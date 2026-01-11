
-- Add AI analysis columns to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ai_analysis jsonb;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ai_analysis_status text DEFAULT 'pending';

-- Add AI analysis columns to match_videos table  
ALTER TABLE public.match_videos ADD COLUMN IF NOT EXISTS ai_analysis jsonb;
ALTER TABLE public.match_videos ADD COLUMN IF NOT EXISTS ai_analysis_status text DEFAULT 'pending';
