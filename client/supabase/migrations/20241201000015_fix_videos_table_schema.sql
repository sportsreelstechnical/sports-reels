-- Fix videos table schema by adding missing columns
-- This migration ensures the videos table has all required columns for video uploads

-- Add missing columns to videos table
DO $$ 
BEGIN
    -- Add score column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'score') THEN
        ALTER TABLE videos ADD COLUMN score TEXT;
    END IF;

    -- Add league_competition column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'league_competition') THEN
        ALTER TABLE videos ADD COLUMN league_competition TEXT;
    END IF;

    -- Add opposing_team column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'opposing_team') THEN
        ALTER TABLE videos ADD COLUMN opposing_team TEXT;
    END IF;

    -- Add match_date column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'match_date') THEN
        ALTER TABLE videos ADD COLUMN match_date DATE;
    END IF;

    -- Add video_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'video_type') THEN
        ALTER TABLE videos ADD COLUMN video_type TEXT DEFAULT 'highlight';
    END IF;

    -- Add duration column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'duration') THEN
        ALTER TABLE videos ADD COLUMN duration INTEGER;
    END IF;

    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'tags') THEN
        ALTER TABLE videos ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;

    -- Add ai_analysis_status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ai_analysis_status') THEN
        ALTER TABLE videos ADD COLUMN ai_analysis_status TEXT DEFAULT 'pending';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'description') THEN
        ALTER TABLE videos ADD COLUMN description TEXT;
    END IF;

    -- Add home_or_away column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'home_or_away') THEN
        ALTER TABLE videos ADD COLUMN home_or_away TEXT CHECK (home_or_away IN ('home', 'away'));
    END IF;

    -- Add final_score_home column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'final_score_home') THEN
        ALTER TABLE videos ADD COLUMN final_score_home INTEGER DEFAULT 0;
    END IF;

    -- Add final_score_away column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'final_score_away') THEN
        ALTER TABLE videos ADD COLUMN final_score_away INTEGER DEFAULT 0;
    END IF;

    -- Add file_size column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'file_size') THEN
        ALTER TABLE videos ADD COLUMN file_size BIGINT;
    END IF;

    -- Add compressed_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'compressed_url') THEN
        ALTER TABLE videos ADD COLUMN compressed_url TEXT;
    END IF;

    -- Add upload_status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'upload_status') THEN
        ALTER TABLE videos ADD COLUMN upload_status TEXT DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed'));
    END IF;

    -- Add is_public column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'is_public') THEN
        ALTER TABLE videos ADD COLUMN is_public BOOLEAN DEFAULT true;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'updated_at') THEN
        ALTER TABLE videos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_score ON videos(score);
CREATE INDEX IF NOT EXISTS idx_videos_league_competition ON videos(league_competition);
CREATE INDEX IF NOT EXISTS idx_videos_opposing_team ON videos(opposing_team);
CREATE INDEX IF NOT EXISTS idx_videos_match_date ON videos(match_date);
CREATE INDEX IF NOT EXISTS idx_videos_video_type ON videos(video_type);
CREATE INDEX IF NOT EXISTS idx_videos_ai_analysis_status ON videos(ai_analysis_status);
CREATE INDEX IF NOT EXISTS idx_videos_upload_status ON videos(upload_status);
CREATE INDEX IF NOT EXISTS idx_videos_is_public ON videos(is_public);
CREATE INDEX IF NOT EXISTS idx_videos_tags ON videos USING GIN(tags);
