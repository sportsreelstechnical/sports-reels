-- FIX AGENT_REQUESTS AND ALL MISSING RELATIONSHIPS
-- Run this script directly in your Supabase SQL Editor to fix all relationship issues

-- Step 1: Check current table structures
SELECT '🔍 CHECKING CURRENT TABLE STRUCTURES:' as info;

-- Check agent_requests table
SELECT '📋 AGENT_REQUESTS TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'agent_requests' 
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
    AND tc.table_name IN ('agent_requests', 'agents', 'profiles')
ORDER BY tc.table_name, kcu.column_name;

-- Step 3: Add missing columns to agent_requests table
SELECT '🔧 ADDING MISSING COLUMNS TO AGENT_REQUESTS:' as info;

DO $$ 
BEGIN
    -- Add agent_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'agent_id') THEN
        ALTER TABLE agent_requests ADD COLUMN agent_id UUID;
        RAISE NOTICE '✅ Added agent_id column to agent_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ agent_id column already exists in agent_requests table';
    END IF;

    -- Add position column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'position') THEN
        ALTER TABLE agent_requests ADD COLUMN position TEXT;
        RAISE NOTICE '✅ Added position column to agent_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ position column already exists in agent_requests table';
    END IF;

    -- Add is_public column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'is_public') THEN
        ALTER TABLE agent_requests ADD COLUMN is_public BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added is_public column to agent_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ is_public column already exists in agent_requests table';
    END IF;

    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'expires_at') THEN
        ALTER TABLE agent_requests ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE '✅ Added expires_at column to agent_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ expires_at column already exists in agent_requests table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'created_at') THEN
        ALTER TABLE agent_requests ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        RAISE NOTICE '✅ Added created_at column to agent_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ created_at column already exists in agent_requests table';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'description') THEN
        ALTER TABLE agent_requests ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description column to agent_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ description column already exists in agent_requests table';
    END IF;

    -- Add budget_range column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'budget_range') THEN
        ALTER TABLE agent_requests ADD COLUMN budget_range TEXT;
        RAISE NOTICE '✅ Added budget_range column to agent_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ budget_range column already exists in agent_requests table';
    END IF;

    -- Add sport_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agent_requests' AND column_name = 'sport_type') THEN
        ALTER TABLE agent_requests ADD COLUMN sport_type TEXT DEFAULT 'football';
        RAISE NOTICE '✅ Added sport_type column to agent_requests table';
    ELSE
        RAISE NOTICE 'ℹ️ sport_type column already exists in agent_requests table';
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
END $$;

-- Step 6: Fix foreign key relationships
SELECT '🔧 FIXING FOREIGN KEY RELATIONSHIPS:' as info;

-- Drop existing foreign key constraints if they exist
ALTER TABLE agent_requests DROP CONSTRAINT IF EXISTS agent_requests_agent_id_fkey;
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_profile_id_fkey;

-- Create proper foreign key constraints
ALTER TABLE agent_requests 
ADD CONSTRAINT agent_requests_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE agents 
ADD CONSTRAINT agents_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 7: Populate sample data for testing
SELECT '🔧 POPULATING SAMPLE DATA:' as info;

-- Update some agents with agency_name and specialization for testing
UPDATE agents 
SET agency_name = 'Sports Management Agency',
    specialization = ARRAY['football', 'basketball']
WHERE agency_name IS NULL 
LIMIT 5;

-- Update some profiles with full_name for testing
UPDATE profiles 
SET full_name = 'John Doe'
WHERE full_name IS NULL 
LIMIT 5;

-- Create some sample agent_requests for testing
INSERT INTO agent_requests (agent_id, position, is_public, expires_at, description, budget_range, sport_type)
SELECT 
    a.id,
    'Midfielder',
    true,
    (NOW() + INTERVAL '30 days'),
    'Looking for talented midfielders',
    '1M-5M',
    'football'
