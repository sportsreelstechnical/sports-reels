-- Temporarily disable RLS on contract_messages for testing
-- This script disables RLS to allow contract message creation during testing

-- Step 1: Check current RLS status
SELECT '🔍 CHECKING CURRENT RLS STATUS:' as info;

SELECT 
    'RLS Status:' as info,
    CASE 
        WHEN relrowsecurity THEN '✅ RLS is enabled'
        ELSE '❌ RLS is disabled'
    END as status
FROM pg_class 
WHERE relname = 'contract_messages';

-- Step 2: Disable RLS temporarily
SELECT '🔧 DISABLING RLS TEMPORARILY:' as info;

ALTER TABLE contract_messages DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT '✅ VERIFYING RLS IS DISABLED:' as info;

SELECT 
    'RLS Status:' as info,
    CASE 
        WHEN relrowsecurity THEN '❌ RLS is still enabled'
        ELSE '✅ RLS is disabled'
    END as status
FROM pg_class 
WHERE relname = 'contract_messages';

-- Step 4: Test message insertion capability
SELECT '🧪 TESTING MESSAGE INSERTION CAPABILITY:' as info;

-- Check if we can select from contract_messages
SELECT 
    'Can select from contract_messages:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM contract_messages 
            LIMIT 1
        )
        THEN '✅ Can select from table'
        ELSE '⚠️ Cannot select from table or no data exists'
    END as result;

-- Step 5: Show table structure
SELECT '📋 TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contract_messages' 
ORDER BY column_name;

-- Step 6: Show sample data
SELECT '📋 SAMPLE DATA:' as info;

SELECT 
    'Total messages:' as info,
    COUNT(*) as count
FROM contract_messages;

-- Show sample messages
SELECT 
    'Sample messages:' as info,
    id,
    contract_id,
    sender_id,
    message_type,
    created_at
FROM contract_messages
LIMIT 3;

SELECT '🎉 RLS DISABLED FOR TESTING!' as info;
SELECT 'You can now test contract message creation without RLS restrictions.' as next_steps;
SELECT 'Remember to re-enable RLS with proper policies after testing.' as warning;
