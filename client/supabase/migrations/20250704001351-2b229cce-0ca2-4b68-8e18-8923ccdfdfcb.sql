
-- Add missing fields to agents table
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS year_founded integer,
ADD COLUMN IF NOT EXISTS member_association text;

-- Create agent_requests table if it doesn't exist (it should already exist based on the schema)
-- Just ensuring it has all needed fields
ALTER TABLE agent_requests 
ADD COLUMN IF NOT EXISTS tagged_players jsonb DEFAULT '[]'::jsonb;

-- Create a view for active agent requests with tagged players
CREATE OR REPLACE VIEW public.active_agent_requests_view AS
SELECT 
  ar.*,
  a.agency_name,
  a.logo_url as agent_logo_url,
  p.full_name as agent_name,
  p.country as agent_country
FROM agent_requests ar
JOIN agents a ON ar.agent_id = a.id
JOIN profiles p ON a.profile_id = p.id
WHERE ar.is_public = true 
  AND ar.expires_at > now()
ORDER BY ar.created_at DESC;

-- Update shortlist table to ensure it has all needed functionality
-- (It already exists with the right structure)

-- Create notification function for profile changes
CREATE OR REPLACE FUNCTION notify_profile_change()
RETURNS trigger AS $$
BEGIN
  -- Insert notification for profile change
  INSERT INTO notifications (user_id, title, message, type, metadata)
  VALUES (
    NEW.user_id,
    'Profile Updated',
    'Your agent profile has been updated successfully.',
    'profile',
    jsonb_build_object('changed_at', now(), 'table', TG_TABLE_NAME)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for agent profile changes
DROP TRIGGER IF EXISTS agent_profile_change_trigger ON agents;
CREATE TRIGGER agent_profile_change_trigger
  AFTER UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_change();

-- Create function to handle shortlist expiration
CREATE OR REPLACE FUNCTION check_shortlist_expiration()
RETURNS void AS $$
BEGIN
  -- Remove expired shortlist items
  DELETE FROM shortlist s
  WHERE EXISTS (
    SELECT 1 FROM transfer_pitches tp
    WHERE tp.id = s.pitch_id 
    AND tp.expires_at <= now()
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on agent_requests if not already enabled
ALTER TABLE agent_requests ENABLE ROW LEVEL SECURITY;

-- Add policy for public viewing of active requests
CREATE POLICY IF NOT EXISTS "Public can view active requests" ON agent_requests
  FOR SELECT USING (is_public = true AND expires_at > now());
