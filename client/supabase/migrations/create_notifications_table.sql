-- Create notifications table with proper schema
-- This script sets up the notifications table for the notification system

-- Step 1: Check if notifications table exists
SELECT '🔍 CHECKING IF NOTIFICATIONS TABLE EXISTS:' as info;

SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'notifications' 
AND table_schema = 'public';

-- Step 2: Create notifications table if it doesn't exist
SELECT '🔧 CREATING NOTIFICATIONS TABLE:' as info;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'system',
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for better performance
SELECT '🔧 CREATING INDEXES:' as info;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Step 4: Enable Row Level Security (RLS)
SELECT '🔧 ENABLING ROW LEVEL SECURITY:' as info;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
SELECT '🔧 CREATING RLS POLICIES:' as info;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create new policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Enable real-time for notifications table
SELECT '🔧 ENABLING REALTIME:' as info;

-- Enable real-time for the notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Step 7: Create a function to automatically update updated_at
SELECT '🔧 CREATING UPDATE TRIGGER:' as info;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for notifications table
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Insert some test notifications (optional)
SELECT '🧪 INSERTING TEST NOTIFICATIONS:' as info;

-- Insert test notifications for existing users
DO $$ 
BEGIN
    -- Only insert if there are users in the profiles table
    IF EXISTS (SELECT 1 FROM profiles LIMIT 1) THEN
        INSERT INTO notifications (user_id, title, description, type, data)
        SELECT 
            p.user_id,
            'Welcome to Sports Reels!',
            'Your notification system is now set up and ready to use.',
            'system',
            '{"welcome": true}'::jsonb
        FROM profiles p
        WHERE p.user_id IS NOT NULL
        LIMIT 5;
        
        RAISE NOTICE '✅ Test notifications inserted successfully';
    ELSE
        RAISE NOTICE '⚠️ No users found to insert test notifications';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error inserting test notifications: %', SQLERRM;
END $$;

-- Step 9: Verify the table structure
SELECT '✅ VERIFYING TABLE STRUCTURE:' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 10: Check RLS policies
SELECT '✅ VERIFYING RLS POLICIES:' as info;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'notifications';

-- Step 11: Check real-time publication
SELECT '✅ VERIFYING REALTIME PUBLICATION:' as info;

SELECT 
    schemaname,
    tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'notifications';

-- Step 12: Test query
SELECT '🧪 TESTING NOTIFICATIONS QUERY:' as info;

-- Test the query that was failing
SELECT COUNT(*) as notification_count
FROM notifications
WHERE read = false
LIMIT 1;

SELECT '🎉 NOTIFICATIONS TABLE SETUP COMPLETE!' as info;
SELECT 'The notifications table is now ready for use with real-time functionality.' as next_steps;
SELECT 'You can now test the notification system without refreshing the page.' as recommendation;
