-- Create video_analyses table for storing AI analysis results
CREATE TABLE IF NOT EXISTS video_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url TEXT NOT NULL,
  video_type TEXT NOT NULL CHECK (video_type IN ('match', 'interview', 'training', 'highlight')),
  sport TEXT NOT NULL,
  analysis_data JSONB NOT NULL,
  player_tags JSONB,
  team_info JSONB,
  context TEXT,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  frame_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_analyses_video_type ON video_analyses(video_type);
CREATE INDEX IF NOT EXISTS idx_video_analyses_sport ON video_analyses(sport);
CREATE INDEX IF NOT EXISTS idx_video_analyses_created_at ON video_analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_video_analyses_user_id ON video_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_team_id ON video_analyses(team_id);
CREATE INDEX IF NOT EXISTS idx_video_analyses_status ON video_analyses(status);

-- Create GIN index for JSONB search
CREATE INDEX IF NOT EXISTS idx_video_analyses_analysis_data ON video_analyses USING GIN (analysis_data);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_video_analyses_updated_at
  BEFORE UPDATE ON video_analyses
  FOR EACH ROW
  EXECUTE FUNCTION update_video_analyses_updated_at();

-- Create view for recent analyses
CREATE OR REPLACE VIEW recent_video_analyses AS
SELECT 
  va.id,
  va.video_url,
  va.video_type,
  va.sport,
  va.confidence,
  va.frame_count,
  va.status,
  va.created_at,
  va.player_tags,
  va.team_info,
  va.context,
  u.email as user_email,
  t.team_name
FROM video_analyses va
LEFT JOIN auth.users u ON va.user_id = u.id
LEFT JOIN teams t ON va.team_id = t.id
ORDER BY va.created_at DESC;

-- Create function to get analysis statistics
CREATE OR REPLACE FUNCTION get_video_analysis_stats(
  p_user_id UUID DEFAULT NULL,
  p_team_id UUID DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL
)
RETURNS TABLE (
  total_analyses BIGINT,
  avg_confidence DECIMAL(3,2),
  total_frames BIGINT,
  by_type JSONB,
  by_sport JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as total_count,
      AVG(confidence) as avg_conf,
      SUM(frame_count) as total_frames,
      jsonb_object_agg(video_type, type_count) as type_stats,
      jsonb_object_agg(sport, sport_count) as sport_stats
    FROM (
      SELECT 
        video_type,
        sport,
        COUNT(*) OVER (PARTITION BY video_type) as type_count,
        COUNT(*) OVER (PARTITION BY sport) as sport_count
      FROM video_analyses va
      WHERE (p_user_id IS NULL OR va.user_id = p_user_id)
        AND (p_team_id IS NULL OR va.team_id = p_team_id)
        AND (p_date_from IS NULL OR va.created_at::date >= p_date_from)
        AND (p_date_to IS NULL OR va.created_at::date <= p_date_to)
    ) sub
  )
  SELECT 
    stats.total_count,
    stats.avg_conf,
    stats.total_frames,
    stats.type_stats,
    stats.sport_stats
  FROM stats;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON video_analyses TO authenticated;
GRANT SELECT ON recent_video_analyses TO authenticated;
GRANT EXECUTE ON FUNCTION get_video_analysis_stats TO authenticated;

-- Add RLS policies
ALTER TABLE video_analyses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own analyses
CREATE POLICY "Users can view own video analyses" ON video_analyses
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own analyses
CREATE POLICY "Users can insert own video analyses" ON video_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own analyses
CREATE POLICY "Users can update own video analyses" ON video_analyses
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own analyses
CREATE POLICY "Users can delete own video analyses" ON video_analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Team members can view team analyses
CREATE POLICY "Team members can view team video analyses" ON video_analyses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = video_analyses.team_id 
      AND tm.user_id = auth.uid()
    )
  );

-- Policy: Team admins can manage team analyses
CREATE POLICY "Team admins can manage team video analyses" ON video_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_members tm 
      WHERE tm.team_id = video_analyses.team_id 
      AND tm.user_id = auth.uid()
      AND tm.role IN ('admin', 'owner')
    )
  );
