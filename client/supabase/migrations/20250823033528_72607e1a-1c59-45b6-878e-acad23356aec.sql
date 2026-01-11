
-- Add missing columns to videos table for comprehensive match data
ALTER TABLE videos ADD COLUMN IF NOT EXISTS jersey_numbers jsonb DEFAULT '{}';
ALTER TABLE videos ADD COLUMN IF NOT EXISTS league_competition text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS sport_type text;
ALTER TABLE videos ADD COLUMN IF NOT EXISTS total_match_stats jsonb DEFAULT '{}';

-- Create match_statistics table if it doesn't exist with proper structure
CREATE TABLE IF NOT EXISTS match_statistics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id),
  jersey_number integer,
  goals integer DEFAULT 0,
  assists integer DEFAULT 0,
  yellow_cards integer DEFAULT 0,
  second_yellow_cards integer DEFAULT 0,
  red_cards integer DEFAULT 0,
  minutes_played integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Add RLS policies for match_statistics
ALTER TABLE match_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams can manage their match statistics" ON match_statistics
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM videos v
    JOIN teams t ON v.team_id = t.id
    WHERE v.id = match_statistics.video_id 
    AND t.profile_id = auth.uid()
  )
);

CREATE POLICY "Public can view match statistics from public videos" ON match_statistics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM videos v
    WHERE v.id = match_statistics.video_id 
    AND v.is_public = true
  )
);
