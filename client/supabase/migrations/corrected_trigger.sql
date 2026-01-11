-- Corrected trigger with explicit user targeting verification
-- This will ensure notifications go to the correct recipients

DROP TRIGGER IF EXISTS trigger_agent_interest_notifications ON agent_interest;
DROP FUNCTION IF EXISTS handle_agent_interest_notifications();

CREATE OR REPLACE FUNCTION handle_agent_interest_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_user_id UUID;
  agent_user_id UUID;
  team_profile_id UUID;
  agent_profile_id UUID;
  player_name TEXT;
  team_name TEXT;
  agent_name TEXT;
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user (this should be the agent when expressing interest)
  current_user_id := auth.uid();
  
  RAISE NOTICE 'Trigger fired: % on pitch %, current auth user: %', TG_OP, COALESCE(NEW.pitch_id, OLD.pitch_id), current_user_id;

  -- Get all the data we need with explicit field selection
  SELECT 
    -- Team data
    team_profiles.user_id,
    team_profiles.id,
    team_profiles.full_name,
    teams.team_name,
    -- Agent data  
    agent_profiles.user_id,
    agent_profiles.id,
    agent_profiles.full_name,
    -- Player data
    players.full_name
  INTO 
    team_user_id,
    team_profile_id,
    agent_name, -- This will be overwritten, just placeholder
    team_name,
    agent_user_id,
    agent_profile_id,
    agent_name,
    player_name
  FROM transfer_pitches tp
  -- Join to get team info
  JOIN teams ON tp.team_id = teams.id
  JOIN profiles team_profiles ON teams.profile_id = team_profiles.id
  -- Join to get player info
  JOIN players ON tp.player_id = players.id
  -- Join to get agent info
  JOIN agents ON agents.id = COALESCE(NEW.agent_id, OLD.agent_id)
  JOIN profiles agent_profiles ON agents.profile_id = agent_profiles.id
  WHERE tp.id = COALESCE(NEW.pitch_id, OLD.pitch_id);

  -- Debug logging
  RAISE NOTICE 'Data retrieved:';
  RAISE NOTICE '  Team: user_id=%, profile_id=%, name=%, type should be team', team_user_id, team_profile_id, team_name;
  RAISE NOTICE '  Agent: user_id=%, profile_id=%, name=%', agent_user_id, agent_profile_id, agent_name;
  RAISE NOTICE '  Player: name=%', player_name;
  RAISE NOTICE '  Current auth user: %', current_user_id;

  -- Verify we have the data we need
  IF team_user_id IS NULL THEN
    RAISE NOTICE 'ERROR: team_user_id is NULL, cannot send notification';
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  IF agent_user_id IS NULL THEN
    RAISE NOTICE 'ERROR: agent_user_id is NULL, cannot send notification';
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Additional safety check: ensure team_user_id != agent_user_id
  IF team_user_id = agent_user_id THEN
    RAISE NOTICE 'ERROR: team_user_id equals agent_user_id (%), this should not happen!', team_user_id;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Agent expressed interest → NOTIFY TEAM (NOT agent)
    RAISE NOTICE 'INSERT: Creating notification for TEAM user_id: % (NOT agent user_id: %)', team_user_id, agent_user_id;
    
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
      team_user_id,  -- EXPLICITLY send to team
      'New Agent Interest',
      CONCAT(COALESCE(agent_name, 'An agent'), ' has expressed interest in ', COALESCE(player_name, 'your player')),
      'agent_interest',
      '/team-explore?tab=communication',
      'View Communication',
      json_build_object(
        'pitch_id', NEW.pitch_id,
        'player_name', COALESCE(player_name, 'Unknown'),
        'team_name', COALESCE(team_name, 'Unknown'),
        'agent_name', COALESCE(agent_name, 'Unknown'),
        'action', 'expressed_interest',
        'team_user_id', team_user_id,
        'agent_user_id', agent_user_id,
        'debug_info', 'notification_sent_to_team'
      ),
      false,
      NOW()
    );
    
    RAISE NOTICE 'INSERT: Notification created for team user_id: %', team_user_id;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    
    IF NEW.status = 'withdrawn' THEN
      -- Agent withdrew → NOTIFY TEAM
      RAISE NOTICE 'UPDATE (withdrawn): Creating notification for TEAM user_id: %', team_user_id;
      
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
        team_user_id,  -- Send to team
        'Interest Withdrawn',
        CONCAT(COALESCE(agent_name, 'An agent'), ' has withdrawn their interest in ', COALESCE(player_name, 'your player')),
        'agent_interest',
        '/team-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'action', 'withdrawn',
          'debug_info', 'notification_sent_to_team'
        ),
        false,
        NOW()
      );
      
    ELSIF NEW.status = 'rejected' THEN
      -- Team rejected → NOTIFY AGENT
      RAISE NOTICE 'UPDATE (rejected): Creating notification for AGENT user_id: %', agent_user_id;
      
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
        agent_user_id,  -- Send to agent
        'Interest Rejected',
        CONCAT('Your interest in ', COALESCE(player_name, 'the player'), ' has been rejected'),
        'agent_interest',
        '/agent-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'action', 'rejected',
          'debug_info', 'notification_sent_to_agent'
        ),
        false,
        NOW()
      );
      
    ELSE
      -- Other status changes → NOTIFY AGENT
      RAISE NOTICE 'UPDATE (% status): Creating notification for AGENT user_id: %', NEW.status, agent_user_id;
      
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
        agent_user_id,  -- Send to agent
        'Interest Status Update',
        CASE NEW.status
          WHEN 'negotiating' THEN CONCAT(COALESCE(team_name, 'Team'), ' is ready to start negotiations')
          WHEN 'requested' THEN CONCAT(COALESCE(team_name, 'Team'), ' has requested more information')
          ELSE 'Status updated'
        END,
        'agent_interest',
        '/agent-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'new_status', NEW.status,
          'action', 'status_updated',
          'debug_info', 'notification_sent_to_agent'
        ),
        false,
        NOW()
      );
    END IF;
    
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Interest deleted → NOTIFY TEAM
    RAISE NOTICE 'DELETE: Creating notification for TEAM user_id: %', team_user_id;
    
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
      team_user_id,  -- Send to team
      'Interest Cancelled',
      CONCAT(COALESCE(agent_name, 'An agent'), ' has cancelled their interest in ', COALESCE(player_name, 'your player')),
      'agent_interest',
      '/team-explore?tab=communication',
      'View Communication',
      json_build_object(
        'pitch_id', OLD.pitch_id,
        'action', 'cancelled',
        'debug_info', 'notification_sent_to_team'
      ),
      false,
      NOW()
    );
    
    RETURN OLD;
  END IF;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ERROR in trigger: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_agent_interest_notifications
  AFTER INSERT OR UPDATE OR DELETE ON agent_interest
  FOR EACH ROW
  EXECUTE FUNCTION handle_agent_interest_notifications();

SELECT 'Corrected trigger installed with enhanced debugging' as status;
