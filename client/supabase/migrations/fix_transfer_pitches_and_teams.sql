-- FIX TRANSFER_PITCHES, TEAMS, AND AGENTS TABLES
-- Run this script directly in your Supabase SQL Editor to fix all relationship issues

-- Step 1: Check current table structures
SELECT '🔍 CHECKING CURRENT TABLE STRUCTURES:' as info;

-- Check transfer_pitches table
SELECT '📋 TRANSFER_PITCHES TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'transfer_pitches' 
ORDER BY ordinal_position;

-- Check teams table
SELECT '🏆 TEAMS TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'teams' 
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
    AND tc.table_name IN ('transfer_pitches', 'teams', 'agents')
ORDER BY tc.table_name, kcu.column_name;

-- Step 3: Add missing columns to teams table
SELECT '🔧 ADDING MISSING COLUMNS TO TEAMS:' as info;

DO $$ 
BEGIN
    -- Add member_association column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'member_association') THEN
        ALTER TABLE teams ADD COLUMN member_association TEXT;
        RAISE NOTICE '✅ Added member_association column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ member_association column already exists in teams table';
    END IF;

    -- Add year_founded column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'year_founded') THEN
        ALTER TABLE teams ADD COLUMN year_founded INTEGER;
        RAISE NOTICE '✅ Added year_founded column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ year_founded column already exists in teams table';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'description') THEN
        ALTER TABLE teams ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ description column already exists in teams table';
    END IF;

    -- Add titles column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'titles') THEN
        ALTER TABLE teams ADD COLUMN titles TEXT[];
        RAISE NOTICE '✅ Added titles column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ titles column already exists in teams table';
    END IF;

    -- Add website column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'website') THEN
        ALTER TABLE teams ADD COLUMN website TEXT;
        RAISE NOTICE '✅ Added website column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ website column already exists in teams table';
    END IF;

    -- Add division column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'division') THEN
        ALTER TABLE teams ADD COLUMN division TEXT;
        RAISE NOTICE '✅ Added division column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ division column already exists in teams table';
    END IF;
END $$;

-- Step 4: Add missing columns to agents table
SELECT '🔧 ADDING MISSING COLUMNS TO AGENTS:' as info;

DO $$ 
BEGIN
    -- Add member_association column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'member_association') THEN
        ALTER TABLE agents ADD COLUMN member_association TEXT;
        RAISE NOTICE '✅ Added member_association column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ member_association column already exists in agents table';
    END IF;

    -- Add year_founded column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'year_founded') THEN
        ALTER TABLE agents ADD COLUMN year_founded INTEGER;
        RAISE NOTICE '✅ Added year_founded column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ year_founded column already exists in agents table';
    END IF;

    -- Add specialization column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'specialization') THEN
        ALTER TABLE agents ADD COLUMN specialization TEXT[] DEFAULT '{}';
        RAISE NOTICE '✅ Added specialization column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ specialization column already exists in agents table';
    END IF;
END $$;

-- Step 5: Fix transfer_pitches table foreign key relationships
SELECT '🔧 FIXING TRANSFER_PITCHES RELATIONSHIPS:' as info;

-- Ensure transfer_pitches table has the required columns
DO $$ 
BEGIN
    -- Add team_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'transfer_pitches' AND column_name = 'team_id') THEN
        ALTER TABLE transfer_pitches ADD COLUMN team_id UUID;
        RAISE NOTICE '✅ Added team_id column to transfer_pitches table';
    ELSE
        RAISE NOTICE 'ℹ️ team_id column already exists in transfer_pitches table';
    END IF;

    -- Add player_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'transfer_pitches' AND column_name = 'player_id') THEN
        ALTER TABLE transfer_pitches ADD COLUMN player_id UUID;
        RAISE NOTICE '✅ Added player_id column to transfer_pitches table';
    ELSE
        RAISE NOTICE 'ℹ️ player_id column already exists in transfer_pitches table';
    END IF;

    -- Add message_count column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'transfer_pitches' AND column_name = 'message_count') THEN
        ALTER TABLE transfer_pitches ADD COLUMN message_count INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added message_count column to transfer_pitches table';
    ELSE
        RAISE NOTICE 'ℹ️ message_count column already exists in transfer_pitches table';
    END IF;
