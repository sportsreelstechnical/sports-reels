-- Final working trigger: Original logic + support for withdrawn/rejected status
-- This combines your working trigger with the new status functionality

-- Drop current triggers
DROP TRIGGER IF EXISTS trigger_agent_interest_notifications ON agent_interest;
DROP FUNCTION IF EXISTS handle_agent_interest_notifications();

-- Restore working function with added support for withdrawn/rejected
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
  -- Get related data (original working logic)
  SELECT 
    p.full_name,
    t.team_name,
    t.profile_id as team_profile_id
  INTO player_name, team_name, team_user_id
  FROM transfer_pitches tp
  JOIN players p ON tp.player_id = p.id
  JOIN teams t ON tp.team_id = t.id
  WHERE tp.id = COALESCE(NEW.pitch_id, OLD.pitch_id);

  -- Get agent info (original working logic)
  SELECT 
    pr.full_name,
    pr.user_id
  INTO agent_name, agent_user_id
  FROM agents a
  JOIN profiles pr ON a.profile_id = pr.id
  WHERE a.id = COALESCE(NEW.agent_id, OLD.agent_id);

  -- Convert team profile_id to user_id (original working logic)
  team_user_id := get_user_id_from_profile(team_user_id);

  IF TG_OP = 'INSERT' THEN
    -- Agent expressed interest - notify team (ORIGINAL WORKING LOGIC)
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
    -- Status changed - handle different scenarios
    IF OLD.status != NEW.status THEN
      
      -- NEW: Handle withdrawn status (notify team)
      IF NEW.status = 'withdrawn' THEN
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
          team_user_id,  -- Notify TEAM when agent withdraws
          'Interest Withdrawn',
          CONCAT(COALESCE(agent_name, 'An agent'), ' has withdrawn their interest in ', COALESCE(player_name, 'your player')),
          'agent_interest',
          '/team-explore?tab=communication',
          'View Communication',
          json_build_object(
            'pitch_id', NEW.pitch_id,
            'player_name', player_name,
            'team_name', team_name,
            'agent_name', agent_name,
            'action', 'withdrawn_interest'
          ),
          false,
          NOW()
        );
      
      -- NEW: Handle rejected status (notify agent)
      ELSIF NEW.status = 'rejected' THEN
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
          agent_user_id,  -- Notify AGENT when team rejects
          'Interest Rejected',
          CONCAT('Your interest in ', COALESCE(player_name, 'the player'), ' has been rejected by the team'),
          'agent_interest',
          '/agent-explore?tab=communication',
          'View Communication',
          json_build_object(
            'pitch_id', NEW.pitch_id,
            'player_name', player_name,
            'team_name', team_name,
            'action', 'rejected_interest'
          ),
          false,
          NOW()
        );
      
      -- ORIGINAL: Other status changes - notify agent
      ELSE
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
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Interest cancelled/rejected - notify team (ORIGINAL WORKING LOGIC)
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

SELECT 'Final working trigger with withdrawn/rejected support installed!' as status;
