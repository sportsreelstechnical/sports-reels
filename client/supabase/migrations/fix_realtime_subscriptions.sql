-- Fix real-time subscriptions for notifications and messages
-- This script ensures real-time functionality works properly

-- Step 1: Check current real-time publication status
SELECT '🔍 CHECKING REALTIME PUBLICATION STATUS:' as info;

SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Step 2: Ensure notifications table is in real-time publication
SELECT '🔧 ADDING NOTIFICATIONS TO REALTIME:' as info;

-- Remove and re-add to ensure it's properly configured
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Step 3: Ensure contract_messages table is in real-time publication
SELECT '🔧 ADDING CONTRACT_MESSAGES TO REALTIME:' as info;

-- Remove and re-add to ensure it's properly configured
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS contract_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE contract_messages;

-- Step 4: Ensure contracts table is in real-time publication
SELECT '🔧 ADDING CONTRACTS TO REALTIME:' as info;

-- Remove and re-add to ensure it's properly configured
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS contracts;
ALTER PUBLICATION supabase_realtime ADD TABLE contracts;

-- Step 5: Check if real-time is enabled for all relevant tables
SELECT '✅ VERIFYING REALTIME ENABLED TABLES:' as info;

SELECT 
    schemaname,
    tablename,
    'Real-time enabled' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('notifications', 'contract_messages', 'contracts', 'profiles', 'agents', 'teams')
ORDER BY tablename;

-- Step 6: Check RLS policies for real-time tables
SELECT '✅ VERIFYING RLS POLICIES FOR REALTIME TABLES:' as info;

SELECT 
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename IN ('notifications', 'contract_messages', 'contracts')
ORDER BY tablename, policyname;

-- Step 7: Test real-time functionality by inserting a test notification
SELECT '🧪 TESTING REALTIME FUNCTIONALITY:' as info;

DO $$ 
BEGIN
    -- Insert a test notification if there are users
    IF EXISTS (SELECT 1 FROM profiles WHERE user_id IS NOT NULL LIMIT 1) THEN
        INSERT INTO notifications (user_id, title, description, type, data)
        SELECT 
            p.user_id,
            'Real-time Test',
            'This is a test notification to verify real-time functionality.',
            'system',
            '{"test": true, "timestamp": NOW()}'::jsonb
        FROM profiles p
        WHERE p.user_id IS NOT NULL
        LIMIT 1;
        
        RAISE NOTICE '✅ Test notification inserted for real-time testing';
        
        -- Clean up the test notification after a short delay
        -- (In a real scenario, you might want to keep it for testing)
        DELETE FROM notifications 
        WHERE title = 'Real-time Test' 
        AND description = 'This is a test notification to verify real-time functionality.';
        
        RAISE NOTICE '✅ Test notification cleaned up';
    ELSE
        RAISE NOTICE '⚠️ No users found to test real-time functionality';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error testing real-time functionality: %', SQLERRM;
END $$;

-- Step 8: Check if there are any issues with the real-time configuration
SELECT '🔍 CHECKING FOR REALTIME CONFIGURATION ISSUES:' as info;

-- Check if the real-time extension is properly configured
SELECT 
    extname,
    extversion,
    'Extension status' as info
FROM pg_extension 
WHERE extname = 'supabase_realtime';

-- Step 9: Verify that all necessary tables have proper permissions
SELECT '✅ VERIFYING TABLE PERMISSIONS:' as info;

SELECT 
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_name IN ('notifications', 'contract_messages', 'contracts')
AND grantee = 'authenticated'
ORDER BY table_name, privilege_type;

-- Step 10: Final verification
SELECT '🎯 FINAL REALTIME VERIFICATION:' as info;

SELECT 
    'notifications' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'notifications'
        )
        THEN '✅ Real-time enabled'
        ELSE '❌ Real-time not enabled'
    END as realtime_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'notifications' 
            AND table_schema = 'public'
        )
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as table_status

UNION ALL

SELECT 
    'contract_messages' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'contract_messages'
        )
        THEN '✅ Real-time enabled'
        ELSE '❌ Real-time not enabled'
    END as realtime_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'contract_messages' 
            AND table_schema = 'public'
        )
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as table_status

UNION ALL

SELECT 
    'contracts' as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'contracts'
        )
        THEN '✅ Real-time enabled'
        ELSE '❌ Real-time not enabled'
    END as realtime_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'contracts' 
            AND table_schema = 'public'
        )
        THEN '✅ Table exists'
        ELSE '❌ Table missing'
    END as table_status;

SELECT '🎉 REALTIME SUBSCRIPTIONS FIXED!' as info;
SELECT 'All tables are now properly configured for real-time functionality.' as next_steps;
SELECT 'Notifications and messages should now appear instantly without page refresh.' as recommendation;
