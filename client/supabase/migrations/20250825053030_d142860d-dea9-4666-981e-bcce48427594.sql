
-- Create agent_shortlists table for storing agent shortlisted players
CREATE TABLE IF NOT EXISTS agent_shortlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  player_id UUID NOT NULL,
  pitch_id UUID,
  notes TEXT,
  priority_level TEXT DEFAULT 'medium' CHECK (priority_level IN ('high', 'medium', 'low')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(agent_id, player_id, pitch_id)
);

-- Add RLS policies for agent_shortlists
ALTER TABLE agent_shortlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can manage their own shortlists" ON agent_shortlists
  FOR ALL USING (
    agent_id IN (
      SELECT id FROM agents WHERE profile_id = auth.uid()
    )
  );

-- Create enhanced_video_analysis table if not exists
CREATE TABLE IF NOT EXISTS enhanced_video_analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  tagged_player_present BOOLEAN DEFAULT false,
  analysis_status TEXT CHECK (analysis_status IN ('completed', 'partial', 'failed')) DEFAULT 'completed',
  game_context JSONB,
  overall_assessment TEXT,
  recommendations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for enhanced_video_analysis
ALTER TABLE enhanced_video_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own enhanced analysis" ON enhanced_video_analysis
  FOR SELECT USING (
    video_id IN (
      SELECT id FROM videos WHERE team_id IN (
        SELECT id FROM teams WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their own enhanced analysis" ON enhanced_video_analysis
  FOR INSERT WITH CHECK (
    video_id IN (
      SELECT id FROM videos WHERE team_id IN (
        SELECT id FROM teams WHERE profile_id = auth.uid()
      )
    )
  );

-- Update videos table to ensure ai_analysis column exists and has proper structure
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS ai_analysis_results JSONB DEFAULT '{}';

-- Create player_detections table if not exists
CREATE TABLE IF NOT EXISTS player_detections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  player_id TEXT,
  player_name TEXT,
  bounding_box JSONB,
  confidence DECIMAL(3,2),
  timestamp DECIMAL(10,3),
  is_tagged_player BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS for player_detections
ALTER TABLE player_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own player detections" ON player_detections
  FOR SELECT USING (
    video_id IN (
      SELECT id FROM videos WHERE team_id IN (
        SELECT id FROM teams WHERE profile_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert their own player detections" ON player_detections
  FOR INSERT WITH CHECK (
    video_id IN (
      SELECT id FROM videos WHERE team_id IN (
        SELECT id FROM teams WHERE profile_id = auth.uid()
      )
    )
  );