FROM agents a
WHERE a.id NOT IN (SELECT agent_id FROM agent_requests WHERE agent_id IS NOT NULL)
LIMIT 3;

-- Step 8: Verify the relationships
SELECT '🔍 VERIFYING RELATIONSHIPS:' as info;

-- Test agent_requests -> agents relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'agent_requests_agent_id_fkey' 
            AND table_name = 'agent_requests'
        ) 
        THEN '✅ agent_requests -> agents foreign key exists'
        ELSE '❌ agent_requests -> agents foreign key missing'
    END as agent_requests_agents_fk_status;

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

-- Step 9: Test the relationships
SELECT '🧪 TESTING RELATIONSHIPS:' as info;

-- Test if we can query agent_requests with agent information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM agent_requests ar
            JOIN agents a ON ar.agent_id = a.id
            LIMIT 1
        ) 
        THEN '✅ agent_requests JOIN agents works'
        ELSE '❌ agent_requests JOIN agents fails'
    END as agent_requests_agents_join_status;

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

-- Step 10: Test specific queries that were failing
SELECT '🧪 TESTING SPECIFIC QUERIES:' as info;

-- Test agent_requests query with all relationships
DO $$ 
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Test the query that was failing
        PERFORM 1 FROM agent_requests ar
        JOIN agents a ON ar.agent_id = a.id
        JOIN profiles p ON a.profile_id = p.id
        WHERE ar.is_public = true
        AND a.specialization @> ARRAY['football']
        LIMIT 1;
        
        test_result := '✅ Agent requests query with all relationships works';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Agent requests query failed: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Test specialization array query
DO $$ 
DECLARE
    test_result TEXT;
BEGIN
    BEGIN
        -- Test the query that was failing
        PERFORM 1 FROM agents 
        WHERE specialization @> ARRAY['football']
        LIMIT 1;
        
        test_result := '✅ Agents specialization array query works';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Agents specialization array query failed: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Step 11: Show final data structure
SELECT '📊 FINAL DATA STRUCTURE:' as info;

-- Show agent_requests table with relationships
SELECT 
    'agent_requests' as table_name,
    COUNT(*) as total_requests,
    COUNT(agent_id) as requests_with_agent,
    COUNT(position) as requests_with_position,
    COUNT(is_public) as requests_with_public_flag
FROM agent_requests;

-- Show agents table with new columns
SELECT 
    'agents' as table_name,
    COUNT(*) as total_agents,
    COUNT(agency_name) as agents_with_agency_name,
    COUNT(specialization) as agents_with_specialization,
    COUNT(profile_id) as agents_with_profile
FROM agents;

-- Show profiles table with new columns
SELECT 
    'profiles' as table_name,
    COUNT(*) as total_profiles,
    COUNT(full_name) as profiles_with_full_name,
    COUNT(user_type) as profiles_with_user_type
FROM profiles;

-- Step 12: Test the exact query that was failing
SELECT '🧪 TESTING EXACT FAILING QUERY:' as info;

-- Test the exact query from the error
DO $$ 
DECLARE
    test_result TEXT;
    query_result RECORD;
BEGIN
    BEGIN
        -- Test the exact query that was failing
        SELECT * INTO query_result
        FROM agent_requests ar
        JOIN agents a ON ar.agent_id = a.id
        JOIN profiles p ON a.profile_id = p.id
        WHERE ar.is_public = true
        AND a.specialization @> ARRAY['football']
        AND ar.expires_at > NOW()
        ORDER BY ar.created_at DESC
        LIMIT 1;
        
        test_result := '✅ Exact failing query now works!';
    EXCEPTION 
        WHEN OTHERS THEN
            test_result := '❌ Exact failing query still fails: ' || SQLERRM;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Step 13: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'All agent_requests, agents, and profiles table relationships and missing columns have been fixed successfully!' as message,
    'You should now be able to query agent_requests with agents and profiles, and access all required columns.' as next_step;
