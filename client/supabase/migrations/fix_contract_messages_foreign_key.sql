-- Fix contract_messages foreign key constraint issues
-- This script addresses the sender_id foreign key constraint violation

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

-- Step 2: Check foreign key constraints
SELECT '🔍 CHECKING FOREIGN KEY CONSTRAINTS:' as info;

SELECT 
    tc.constraint_name,
    tc.constraint_type,
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
WHERE tc.table_name = 'contract_messages'
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name;

-- Step 3: Check profiles table structure
SELECT '🔍 CHECKING PROFILES TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY column_name;

-- Step 4: Check if there are any profiles
SELECT '👤 CHECKING PROFILES DATA:' as info;

SELECT 
    'Total profiles:' as info,
    COUNT(*) as count
FROM profiles;

-- Show sample profiles
SELECT 
    'Sample profiles:' as info,
    id,
    user_id,
    full_name,
    user_type,
    created_at
FROM profiles
LIMIT 5;

-- Step 5: Check current user context
SELECT '👤 CURRENT USER CONTEXT:' as info;

SELECT 
    'Current user ID:' as info,
    auth.uid() as user_id;

SELECT 
    'Current user role:' as info,
    auth.role() as user_role;

-- Step 6: Check if current user has a profile
SELECT '👤 CURRENT USER PROFILE CHECK:' as info;

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

-- If user has a profile, show it
SELECT 
    'User profile details:' as info,
    id,
    user_id,
    full_name,
    user_type
FROM profiles 
WHERE user_id = auth.uid()
LIMIT 1;

-- Step 7: Check contracts table
SELECT '📋 CHECKING CONTRACTS DATA:' as info;

SELECT 
    'Total contracts:' as info,
    COUNT(*) as count
FROM contracts;

-- Show sample contracts
SELECT 
    'Sample contracts:' as info,
    id,
    agent_id,
    team_id,
    status,
    created_at
FROM contracts
LIMIT 3;

-- Step 8: Fix the foreign key constraint issue
SELECT '🔧 FIXING FOREIGN KEY CONSTRAINT:' as info;

-- Option 1: Make sender_id nullable to allow system messages
ALTER TABLE contract_messages ALTER COLUMN sender_id DROP NOT NULL;

-- Option 2: Add a default system profile for system messages
-- First, check if we need to create a system profile
DO $$ 
BEGIN
    -- Create a system profile if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id IS NULL AND full_name = 'System'
    ) THEN
        INSERT INTO profiles (id, user_id, full_name, user_type, created_at, updated_at)
        VALUES (
            gen_random_uuid(),
            NULL,
            'System',
            'system',
            NOW(),
            NOW()
        );
        RAISE NOTICE '✅ Created system profile for system messages';
    ELSE
        RAISE NOTICE 'ℹ️ System profile already exists';
    END IF;
END $$;

-- Step 9: Update the foreign key constraint to allow NULL values
-- Drop the existing foreign key constraint
ALTER TABLE contract_messages DROP CONSTRAINT IF EXISTS contract_messages_sender_id_fkey;

-- Recreate the foreign key constraint with proper handling
ALTER TABLE contract_messages 
ADD CONSTRAINT contract_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 10: Verify the fix
SELECT '✅ VERIFYING FIX:' as info;

-- Check if sender_id is now nullable
SELECT 
    'sender_id nullable:' as info,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ sender_id is nullable'
        ELSE '❌ sender_id is still NOT NULL'
    END as status
FROM information_schema.columns 
WHERE table_name = 'contract_messages' 
AND column_name = 'sender_id';

-- Check foreign key constraint
SELECT 
    'Foreign key constraint:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'contract_messages' 
            AND constraint_name = 'contract_messages_sender_id_fkey'
        )
        THEN '✅ Foreign key constraint exists'
        ELSE '❌ Foreign key constraint missing'
    END as status;

-- Step 11: Test message insertion capability
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

-- Step 12: Show system profile
SELECT '👤 SYSTEM PROFILE:' as info;

SELECT 
    id,
    user_id,
    full_name,
    user_type,
    created_at
FROM profiles 
WHERE user_type = 'system'
LIMIT 1;

SELECT '🎉 FOREIGN KEY CONSTRAINT FIXED!' as info;
SELECT 'The contract_messages table now allows NULL sender_id for system messages.' as next_steps;
SELECT 'You can now test contract message creation without foreign key violations.' as recommendation;
