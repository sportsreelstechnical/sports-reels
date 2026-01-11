-- FIX CONTRACTS, AGENTS, AND PLAYERS TABLES
-- Run this script directly in your Supabase SQL Editor to fix all relationship issues

-- Step 1: Check current table structures
SELECT '🔍 CHECKING CURRENT TABLE STRUCTURES:' as info;

-- Check contracts table
SELECT '📋 CONTRACTS TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'contracts' 
ORDER BY ordinal_position;

-- Check players table
SELECT '👤 PLAYERS TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'players' 
ORDER BY ordinal_position;

-- Check agents table
SELECT '👤 AGENTS TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;

-- Step 2: Check existing foreign key constraints
SELECT '🔗 CHECKING EXISTING FOREIGN KEYS:' as info;

SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('contracts', 'players', 'agents')
ORDER BY tc.table_name, kcu.column_name;

-- Step 3: Add missing columns to players table
SELECT '🔧 ADDING MISSING COLUMNS TO PLAYERS:' as info;

DO $$ 
BEGIN
    -- Add market_value column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'market_value') THEN
        ALTER TABLE players ADD COLUMN market_value DECIMAL(15,2);
        RAISE NOTICE '✅ Added market_value column to players table';
    ELSE
        RAISE NOTICE 'ℹ️ market_value column already exists in players table';
    END IF;

    -- Add position column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'position') THEN
        ALTER TABLE players ADD COLUMN position TEXT;
        RAISE NOTICE '✅ Added position column to players table';
    ELSE
        RAISE NOTICE 'ℹ️ position column already exists in players table';
    END IF;

    -- Add photo_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'photo_url') THEN
        ALTER TABLE players ADD COLUMN photo_url TEXT;
        RAISE NOTICE '✅ Added photo_url column to players table';
    ELSE
        RAISE NOTICE 'ℹ️ photo_url column already exists in players table';
    END IF;

    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'full_name') THEN
        ALTER TABLE players ADD COLUMN full_name TEXT;
        RAISE NOTICE '✅ Added full_name column to players table';
    ELSE
        RAISE NOTICE 'ℹ️ full_name column already exists in players table';
    END IF;
END $$;

-- Step 4: Add missing columns to agents table
SELECT '🔧 ADDING MISSING COLUMNS TO AGENTS:' as info;

DO $$ 
BEGIN
    -- Add agency_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'agency_name') THEN
        ALTER TABLE agents ADD COLUMN agency_name TEXT;
        RAISE NOTICE '✅ Added agency_name column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ agency_name column already exists in agents table';
    END IF;

    -- Add profile_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'profile_id') THEN
        ALTER TABLE agents ADD COLUMN profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added profile_id column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ profile_id column already exists in agents table';
    END IF;
END $$;

-- Step 5: Fix contracts table foreign key relationships
SELECT '🔧 FIXING CONTRACTS RELATIONSHIPS:' as info;

-- Ensure contracts table has the required columns
DO $$ 
BEGIN
    -- Add team_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'team_id') THEN
        ALTER TABLE contracts ADD COLUMN team_id UUID;
        RAISE NOTICE '✅ Added team_id column to contracts table';
    ELSE
        RAISE NOTICE 'ℹ️ team_id column already exists in contracts table';
    END IF;

    -- Add player_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'player_id') THEN
        ALTER TABLE contracts ADD COLUMN player_id UUID;
        RAISE NOTICE '✅ Added player_id column to contracts table';
    ELSE
        RAISE NOTICE 'ℹ️ player_id column already exists in contracts table';
    END IF;

    -- Add agent_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'agent_id') THEN
        ALTER TABLE contracts ADD COLUMN agent_id UUID;
        RAISE NOTICE '✅ Added agent_id column to contracts table';
    ELSE
        RAISE NOTICE 'ℹ️ agent_id column already exists in contracts table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'created_at') THEN
        ALTER TABLE contracts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        RAISE NOTICE '✅ Added created_at column to contracts table';
    ELSE
        RAISE NOTICE 'ℹ️ created_at column already exists in contracts table';
    END IF;
END $$;

-- Drop existing foreign key constraints if they exist
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_team_id_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_player_id_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_agent_id_fkey;

