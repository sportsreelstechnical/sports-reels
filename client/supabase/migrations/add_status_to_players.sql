-- Add status column to players table for tracking transfer status
-- Run this script directly in your Supabase SQL editor

-- Add status column if it doesn't exist
ALTER TABLE players ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add check constraint for valid status values
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_status_check;
ALTER TABLE players ADD CONSTRAINT players_status_check 
CHECK (status IN ('active', 'transferred', 'retired', 'inactive'));

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);

-- Update existing players to have 'active' status if they don't have one
UPDATE players SET status = 'active' WHERE status IS NULL;
