
-- Create leagues and competitions table
CREATE TABLE public.leagues_competitions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  sport_type text NOT NULL,
  tier_level integer DEFAULT 1,
  region text,
  type text NOT NULL DEFAULT 'league', -- 'league', 'cup', 'tournament'
  created_at timestamp with time zone DEFAULT now()
);

-- Create player international duty records
CREATE TABLE public.player_international_duty (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  season text NOT NULL,
  category text NOT NULL, -- 'senior', 'u21', 'u19', 'u17', etc.
  country text NOT NULL,
  debut_date date,
  appearances integer DEFAULT 0,
  goals integer DEFAULT 0,
  assists integer DEFAULT 0,
  yellow_cards integer DEFAULT 0,
  second_yellow_cards integer DEFAULT 0,
  red_cards integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create player transfer history
CREATE TABLE public.player_transfer_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  from_club text,
  to_club text,
  transfer_date date NOT NULL,
  transfer_value numeric,
  transfer_type text NOT NULL DEFAULT 'permanent', -- 'permanent', 'loan', 'free'
  currency text DEFAULT 'USD',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create player league participation records
CREATE TABLE public.player_league_participation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  league_competition_id uuid REFERENCES leagues_competitions(id),
  season text NOT NULL,
  appearances integer DEFAULT 0,
  goals integer DEFAULT 0,
  assists integer DEFAULT 0,
  minutes_played integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create player titles and achievements
CREATE TABLE public.player_titles_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  title text NOT NULL,
  season text NOT NULL,
  competition text,
  achievement_type text NOT NULL, -- 'individual', 'team', 'statistical'
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.leagues_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_international_duty ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_transfer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_league_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_titles_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for leagues_competitions (public read)
CREATE POLICY "Everyone can view leagues and competitions" 
  ON public.leagues_competitions 
  FOR SELECT 
  USING (true);

-- RLS policies for player_international_duty
CREATE POLICY "Teams can manage their players international duty" 
  ON public.player_international_duty 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM players p 
    JOIN teams t ON p.team_id = t.id 
    WHERE p.id = player_international_duty.player_id 
    AND t.profile_id = auth.uid()
  ));

CREATE POLICY "Public can view international duty records" 
  ON public.player_international_duty 
  FOR SELECT 
  USING (true);

-- RLS policies for player_transfer_history
CREATE POLICY "Teams can manage their players transfer history" 
  ON public.player_transfer_history 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM players p 
    JOIN teams t ON p.team_id = t.id 
    WHERE p.id = player_transfer_history.player_id 
    AND t.profile_id = auth.uid()
  ));

CREATE POLICY "Public can view transfer history" 
  ON public.player_transfer_history 
  FOR SELECT 
  USING (true);

-- RLS policies for player_league_participation
CREATE POLICY "Teams can manage their players league participation" 
  ON public.player_league_participation 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM players p 
    JOIN teams t ON p.team_id = t.id 
    WHERE p.id = player_league_participation.player_id 
    AND t.profile_id = auth.uid()
  ));

CREATE POLICY "Public can view league participation" 
  ON public.player_league_participation 
  FOR SELECT 
  USING (true);

-- RLS policies for player_titles_achievements
CREATE POLICY "Teams can manage their players titles and achievements" 
  ON public.player_titles_achievements 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM players p 
    JOIN teams t ON p.team_id = t.id 
    WHERE p.id = player_titles_achievements.player_id 
    AND t.profile_id = auth.uid()
  ));

CREATE POLICY "Public can view titles and achievements" 
  ON public.player_titles_achievements 
  FOR SELECT 
  USING (true);

-- Insert some sample leagues and competitions
INSERT INTO public.leagues_competitions (name, country, sport_type, tier_level, type) VALUES
('Premier League', 'England', 'football', 1, 'league'),
('Championship', 'England', 'football', 2, 'league'),
('La Liga', 'Spain', 'football', 1, 'league'),
('Bundesliga', 'Germany', 'football', 1, 'league'),
('Serie A', 'Italy', 'football', 1, 'league'),
('Ligue 1', 'France', 'football', 1, 'league'),
('UEFA Champions League', 'Europe', 'football', 1, 'tournament'),
('UEFA Europa League', 'Europe', 'football', 1, 'tournament'),
('FIFA World Cup', 'International', 'football', 1, 'tournament'),
('NPFL', 'Nigeria', 'football', 1, 'league'),
('NNL', 'Nigeria', 'football', 2, 'league'),
('Federation Cup', 'Nigeria', 'football', 1, 'cup'),
('FA Cup', 'England', 'football', 1, 'cup'),
('Copa del Rey', 'Spain', 'football', 1, 'cup'),
('DFB-Pokal', 'Germany', 'football', 1, 'cup'),
('NBA', 'USA', 'basketball', 1, 'league'),
('EuroLeague', 'Europe', 'basketball', 1, 'league'),
('WNBA', 'USA', 'basketball', 1, 'league');

-- Create message_violations table for enhanced message flagging
CREATE TABLE public.message_violations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  violation_type text NOT NULL, -- 'phone', 'email', 'inappropriate'
  violation_content text NOT NULL,
  detected_at timestamp with time zone DEFAULT now(),
  action_taken text, -- 'flagged', 'blocked', 'warning'
  reviewed boolean DEFAULT false,
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

-- Enable RLS
ALTER TABLE public.message_violations ENABLE ROW LEVEL SECURITY;

-- RLS policy for message violations (admin only)
CREATE POLICY "Only admins can view message violations" 
  ON public.message_violations 
  FOR ALL 
  USING (false); -- Will be updated when admin system is implemented
