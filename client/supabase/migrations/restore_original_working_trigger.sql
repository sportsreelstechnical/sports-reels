-- Restore the original working trigger exactly as it was
-- This was working before we started "fixing" it

-- Drop the current broken triggers
DROP TRIGGER IF EXISTS trigger_agent_interest_notifications ON agent_interest;
DROP FUNCTION IF EXISTS handle_agent_interest_notifications();
DROP TRIGGER IF EXISTS trigger_contract_notifications ON contracts;
DROP FUNCTION IF EXISTS handle_contract_notifications();
DROP FUNCTION IF EXISTS get_user_id_from_profile(UUID);

-- Restore the original working functions exactly as they were

-- Function to get user_id from profile_id
CREATE OR REPLACE FUNCTION get_user_id_from_profile(profile_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_user_id UUID;
BEGIN
  SELECT user_id INTO result_user_id 
  FROM profiles 
  WHERE id = profile_id_param;
  
  RETURN result_user_id;
END;
$$;

-- Function to automatically create notifications for agent interest changes
CREATE OR REPLACE FUNCTION handle_agent_interest_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_user_id UUID;
  agent_user_id UUID;
  player_name TEXT;
  team_name TEXT;
  agent_name TEXT;
BEGIN
  -- Get related data
  SELECT 
    p.full_name,
    t.team_name,
    t.profile_id as team_profile_id
  INTO player_name, team_name, team_user_id
  FROM transfer_pitches tp
  JOIN players p ON tp.player_id = p.id
  JOIN teams t ON tp.team_id = t.id
  WHERE tp.id = COALESCE(NEW.pitch_id, OLD.pitch_id);

  -- Get agent info
  SELECT 
    pr.full_name,
    pr.user_id
  INTO agent_name, agent_user_id
  FROM agents a
  JOIN profiles pr ON a.profile_id = pr.id
  WHERE a.id = COALESCE(NEW.agent_id, OLD.agent_id);

  -- Convert team profile_id to user_id
  team_user_id := get_user_id_from_profile(team_user_id);

  IF TG_OP = 'INSERT' THEN
    -- Agent expressed interest - notify team
    INSERT INTO notifications (
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
      team_user_id,
      'New Agent Interest',
      CONCAT(COALESCE(agent_name, 'An agent'), ' has expressed interest in ', COALESCE(player_name, 'your player')),
      'agent_interest',
      '/team-explore?tab=communication',
      'View Communication',
      json_build_object(
        'pitch_id', NEW.pitch_id,
        'player_name', player_name,
        'team_name', team_name,
        'agent_name', agent_name,
        'action', 'expressed_interest'
      ),
      false,
      NOW()
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed - notify agent
    IF OLD.status != NEW.status THEN
      INSERT INTO notifications (
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
        agent_user_id,
        'Interest Status Update',
        CASE NEW.status
          WHEN 'negotiating' THEN CONCAT('🚀 ', COALESCE(team_name, 'Team'), ' is ready to start negotiations for ', COALESCE(player_name, 'the player'))
          WHEN 'requested' THEN CONCAT('📋 ', COALESCE(team_name, 'Team'), ' has requested more information about ', COALESCE(player_name, 'the player'))
          ELSE CONCAT('Status updated for ', COALESCE(player_name, 'the player'))
        END,
        'agent_interest',
        '/agent-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'player_name', player_name,
          'team_name', team_name,
          'new_status', NEW.status,
          'action', 'status_updated'
        ),
        false,
        NOW()
      );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Interest cancelled/rejected - notify team
    INSERT INTO notifications (
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
      team_user_id,
      'Interest Cancelled',
      CONCAT(COALESCE(agent_name, 'An agent'), ' has cancelled their interest in ', COALESCE(player_name, 'your player')),
      'agent_interest',
      '/team-explore?tab=communication',
      'View Communication',
      json_build_object(
        'pitch_id', OLD.pitch_id,
        'player_name', player_name,
        'team_name', team_name,
        'agent_name', agent_name,
        'action', 'cancelled_interest'
      ),
      false,
      NOW()
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger for agent interest notifications
CREATE TRIGGER trigger_agent_interest_notifications
  AFTER INSERT OR UPDATE OR DELETE ON agent_interest
  FOR EACH ROW
  EXECUTE FUNCTION handle_agent_interest_notifications();

-- Function to handle contract creation notifications
CREATE OR REPLACE FUNCTION handle_contract_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_user_id UUID;
  team_user_id UUID;
  player_name TEXT;
  team_name TEXT;
BEGIN
  -- Get related data
  SELECT 
    p.full_name,
    t.team_name,
    t.profile_id as team_profile_id
  INTO player_name, team_name, team_user_id
  FROM transfer_pitches tp
  JOIN players p ON tp.player_id = p.id
  JOIN teams t ON tp.team_id = t.id
  WHERE tp.id = NEW.pitch_id;

  -- Get agent user_id
  SELECT pr.user_id INTO agent_user_id
  FROM agents a
  JOIN profiles pr ON a.profile_id = pr.id
  WHERE a.id = NEW.agent_id;

  -- Convert team profile_id to user_id
  team_user_id := get_user_id_from_profile(team_user_id);

  IF TG_OP = 'INSERT' THEN
    -- Contract created - notify agent
    INSERT INTO notifications (
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
      agent_user_id,
      'Contract Created!',
      CONCAT('📄 ', COALESCE(team_name, 'Team'), ' has created a contract for ', COALESCE(player_name, 'the player'), '. You can now enter the negotiation room.'),
      'contract_update',
      '/agent-explore?tab=communication',
      'Enter Negotiation Room',
      json_build_object(
        'contract_id', NEW.id,
        'pitch_id', NEW.pitch_id,
        'player_name', player_name,
        'team_name', team_name,
        'action', 'contract_created'
      ),
      false,
      NOW()
    );

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Create trigger for contract notifications
CREATE TRIGGER trigger_contract_notifications
  AFTER INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION handle_contract_notifications();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_id_from_profile TO authenticated;
GRANT EXECUTE ON FUNCTION handle_agent_interest_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION handle_contract_notifications TO authenticated;

SELECT 'Original working trigger restored successfully!' as status;