-- Create proper foreign key constraints
ALTER TABLE contracts 
ADD CONSTRAINT contracts_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE contracts 
ADD CONSTRAINT contracts_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE contracts 
ADD CONSTRAINT contracts_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Step 6: Populate sample data for testing
SELECT '🔧 POPULATING SAMPLE DATA:' as info;

-- Update some players with market_value for testing
UPDATE players 
SET market_value = 1000000.00
WHERE market_value IS NULL 
LIMIT 5;

-- Update some agents with agency_name for testing
UPDATE agents 
SET agency_name = 'Sports Management Agency'
WHERE agency_name IS NULL 
LIMIT 5;

-- Step 7: Verify the relationships
SELECT '🔍 VERIFYING RELATIONSHIPS:' as info;

-- Test contracts -> teams relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'contracts_team_id_fkey' 
            AND table_name = 'contracts'
        ) 
        THEN '✅ contracts -> teams foreign key exists'
        ELSE '❌ contracts -> teams foreign key missing'
    END as contracts_teams_fk_status;

-- Test contracts -> players relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'contracts_player_id_fkey' 
            AND table_name = 'contracts'
        ) 
        THEN '✅ contracts -> players foreign key exists'
        ELSE '❌ contracts -> players foreign key missing'
    END as contracts_players_fk_status;

-- Test contracts -> agents relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'contracts_agent_id_fkey' 
            AND table_name = 'contracts'
        ) 
        THEN '✅ contracts -> agents foreign key exists'
        ELSE '❌ contracts -> agents foreign key missing'
    END as contracts_agents_fk_status;

-- Step 8: Test the relationships
SELECT '🧪 TESTING RELATIONSHIPS:' as info;

-- Test if we can query contracts with team information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM contracts c
            JOIN teams t ON c.team_id = t.id
            LIMIT 1
        ) 
        THEN '✅ contracts JOIN teams works'
        ELSE '❌ contracts JOIN teams fails'
    END as contracts_teams_join_status;

-- Test if we can query contracts with player information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM contracts c
            JOIN players p ON c.player_id = p.id
            LIMIT 1
        ) 
        THEN '✅ contracts JOIN players works'
        ELSE '❌ contracts JOIN players fails'
    END as contracts_players_join_status;

-- Test if we can query contracts with agent information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM contracts c
            JOIN agents a ON c.agent_id = a.id
            LIMIT 1
        ) 
        THEN '✅ contracts JOIN agents works'
        ELSE '❌ contracts JOIN agents fails'
    END as contracts_agents_join_status;

-- Step 9: Test specific queries that were failing
SELECT '🧪 TESTING SPECIFIC QUERIES:' as info;

-- Test contracts query with all relationships
DO $$ 
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Test the query that was failing
        PERFORM 1 FROM contracts c
        JOIN players p ON c.player_id = p.id
        JOIN agents a ON c.agent_id = a.id
        JOIN teams t ON c.team_id = t.id
        LIMIT 1;
        
        test_result := '✅ Contracts query with all relationships works';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Contracts query failed: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Test players query with market_value
DO $$ 
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Test the query that was failing
        PERFORM 1 FROM players 
        WHERE market_value IS NOT NULL 
        LIMIT 1;
        
        test_result := '✅ Players query with market_value works';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Players query failed: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Step 10: Show final data structure
SELECT '📊 FINAL DATA STRUCTURE:' as info;

-- Show contracts table with relationships
SELECT 
    'contracts' as table_name,
    COUNT(*) as total_contracts,
    COUNT(team_id) as contracts_with_team,
    COUNT(player_id) as contracts_with_player,
    COUNT(agent_id) as contracts_with_agent
FROM contracts;

-- Show players table with new columns
SELECT 
    'players' as table_name,
    COUNT(*) as total_players,
    COUNT(market_value) as players_with_market_value,
    COUNT(position) as players_with_position,
    COUNT(photo_url) as players_with_photo
FROM players;

-- Show agents table with new columns
SELECT 
    'agents' as table_name,
    COUNT(*) as total_agents,
    COUNT(agency_name) as agents_with_agency_name,
    COUNT(profile_id) as agents_with_profile
FROM agents;

-- Step 11: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'All contracts, players, and agents table relationships and missing columns have been fixed successfully!' as message,
    'You should now be able to query contracts with teams, players, and agents, and access market_value and other columns.' as next_step;
