-- Video Compression Logs Table
-- This table tracks video compression processes for quality control and monitoring

CREATE TABLE IF NOT EXISTS video_compression_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    
    -- Compression Details
    original_size_mb DECIMAL(10,2),
    compressed_size_mb DECIMAL(10,2),
    compression_ratio DECIMAL(5,2),
    target_size_mb INTEGER DEFAULT 10,
    compression_algorithm TEXT DEFAULT 'h264',
    
    -- Process Details
    compression_status TEXT CHECK (compression_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    processing_time INTEGER, -- Time taken in seconds
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_video_compression_logs_video_id ON video_compression_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_compression_logs_status ON video_compression_logs(compression_status);

-- Enable RLS for security
ALTER TABLE video_compression_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for team members
CREATE POLICY "Team members can view their own compression logs" ON video_compression_logs
    FOR SELECT USING (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Team members can insert their own compression logs" ON video_compression_logs
    FOR INSERT WITH CHECK (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Team members can update their own compression logs" ON video_compression_logs
    FOR UPDATE USING (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.id = auth.uid()
        )
    );

-- Add comment for documentation
COMMENT ON TABLE video_compression_logs IS 'Logs of video compression process for quality control';

-- Update existing videos table if needed
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS compressed_size_mb DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS compression_status TEXT DEFAULT 'pending' CHECK (compression_status IN ('pending', 'processing', 'completed', 'failed'));
