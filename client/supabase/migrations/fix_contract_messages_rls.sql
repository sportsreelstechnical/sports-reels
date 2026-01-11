-- Fix contract_messages RLS policies
-- This script fixes the Row Level Security policies for contract_messages table

-- Step 1: Check current contract_messages table structure
SELECT '🔍 CHECKING CONTRACT_MESSAGES TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contract_messages' 
ORDER BY column_name;

-- Step 2: Check current RLS policies
SELECT '🔍 CHECKING CURRENT RLS POLICIES:' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'contract_messages'
ORDER BY policyname;

-- Step 3: Drop existing problematic policies
SELECT '🗑️ DROPPING EXISTING POLICIES:' as info;

DROP POLICY IF EXISTS "Agents can view and send contract messages" ON contract_messages;
DROP POLICY IF EXISTS "Teams can view and send contract messages" ON contract_messages;
DROP POLICY IF EXISTS "Users can view contract messages" ON contract_messages;
DROP POLICY IF EXISTS "Users can insert contract messages" ON contract_messages;

-- Step 4: Create corrected RLS policies
SELECT '🔧 CREATING CORRECTED RLS POLICIES:' as info;

-- Policy 1: Allow authenticated users to view contract messages for contracts they're involved in
CREATE POLICY "Authenticated users can view contract messages" ON contract_messages
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            -- User is the sender
            sender_id IN (
                SELECT p.id FROM profiles p 
                WHERE p.user_id = auth.uid()
            ) OR
            -- User is involved in the contract (as agent or team)
            contract_id IN (
                SELECT c.id FROM contracts c
                WHERE 
                    -- User is the agent
                    c.agent_id IN (
                        SELECT a.id FROM agents a
                        JOIN profiles p ON a.profile_id = p.id
                        WHERE p.user_id = auth.uid()
                    ) OR
                    -- User is the team
                    c.team_id IN (
                        SELECT t.id FROM teams t
                        JOIN profiles p ON t.profile_id = p.id
                        WHERE p.user_id = auth.uid()
                    )
            )
        )
    );

-- Policy 2: Allow authenticated users to insert contract messages
CREATE POLICY "Authenticated users can insert contract messages" ON contract_messages
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND (
            -- User is the sender
            sender_id IN (
                SELECT p.id FROM profiles p 
                WHERE p.user_id = auth.uid()
            ) AND (
                -- User is involved in the contract (as agent or team)
                contract_id IN (
                    SELECT c.id FROM contracts c
                    WHERE 
                        -- User is the agent
                        c.agent_id IN (
                            SELECT a.id FROM agents a
                            JOIN profiles p ON a.profile_id = p.id
                            WHERE p.user_id = auth.uid()
                        ) OR
                        -- User is the team
                        c.team_id IN (
                            SELECT t.id FROM teams t
                            JOIN profiles p ON t.profile_id = p.id
                            WHERE p.user_id = auth.uid()
                        )
                ) OR
                -- Allow system messages during contract creation
                message_type = 'system'
            )
        )
    );

-- Policy 3: Allow authenticated users to update their own messages
CREATE POLICY "Users can update their own messages" ON contract_messages
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND
        sender_id IN (
            SELECT p.id FROM profiles p 
            WHERE p.user_id = auth.uid()
        )
    );

-- Step 5: Verify policies were created
SELECT '✅ VERIFYING POLICIES:' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'contract_messages'
ORDER BY policyname;

-- Step 6: Test the policies with a sample query
SELECT '🧪 TESTING POLICIES:' as info;

-- Check if we can select from contract_messages (should work if user is authenticated)
SELECT 
    'Testing SELECT policy:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM contract_messages 
            LIMIT 1
        )
        THEN '✅ SELECT policy allows access'
        ELSE '⚠️ SELECT policy may be too restrictive or no data exists'
    END as result;

-- Step 7: Show sample data structure
SELECT '📋 SAMPLE DATA:' as info;

-- Show contract_messages structure
SELECT 
    'contract_messages' as table_name,
    COUNT(*) as total_records
FROM contract_messages;

-- Show contracts that might have messages
SELECT 
    'contracts' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN id IN (SELECT DISTINCT contract_id FROM contract_messages) THEN 1 END) as contracts_with_messages
FROM contracts;

-- Step 8: Final verification
SELECT '🎯 FINAL VERIFICATION:' as info;

-- Check RLS is enabled
SELECT 
    'RLS Status:' as info,
    CASE 
        WHEN relrowsecurity THEN '✅ RLS is enabled'
        ELSE '❌ RLS is disabled'
    END as status
FROM pg_class 
WHERE relname = 'contract_messages';

-- Check policy count
SELECT 
    'Policy Count:' as info,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'contract_messages';

SELECT '🎉 FIX COMPLETE!' as info;
SELECT 'The contract_messages RLS policies should now work properly.' as next_steps;
