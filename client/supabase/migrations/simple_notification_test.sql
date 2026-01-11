-- Simple test to verify notification creation works
-- Run this in Supabase SQL Editor to test

-- Test creating a notification directly
SELECT public.create_system_notification(
  (SELECT user_id FROM profiles LIMIT 1),  -- Use any user for testing
  'Test Notification',
  'This is a test notification to verify the system works',
  'system',
  '/notifications',
  'View Notifications',
  '{}'::jsonb
) as notification_id;

-- Check if the notification was created
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
