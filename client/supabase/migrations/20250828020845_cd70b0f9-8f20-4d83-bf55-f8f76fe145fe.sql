
-- Fix the messages table to properly support contract integration
ALTER TABLE messages ADD COLUMN IF NOT EXISTS contract_file_url text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS contract_file_name text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS contract_file_type text;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_contract_message boolean DEFAULT false;

-- Create generated_contracts table for contract workflow
CREATE TABLE IF NOT EXISTS generated_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES contract_templates(id),
  pitch_id uuid REFERENCES transfer_pitches(id),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  player_id uuid REFERENCES players(id),
  contract_content text NOT NULL,
  contract_data jsonb DEFAULT '{}',
  status text DEFAULT 'draft',
  file_url text,
  sent_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  signed_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for generated_contracts
ALTER TABLE generated_contracts ENABLE ROW LEVEL SECURITY;

-- Policies for generated_contracts
CREATE POLICY "Users can manage their contracts" ON generated_contracts
  FOR ALL USING (
    sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Create contract_negotiations table for tracking negotiation actions
CREATE TABLE IF NOT EXISTS contract_negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid REFERENCES generated_contracts(id) ON DELETE CASCADE,
  negotiator_id uuid NOT NULL,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for contract_negotiations
ALTER TABLE contract_negotiations ENABLE ROW LEVEL SECURITY;

-- Policies for contract_negotiations
CREATE POLICY "Users can view contract negotiations they're involved in" ON contract_negotiations
  FOR SELECT USING (
    contract_id IN (
      SELECT id FROM generated_contracts 
      WHERE sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
            receiver_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create contract negotiations" ON contract_negotiations
  FOR INSERT WITH CHECK (
    negotiator_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Fix notifications table to properly link with profiles
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create function to send contract notifications
CREATE OR REPLACE FUNCTION send_contract_notification(
  receiver_profile_id uuid,
  sender_name text,
  player_name text,
  contract_type text DEFAULT 'contract'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    receiver_profile_id,
    'New Contract Received',
    sender_name || ' has sent you a contract for ' || player_name,
    contract_type,
    jsonb_build_object('sender_name', sender_name, 'player_name', player_name)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$;

-- Create function to get profile from user_id
CREATE OR REPLACE FUNCTION get_profile_from_user_id(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_uuid uuid;
BEGIN
  SELECT id INTO profile_uuid FROM profiles WHERE user_id = user_uuid;
  RETURN profile_uuid;
END;
$$;

-- Create trigger for message notifications
CREATE OR REPLACE FUNCTION create_message_notification_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  receiver_profile_id uuid;
  sender_profile_data record;
  pitch_data record;
BEGIN
  -- Get receiver profile ID
  SELECT id INTO receiver_profile_id FROM profiles WHERE id = NEW.receiver_id;
  
  -- Get sender profile data
  SELECT full_name, user_type INTO sender_profile_data FROM profiles WHERE id = NEW.sender_id;
  
  -- Get pitch data if available
  IF NEW.pitch_id IS NOT NULL THEN
    SELECT p.full_name as player_name INTO pitch_data 
    FROM transfer_pitches tp
    JOIN players p ON tp.player_id = p.id
    WHERE tp.id = NEW.pitch_id;
  END IF;
  
  -- Create notification
  INSERT INTO notifications (user_id, title, message, type, metadata)
  VALUES (
    receiver_profile_id,
    CASE 
      WHEN NEW.is_contract_message THEN 'New Contract Message'
      ELSE 'New Message'
    END,
    CASE 
      WHEN pitch_data.player_name IS NOT NULL THEN 
        'You have a new message from ' || sender_profile_data.full_name || ' about ' || pitch_data.player_name
      ELSE 
        'You have a new message from ' || sender_profile_data.full_name
    END,
    CASE 
      WHEN NEW.is_contract_message THEN 'contract'
      ELSE 'message'
    END,
    jsonb_build_object(
      'sender_name', sender_profile_data.full_name,
      'player_name', pitch_data.player_name,
      'pitch_id', NEW.pitch_id,
      'message_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS message_notification_trigger ON messages;
CREATE TRIGGER message_notification_trigger
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION create_message_notification_trigger();

-- Enable realtime for notifications and messages
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE generated_contracts;
