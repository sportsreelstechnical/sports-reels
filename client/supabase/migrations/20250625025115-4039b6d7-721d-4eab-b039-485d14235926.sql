
-- Add tagged_players column to videos table
ALTER TABLE videos 
ADD COLUMN IF NOT EXISTS tagged_players jsonb;
