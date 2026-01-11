
-- Fix RLS policies for transfer_pitches and timeline_events
CREATE OR REPLACE FUNCTION public.get_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Update transfer_pitches RLS policies
DROP POLICY IF EXISTS "Team owners can manage their pitches" ON public.transfer_pitches;
DROP POLICY IF EXISTS "Allow all users to insert transfer pitches" ON public.transfer_pitches;

CREATE POLICY "Team owners can insert transfer pitches"
ON public.transfer_pitches
FOR INSERT
WITH CHECK (
  team_id IN (
    SELECT t.id FROM teams t 
    WHERE t.profile_id = public.get_user_profile_id()
  )
);

CREATE POLICY "Team owners can manage their transfer pitches"
ON public.transfer_pitches
FOR ALL
USING (
  team_id IN (
    SELECT t.id FROM teams t 
    WHERE t.profile_id = public.get_user_profile_id()
  )
);

-- Fix timeline_events RLS policy
DROP POLICY IF EXISTS "Users can create timeline events" ON public.timeline_events;

CREATE POLICY "Users can create timeline events"
ON public.timeline_events
FOR INSERT
WITH CHECK (
  created_by = public.get_user_profile_id()
);

-- Add missing columns to agent_requests for editing
ALTER TABLE public.agent_requests 
ADD COLUMN IF NOT EXISTS is_editable boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS edit_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_edited_at timestamp with time zone DEFAULT now();

-- Create agent_request_comments table for commenting functionality
CREATE TABLE IF NOT EXISTS public.agent_request_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES public.agent_requests(id) ON DELETE CASCADE NOT NULL,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  tagged_players jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on agent_request_comments
ALTER TABLE public.agent_request_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for agent_request_comments
CREATE POLICY "Users can view comments on public requests"
ON public.agent_request_comments
FOR SELECT
USING (
  request_id IN (
    SELECT id FROM agent_requests WHERE is_public = true
  )
);

CREATE POLICY "Users can create comments on public requests"
ON public.agent_request_comments
FOR INSERT
WITH CHECK (
  profile_id = public.get_user_profile_id() AND
  request_id IN (
    SELECT id FROM agent_requests WHERE is_public = true
  )
);

CREATE POLICY "Users can update their own comments"
ON public.agent_request_comments
FOR UPDATE
USING (profile_id = public.get_user_profile_id());

CREATE POLICY "Users can delete their own comments"
ON public.agent_request_comments
FOR DELETE
USING (profile_id = public.get_user_profile_id());

-- Add video filtering enhancements
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS performance_rating integer CHECK (performance_rating >= 1 AND performance_rating <= 10),
ADD COLUMN IF NOT EXISTS match_result text CHECK (match_result IN ('win', 'loss', 'draw')),
ADD COLUMN IF NOT EXISTS video_quality text DEFAULT 'standard' CHECK (video_quality IN ('low', 'standard', 'high', '4k'));

-- Create video_tags table for better tagging
CREATE TABLE IF NOT EXISTS public.video_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE NOT NULL,
  tag_name text NOT NULL,
  tag_type text DEFAULT 'custom' CHECK (tag_type IN ('system', 'custom', 'performance', 'tactical')),
  created_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on video_tags
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for video_tags
CREATE POLICY "Users can manage tags for their videos"
ON public.video_tags
FOR ALL
USING (
  video_id IN (
    SELECT v.id FROM videos v
    JOIN teams t ON v.team_id = t.id
    WHERE t.profile_id = public.get_user_profile_id()
  )
);

-- Add trigger for agent_request_comments updated_at
CREATE OR REPLACE FUNCTION public.update_agent_request_comments_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_agent_request_comments_updated_at
  BEFORE UPDATE ON public.agent_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_request_comments_updated_at();

-- Create function to update agent request edit tracking
CREATE OR REPLACE FUNCTION public.track_agent_request_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.edit_count = OLD.edit_count + 1;
  NEW.last_edited_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER track_agent_request_edit
  BEFORE UPDATE ON public.agent_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.track_agent_request_edit();
