-- Fix notifications table schema to match the code expectations
-- This migration ensures the notifications table has the correct column names and structure

-- Step 1: Check current table structure
SELECT '🔍 CHECKING CURRENT NOTIFICATIONS TABLE STRUCTURE:' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Add missing columns if they don't exist
SELECT '🔧 ADDING MISSING COLUMNS:' as info;

-- Add 'read' column if it doesn't exist (for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' 
                   AND column_name = 'read' 
                   AND table_schema = 'public') THEN
        ALTER TABLE notifications ADD COLUMN read BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added read column';
    ELSE
        RAISE NOTICE 'ℹ️ read column already exists';
    END IF;
END $$;

-- Add 'description' column if it doesn't exist (for backward compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' 
                   AND column_name = 'description' 
                   AND table_schema = 'public') THEN
        ALTER TABLE notifications ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description column';
    ELSE
        RAISE NOTICE 'ℹ️ description column already exists';
    END IF;
END $$;

-- Add 'data' column if it doesn't exist (for backward compatibility with metadata)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' 
                   AND column_name = 'data' 
                   AND table_schema = 'public') THEN
        ALTER TABLE notifications ADD COLUMN data JSONB DEFAULT '{}';
        RAISE NOTICE '✅ Added data column';
    ELSE
        RAISE NOTICE 'ℹ️ data column already exists';
    END IF;
END $$;

-- Step 3: Sync data between is_read and read columns
SELECT '🔧 SYNCING READ STATUS:' as info;

-- Update read column based on is_read column
UPDATE notifications 
SET read = is_read 
WHERE read IS NULL AND is_read IS NOT NULL;

-- Step 4: Create a trigger to keep both columns in sync
SELECT '🔧 CREATING SYNC TRIGGER:' as info;

-- Create or replace function to sync read status and data/metadata
CREATE OR REPLACE FUNCTION sync_notification_read_status()
RETURNS TRIGGER AS $$
BEGIN
    -- If is_read is updated, update read
    IF TG_OP = 'UPDATE' AND OLD.is_read IS DISTINCT FROM NEW.is_read THEN
        NEW.read = NEW.is_read;
    END IF;
    
    -- If read is updated, update is_read
    IF TG_OP = 'UPDATE' AND OLD.read IS DISTINCT FROM NEW.read THEN
        NEW.is_read = NEW.read;
    END IF;
    
    -- For inserts, ensure both are set
    IF TG_OP = 'INSERT' THEN
        IF NEW.read IS NULL AND NEW.is_read IS NOT NULL THEN
            NEW.read = NEW.is_read;
        ELSIF NEW.is_read IS NULL AND NEW.read IS NOT NULL THEN
            NEW.is_read = NEW.read;
        END IF;
    END IF;
    
    -- Sync data and metadata columns
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- If data is provided but metadata is null, copy data to metadata
        IF NEW.data IS NOT NULL AND NEW.metadata IS NULL THEN
            NEW.metadata = NEW.data;
        END IF;
        
        -- If metadata is provided but data is null, copy metadata to data
        IF NEW.metadata IS NOT NULL AND NEW.data IS NULL THEN
            NEW.data = NEW.metadata;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_notification_read_trigger ON notifications;

-- Create the sync trigger
CREATE TRIGGER sync_notification_read_trigger
    BEFORE INSERT OR UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION sync_notification_read_status();

-- Step 5: Ensure RLS is enabled and policies exist
SELECT '🔧 ENSURING RLS POLICIES:' as info;

-- Enable RLS if not already enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Ensure real-time is enabled
SELECT '🔧 ENABLING REALTIME:' as info;

-- Add table to realtime publication if not already added
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables 
                   WHERE pubname = 'supabase_realtime' 
                   AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
        RAISE NOTICE '✅ Added notifications to realtime publication';
    ELSE
        RAISE NOTICE 'ℹ️ notifications already in realtime publication';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️ Could not add to realtime publication: %', SQLERRM;
END $$;

-- Step 7: Create indexes for better performance
SELECT '🔧 CREATING INDEXES:' as info;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Step 8: Insert test notifications for current user
SELECT '🧪 INSERTING TEST NOTIFICATIONS:' as info;

-- Insert test notifications for the current user
DO $$ 
DECLARE
    current_user_id UUID;
BEGIN
    -- Get current user ID
    SELECT auth.uid() INTO current_user_id;
    
    IF current_user_id IS NOT NULL THEN
        -- Insert test notifications
        INSERT INTO notifications (user_id, title, message, description, type, is_read, read, metadata, data)
        VALUES 
            (current_user_id, 'Welcome to Sports Reels!', 'Your notification system is now working properly.', 'Welcome message', 'system', false, false, '{"welcome": true}'::jsonb, '{"welcome": true}'::jsonb),
            (current_user_id, 'Test Notification', 'This is a test notification to verify the system is working.', 'Test message', 'system', false, false, '{"test": true}'::jsonb, '{"test": true}'::jsonb),
            (current_user_id, 'System Update', 'The notification system has been updated and is now fully functional.', 'System update', 'system', true, true, '{"update": true}'::jsonb, '{"update": true}'::jsonb)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE '✅ Test notifications inserted for user %', current_user_id;
    ELSE
        RAISE NOTICE '⚠️ No authenticated user found to insert test notifications';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Error inserting test notifications: %', SQLERRM;
END $$;

-- Step 9: Verify the final table structure
SELECT '✅ VERIFYING FINAL TABLE STRUCTURE:' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 10: Test the notification queries
SELECT '🧪 TESTING NOTIFICATION QUERIES:' as info;

-- Test unread count query
SELECT COUNT(*) as unread_count
FROM notifications
WHERE user_id = auth.uid() AND (read = false OR is_read = false);

-- Test notifications query
SELECT id, title, message, description, type, read, is_read, created_at
FROM notifications
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

SELECT '🎉 NOTIFICATIONS SCHEMA FIX COMPLETE!' as info;
SELECT 'The notifications table is now properly configured and ready for use.' as next_steps;
