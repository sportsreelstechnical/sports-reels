-- Fix contracts table relationships and add missing market_value column
-- This migration ensures proper foreign key constraints and adds missing columns

-- Step 1: Add missing columns to players table
DO $$ 
BEGIN
    -- Add market_value column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'market_value') THEN
        ALTER TABLE players ADD COLUMN market_value DECIMAL(15,2);
    END IF;

    -- Add position column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'position') THEN
        ALTER TABLE players ADD COLUMN position TEXT;
    END IF;

    -- Add photo_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'photo_url') THEN
        ALTER TABLE players ADD COLUMN photo_url TEXT;
    END IF;

    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'full_name') THEN
        ALTER TABLE players ADD COLUMN full_name TEXT;
    END IF;
END $$;

-- Step 2: Add missing columns to agents table
DO $$ 
BEGIN
    -- Add agency_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'agency_name') THEN
        ALTER TABLE agents ADD COLUMN agency_name TEXT;
    END IF;

    -- Add profile_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'profile_id') THEN
        ALTER TABLE agents ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 3: Ensure contracts table has required columns
DO $$ 
BEGIN
    -- Add team_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'team_id') THEN
        ALTER TABLE contracts ADD COLUMN team_id UUID;
    END IF;

    -- Add player_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'player_id') THEN
        ALTER TABLE contracts ADD COLUMN player_id UUID;
    END IF;

    -- Add agent_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'agent_id') THEN
        ALTER TABLE contracts ADD COLUMN agent_id UUID;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'created_at') THEN
        ALTER TABLE contracts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;

-- Step 4: Drop existing foreign key constraints if they exist
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_team_id_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_player_id_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_agent_id_fkey;

-- Step 5: Create proper foreign key constraints
ALTER TABLE contracts 
ADD CONSTRAINT contracts_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE contracts 
ADD CONSTRAINT contracts_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE contracts 
ADD CONSTRAINT contracts_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contracts_team_id ON contracts(team_id);
CREATE INDEX IF NOT EXISTS idx_contracts_player_id ON contracts(player_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agent_id ON contracts(agent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);
CREATE INDEX IF NOT EXISTS idx_players_market_value ON players(market_value);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_agents_agency_name ON agents(agency_name);
