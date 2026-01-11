-- Fix video_requirements table issue
-- This migration ensures the video_requirements table exists and is properly configured

-- Step 1: Create video_requirements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.video_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    video_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(team_id)
);

-- Step 2: Enable RLS on video_requirements table
ALTER TABLE video_requirements ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for video_requirements
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Teams can view their video requirements" ON video_requirements;
    DROP POLICY IF EXISTS "Teams can manage their video requirements" ON video_requirements;
    
    -- Create new policies
    CREATE POLICY "Teams can view their video requirements" ON video_requirements
    FOR SELECT USING (
        team_id IN (
            SELECT id FROM teams WHERE profile_id = auth.uid()
        )
    );
    
    CREATE POLICY "Teams can manage their video requirements" ON video_requirements
    FOR ALL USING (
        team_id IN (
            SELECT id FROM teams WHERE profile_id = auth.uid()
        )
    );
END $$;

-- Step 4: Create function to update video count
CREATE OR REPLACE FUNCTION update_team_video_count()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO video_requirements (team_id, video_count)
    VALUES (
        COALESCE(NEW.team_id, OLD.team_id),
        (SELECT COUNT(*) FROM videos WHERE team_id = COALESCE(NEW.team_id, OLD.team_id))
    )
    ON CONFLICT (team_id) 
    DO UPDATE SET 
        video_count = (SELECT COUNT(*) FROM videos WHERE team_id = COALESCE(NEW.team_id, OLD.team_id)),
        last_updated = now();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create triggers for video count tracking
DO $$ 
BEGIN
    -- Drop existing triggers if they exist
    DROP TRIGGER IF EXISTS update_video_count_insert ON videos;
    DROP TRIGGER IF EXISTS update_video_count_delete ON videos;
    
    -- Create new triggers
    CREATE TRIGGER update_video_count_insert
        AFTER INSERT ON videos
        FOR EACH ROW EXECUTE FUNCTION update_team_video_count();
    
    CREATE TRIGGER update_video_count_delete
        AFTER DELETE ON videos
        FOR EACH ROW EXECUTE FUNCTION update_team_video_count();
END $$;

-- Step 6: Populate video_requirements for existing teams
INSERT INTO video_requirements (team_id, video_count, last_updated)
SELECT 
    t.id,
    COALESCE(video_counts.video_count, 0),
    now()
FROM teams t
LEFT JOIN (
    SELECT 
        team_id,
        COUNT(*) as video_count
    FROM videos 
    WHERE team_id IS NOT NULL
    GROUP BY team_id
) video_counts ON t.id = video_counts.team_id
ON CONFLICT (team_id) 
DO UPDATE SET 
    video_count = EXCLUDED.video_count,
    last_updated = now();
