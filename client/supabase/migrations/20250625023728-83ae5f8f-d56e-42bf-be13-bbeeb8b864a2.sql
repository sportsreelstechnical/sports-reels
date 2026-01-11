
-- Add photo storage for players (3 photos: headshot, portrait, full_body)
ALTER TABLE players 
ADD COLUMN headshot_url text,
ADD COLUMN portrait_url text,
ADD COLUMN full_body_url text;

-- Update the existing photo_url to be headshot_url for existing players
UPDATE players SET headshot_url = photo_url WHERE photo_url IS NOT NULL;

-- Create storage bucket for player photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for contracts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Create messages table for player inquiries
CREATE TABLE IF NOT EXISTS player_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES profiles(id) NOT NULL,
  receiver_id uuid REFERENCES profiles(id) NOT NULL,
  player_id uuid REFERENCES players(id),
  pitch_id uuid REFERENCES transfer_pitches(id),
  request_id uuid REFERENCES agent_requests(id),
  subject text,
  content text NOT NULL,
  message_type text DEFAULT 'inquiry',
  is_flagged boolean DEFAULT false,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players(id) NOT NULL,
  agent_id uuid REFERENCES agents(id),
  team_id uuid REFERENCES teams(id),
  contract_type text NOT NULL, -- 'transfer', 'loan', 'pre_contract'
  status text DEFAULT 'draft', -- 'draft', 'sent', 'signed', 'completed'
  template_url text,
  signed_contract_url text,
  terms jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE player_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_messages
CREATE POLICY "Users can view their own messages" ON player_messages
  FOR SELECT USING (sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid()) 
                 OR receiver_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can send messages" ON player_messages
  FOR INSERT WITH CHECK (sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their received messages" ON player_messages
  FOR UPDATE USING (receiver_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS policies for contracts
CREATE POLICY "Users can view related contracts" ON contracts
  FOR SELECT USING (
    team_id IN (SELECT id FROM teams WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR agent_id IN (SELECT id FROM agents WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

CREATE POLICY "Teams and agents can create contracts" ON contracts
  FOR INSERT WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR agent_id IN (SELECT id FROM agents WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

CREATE POLICY "Users can update their contracts" ON contracts
  FOR UPDATE USING (
    team_id IN (SELECT id FROM teams WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    OR agent_id IN (SELECT id FROM agents WHERE profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
  );

-- Storage policies for player photos
CREATE POLICY "Anyone can view player photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'player-photos');

CREATE POLICY "Teams can upload player photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'player-photos' AND
    auth.uid() IN (SELECT user_id FROM profiles WHERE user_type = 'team')
  );

-- Storage policies for contracts (private)
CREATE POLICY "Users can view their contracts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Users can upload contracts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'contracts' AND
    auth.uid() IS NOT NULL
  );

-- Create function to flag messages with contact info
CREATE OR REPLACE FUNCTION flag_contact_info_messages()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for phone numbers (simple pattern)
  IF NEW.content ~* '\+?[0-9]{10,15}' OR 
     NEW.content ~* '[0-9]{3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}' THEN
    NEW.is_flagged = true;
  END IF;
  
  -- Check for email addresses
  IF NEW.content ~* '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' THEN
    NEW.is_flagged = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for flagging messages
CREATE TRIGGER flag_contact_messages
  BEFORE INSERT OR UPDATE ON player_messages
  FOR EACH ROW
  EXECUTE FUNCTION flag_contact_info_messages();
