-- Complete fix for 406 Not Acceptable errors
-- This script fixes both the missing agents.id column and restrictive RLS policies

-- Step 1: Fix agents table missing id column
SELECT '🔧 FIXING AGENTS TABLE STRUCTURE:' as info;

-- Add missing id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' 
        AND column_name = 'id'
    ) THEN
        -- Add the id column as primary key
        ALTER TABLE agents ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
        RAISE NOTICE '✅ Added id column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ id column already exists in agents table';
    END IF;
END $$;

-- Step 2: Fix RLS policies to be more permissive
SELECT '🔧 FIXING RLS POLICIES:' as info;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Agents can view their own data" ON agents;
DROP POLICY IF EXISTS "Teams can view their own data" ON teams;
DROP POLICY IF EXISTS "Agents can update their own data" ON agents;
DROP POLICY IF EXISTS "Teams can update their own data" ON teams;
DROP POLICY IF EXISTS "Agent owners can manage their agent profile" ON agents;
DROP POLICY IF EXISTS "Team owners can manage their team" ON teams;
DROP POLICY IF EXISTS "Everyone can view verified agents" ON agents;
DROP POLICY IF EXISTS "Everyone can view verified teams" ON teams;

-- Create more permissive policies for teams table
-- Allow authenticated users to view all teams (needed for contract creation, etc.)
CREATE POLICY "Authenticated users can view teams" ON teams
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow teams to update their own data
CREATE POLICY "Teams can update their own data" ON teams
    FOR UPDATE USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Allow teams to insert their own data
CREATE POLICY "Teams can insert their own data" ON teams
    FOR INSERT WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create more permissive policies for agents table
-- Allow authenticated users to view all agents (needed for contract creation, etc.)
CREATE POLICY "Authenticated users can view agents" ON agents
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow agents to update their own data
CREATE POLICY "Agents can update their own data" ON agents
    FOR UPDATE USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Allow agents to insert their own data
CREATE POLICY "Agents can insert their own data" ON agents
    FOR INSERT WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Step 3: Fix agent_interest policies as well
SELECT '🔧 FIXING AGENT_INTEREST POLICIES:' as info;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Agents can view their own interest" ON agent_interest;
DROP POLICY IF EXISTS "Teams can view interest in their pitches" ON agent_interest;
DROP POLICY IF EXISTS "Agents can insert their own interest" ON agent_interest;
DROP POLICY IF EXISTS "Teams can update interest status for their pitches" ON agent_interest;

-- Create more permissive policies for agent_interest
CREATE POLICY "Authenticated users can view agent interest" ON agent_interest
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can insert their own interest" ON agent_interest
    FOR INSERT WITH CHECK (
        agent_id IN (
            SELECT a.id FROM agents a
            JOIN profiles p ON a.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Teams can update interest status for their pitches" ON agent_interest
    FOR UPDATE USING (
        pitch_id IN (
            SELECT tp.id FROM transfer_pitches tp
            JOIN teams t ON tp.team_id = t.id
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Step 4: Verify the fixes
SELECT '✅ VERIFYING FIXES:' as info;

-- Check agents table structure
SELECT 
    'Agents table structure:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY column_name;

-- Check teams table structure
SELECT 
    'Teams table structure:' as info,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'teams' 
ORDER BY column_name;

-- Check RLS policies
SELECT 
    'RLS Policies:' as info,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('agents', 'teams', 'agent_interest')
ORDER BY tablename, policyname;

-- Step 5: Test queries
SELECT '🧪 TESTING QUERIES:' as info;

-- Test agents query
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM agents LIMIT 1
        )
        THEN '✅ Agents table is accessible'
        ELSE '⚠️ Agents table is empty (this is OK)'
    END as agents_test;

-- Test teams query
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM teams LIMIT 1
        )
        THEN '✅ Teams table is accessible'
        ELSE '⚠️ Teams table is empty (this is OK)'
    END as teams_test;

-- Step 6: Show sample data if any exists
SELECT '📋 SAMPLE DATA:' as info;

-- Show agents
SELECT 
    'Agents:' as table_name,
    id,
    profile_id,
    agency_name,
    created_at
FROM agents 
LIMIT 3;

-- Show teams
SELECT 
    'Teams:' as table_name,
    id,
    profile_id,
    team_name,
    country,
    created_at
FROM teams 
LIMIT 3;

SELECT '🎉 FIX COMPLETE!' as info;
SELECT 'The 406 errors should now be resolved. Contract creation should work properly.' as next_steps;
