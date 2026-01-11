-- Test script to insert a notification and verify the system works
-- Run this in your Supabase SQL editor

-- Insert a test notification for the current user
INSERT INTO notifications (
    user_id, 
    title, 
    message, 
    type, 
    is_read, 
    metadata,
    created_at
) VALUES (
    auth.uid(),
    'Test Notification',
    'This is a test notification to verify the system is working properly.',
    'system',
    false,
    '{"test": true, "source": "manual_test"}'::jsonb,
    NOW()
);

-- Check if the notification was inserted
SELECT 
    id,
    title,
    message,
    type,
    is_read,
    created_at
FROM notifications 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- Check unread count
SELECT COUNT(*) as unread_count
FROM notifications 
WHERE user_id = auth.uid() AND is_read = false;
