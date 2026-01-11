
-- Add new columns to transfer_pitches table for timeline features
ALTER TABLE transfer_pitches 
ADD COLUMN IF NOT EXISTS deal_stage TEXT DEFAULT 'pitch' CHECK (deal_stage IN ('pitch', 'interest', 'discussion', 'expired')),
ADD COLUMN IF NOT EXISTS contact_info_flagged BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS team_blocked BOOLEAN DEFAULT false;

-- Create table for squad availability
CREATE TABLE IF NOT EXISTS squad_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  available_for_transfer BOOLEAN DEFAULT false,
  transfer_type TEXT[] DEFAULT '{}', -- permanent, loan
  asking_price NUMERIC,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, player_id)
);

-- Create table for saved custom views/filters
CREATE TABLE IF NOT EXISTS custom_filter_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  view_name TEXT NOT NULL,
  filter_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for player tagging to agent requests
CREATE TABLE IF NOT EXISTS agent_request_player_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES agent_requests(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  tagged_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(request_id, player_id)
);

-- Create table for message stages tracking
CREATE TABLE IF NOT EXISTS message_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pitch_id UUID REFERENCES transfer_pitches(id) ON DELETE CASCADE,
  agent_id UUID,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  stage TEXT DEFAULT 'initial_contact' CHECK (stage IN ('initial_contact', 'negotiation', 'agreement_pending')),
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(pitch_id, agent_id)
);

-- Add RLS policies for new tables
ALTER TABLE squad_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_filter_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_request_player_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_stages ENABLE ROW LEVEL SECURITY;

-- RLS policies for squad_availability
CREATE POLICY "Teams can manage their squad availability" ON squad_availability
  FOR ALL USING (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()));

-- RLS policies for custom_filter_views
CREATE POLICY "Teams can manage their custom views" ON custom_filter_views
  FOR ALL USING (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()));

-- RLS policies for agent_request_player_tags
CREATE POLICY "Teams can tag their players to requests" ON agent_request_player_tags
  FOR ALL USING (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()));

CREATE POLICY "Everyone can view player tags on public requests" ON agent_request_player_tags
  FOR SELECT USING (request_id IN (SELECT id FROM agent_requests WHERE is_public = true));

-- RLS policies for message_stages
CREATE POLICY "Teams can view their message stages" ON message_stages
  FOR ALL USING (team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid()));

-- Add trigger for auto-expiring pitches and updating deal stage
CREATE OR REPLACE FUNCTION update_expired_pitches()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE transfer_pitches 
  SET 
    status = 'expired',
    deal_stage = 'expired'
  WHERE 
    status = 'active' 
    AND expires_at < NOW() 
    AND deal_stage != 'expired';
END;
$$;

-- Create function to check pitch requirements
CREATE OR REPLACE FUNCTION check_pitch_requirements(p_team_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  video_count INTEGER;
  player_complete BOOLEAN;
BEGIN
  -- Check video count
  SELECT COUNT(*) INTO video_count
  FROM videos 
  WHERE team_id = p_team_id;
  
  IF video_count < 5 THEN
    RETURN FALSE;
  END IF;
  
  -- Check player profile completeness
  SELECT (
    full_name IS NOT NULL AND 
    position IS NOT NULL AND 
    citizenship IS NOT NULL AND
    date_of_birth IS NOT NULL AND
    height IS NOT NULL AND
    weight IS NOT NULL AND
    bio IS NOT NULL AND
    market_value IS NOT NULL
  ) INTO player_complete
  FROM players 
  WHERE id = p_player_id;
  
  RETURN COALESCE(player_complete, FALSE);
END;
$$;
