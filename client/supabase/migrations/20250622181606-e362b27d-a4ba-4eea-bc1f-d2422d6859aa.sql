
-- Create enum types for better data integrity
CREATE TYPE user_type AS ENUM ('team', 'agent');
CREATE TYPE sport_type AS ENUM ('football', 'basketball', 'volleyball', 'tennis', 'rugby');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE transfer_type AS ENUM ('loan', 'permanent');
CREATE TYPE transfer_status AS ENUM ('active', 'expired', 'completed', 'cancelled');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');

-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_type user_type NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  is_verified BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  team_name TEXT NOT NULL,
  logo_url TEXT,
  sport_type sport_type NOT NULL,
  member_association TEXT,
  year_founded INTEGER,
  country TEXT NOT NULL,
  league TEXT,
  titles TEXT[],
  description TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id)
);

-- Create agents table
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  agency_name TEXT NOT NULL,
  fifa_id TEXT,
  license_number TEXT,
  specialization sport_type[] DEFAULT '{}',
  bio TEXT,
  website TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id)
);

-- Create players table
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  gender gender_type NOT NULL,
  date_of_birth DATE,
  height INTEGER, -- in centimeters
  weight INTEGER, -- in kilograms
  position TEXT NOT NULL,
  jersey_number INTEGER,
  citizenship TEXT NOT NULL,
  fifa_id TEXT,
  bio TEXT,
  market_value DECIMAL(15,2),
  ai_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create player stats table
CREATE TABLE public.player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  season TEXT NOT NULL,
  matches_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  additional_stats JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create videos table
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER, -- in seconds
  tags TEXT[],
  opposing_team TEXT,
  match_date DATE,
  score TEXT,
  video_type TEXT DEFAULT 'highlight',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create transfer pitches table
CREATE TABLE public.transfer_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  transfer_type transfer_type NOT NULL,
  asking_price DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  description TEXT,
  status transfer_status DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create agent requests table
CREATE TABLE public.agent_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL CHECK (char_length(description) <= 550),
  sport_type sport_type NOT NULL,
  position TEXT,
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  currency TEXT DEFAULT 'USD',
  transfer_type transfer_type NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days'),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create shortlist table for agents
CREATE TABLE public.shortlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  pitch_id UUID REFERENCES public.transfer_pitches(id) ON DELETE CASCADE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(agent_id, player_id, pitch_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  pitch_id UUID REFERENCES public.transfer_pitches(id) ON DELETE SET NULL,
  subject TEXT,
  content TEXT NOT NULL,
  status message_status DEFAULT 'sent',
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for teams
CREATE POLICY "Team owners can manage their team" ON public.teams
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view verified teams" ON public.teams
  FOR SELECT USING (verified = true OR profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Create RLS policies for agents
CREATE POLICY "Agent owners can manage their agent profile" ON public.agents
  FOR ALL USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view verified agents" ON public.agents
  FOR SELECT USING (verified = true OR profile_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ));

-- Create RLS policies for players
CREATE POLICY "Team owners can manage their players" ON public.players
  FOR ALL USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.profiles p ON t.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view players from verified teams" ON public.players
  FOR SELECT USING (
    team_id IN (SELECT id FROM public.teams WHERE verified = true)
  );

-- Create RLS policies for transfer pitches
CREATE POLICY "Team owners can manage their pitches" ON public.transfer_pitches
  FOR ALL USING (
    team_id IN (
      SELECT t.id FROM public.teams t
      JOIN public.profiles p ON t.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active pitches" ON public.transfer_pitches
  FOR SELECT USING (status = 'active' AND expires_at > now());

-- Create RLS policies for agent requests
CREATE POLICY "Agent owners can manage their requests" ON public.agent_requests
  FOR ALL USING (
    agent_id IN (
      SELECT a.id FROM public.agents a
      JOIN public.profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view public requests" ON public.agent_requests
  FOR SELECT USING (is_public = true AND expires_at > now());

-- Create RLS policies for shortlist
CREATE POLICY "Agents can manage their shortlist" ON public.shortlist
  FOR ALL USING (
    agent_id IN (
      SELECT a.id FROM public.agents a
      JOIN public.profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Create RLS policies for messages
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (
    sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR
    receiver_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Create RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'team')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_teams_profile_id ON public.teams(profile_id);
CREATE INDEX idx_agents_profile_id ON public.agents(profile_id);
CREATE INDEX idx_players_team_id ON public.players(team_id);
CREATE INDEX idx_transfer_pitches_status ON public.transfer_pitches(status);
CREATE INDEX idx_transfer_pitches_expires_at ON public.transfer_pitches(expires_at);
CREATE INDEX idx_messages_sender_receiver ON public.messages(sender_id, receiver_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
