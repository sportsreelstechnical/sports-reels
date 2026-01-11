-- Fix transfer_pitches table relationships and missing columns
-- This migration ensures proper foreign key constraints and adds missing columns

-- Step 1: Add missing columns to teams table
DO $$ 
BEGIN
    -- Add member_association column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'member_association') THEN
        ALTER TABLE teams ADD COLUMN member_association TEXT;
    END IF;

    -- Add year_founded column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'year_founded') THEN
        ALTER TABLE teams ADD COLUMN year_founded INTEGER;
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'description') THEN
        ALTER TABLE teams ADD COLUMN description TEXT;
    END IF;

    -- Add titles column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'titles') THEN
        ALTER TABLE teams ADD COLUMN titles TEXT[];
    END IF;

    -- Add website column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'website') THEN
        ALTER TABLE teams ADD COLUMN website TEXT;
    END IF;

    -- Add division column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'division') THEN
        ALTER TABLE teams ADD COLUMN division TEXT;
    END IF;
END $$;

-- Step 2: Add missing columns to agents table
DO $$ 
BEGIN
    -- Add member_association column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'member_association') THEN
        ALTER TABLE agents ADD COLUMN member_association TEXT;
    END IF;

    -- Add year_founded column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'year_founded') THEN
        ALTER TABLE agents ADD COLUMN year_founded INTEGER;
    END IF;

    -- Add specialization column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'specialization') THEN
        ALTER TABLE agents ADD COLUMN specialization TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Step 3: Ensure transfer_pitches table has required columns
DO $$ 
BEGIN
    -- Add team_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'transfer_pitches' AND column_name = 'team_id') THEN
        ALTER TABLE transfer_pitches ADD COLUMN team_id UUID;
    END IF;

    -- Add player_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'transfer_pitches' AND column_name = 'player_id') THEN
        ALTER TABLE transfer_pitches ADD COLUMN player_id UUID;
    END IF;

    -- Add message_count column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'transfer_pitches' AND column_name = 'message_count') THEN
        ALTER TABLE transfer_pitches ADD COLUMN message_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 4: Drop existing foreign key constraints if they exist
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_team_id_fkey;
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_player_id_fkey;

-- Step 5: Create proper foreign key constraints
ALTER TABLE transfer_pitches 
ADD CONSTRAINT transfer_pitches_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE transfer_pitches 
ADD CONSTRAINT transfer_pitches_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_team_id ON transfer_pitches(team_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_player_id ON transfer_pitches(player_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_status ON transfer_pitches(status);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_expires_at ON transfer_pitches(expires_at);
CREATE INDEX IF NOT EXISTS idx_teams_member_association ON teams(member_association);
CREATE INDEX IF NOT EXISTS idx_agents_specialization ON agents USING GIN(specialization);
