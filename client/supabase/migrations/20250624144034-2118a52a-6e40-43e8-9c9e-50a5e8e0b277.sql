
-- Add missing columns to players table for comprehensive player profiles
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS place_of_birth text,
ADD COLUMN IF NOT EXISTS foot text CHECK (foot IN ('left', 'right', 'both')),
ADD COLUMN IF NOT EXISTS player_agent text,
ADD COLUMN IF NOT EXISTS current_club text,
ADD COLUMN IF NOT EXISTS joined_date date,
ADD COLUMN IF NOT EXISTS contract_expires date,
ADD COLUMN IF NOT EXISTS leagues_participated text[],
ADD COLUMN IF NOT EXISTS titles_seasons text[],
ADD COLUMN IF NOT EXISTS transfer_history jsonb,
ADD COLUMN IF NOT EXISTS international_duty jsonb,
ADD COLUMN IF NOT EXISTS match_stats jsonb;

-- Create player_performance table for detailed statistics
CREATE TABLE IF NOT EXISTS public.player_performance (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES public.players(id) ON DELETE CASCADE,
  season text NOT NULL,
  league text,
  goals integer DEFAULT 0,
  assists integer DEFAULT 0,
  matches_played integer DEFAULT 0,
  minutes_played integer DEFAULT 0,
  yellow_cards integer DEFAULT 0,
  red_cards integer DEFAULT 0,
  clean_sheets integer DEFAULT 0,
  saves integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create match_videos table with comprehensive video management
CREATE TABLE IF NOT EXISTS public.match_videos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL,
  video_url text NOT NULL,
  thumbnail_url text,
  compressed_video_url text,
  home_or_away text CHECK (home_or_away IN ('home', 'away')),
  opposing_team text NOT NULL,
  league text NOT NULL,
  final_score text,
  match_date date,
  tagged_players jsonb,
  match_stats jsonb,
  duration integer,
  file_size integer,
  is_processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('match-videos', 'match-videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('video-thumbnails', 'video-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.player_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_videos ENABLE ROW LEVEL SECURITY;

-- RLS policies for player_performance
CREATE POLICY "Teams can view their players performance" ON public.player_performance
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.teams t ON p.team_id = t.id
    WHERE p.id = player_performance.player_id 
    AND t.profile_id = auth.uid()
  )
);

CREATE POLICY "Teams can manage their players performance" ON public.player_performance
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.teams t ON p.team_id = t.id
    WHERE p.id = player_performance.player_id 
    AND t.profile_id = auth.uid()
  )
);

-- RLS policies for match_videos
CREATE POLICY "Teams can view their videos" ON public.match_videos
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = match_videos.team_id 
    AND t.profile_id = auth.uid()
  )
);

CREATE POLICY "Teams can manage their videos" ON public.match_videos
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = match_videos.team_id 
    AND t.profile_id = auth.uid()
  )
);

-- Storage policies for player photos
CREATE POLICY "Public read player photos" ON storage.objects
FOR SELECT USING (bucket_id = 'player-photos');

CREATE POLICY "Auth users upload player photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Users update player photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'player-photos' AND auth.role() = 'authenticated');

-- Storage policies for videos
CREATE POLICY "Public read videos" ON storage.objects
FOR SELECT USING (bucket_id = 'match-videos');

CREATE POLICY "Auth users upload videos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'match-videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users update videos" ON storage.objects
FOR UPDATE USING (bucket_id = 'match-videos' AND auth.role() = 'authenticated');

-- Storage policies for thumbnails
CREATE POLICY "Public read thumbnails" ON storage.objects
FOR SELECT USING (bucket_id = 'video-thumbnails');

CREATE POLICY "Auth users upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'video-thumbnails' AND auth.role() = 'authenticated');
