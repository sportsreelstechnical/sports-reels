
-- Create timeline_events table
CREATE TABLE IF NOT EXISTS public.timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('match', 'transfer', 'player', 'team', 'achievement')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  match_id UUID DEFAULT NULL,
  created_by UUID NOT NULL,
  reactions_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0
);

-- Create timeline_comments table
CREATE TABLE IF NOT EXISTS public.timeline_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create timeline_reactions table
CREATE TABLE IF NOT EXISTS public.timeline_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.timeline_events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'important', 'flag')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, profile_id, reaction_type)
);

-- Enable RLS
ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timeline_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for timeline_events
CREATE POLICY "Team members can view their timeline events" ON public.timeline_events
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM public.teams t 
      WHERE t.profile_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create timeline events" ON public.timeline_events
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT t.id FROM public.teams t 
      WHERE t.profile_id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Team members can update their timeline events" ON public.timeline_events
  FOR UPDATE USING (
    team_id IN (
      SELECT t.id FROM public.teams t 
      WHERE t.profile_id = auth.uid()
    )
  );

CREATE POLICY "Team members can delete their timeline events" ON public.timeline_events
  FOR DELETE USING (
    team_id IN (
      SELECT t.id FROM public.teams t 
      WHERE t.profile_id = auth.uid()
    )
  );

-- RLS Policies for timeline_comments
CREATE POLICY "Users can view comments on their team events" ON public.timeline_comments
  FOR SELECT USING (
    event_id IN (
      SELECT te.id FROM public.timeline_events te
      JOIN public.teams t ON te.team_id = t.id
      WHERE t.profile_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create comments" ON public.timeline_comments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments" ON public.timeline_comments
  FOR UPDATE USING (profile_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.timeline_comments
  FOR DELETE USING (profile_id = auth.uid());

-- RLS Policies for timeline_reactions
CREATE POLICY "Users can view reactions on their team events" ON public.timeline_reactions
  FOR SELECT USING (
    event_id IN (
      SELECT te.id FROM public.timeline_events te
      JOIN public.teams t ON te.team_id = t.id
      WHERE t.profile_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create reactions" ON public.timeline_reactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND profile_id = auth.uid());

CREATE POLICY "Users can delete their own reactions" ON public.timeline_reactions
  FOR DELETE USING (profile_id = auth.uid());

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_timeline_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.timeline_events 
    SET comments_count = comments_count + 1 
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.timeline_events 
    SET comments_count = comments_count - 1 
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update reactions count
CREATE OR REPLACE FUNCTION update_timeline_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.timeline_events 
    SET reactions_count = reactions_count + 1 
    WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.timeline_events 
    SET reactions_count = reactions_count - 1 
    WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER timeline_comments_count_trigger
  AFTER INSERT OR DELETE ON public.timeline_comments
  FOR EACH ROW EXECUTE FUNCTION update_timeline_comments_count();

CREATE TRIGGER timeline_reactions_count_trigger
  AFTER INSERT OR DELETE ON public.timeline_reactions
  FOR EACH ROW EXECUTE FUNCTION update_timeline_reactions_count();

-- Function to auto-create transfer events
CREATE OR REPLACE FUNCTION create_transfer_timeline_event()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger for auto-creating transfer events
CREATE TRIGGER auto_create_transfer_timeline_event
  AFTER INSERT ON public.transfer_pitches
  FOR EACH ROW EXECUTE FUNCTION create_transfer_timeline_event();
