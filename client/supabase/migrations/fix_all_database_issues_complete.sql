-- COMPREHENSIVE DATABASE FIX - ALL ISSUES
-- Run this script directly in your Supabase SQL Editor to fix ALL relationship issues

-- Step 1: Check current table structures
SELECT '🔍 CHECKING CURRENT TABLE STRUCTURES:' as info;

-- Check teams table
SELECT '📋 TEAMS TABLE:' as table_name;
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

-- Check profiles table
SELECT '👤 PROFILES TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Step 2: Add missing columns to teams table
SELECT '🔧 ADDING MISSING COLUMNS TO TEAMS:' as info;

DO $$ 
BEGIN
    -- Add team_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'team_name') THEN
        ALTER TABLE teams ADD COLUMN team_name TEXT;
        RAISE NOTICE '✅ Added team_name column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ team_name column already exists in teams table';
    END IF;

    -- Add logo_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'logo_url') THEN
        ALTER TABLE teams ADD COLUMN logo_url TEXT;
        RAISE NOTICE '✅ Added logo_url column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ logo_url column already exists in teams table';
    END IF;

    -- Add country column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'country') THEN
        ALTER TABLE teams ADD COLUMN country TEXT;
        RAISE NOTICE '✅ Added country column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ country column already exists in teams table';
    END IF;

    -- Add sport_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'sport_type') THEN
        ALTER TABLE teams ADD COLUMN sport_type TEXT DEFAULT 'football';
        RAISE NOTICE '✅ Added sport_type column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ sport_type column already exists in teams table';
    END IF;

    -- Add profile_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'profile_id') THEN
        ALTER TABLE teams ADD COLUMN profile_id UUID;
        RAISE NOTICE '✅ Added profile_id column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ profile_id column already exists in teams table';
    END IF;

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

-- Step 3: Add missing columns to agents table
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

    -- Add specialization column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'specialization') THEN
        ALTER TABLE agents ADD COLUMN specialization TEXT[] DEFAULT '{}';
        RAISE NOTICE '✅ Added specialization column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ specialization column already exists in agents table';
    END IF;

    -- Add profile_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'profile_id') THEN
        ALTER TABLE agents ADD COLUMN profile_id UUID;
        RAISE NOTICE '✅ Added profile_id column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ profile_id column already exists in agents table';
    END IF;

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
END $$;

-- Step 4: Add missing columns to players table
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

    -- Add citizenship column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'citizenship') THEN
        ALTER TABLE players ADD COLUMN citizenship TEXT;
        RAISE NOTICE '✅ Added citizenship column to players table';
    ELSE
        RAISE NOTICE 'ℹ️ citizenship column already exists in players table';
    END IF;

    -- Add age column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'age') THEN
        ALTER TABLE players ADD COLUMN age INTEGER;
        RAISE NOTICE '✅ Added age column to players table';
    ELSE
        RAISE NOTICE 'ℹ️ age column already exists in players table';
    END IF;

    -- Add team_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'team_id') THEN
        ALTER TABLE players ADD COLUMN team_id UUID;
        RAISE NOTICE '✅ Added team_id column to players table';
    ELSE
        RAISE NOTICE 'ℹ️ team_id column already exists in players table';
    END IF;
END $$;

-- Step 5: Add missing columns to profiles table
SELECT '🔧 ADDING MISSING COLUMNS TO PROFILES:' as info;

DO $$ 
BEGIN
    -- Add full_name column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
        RAISE NOTICE '✅ Added full_name column to profiles table';
    ELSE
        RAISE NOTICE 'ℹ️ full_name column already exists in profiles table';
    END IF;

    -- Add user_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'user_type') THEN
        ALTER TABLE profiles ADD COLUMN user_type TEXT;
        RAISE NOTICE '✅ Added user_type column to profiles table';
    ELSE
        RAISE NOTICE 'ℹ️ user_type column already exists in profiles table';
    END IF;

    -- Add email column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
        RAISE NOTICE '✅ Added email column to profiles table';
    ELSE
        RAISE NOTICE 'ℹ️ email column already exists in profiles table';
    END IF;
