-- FIX VIDEO_REQUIREMENTS TABLE ISSUE
-- Run this script directly in your Supabase SQL Editor to fix the 406 error

-- Step 1: Check if video_requirements table exists
SELECT '🔍 CHECKING VIDEO_REQUIREMENTS TABLE:' as info;

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'video_requirements') 
        THEN '✅ video_requirements table exists'
        ELSE '❌ video_requirements table does not exist'
    END as table_status;

-- Step 2: Create video_requirements table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'video_requirements') THEN
        CREATE TABLE public.video_requirements (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
            video_count INTEGER DEFAULT 0,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
            UNIQUE(team_id)
        );
        RAISE NOTICE '✅ Created video_requirements table';
    ELSE
        RAISE NOTICE 'ℹ️ video_requirements table already exists';
    END IF;
END $$;

-- Step 3: Check table structure
SELECT '🔍 VIDEO_REQUIREMENTS TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'video_requirements' 
ORDER BY ordinal_position;

-- Step 4: Enable RLS on video_requirements table
ALTER TABLE video_requirements ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies for video_requirements
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
    
    RAISE NOTICE '✅ Created RLS policies for video_requirements table';
END $$;

-- Step 6: Create function to update video count
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

-- Step 7: Create triggers for video count tracking
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
    
    RAISE NOTICE '✅ Created triggers for video count tracking';
END $$;

-- Step 8: Populate video_requirements for existing teams
DO $$ 
BEGIN
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
    
    RAISE NOTICE '✅ Populated video_requirements for existing teams';
END $$;

-- Step 9: Test the video_requirements table
SELECT '🧪 TESTING VIDEO_REQUIREMENTS:' as info;

-- Test if we can query the table
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM video_requirements LIMIT 1) 
        THEN '✅ video_requirements table is queryable'
        ELSE '❌ video_requirements table is not queryable'
    END as query_status;

-- Test if we can select specific columns
SELECT 
    CASE 
        WHEN EXISTS (SELECT video_count FROM video_requirements LIMIT 1) 
        THEN '✅ video_count column is selectable'
        ELSE '❌ video_count column is not selectable'
    END as video_count_status;

-- Test if we can filter by team_id
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM video_requirements WHERE team_id IS NOT NULL LIMIT 1) 
        THEN '✅ team_id filtering works'
        ELSE '❌ team_id filtering does not work'
    END as filtering_status;

-- Step 10: Show sample data
SELECT '📊 SAMPLE VIDEO_REQUIREMENTS DATA:' as info;
SELECT 
    vr.team_id,
    t.team_name,
    vr.video_count,
    vr.last_updated
FROM video_requirements vr
JOIN teams t ON vr.team_id = t.id
LIMIT 5;

-- Step 11: Verify RLS policies
SELECT '🔒 RLS POLICIES VERIFICATION:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'video_requirements';

-- Step 12: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'Video requirements table has been created and configured successfully!' as message,
    'You should now be able to query video_requirements without 406 errors.' as next_step;
