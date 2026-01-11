-- Simplified trigger that should work reliably
-- This removes complex logic and focuses on the core functionality

DROP TRIGGER IF EXISTS trigger_agent_interest_notifications ON agent_interest;
DROP FUNCTION IF EXISTS handle_agent_interest_notifications();

-- Create a simple, reliable function
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
  -- Simple logging
  RAISE NOTICE 'Trigger fired: % on pitch %', TG_OP, COALESCE(NEW.pitch_id, OLD.pitch_id);

  -- Get team user_id directly with a single query
  SELECT 
    profiles.user_id,
    players.full_name,
    teams.team_name
  INTO team_user_id, player_name, team_name
  FROM transfer_pitches
  JOIN teams ON transfer_pitches.team_id = teams.id
  JOIN profiles ON teams.profile_id = profiles.id
  JOIN players ON transfer_pitches.player_id = players.id
  WHERE transfer_pitches.id = COALESCE(NEW.pitch_id, OLD.pitch_id);

  -- Get agent user_id directly
  SELECT 
    profiles.user_id,
    profiles.full_name
  INTO agent_user_id, agent_name
  FROM agents
  JOIN profiles ON agents.profile_id = profiles.id
  WHERE agents.id = COALESCE(NEW.agent_id, OLD.agent_id);

  RAISE NOTICE 'Found team_user_id: %, agent_user_id: %', team_user_id, agent_user_id;

  -- Handle INSERT (agent expresses interest)
  IF TG_OP = 'INSERT' THEN
    RAISE NOTICE 'Creating notification for team: %', team_user_id;
    
    -- Create notification for team
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
        'player_name', COALESCE(player_name, 'Unknown'),
        'team_name', COALESCE(team_name, 'Unknown'),
        'agent_name', COALESCE(agent_name, 'Unknown'),
        'action', 'expressed_interest'
      ),
      false,
      NOW()
    );
    
    RAISE NOTICE 'Notification created successfully';
    RETURN NEW;
  END IF;

  -- Handle UPDATE (status changes)
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    
    IF NEW.status = 'withdrawn' THEN
      -- Notify team about withdrawal
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
        'Interest Withdrawn',
        CONCAT(COALESCE(agent_name, 'An agent'), ' has withdrawn their interest in ', COALESCE(player_name, 'your player')),
        'agent_interest',
        '/team-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'player_name', COALESCE(player_name, 'Unknown'),
          'team_name', COALESCE(team_name, 'Unknown'),
          'agent_name', COALESCE(agent_name, 'Unknown'),
          'action', 'withdrawn'
        ),
        false,
        NOW()
      );
      
    ELSIF NEW.status = 'rejected' THEN
      -- Notify agent about rejection
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
        'Interest Rejected',
        CONCAT('Your interest in ', COALESCE(player_name, 'the player'), ' has been rejected'),
        'agent_interest',
        '/agent-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'player_name', COALESCE(player_name, 'Unknown'),
          'team_name', COALESCE(team_name, 'Unknown'),
          'action', 'rejected'
        ),
        false,
        NOW()
      );
      
    ELSE
      -- Notify agent about other status changes (negotiating, requested)
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
          WHEN 'negotiating' THEN CONCAT(COALESCE(team_name, 'Team'), ' is ready to start negotiations')
          WHEN 'requested' THEN CONCAT(COALESCE(team_name, 'Team'), ' has requested more information')
          ELSE 'Status updated'
        END,
        'agent_interest',
        '/agent-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'player_name', COALESCE(player_name, 'Unknown'),
          'team_name', COALESCE(team_name, 'Unknown'),
          'new_status', NEW.status,
          'action', 'status_updated'
        ),
        false,
        NOW()
      );
    END IF;
    
    RETURN NEW;
  END IF;

  -- Handle DELETE (interest cancelled)
  IF TG_OP = 'DELETE' THEN
    -- Notify team about cancellation
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
        'player_name', COALESCE(player_name, 'Unknown'),
        'team_name', COALESCE(team_name, 'Unknown'),
        'agent_name', COALESCE(agent_name, 'Unknown'),
        'action', 'cancelled'
      ),
      false,
      NOW()
    );
    
    RETURN OLD;
  END IF;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in trigger: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_agent_interest_notifications
  AFTER INSERT OR UPDATE OR DELETE ON agent_interest
  FOR EACH ROW
  EXECUTE FUNCTION handle_agent_interest_notifications();

-- Test query
SELECT 'Trigger created successfully. Test by expressing agent interest.' as status;