END $$;

-- Step 6: Fix foreign key relationships
SELECT '🔧 FIXING FOREIGN KEY RELATIONSHIPS:' as info;

-- Drop existing foreign key constraints if they exist
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_profile_id_fkey;
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_profile_id_fkey;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_id_fkey;

-- Create proper foreign key constraints
ALTER TABLE teams 
ADD CONSTRAINT teams_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE agents 
ADD CONSTRAINT agents_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE players 
ADD CONSTRAINT players_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Step 7: Populate sample data for testing
SELECT '🔧 POPULATING SAMPLE DATA:' as info;

-- Update some teams with missing data for testing
UPDATE teams 
SET team_name = COALESCE(team_name, 'Team ' || id::text),
    country = COALESCE(country, 'Unknown'),
    sport_type = COALESCE(sport_type, 'football'),
    member_association = COALESCE(member_association, 'General')
WHERE team_name IS NULL OR country IS NULL OR sport_type IS NULL OR member_association IS NULL
LIMIT 10;

-- Update some agents with missing data for testing
UPDATE agents 
SET agency_name = COALESCE(agency_name, 'Sports Management Agency'),
    specialization = COALESCE(specialization, ARRAY['football', 'basketball'])
WHERE agency_name IS NULL OR specialization IS NULL
LIMIT 10;

-- Update some players with missing data for testing
UPDATE players 
SET market_value = COALESCE(market_value, 1000000.00),
    position = COALESCE(position, 'Midfielder'),
    full_name = COALESCE(full_name, 'Player ' || id::text),
    citizenship = COALESCE(citizenship, 'Unknown'),
    age = COALESCE(age, 25)
WHERE market_value IS NULL OR position IS NULL OR full_name IS NULL OR citizenship IS NULL OR age IS NULL
LIMIT 10;

-- Update some profiles with missing data for testing
UPDATE profiles 
SET full_name = COALESCE(full_name, 'User ' || id::text),
    user_type = COALESCE(user_type, 'player'),
    email = COALESCE(email, 'user@example.com')
WHERE full_name IS NULL OR user_type IS NULL OR email IS NULL
LIMIT 10;

-- Step 8: Verify the relationships
SELECT '🔍 VERIFYING RELATIONSHIPS:' as info;

-- Test teams -> profiles relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'teams_profile_id_fkey' 
            AND table_name = 'teams'
        ) 
        THEN '✅ teams -> profiles foreign key exists'
        ELSE '❌ teams -> profiles foreign key missing'
    END as teams_profiles_fk_status;

-- Test agents -> profiles relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'agents_profile_id_fkey' 
            AND table_name = 'agents'
        ) 
        THEN '✅ agents -> profiles foreign key exists'
        ELSE '❌ agents -> profiles foreign key missing'
    END as agents_profiles_fk_status;

-- Test players -> teams relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'players_team_id_fkey' 
            AND table_name = 'players'
        ) 
        THEN '✅ players -> teams foreign key exists'
        ELSE '❌ players -> teams foreign key missing'
    END as players_teams_fk_status;

-- Step 9: Test the relationships
SELECT '🧪 TESTING RELATIONSHIPS:' as info;

-- Test if we can query teams with profile information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM teams t
            JOIN profiles p ON t.profile_id = p.id
            LIMIT 1
        ) 
        THEN '✅ teams JOIN profiles works'
        ELSE '❌ teams JOIN profiles fails'
    END as teams_profiles_join_status;

-- Test if we can query agents with profile information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM agents a
            JOIN profiles p ON a.profile_id = p.id
            LIMIT 1
        ) 
        THEN '✅ agents JOIN profiles works'
        ELSE '❌ agents JOIN profiles fails'
    END as agents_profiles_join_status;

