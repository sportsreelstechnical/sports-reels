-- Fix agent_interest table relationships
-- This script addresses the mismatch between agent_interest.agent_id and agents table

-- Step 1: Check current state
SELECT '🔍 CHECKING CURRENT STATE:' as info;

-- Check agent_interest table structure
SELECT 
    'agent_interest table structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'agent_interest' 
AND column_name IN ('agent_id', 'pitch_id')
ORDER BY column_name;

-- Check current foreign key constraints on agent_interest
SELECT 
    'Current foreign key constraints on agent_interest:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'agent_interest'
ORDER BY tc.constraint_name;

-- Step 2: Check if we need to fix the relationship
SELECT '🔧 ANALYZING RELATIONSHIP ISSUE:' as info;

-- Check if agent_interest.agent_id references profiles or agents
SELECT 
    'agent_interest.agent_id references:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'agent_interest' 
            AND kcu.column_name = 'agent_id'
            AND ccu.table_name = 'profiles'
        )
        THEN 'profiles table (needs fixing)'
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'agent_interest' 
            AND kcu.column_name = 'agent_id'
            AND ccu.table_name = 'agents'
        )
        THEN 'agents table (correct)'
        ELSE 'no foreign key constraint found'
    END as current_reference;

-- Step 3: Fix the relationship (Option 1: Change agent_interest to reference agents table)
SELECT '🔧 FIXING AGENT_INTEREST RELATIONSHIP:' as info;

-- Drop existing foreign key constraint
ALTER TABLE agent_interest DROP CONSTRAINT IF EXISTS agent_interest_agent_id_fkey;

-- Create new foreign key constraint to reference agents table
-- First, we need to ensure all agent_id values in agent_interest correspond to valid agents
-- This requires mapping profile_id to agent_id

-- Check for orphaned records
SELECT 
    'Orphaned agent_interest records:' as info,
    COUNT(*) as count
FROM agent_interest ai
LEFT JOIN profiles p ON ai.agent_id = p.id
LEFT JOIN agents a ON p.id = a.profile_id
WHERE ai.agent_id IS NOT NULL AND a.id IS NULL;

-- Update agent_interest.agent_id to reference agents.id instead of profiles.id
UPDATE agent_interest 
SET agent_id = a.id
FROM agents a
JOIN profiles p ON a.profile_id = p.id
WHERE agent_interest.agent_id = p.id;

-- Create new foreign key constraint
ALTER TABLE agent_interest 
ADD CONSTRAINT agent_interest_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Step 4: Verify the fix
SELECT '✅ VERIFYING THE FIX:' as info;

-- Check the new foreign key constraint
SELECT 
    'New foreign key constraints on agent_interest:' as info;
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'agent_interest'
ORDER BY tc.constraint_name;

-- Step 5: Test the relationship
SELECT '🧪 TESTING THE RELATIONSHIP:' as info;

-- Test if we can join agent_interest with agents
SELECT 
    'Testing agent_interest -> agents join:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM agent_interest ai
            JOIN agents a ON ai.agent_id = a.id
            LIMIT 1
        )
        THEN '✅ Join works - relationship is established'
        ELSE '⚠️ No valid relationships found (this is OK if table is empty)'
    END as result;

-- Step 6: Show sample data
SELECT '📋 SAMPLE DATA:' as info;

-- Show agent_interest with agent details
SELECT 'Agent interest with agent details:' as info;
SELECT 
    ai.id,
    ai.agent_id,
    a.agency_name,
    p.full_name as agent_name,
    ai.pitch_id,
    ai.status,
    ai.created_at
FROM agent_interest ai
LEFT JOIN agents a ON ai.agent_id = a.id
LEFT JOIN profiles p ON a.profile_id = p.id
LIMIT 5;

-- Step 7: Update RLS policies if needed
SELECT '🔒 UPDATING RLS POLICIES:' as info;

-- Drop old policies that reference profiles
DROP POLICY IF EXISTS "Agents can view their own interest" ON agent_interest;
DROP POLICY IF EXISTS "Agents can insert their own interest" ON agent_interest;

-- Create new policies that work with the agents table
CREATE POLICY "Agents can view their own interest" ON agent_interest
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents a
            JOIN profiles p ON a.profile_id = p.id
            WHERE a.id = agent_interest.agent_id
            AND p.user_id = auth.uid()
        )
    );

CREATE POLICY "Agents can insert their own interest" ON agent_interest
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents a
            JOIN profiles p ON a.profile_id = p.id
            WHERE a.id = agent_interest.agent_id
            AND p.user_id = auth.uid()
        )
    );

-- Step 8: Final verification
SELECT '🎯 FINAL VERIFICATION:' as info;

SELECT 
    'agent_interest' as table_name,
    COUNT(*) as total_records,
    COUNT(agent_id) as records_with_agent_id,
    COUNT(pitch_id) as records_with_pitch_id
FROM agent_interest;

-- Check if the relationship works
SELECT 
    'agent_interest -> agents relationship:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM agent_interest ai
            JOIN agents a ON ai.agent_id = a.id
            JOIN profiles p ON a.profile_id = p.id
            LIMIT 1
        )
        THEN '✅ Full relationship chain works'
        ELSE '⚠️ Relationship chain broken'
    END as result;
