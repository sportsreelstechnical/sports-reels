
-- Add missing columns to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS video_description TEXT,
ADD COLUMN IF NOT EXISTS compressed_size_mb DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS compression_status TEXT DEFAULT 'pending' CHECK (compression_status IN ('pending', 'processing', 'completed', 'failed'));

-- Update any existing records to have a default compression status
UPDATE videos 
SET compression_status = 'pending' 
WHERE compression_status IS NULL;

-- Create video_compression_logs table if it doesn't exist
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_compression_logs_video_id ON video_compression_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_video_compression_logs_status ON video_compression_logs(compression_status);

-- Enable RLS for video_compression_logs
ALTER TABLE video_compression_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_compression_logs
CREATE POLICY "Teams can view their compression logs" ON video_compression_logs
    FOR SELECT USING (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            WHERE t.profile_id = auth.uid()
        )
    );

CREATE POLICY "Teams can insert compression logs" ON video_compression_logs
    FOR INSERT WITH CHECK (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            WHERE t.profile_id = auth.uid()
        )
    );

CREATE POLICY "Teams can update compression logs" ON video_compression_logs
    FOR UPDATE USING (
        video_id IN (
            SELECT v.id FROM videos v
            JOIN teams t ON v.team_id = t.id
            WHERE t.profile_id = auth.uid()
        )
    );
