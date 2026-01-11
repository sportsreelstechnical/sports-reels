
-- Create enhanced video analysis tables
CREATE TABLE IF NOT EXISTS public.enhanced_video_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  analysis_status TEXT NOT NULL DEFAULT 'pending',
  tagged_player_present BOOLEAN DEFAULT false,
  overview TEXT,
  key_events JSONB DEFAULT '[]'::jsonb,
  context_reasoning TEXT,
  explanations TEXT,
  recommendations TEXT,
  visual_summary JSONB DEFAULT '{}'::jsonb,
  player_performance_radar JSONB DEFAULT '{}'::jsonb,
  event_timeline JSONB DEFAULT '[]'::jsonb,
  tagged_player_analysis JSONB DEFAULT '{}'::jsonb,
  missing_players JSONB DEFAULT '[]'::jsonb,
  analysis_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create video snapshots table for PDF reports
CREATE TABLE IF NOT EXISTS public.video_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  snapshot_url TEXT NOT NULL,
  timestamp_seconds NUMERIC NOT NULL,
  snapshot_type TEXT DEFAULT 'key_moment',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create video compression logs table
CREATE TABLE IF NOT EXISTS public.video_compression_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  original_size_mb NUMERIC,
  compressed_size_mb NUMERIC,
  compression_ratio NUMERIC,
  compression_status TEXT DEFAULT 'pending',
  compression_method TEXT DEFAULT 'ffmpeg',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create player video cross-references table
CREATE TABLE IF NOT EXISTS public.player_video_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  presence_confirmed BOOLEAN DEFAULT false,
  performance_rating INTEGER,
  key_moments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(player_id, video_id)
);

-- Create AI analysis reports table for PDF generation
CREATE TABLE IF NOT EXISTS public.ai_analysis_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  report_type TEXT DEFAULT 'comprehensive',
  pdf_url TEXT,
  report_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE
);

-- Add RLS policies
ALTER TABLE public.enhanced_video_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_compression_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_video_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analysis_reports ENABLE ROW LEVEL SECURITY;

-- Policies for enhanced_video_analysis
CREATE POLICY "Teams can manage their video analysis" ON public.enhanced_video_analysis
  FOR ALL USING (
    video_id IN (
      SELECT v.id FROM videos v 
      JOIN teams t ON v.team_id = t.id 
      WHERE t.profile_id = auth.uid()
    )
  );

-- Policies for video_snapshots
CREATE POLICY "Teams can manage their video snapshots" ON public.video_snapshots
  FOR ALL USING (
    video_id IN (
      SELECT v.id FROM videos v 
      JOIN teams t ON v.team_id = t.id 
      WHERE t.profile_id = auth.uid()
    )
  );

-- Policies for video_compression_logs
CREATE POLICY "Teams can view their compression logs" ON public.video_compression_logs
  FOR SELECT USING (
    video_id IN (
      SELECT v.id FROM videos v 
      JOIN teams t ON v.team_id = t.id 
      WHERE t.profile_id = auth.uid()
    )
  );

-- Policies for player_video_references
CREATE POLICY "Teams can manage their player video references" ON public.player_video_references
  FOR ALL USING (
    video_id IN (
      SELECT v.id FROM videos v 
      JOIN teams t ON v.team_id = t.id 
      WHERE t.profile_id = auth.uid()
    )
  );

-- Policies for ai_analysis_reports
CREATE POLICY "Teams can manage their AI reports" ON public.ai_analysis_reports
  FOR ALL USING (team_id IN (
    SELECT id FROM teams WHERE profile_id = auth.uid()
  ));

-- Create storage bucket for video snapshots and reports
INSERT INTO storage.buckets (id, name, public) 
VALUES ('video-analysis-reports', 'video-analysis-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_enhanced_video_analysis_updated_at 
    BEFORE UPDATE ON enhanced_video_analysis 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
