-- Create a simpler player activity table
CREATE TABLE public.player_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'bulk_uploaded'
  player_name TEXT NOT NULL, -- Store player name directly for easier querying
  old_data JSONB, -- Previous values for updates
  new_data JSONB, -- New values for updates/creates
  changed_fields TEXT[], -- Array of field names that changed
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  upload_session_id UUID, -- Link to upload session if applicable
  details TEXT, -- Additional context or notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_player_activities_team_id ON public.player_activities(team_id);
CREATE INDEX idx_player_activities_player_id ON public.player_activities(player_id);
CREATE INDEX idx_player_activities_performed_at ON public.player_activities(performed_at);
CREATE INDEX idx_player_activities_action ON public.player_activities(action);
CREATE INDEX idx_player_activities_player_name ON public.player_activities(player_name);

-- Enable RLS
ALTER TABLE public.player_activities ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies
CREATE POLICY "Users can view their team's player activities" ON public.player_activities
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.profiles p ON t.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their team's player activities" ON public.player_activities
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.profiles p ON t.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON public.player_activities TO authenticated;
GRANT ALL ON public.player_activities TO service_role;
