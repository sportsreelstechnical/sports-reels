
-- Add missing columns to messages table for better message handling
ALTER TABLE messages ADD COLUMN IF NOT EXISTS contract_file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'general';

-- Create message_violations table for tracking flagged content
CREATE TABLE IF NOT EXISTS message_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL,
  violation_content JSONB,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add contact warning tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contact_warnings INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_contact_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT TRUE,
  in_app_notifications BOOLEAN DEFAULT TRUE,
  transfer_updates BOOLEAN DEFAULT TRUE,
  message_notifications BOOLEAN DEFAULT TRUE,
  profile_changes BOOLEAN DEFAULT TRUE,
  newsletter_subscription BOOLEAN DEFAULT FALSE,
  login_notifications BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE message_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_violations
CREATE POLICY "Users can view their own violations" ON message_violations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert violations" ON message_violations
  FOR INSERT WITH CHECK (true);

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- RLS policies for notification_preferences  
CREATE POLICY "Users can manage their own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_violations_user_id ON message_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Update messages table RLS to allow contract messages
DROP POLICY IF EXISTS "Users can send messages to pitch owners" ON messages;
CREATE POLICY "Users can send messages to pitch owners" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND (
      -- Can send to team owners of active pitches
      receiver_id IN (
        SELECT t.profile_id 
        FROM transfer_pitches tp 
        JOIN teams t ON tp.team_id = t.id 
        WHERE tp.status = 'active' AND tp.expires_at > NOW()
      )
      OR 
      -- Can send replies to existing conversations
      EXISTS (
        SELECT 1 FROM messages m 
        WHERE (m.sender_id = auth.uid() AND m.receiver_id = NEW.receiver_id)
           OR (m.receiver_id = auth.uid() AND m.sender_id = NEW.receiver_id)
      )
    )
  );

-- Add trigger for auto-creating notification preferences
CREATE OR REPLACE FUNCTION create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_profile_created ON profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_notification_preferences();

-- Add realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
