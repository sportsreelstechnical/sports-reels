-- Fix the agent interest notification trigger to send notifications to the correct recipients
-- Run this in your Supabase SQL Editor

-- Drop existing trigger and function to recreate them correctly
DROP TRIGGER IF EXISTS trigger_agent_interest_notifications ON agent_interest;
DROP FUNCTION IF EXISTS handle_agent_interest_notifications();

-- Recreate the function with fixed logic
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
  -- Get pitch and related data
  SELECT 
    p.full_name,
    t.team_name,
    t.profile_id  -- This is the team's profile_id
  INTO player_name, team_name, team_profile_id
  FROM transfer_pitches tp
  JOIN players p ON tp.player_id = p.id
  JOIN teams t ON tp.team_id = t.id
  WHERE tp.id = COALESCE(NEW.pitch_id, OLD.pitch_id);

  -- Get agent profile_id and convert to user_id
  SELECT 
    pr.full_name,
    pr.id as profile_id,
    pr.user_id
  INTO agent_name, agent_profile_id, agent_user_id
  FROM agents a
  JOIN profiles pr ON a.profile_id = pr.id
  WHERE a.id = COALESCE(NEW.agent_id, OLD.agent_id);

  -- Convert team profile_id to user_id
  team_user_id := get_user_id_from_profile(team_profile_id);

  -- Debug logging
  RAISE NOTICE 'TRIGGER DEBUG - Operation: %, Team Profile ID: %, Team User ID: %, Agent Profile ID: %, Agent User ID: %', 
    TG_OP, team_profile_id, team_user_id, agent_profile_id, agent_user_id;

  IF TG_OP = 'INSERT' THEN
    -- Agent expressed interest - notify TEAM (not agent)
    RAISE NOTICE 'Creating notification for TEAM user_id: %', team_user_id;
    
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
      team_user_id,  -- Send to TEAM, not agent
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
        'action', 'expressed_interest',
        'source', 'database_trigger'
      ),
      false,
      NOW()
    );

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Status changed - notify AGENT (not team)
    IF OLD.status != NEW.status THEN
      RAISE NOTICE 'Creating status update notification for AGENT user_id: %', agent_user_id;
      
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
        agent_user_id,  -- Send to AGENT, not team
        'Interest Status Update',
        CASE NEW.status
          WHEN 'negotiating' THEN CONCAT('🚀 ', COALESCE(team_name, 'Team'), ' is ready to start negotiations for ', COALESCE(player_name, 'the player'))
          WHEN 'requested' THEN CONCAT('📋 ', COALESCE(team_name, 'Team'), ' has requested more information about ', COALESCE(player_name, 'the player'))
          WHEN 'rejected' THEN CONCAT('❌ ', COALESCE(team_name, 'Team'), ' has rejected your interest in ', COALESCE(player_name, 'the player'))
          WHEN 'withdrawn' THEN CONCAT('🚫 You have withdrawn your interest in ', COALESCE(player_name, 'the player'))
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
          'action', 'status_updated',
          'source', 'database_trigger'
        ),
        false,
        NOW()
      );
    END IF;

    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Interest cancelled/deleted - notify TEAM (not agent)
    RAISE NOTICE 'Creating cancellation notification for TEAM user_id: %', team_user_id;
    
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
      team_user_id,  -- Send to TEAM, not agent
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

-- Recreate the trigger
CREATE TRIGGER trigger_agent_interest_notifications
  AFTER INSERT OR UPDATE OR DELETE ON agent_interest
  FOR EACH ROW
  EXECUTE FUNCTION handle_agent_interest_notifications();

-- Test the fix by checking recent notifications
SELECT 
  n.id,
  n.user_id,
  n.title,
  n.message,
  n.type,
  n.created_at,
  p.full_name as recipient_name,
  p.user_type as recipient_type
FROM notifications n
JOIN profiles p ON n.user_id = p.user_id
WHERE n.type = 'agent_interest'
ORDER BY n.created_at DESC
LIMIT 10;
