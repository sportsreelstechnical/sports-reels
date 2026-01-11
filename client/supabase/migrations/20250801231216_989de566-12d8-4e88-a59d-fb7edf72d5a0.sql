
-- Create enhanced tables for video upload feature
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  sport_type TEXT NOT NULL,
  region TEXT,
  tier_level INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create match_statistics table for detailed stats
CREATE TABLE IF NOT EXISTS public.match_statistics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players(id),
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  second_yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  minutes_played INTEGER DEFAULT 0,
  jersey_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create ai_analysis table for real-time insights
CREATE TABLE IF NOT EXISTS public.ai_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  analysis_timestamp NUMERIC NOT NULL,
  event_type TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score NUMERIC DEFAULT 0,
  tagged_players UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add new columns to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS home_or_away TEXT CHECK (home_or_away IN ('home', 'away')),
ADD COLUMN IF NOT EXISTS league_id UUID REFERENCES public.leagues(id),
ADD COLUMN IF NOT EXISTS final_score_home INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_score_away INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS compressed_url TEXT,
ADD COLUMN IF NOT EXISTS upload_status TEXT DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS ai_analysis_status TEXT DEFAULT 'pending' CHECK (ai_analysis_status IN ('pending', 'analyzing', 'completed', 'failed'));

-- Enable RLS on new tables
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for leagues (public read)
CREATE POLICY "Everyone can view leagues" ON public.leagues FOR SELECT USING (true);

-- Create policies for match_statistics
CREATE POLICY "Teams can manage their match statistics" ON public.match_statistics 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.videos v 
    JOIN public.teams t ON v.team_id = t.id 
    WHERE v.id = match_statistics.video_id 
    AND t.profile_id = auth.uid()
  )
);

CREATE POLICY "Public can view match statistics from public videos" ON public.match_statistics 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.videos v 
    WHERE v.id = match_statistics.video_id 
    AND v.is_public = true
  )
);

-- Create policies for ai_analysis
CREATE POLICY "Teams can manage their AI analysis" ON public.ai_analysis 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.videos v 
    JOIN public.teams t ON v.team_id = t.id 
    WHERE v.id = ai_analysis.video_id 
    AND t.profile_id = auth.uid()
  )
);

CREATE POLICY "Public can view AI analysis from public videos" ON public.ai_analysis 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.videos v 
    WHERE v.id = ai_analysis.video_id 
    AND v.is_public = true
  )
);

-- Insert sample leagues data
INSERT INTO public.leagues (name, country, sport_type, region, tier_level) VALUES
('Premier League', 'England', 'football', 'Europe', 1),
('La Liga', 'Spain', 'football', 'Europe', 1),
('Bundesliga', 'Germany', 'football', 'Europe', 1),
('Serie A', 'Italy', 'football', 'Europe', 1),
('Ligue 1', 'France', 'football', 'Europe', 1),
('MLS', 'United States', 'football', 'North America', 2),
('Liga MX', 'Mexico', 'football', 'North America', 1),
('Brazilian Serie A', 'Brazil', 'football', 'South America', 1),
('NBA', 'United States', 'basketball', 'North America', 1),
('EuroLeague', 'Europe', 'basketball', 'Europe', 1)
ON CONFLICT DO NOTHING;

-- Create function to update video analysis status
CREATE OR REPLACE FUNCTION update_video_analysis_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE videos 
  SET ai_analysis_status = 'completed'
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for AI analysis completion
DROP TRIGGER IF EXISTS ai_analysis_completion_trigger ON ai_analysis;
CREATE TRIGGER ai_analysis_completion_trigger
  AFTER INSERT ON ai_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_video_analysis_status();