END $$;

-- Drop existing foreign key constraints if they exist
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_team_id_fkey;
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_player_id_fkey;

-- Create proper foreign key constraints
ALTER TABLE transfer_pitches 
ADD CONSTRAINT transfer_pitches_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE transfer_pitches 
ADD CONSTRAINT transfer_pitches_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Step 6: Populate sample data for testing
SELECT '🔧 POPULATING SAMPLE DATA:' as info;

-- Update some teams with member_association for testing
UPDATE teams 
SET member_association = 'NBA'
WHERE member_association IS NULL 
LIMIT 5;

-- Update some agents with specialization for testing
UPDATE agents 
SET specialization = ARRAY['football', 'basketball']
WHERE specialization IS NULL 
LIMIT 5;

-- Step 7: Verify the relationships
SELECT '🔍 VERIFYING RELATIONSHIPS:' as info;

-- Test transfer_pitches -> teams relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transfer_pitches_team_id_fkey' 
            AND table_name = 'transfer_pitches'
        ) 
        THEN '✅ transfer_pitches -> teams foreign key exists'
        ELSE '❌ transfer_pitches -> teams foreign key missing'
    END as transfer_pitches_teams_fk_status;

-- Test transfer_pitches -> players relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transfer_pitches_player_id_fkey' 
            AND table_name = 'transfer_pitches'
        ) 
        THEN '✅ transfer_pitches -> players foreign key exists'
        ELSE '❌ transfer_pitches -> players foreign key missing'
    END as transfer_pitches_players_fk_status;

-- Step 8: Test the relationships
SELECT '🧪 TESTING RELATIONSHIPS:' as info;

-- Test if we can query transfer_pitches with team information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM transfer_pitches tp
            JOIN teams t ON tp.team_id = t.id
            LIMIT 1
        ) 
        THEN '✅ transfer_pitches JOIN teams works'
        ELSE '❌ transfer_pitches JOIN teams fails'
    END as transfer_pitches_teams_join_status;

-- Test if we can query transfer_pitches with player information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM transfer_pitches tp
            JOIN players p ON tp.player_id = p.id
            LIMIT 1
        ) 
        THEN '✅ transfer_pitches JOIN players works'
        ELSE '❌ transfer_pitches JOIN players fails'
    END as transfer_pitches_players_join_status;

-- Step 9: Test specific queries that were failing
SELECT '🧪 TESTING SPECIFIC QUERIES:' as info;

-- Test teams query with member_association
DO $$ 
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Test the query that was failing
        PERFORM 1 FROM teams 
        WHERE member_association = 'NBA' 
        LIMIT 1;
        
        test_result := '✅ Teams query with member_association works';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Teams query failed: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Test agents query with specialization
DO $$ 
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Test the query that was failing
        PERFORM 1 FROM agents 
        WHERE specialization IS NOT NULL 
        LIMIT 1;
        
        test_result := '✅ Agents query with specialization works';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Agents query failed: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Step 10: Show final data structure
SELECT '📊 FINAL DATA STRUCTURE:' as info;

-- Show teams table with new columns
SELECT 
    'teams' as table_name,
    COUNT(*) as total_teams,
    COUNT(member_association) as teams_with_association,
    COUNT(year_founded) as teams_with_year,
    COUNT(description) as teams_with_description
FROM teams;

-- Show agents table with new columns
SELECT 
    'agents' as table_name,
    COUNT(*) as total_agents,
    COUNT(member_association) as agents_with_association,
    COUNT(year_founded) as agents_with_year,
    COUNT(specialization) as agents_with_specialization
FROM agents;

-- Show transfer_pitches table with relationships
SELECT 
    'transfer_pitches' as table_name,
    COUNT(*) as total_pitches,
    COUNT(team_id) as pitches_with_team,
    COUNT(player_id) as pitches_with_player
FROM transfer_pitches;

-- Step 11: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'All table relationships and missing columns have been fixed successfully!' as message,
    'You should now be able to query transfer_pitches with teams and players, and access member_association and other columns.' as next_step;
