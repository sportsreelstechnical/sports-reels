-- Create a database function to handle system notifications
-- This function runs with elevated privileges and can bypass RLS

CREATE OR REPLACE FUNCTION public.create_system_notification(
  target_user_id UUID,
  notification_title TEXT,
  notification_message TEXT,
  notification_type TEXT DEFAULT 'system',
  notification_action_url TEXT DEFAULT NULL,
  notification_action_text TEXT DEFAULT NULL,
  notification_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert the notification with elevated privileges
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    action_url,
    action_text,
    metadata,
    is_read,
    created_at
  ) VALUES (
    target_user_id,
    notification_title,
    notification_message,
    notification_type,
    notification_action_url,
    notification_action_text,
    notification_metadata,
    false,
    NOW()
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_system_notification TO authenticated;

-- Also create a simpler function for basic notifications
CREATE OR REPLACE FUNCTION public.create_notification(
  target_user_id UUID,
  title TEXT,
  message TEXT,
  type TEXT DEFAULT 'system'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    is_read,
    created_at
  ) VALUES (
    target_user_id,
    title,
    message,
    type,
    false,
    NOW()
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;
