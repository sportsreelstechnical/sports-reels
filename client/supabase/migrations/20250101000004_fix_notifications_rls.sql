-- Fix notifications table RLS policies
-- This ensures the notifications table has proper RLS policies

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON notifications;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Test the policies
SELECT 'Testing RLS policies...' as info;

-- This should work if RLS is set up correctly
SELECT COUNT(*) as my_notifications 
FROM notifications 
WHERE user_id = auth.uid();

-- Test update (this should work)
UPDATE notifications 
SET is_read = true 
WHERE user_id = auth.uid() AND is_read = false
LIMIT 1;

SELECT 'RLS policies updated successfully!' as result;
