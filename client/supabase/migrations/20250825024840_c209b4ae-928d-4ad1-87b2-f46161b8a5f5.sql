
-- Add missing columns to enhanced_video_analysis table
ALTER TABLE enhanced_video_analysis 
ADD COLUMN IF NOT EXISTS overview TEXT,
ADD COLUMN IF NOT EXISTS key_events JSONB,
ADD COLUMN IF NOT EXISTS context_reasoning TEXT,
ADD COLUMN IF NOT EXISTS explanations TEXT,
ADD COLUMN IF NOT EXISTS visual_summary JSONB,
ADD COLUMN IF NOT EXISTS player_performance_radar JSONB,
ADD COLUMN IF NOT EXISTS event_timeline JSONB,
ADD COLUMN IF NOT EXISTS tagged_player_analysis JSONB,
ADD COLUMN IF NOT EXISTS missing_players JSONB,
ADD COLUMN IF NOT EXISTS analysis_metadata JSONB;

-- Update the existing game_context column to be more flexible if needed
-- (This column already exists, so we're just ensuring it can handle the new data structure)

-- Add indexes for better performance on the new JSONB columns
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_key_events ON enhanced_video_analysis USING GIN (key_events);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_player_radar ON enhanced_video_analysis USING GIN (player_performance_radar);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_timeline ON enhanced_video_analysis USING GIN (event_timeline);
CREATE INDEX IF NOT EXISTS idx_enhanced_analysis_tagged_players ON enhanced_video_analysis USING GIN (tagged_player_analysis);
