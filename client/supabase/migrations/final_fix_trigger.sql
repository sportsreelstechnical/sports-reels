-- FINAL FIX: Clean and simple trigger with correct notification targeting
-- This will fix all notification targeting issues

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_agent_interest_notifications ON agent_interest;
DROP FUNCTION IF EXISTS handle_agent_interest_notifications();

-- Create a simple, working function with clear logic
CREATE OR REPLACE FUNCTION handle_agent_interest_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  team_profile_id UUID;
  team_user_id UUID;
  agent_profile_id UUID;
  agent_user_id UUID;
  player_name TEXT;
  team_name TEXT;
  agent_name TEXT;
BEGIN
  -- Debug logging
  RAISE NOTICE 'TRIGGER FIRED: Operation = %, Pitch ID = %', TG_OP, COALESCE(NEW.pitch_id, OLD.pitch_id);

  -- Get pitch, player, and team data
  SELECT 
    p.full_name,
    t.team_name,
    t.profile_id
  INTO player_name, team_name, team_profile_id
  FROM transfer_pitches tp
  JOIN players p ON tp.player_id = p.id
  JOIN teams t ON tp.team_id = t.id
  WHERE tp.id = COALESCE(NEW.pitch_id, OLD.pitch_id);

  -- Get agent data
  SELECT 
    pr.full_name,
    pr.id,
    pr.user_id
  INTO agent_name, agent_profile_id, agent_user_id
  FROM agents a
  JOIN profiles pr ON a.profile_id = pr.id
  WHERE a.id = COALESCE(NEW.agent_id, OLD.agent_id);

  -- Convert team profile_id to user_id using the helper function
  SELECT get_user_id_from_profile(team_profile_id) INTO team_user_id;

  -- Debug logging
  RAISE NOTICE 'DATA: Player=%, Team=%, Agent=%, Team Profile ID=%, Team User ID=%, Agent User ID=%', 
    player_name, team_name, agent_name, team_profile_id, team_user_id, agent_user_id;

  IF TG_OP = 'INSERT' THEN
    -- Agent expressed interest → NOTIFY TEAM
    RAISE NOTICE 'INSERT: Notifying TEAM (user_id: %) about agent interest', team_user_id;
    
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
      team_user_id,  -- Send to TEAM
      '🎯 New Agent Interest',
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
        'source', 'database_trigger'
      ),
      false,
      NOW()
    );

    RAISE NOTICE 'INSERT: Team notification created successfully';
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    
    IF NEW.status = 'withdrawn' THEN
      -- Agent withdrew interest → NOTIFY TEAM
      RAISE NOTICE 'UPDATE (withdrawn): Notifying TEAM (user_id: %) about withdrawal', team_user_id;
      
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
        team_user_id,  -- Send to TEAM
        '🚫 Interest Withdrawn',
        CONCAT(COALESCE(agent_name, 'An agent'), ' has withdrawn their interest in ', COALESCE(player_name, 'your player')),
        'agent_interest',
        '/team-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'player_name', COALESCE(player_name, 'Unknown'),
          'team_name', COALESCE(team_name, 'Unknown'),
          'agent_name', COALESCE(agent_name, 'Unknown'),
          'action', 'withdrawn_interest',
          'source', 'database_trigger'
        ),
        false,
        NOW()
      );

    ELSIF NEW.status = 'rejected' THEN
      -- Team rejected interest → NOTIFY AGENT
      RAISE NOTICE 'UPDATE (rejected): Notifying AGENT (user_id: %) about rejection', agent_user_id;
      
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
        agent_user_id,  -- Send to AGENT
        '❌ Interest Rejected',
        CONCAT('Your interest in ', COALESCE(player_name, 'the player'), ' has been rejected by ', COALESCE(team_name, 'the team')),
        'agent_interest',
        '/agent-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'player_name', COALESCE(player_name, 'Unknown'),
          'team_name', COALESCE(team_name, 'Unknown'),
          'action', 'rejected_interest',
          'source', 'database_trigger'
        ),
        false,
        NOW()
      );

    ELSIF NEW.status IN ('negotiating', 'requested') THEN
      -- Team changed status → NOTIFY AGENT
      RAISE NOTICE 'UPDATE (% status): Notifying AGENT (user_id: %) about status change', NEW.status, agent_user_id;
      
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
        agent_user_id,  -- Send to AGENT
        CASE NEW.status
          WHEN 'negotiating' THEN '🚀 Negotiation Started!'
          WHEN 'requested' THEN '📋 More Information Requested'
          ELSE 'Interest Status Updated'
        END,
        CASE NEW.status
          WHEN 'negotiating' THEN CONCAT(COALESCE(team_name, 'Team'), ' is ready to start negotiations for ', COALESCE(player_name, 'the player'))
          WHEN 'requested' THEN CONCAT(COALESCE(team_name, 'Team'), ' has requested more information about ', COALESCE(player_name, 'the player'))
          ELSE CONCAT('Status updated for ', COALESCE(player_name, 'the player'))
        END,
        'agent_interest',
        '/agent-explore?tab=communication',
        'View Communication',
        json_build_object(
          'pitch_id', NEW.pitch_id,
          'player_name', COALESCE(player_name, 'Unknown'),
          'team_name', COALESCE(team_name, 'Unknown'),
          'new_status', NEW.status,
          'action', 'status_updated',
          'source', 'database_trigger'
        ),
        false,
        NOW()
      );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Interest deleted → NOTIFY TEAM
    RAISE NOTICE 'DELETE: Notifying TEAM (user_id: %) about deletion', team_user_id;
    
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
      team_user_id,  -- Send to TEAM
      '🗑️ Interest Cancelled',
      CONCAT(COALESCE(agent_name, 'An agent'), ' has cancelled their interest in ', COALESCE(player_name, 'your player')),
      'agent_interest',
      '/team-explore?tab=communication',
      'View Communication',
      json_build_object(
        'pitch_id', OLD.pitch_id,
        'player_name', COALESCE(player_name, 'Unknown'),
        'team_name', COALESCE(team_name, 'Unknown'),
        'agent_name', COALESCE(agent_name, 'Unknown'),
        'action', 'cancelled_interest',
        'source', 'database_trigger'
      ),
      false,
      NOW()
    );

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- Create the trigger
CREATE TRIGGER trigger_agent_interest_notifications
  AFTER INSERT OR UPDATE OR DELETE ON agent_interest
  FOR EACH ROW
  EXECUTE FUNCTION handle_agent_interest_notifications();

-- Verification query to check recent notifications and their recipients
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.message,
  n.type,
  n.created_at,
  p.full_name as recipient_name,
  p.user_type as recipient_type,
  n.metadata->>'action' as action_type,
  n.metadata->>'source' as source
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.user_id
WHERE n.type = 'agent_interest'
ORDER BY n.created_at DESC
LIMIT 10;
