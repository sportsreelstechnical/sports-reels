-- Fix notifications table schema to support enhanced notifications
-- Add missing columns for action_url and action_text

-- Add missing columns if they don't exist
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS action_text TEXT,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_type ON public.notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- Update RLS policies to be more permissive for system notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Allow users to delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE USING (user_id = auth.uid());

-- Ensure proper data types and constraints
ALTER TABLE public.notifications 
ALTER COLUMN metadata SET DEFAULT '{}';

-- Create function to automatically set read_at when is_read is set to true
CREATE OR REPLACE FUNCTION update_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at = NOW();
  ELSIF NEW.is_read = false THEN
    NEW.read_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for read_at updates
DROP TRIGGER IF EXISTS trigger_update_notification_read_at ON public.notifications;
CREATE TRIGGER trigger_update_notification_read_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_notification_read_at();
