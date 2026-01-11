
-- Create agent_requests table with enhanced features
CREATE TABLE IF NOT EXISTS public.agent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL CHECK (length(description) <= 550),
  position TEXT,
  sport_type TEXT NOT NULL DEFAULT 'football',
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('permanent', 'loan', 'loan_with_option', 'loan_with_obligation')),
  budget_min NUMERIC,
  budget_max NUMERIC,
  currency TEXT DEFAULT 'USD',
  passport_requirement TEXT,
  league_level TEXT,
  country TEXT,
  category TEXT CHECK (category IN ('youth', 'womens', 'elite', 'academy')),
  deal_stage TEXT DEFAULT 'open' CHECK (deal_stage IN ('open', 'in_discussion', 'closed')),
  tagged_players UUID[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
  view_count INTEGER DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  shortlist_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Create agent_request_comments table for tagged players
CREATE TABLE IF NOT EXISTS public.agent_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
  commenter_id UUID NOT NULL,
  content TEXT NOT NULL,
  tagged_players UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create agent_saved_filters table
CREATE TABLE IF NOT EXISTS public.agent_saved_filters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Create agent_player_follows table
CREATE TABLE IF NOT EXISTS public.agent_player_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  player_id UUID NOT NULL,
  pitch_id UUID,
  followed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  FOREIGN KEY (pitch_id) REFERENCES transfer_pitches(id) ON DELETE SET NULL,
  UNIQUE(agent_id, player_id)
);

-- Create agent_request_analytics table
CREATE TABLE IF NOT EXISTS public.agent_request_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES agent_requests(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.agent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_saved_filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_player_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_request_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for agent_requests
CREATE POLICY "Everyone can view public agent requests" 
ON agent_requests FOR SELECT 
USING (is_public = true AND expires_at > now());

CREATE POLICY "Agents can manage their own requests" 
ON agent_requests FOR ALL 
USING (agent_id IN (
  SELECT id FROM agents WHERE profile_id = auth.uid()
));

-- Create RLS policies for agent_request_comments
CREATE POLICY "Everyone can view request comments" 
ON agent_request_comments FOR SELECT 
USING (request_id IN (
  SELECT id FROM agent_requests WHERE is_public = true AND expires_at > now()
));

CREATE POLICY "Authenticated users can create comments" 
ON agent_request_comments FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments" 
ON agent_request_comments FOR UPDATE 
USING (commenter_id = auth.uid());

-- Create RLS policies for agent_saved_filters
CREATE POLICY "Agents can manage their saved filters" 
ON agent_saved_filters FOR ALL 
USING (agent_id IN (
  SELECT id FROM agents WHERE profile_id = auth.uid()
));

-- Create RLS policies for agent_player_follows
CREATE POLICY "Agents can manage their follows" 
ON agent_player_follows FOR ALL 
USING (agent_id IN (
  SELECT id FROM agents WHERE profile_id = auth.uid()
));

-- Create RLS policies for agent_request_analytics
CREATE POLICY "Agents can view their request analytics" 
ON agent_request_analytics FOR SELECT 
USING (request_id IN (
  SELECT ar.id FROM agent_requests ar 
  JOIN agents a ON ar.agent_id = a.id 
  WHERE a.profile_id = auth.uid()
));

-- Create indexes for performance
CREATE INDEX idx_agent_requests_sport_type ON agent_requests(sport_type);
CREATE INDEX idx_agent_requests_expires_at ON agent_requests(expires_at);
CREATE INDEX idx_agent_requests_deal_stage ON agent_requests(deal_stage);
CREATE INDEX idx_agent_requests_tagged_players ON agent_requests USING GIN(tagged_players);
CREATE INDEX idx_agent_request_comments_tagged_players ON agent_request_comments USING GIN(tagged_players);

-- Create trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_agent_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agent_requests_update_timestamp
  BEFORE UPDATE ON agent_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_request_updated_at();

CREATE TRIGGER agent_request_comments_update_timestamp
  BEFORE UPDATE ON agent_request_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_request_comments_updated_at();
