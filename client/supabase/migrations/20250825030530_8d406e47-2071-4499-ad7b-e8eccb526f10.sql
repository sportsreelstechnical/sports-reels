
-- Add unique constraint on video_id for enhanced_video_analysis table
ALTER TABLE enhanced_video_analysis 
ADD CONSTRAINT enhanced_video_analysis_video_id_unique UNIQUE (video_id);

-- Add the missing compression_algorithm column to video_compression_logs table
ALTER TABLE video_compression_logs 
ADD COLUMN IF NOT EXISTS compression_algorithm TEXT DEFAULT 'h264';
