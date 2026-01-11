-- Fix foreign key relationships between videos, players, and teams tables
-- This migration ensures proper foreign key constraints exist for proper JOIN operations

-- Step 1: Ensure videos table has required columns
DO $$ 
BEGIN
    -- Add team_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'team_id') THEN
        ALTER TABLE videos ADD COLUMN team_id UUID;
    END IF;

    -- Add player_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'player_id') THEN
        ALTER TABLE videos ADD COLUMN player_id UUID;
    END IF;

    -- Add tagged_players column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'tagged_players') THEN
        ALTER TABLE videos ADD COLUMN tagged_players JSONB DEFAULT '[]';
    END IF;

    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'title') THEN
        ALTER TABLE videos ADD COLUMN title TEXT DEFAULT 'Untitled Video';
    END IF;

    -- Add video_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'video_url') THEN
        ALTER TABLE videos ADD COLUMN video_url TEXT;
    END IF;

    -- Add thumbnail_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE videos ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'created_at') THEN
        ALTER TABLE videos ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Step 2: Ensure players table has team_id column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'team_id') THEN
        ALTER TABLE players ADD COLUMN team_id UUID;
    END IF;
END $$;

-- Step 3: Drop existing foreign key constraints if they exist
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_team_id_fkey;
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_player_id_fkey;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_id_fkey;

-- Step 4: Create proper foreign key constraints
ALTER TABLE videos 
ADD CONSTRAINT videos_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE videos 
ADD CONSTRAINT videos_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE players 
ADD CONSTRAINT players_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_videos_team_id ON videos(team_id);
CREATE INDEX IF NOT EXISTS idx_videos_player_id ON videos(player_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_videos_tagged_players ON videos USING GIN(tagged_players);
