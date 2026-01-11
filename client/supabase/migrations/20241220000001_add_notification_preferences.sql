-- Add notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  newsletter_subscription BOOLEAN DEFAULT false,
  in_app_notifications BOOLEAN DEFAULT true,
  transfer_updates BOOLEAN DEFAULT true,
  message_notifications BOOLEAN DEFAULT true,
  profile_changes BOOLEAN DEFAULT true,
  login_notifications BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences" ON public.notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Add function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user notification preferences
CREATE TRIGGER on_auth_user_created_notification_preferences
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_notification_preferences();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Add function to create transfer pitch notifications
CREATE OR REPLACE FUNCTION public.create_transfer_pitch_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify agents about new transfer pitch
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT 
    p.user_id,
    'New Transfer Pitch Available',
    'A new transfer pitch has been created for ' || (
      SELECT pl.full_name FROM public.players pl WHERE pl.id = NEW.player_id
    ) || ' by ' || (
      SELECT t.team_name FROM public.teams t WHERE t.id = NEW.team_id
    ),
    'transfer',
    jsonb_build_object(
      'pitch_id', NEW.id,
      'player_id', NEW.player_id,
      'team_id', NEW.team_id,
      'transfer_type', NEW.transfer_type,
      'asking_price', NEW.asking_price
    )
  FROM public.profiles p
  WHERE p.user_type = 'agent'
  AND p.id IN (
    SELECT profile_id FROM public.agents
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for transfer pitch notifications
CREATE TRIGGER transfer_pitch_notification_trigger
  AFTER INSERT ON public.transfer_pitches
  FOR EACH ROW
  EXECUTE FUNCTION public.create_transfer_pitch_notification();

-- Add function to create message notifications
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify receiver about new message
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    NEW.receiver_id,
    'New Message Received',
    'You have received a new message from ' || (
      SELECT full_name FROM public.profiles WHERE id = NEW.sender_id
    ),
    'message',
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'player_id', NEW.player_id,
      'pitch_id', NEW.pitch_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for message notifications
CREATE TRIGGER message_notification_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();
