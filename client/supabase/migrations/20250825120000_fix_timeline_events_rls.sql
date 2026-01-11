-- Fix RLS policy for timeline_events to allow trigger functions to work
-- The issue is that the trigger function create_transfer_timeline_event() 
-- runs with different security context and can't pass the RLS policy check

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can create timeline events" ON public.timeline_events;

-- Create a new policy that allows team members to create timeline events
-- This policy checks if the user is a member of the team associated with the event
CREATE POLICY "Team members can create timeline events"
ON public.timeline_events
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.profile_id = public.get_user_profile_id()
  )
);

-- Also add a policy to allow the trigger function to work
-- This policy allows creation if the created_by matches a team's profile_id
-- and the user is a member of that team
CREATE POLICY "Allow trigger function timeline events"
ON public.timeline_events
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams t 
    WHERE t.id = team_id 
    AND t.profile_id = created_by
    AND t.profile_id IN (
      SELECT t2.profile_id FROM public.teams t2 
      WHERE t2.profile_id = public.get_user_profile_id()
    )
  )
);

-- Make the trigger function SECURITY DEFINER so it runs with elevated privileges
-- This ensures it can bypass RLS when inserting timeline events
CREATE OR REPLACE FUNCTION create_transfer_timeline_event()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.timeline_events (
    team_id,
    event_type,
    title,
    description,
    event_date,
    player_id,
    created_by,
    metadata
  ) VALUES (
    NEW.team_id,
    'transfer',
    'Transfer Pitch Created for ' || (
      SELECT p.full_name FROM public.players p WHERE p.id = NEW.player_id
    ),
    'A new transfer pitch has been created for player ' || (
      SELECT p.full_name FROM public.players p WHERE p.id = NEW.player_id
    ) || ' with asking price ' || COALESCE(NEW.asking_price::TEXT, 'TBD'),
    CURRENT_DATE,
    NEW.player_id,
    (SELECT t.profile_id FROM public.teams t WHERE t.id = NEW.team_id),
    jsonb_build_object(
      'pitch_id', NEW.id,
      'transfer_type', NEW.transfer_type,
      'asking_price', NEW.asking_price,
      'currency', NEW.currency
    )
  );
  RETURN NEW;
END;
$$;