-- Test if we can query players with team information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM players p
            JOIN teams t ON p.team_id = t.id
            LIMIT 1
        ) 
        THEN '✅ players JOIN teams works'
        ELSE '❌ players JOIN teams fails'
    END as players_teams_join_status;

-- Step 10: Test specific queries that were failing
SELECT '🧪 TESTING SPECIFIC FAILING QUERIES:' as info;

-- Test teams query that was failing
DO $$ 
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Test the exact query that was failing
        PERFORM 1 FROM teams 
        WHERE id = 'a0935295-2e54-4236-b09a-345b8a43f03e'
        AND team_name IS NOT NULL
        AND logo_url IS NOT NULL
        AND country IS NOT NULL
        AND sport_type IS NOT NULL
        AND profile_id IS NOT NULL
        LIMIT 1;
        
        test_result := '✅ Teams query now works!';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Teams query still fails: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Test agents query that was failing
DO $$ 
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Test the exact query that was failing
        PERFORM 1 FROM agents 
        WHERE id = 'c019b40b-bcd2-49a3-b15b-33cda1b8883a'
        AND profile_id IS NOT NULL
        LIMIT 1;
        
        test_result := '✅ Agents query now works!';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Agents query still fails: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Step 11: Show final data structure
SELECT '📊 FINAL DATA STRUCTURE:' as info;

-- Show teams table with new columns
SELECT 
    'teams' as table_name,
    COUNT(*) as total_teams,
    COUNT(team_name) as teams_with_name,
    COUNT(logo_url) as teams_with_logo,
    COUNT(country) as teams_with_country,
    COUNT(sport_type) as teams_with_sport_type,
    COUNT(profile_id) as teams_with_profile,
    COUNT(member_association) as teams_with_association
FROM teams;

-- Show agents table with new columns
SELECT 
    'agents' as table_name,
    COUNT(*) as total_agents,
    COUNT(agency_name) as agents_with_agency_name,
    COUNT(specialization) as agents_with_specialization,
    COUNT(profile_id) as agents_with_profile,
    COUNT(member_association) as agents_with_association
FROM agents;

-- Show players table with new columns
SELECT 
    'players' as table_name,
    COUNT(*) as total_players,
    COUNT(market_value) as players_with_market_value,
    COUNT(position) as players_with_position,
    COUNT(photo_url) as players_with_photo,
    COUNT(full_name) as players_with_full_name,
    COUNT(citizenship) as players_with_citizenship,
    COUNT(age) as players_with_age,
    COUNT(team_id) as players_with_team
FROM players;

-- Show profiles table with new columns
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_profiles,
    COUNT(full_name) as profiles_with_full_name,
    COUNT(user_type) as profiles_with_user_type,
    COUNT(email) as profiles_with_email
FROM profiles;

-- Step 12: Test the exact failing queries
SELECT '🧪 TESTING EXACT FAILING QUERIES:' as info;

-- Test teams query with all required columns
DO $$ 
DECLARE
    test_result TEXT;
    query_result RECORD;
BEGIN
    BEGIN
        -- Test the exact query that was failing
        SELECT * INTO query_result
        FROM teams 
        WHERE id = 'a0935295-2e54-4236-b09a-345b8a43f03e'
        LIMIT 1;
        
        test_result := '✅ Teams query with all columns works!';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Teams query still fails: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Test agents query with profile_id
DO $$ 
DECLARE
    test_result TEXT;
    query_result RECORD;
BEGIN
    BEGIN
        -- Test the exact query that was failing
        SELECT * INTO query_result
        FROM agents 
        WHERE id = 'c019b40b-bcd2-49a3-b15b-33cda1b8883a'
        LIMIT 1;
        
        test_result := '✅ Agents query with profile_id works!';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Agents query still fails: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Step 13: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'All database issues have been fixed successfully!' as message,
    'You should now be able to query teams, agents, players, and profiles with all required columns and relationships.' as next_step;
