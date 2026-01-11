-- Create player upload history table
CREATE TABLE public.player_upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT, -- Path to stored file in storage
  file_size INTEGER, -- File size in bytes
  file_type TEXT, -- MIME type (text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
  total_players INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  error_count INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  details JSONB -- Additional details like validation errors, warnings, etc.
);

-- Create player activity log table
CREATE TABLE public.player_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'bulk_uploaded'
  old_values JSONB, -- Previous values for updates
  new_values JSONB, -- New values for updates/creates
  changed_fields TEXT[], -- Array of field names that changed
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  upload_session_id UUID REFERENCES public.player_upload_history(id) ON DELETE SET NULL, -- Link to upload session if applicable
  details TEXT -- Additional context or notes
);

-- Create indexes for better query performance
CREATE INDEX idx_player_upload_history_team_id ON public.player_upload_history(team_id);
CREATE INDEX idx_player_upload_history_uploaded_at ON public.player_upload_history(uploaded_at);
CREATE INDEX idx_player_activity_log_team_id ON public.player_activity_log(team_id);
CREATE INDEX idx_player_activity_log_player_id ON public.player_activity_log(player_id);
CREATE INDEX idx_player_activity_log_performed_at ON public.player_activity_log(performed_at);
CREATE INDEX idx_player_activity_log_action ON public.player_activity_log(action);

-- Add RLS policies
ALTER TABLE public.player_upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_activity_log ENABLE ROW LEVEL SECURITY;

-- Policies for player_upload_history
CREATE POLICY "Teams can view their own upload history" ON public.player_upload_history
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.profiles p ON t.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Teams can insert their own upload history" ON public.player_upload_history
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.profiles p ON t.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Policies for player_activity_log
CREATE POLICY "Teams can view their own player activity" ON public.player_activity_log
  FOR SELECT USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.profiles p ON t.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Teams can insert their own player activity" ON public.player_activity_log
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.profiles p ON t.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Alternative simpler policy for testing (uncomment if needed)
-- DROP POLICY IF EXISTS "Teams can insert their own player activity" ON public.player_activity_log;
-- CREATE POLICY "Teams can insert their own player activity" ON public.player_activity_log
--   FOR INSERT WITH CHECK (performed_by = auth.uid());
