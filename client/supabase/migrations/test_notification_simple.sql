-- Simple test to check notifications table and RLS
-- Run this in your Supabase SQL editor

-- Check if we can read notifications
SELECT COUNT(*) as total_notifications FROM notifications;

-- Check if we can read our own notifications
SELECT COUNT(*) as my_notifications FROM notifications WHERE user_id = auth.uid();

-- Check if we can update a notification (this should work if RLS is set up correctly)
UPDATE notifications 
SET is_read = true 
WHERE user_id = auth.uid() AND is_read = false
LIMIT 1;

-- Check the result
SELECT COUNT(*) as unread_notifications FROM notifications WHERE user_id = auth.uid() AND is_read = false;
