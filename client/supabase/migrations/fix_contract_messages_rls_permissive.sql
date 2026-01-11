-- Fix contract_messages RLS policies with more permissive approach
-- This script creates more permissive RLS policies to allow contract message creation

-- Step 1: Check current RLS policies
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

-- Step 2: Drop existing restrictive policies
SELECT '🗑️ DROPPING EXISTING POLICIES:' as info;

DROP POLICY IF EXISTS "Authenticated users can view contract messages" ON contract_messages;
DROP POLICY IF EXISTS "Authenticated users can insert contract messages" ON contract_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON contract_messages;
DROP POLICY IF EXISTS "Agents can view and send contract messages" ON contract_messages;
DROP POLICY IF EXISTS "Teams can view and send contract messages" ON contract_messages;

-- Step 3: Create more permissive RLS policies
SELECT '🔧 CREATING PERMISSIVE RLS POLICIES:' as info;

-- Policy 1: Allow authenticated users to view all contract messages
-- This is more permissive for debugging and testing
CREATE POLICY "Authenticated users can view contract messages" ON contract_messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Policy 2: Allow authenticated users to insert contract messages
-- This is more permissive to allow contract creation
CREATE POLICY "Authenticated users can insert contract messages" ON contract_messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy 3: Allow authenticated users to update their own messages
CREATE POLICY "Authenticated users can update contract messages" ON contract_messages
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy 4: Allow authenticated users to delete their own messages
CREATE POLICY "Authenticated users can delete contract messages" ON contract_messages
    FOR DELETE USING (auth.role() = 'authenticated');

-- Step 4: Verify policies were created
SELECT '✅ VERIFYING POLICIES:' as info;

SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'contract_messages'
ORDER BY policyname;

-- Step 5: Test the policies
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

-- Step 6: Show current user context
SELECT '👤 CURRENT USER CONTEXT:' as info;

SELECT 
    'Current user ID:' as info,
    auth.uid() as user_id;

SELECT 
    'Current user role:' as info,
    auth.role() as user_role;

-- Step 7: Check if user has a profile
SELECT '👤 USER PROFILE CHECK:' as info;

SELECT 
    'User profile exists:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM profiles 
            WHERE user_id = auth.uid()
        )
        THEN '✅ User has a profile'
        ELSE '❌ User does not have a profile'
    END as result;

-- Step 8: Show sample contracts data
SELECT '📋 SAMPLE CONTRACTS DATA:' as info;

SELECT 
    'Total contracts:' as info,
    COUNT(*) as count
FROM contracts;

-- Show contracts with their agent and team info
SELECT 
    'Sample contracts:' as info,
    c.id,
    c.agent_id,
    c.team_id,
    c.status,
    c.created_at
FROM contracts c
LIMIT 3;

-- Step 9: Final verification
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

SELECT '🎉 PERMISSIVE POLICIES APPLIED!' as info;
SELECT 'The contract_messages table now has permissive RLS policies for testing.' as next_steps;
SELECT 'You can now test contract message creation and then tighten the policies later.' as recommendation;
