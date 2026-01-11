
-- Create transfer_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE transfer_status AS ENUM ('active', 'expired', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create message_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update transfer_pitches table to include all required fields
ALTER TABLE transfer_pitches 
ADD COLUMN IF NOT EXISTS sign_on_bonus NUMERIC,
ADD COLUMN IF NOT EXISTS performance_bonus NUMERIC,
ADD COLUMN IF NOT EXISTS player_salary NUMERIC,
ADD COLUMN IF NOT EXISTS relocation_support NUMERIC,
ADD COLUMN IF NOT EXISTS loan_fee NUMERIC,
ADD COLUMN IF NOT EXISTS loan_with_option BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loan_with_obligation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tagged_videos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS contract_details JSONB,
ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tier_level TEXT DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS service_charge_rate NUMERIC DEFAULT 15.0;

-- Create RLS policies for transfer_pitches (with IF NOT EXISTS check)
ALTER TABLE transfer_pitches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view active transfer pitches" ON transfer_pitches
    FOR SELECT USING (status = 'active' AND expires_at > now());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Team owners can manage their pitches v2" ON transfer_pitches
    FOR ALL USING (
      team_id IN (
        SELECT id FROM teams WHERE profile_id = auth.uid()
      )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update messages table structure for better organization
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS transfer_pitch_id UUID REFERENCES transfer_pitches(id),
ADD COLUMN IF NOT EXISTS message_thread_id UUID,
ADD COLUMN IF NOT EXISTS attachment_urls JSONB DEFAULT '[]'::jsonb;

-- Create RLS policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view their own messages" ON messages
    FOR SELECT USING (
      sender_id = auth.uid() OR 
      receiver_id = auth.uid()
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (sender_id = auth.uid());
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create trigger to flag contact info in messages
DROP TRIGGER IF EXISTS flag_contact_info_trigger ON messages;
CREATE TRIGGER flag_contact_info_trigger
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION flag_contact_info_messages();

-- Create video_requirements table to track team video count
CREATE TABLE IF NOT EXISTS video_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) NOT NULL,
  video_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id)
);

-- Create function to update video count
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

-- Create triggers for video count tracking
DROP TRIGGER IF EXISTS update_video_count_insert ON videos;
CREATE TRIGGER update_video_count_insert
  AFTER INSERT ON videos
  FOR EACH ROW EXECUTE FUNCTION update_team_video_count();

DROP TRIGGER IF EXISTS update_video_count_delete ON videos;
CREATE TRIGGER update_video_count_delete
  AFTER DELETE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_team_video_count();

-- Enable RLS for shortlist
ALTER TABLE shortlist ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Agents can manage their shortlist" ON shortlist
    FOR ALL USING (
      agent_id IN (
        SELECT id FROM agents WHERE profile_id = auth.uid()
      )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create function to validate transfer pitch requirements
CREATE OR REPLACE FUNCTION validate_transfer_pitch_requirements(p_team_id UUID, p_player_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  video_count INTEGER;
  player_complete BOOLEAN;
BEGIN
  -- Check if team has at least 5 videos
  SELECT COALESCE(vr.video_count, 0) INTO video_count
  FROM video_requirements vr
  WHERE vr.team_id = p_team_id;
  
  IF video_count < 5 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if player profile is complete
  SELECT (
    full_name IS NOT NULL AND 
    position IS NOT NULL AND 
    citizenship IS NOT NULL AND
    date_of_birth IS NOT NULL AND
    height IS NOT NULL AND
    weight IS NOT NULL AND
    bio IS NOT NULL AND
    market_value IS NOT NULL
  ) INTO player_complete
  FROM players 
  WHERE id = p_player_id;
  
  RETURN COALESCE(player_complete, FALSE);
END;
$$ LANGUAGE plpgsql;
