-- Drop the problematic policy
DROP POLICY "Team members can create timeline events" ON public.timeline_events;

-- Create a new policy that allows team members to create timeline events
CREATE POLICY "Team members can create timeline events"
ON public.timeline_events
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT t.id FROM public.teams t 
    WHERE t.profile_id = public.get_user_profile_id()
  )
);

-- Make the trigger function SECURITY DEFINER
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

-- Create the trigger on transfer_pitches table
CREATE TRIGGER transfer_pitch_timeline_trigger
  AFTER INSERT ON public.transfer_pitches
  FOR EACH ROW
  EXECUTE FUNCTION create_transfer_timeline_event();
