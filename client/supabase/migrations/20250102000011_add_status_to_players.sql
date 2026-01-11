-- Add status column to players table for tracking transfer status
-- This migration adds a status column to track player transfer states

-- Add status column to players table if it doesn't exist
DO $$ 
BEGIN
    -- Add status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'status') THEN
        ALTER TABLE players ADD COLUMN status TEXT DEFAULT 'active';
        
        -- Add check constraint for valid status values
        ALTER TABLE players ADD CONSTRAINT players_status_check 
        CHECK (status IN ('active', 'transferred', 'retired', 'inactive'));
    END IF;
END $$;

-- Create index for better performance on status queries
CREATE INDEX IF NOT EXISTS idx_players_status ON players(status);

-- Update existing players to have 'active' status if they don't have one
UPDATE players SET status = 'active' WHERE status IS NULL;
