
-- Create agent_request_comments table
CREATE TABLE public.agent_request_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.agent_requests(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tagged_players JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_request_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view comments on public requests" 
  ON public.agent_request_comments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_requests 
      WHERE id = agent_request_comments.request_id 
      AND is_public = true 
      AND expires_at > now()
    )
  );

CREATE POLICY "Authenticated users can create comments" 
  ON public.agent_request_comments 
  FOR INSERT 
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own comments" 
  ON public.agent_request_comments 
  FOR UPDATE 
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments" 
  ON public.agent_request_comments 
  FOR DELETE 
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_request_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_request_comments_updated_at
  BEFORE UPDATE ON public.agent_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_request_comments_updated_at();
