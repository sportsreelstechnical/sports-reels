
-- Fix storage policies for video-analysis-reports bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('video-analysis-reports', 'video-analysis-reports', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['application/pdf'];

-- Create storage policy for teams to upload analysis reports
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition)
VALUES (
  'video-analysis-reports-upload-policy',
  'video-analysis-reports',
  'Teams can upload analysis reports',
  '(bucket_id = ''video-analysis-reports'')',
  '(bucket_id = ''video-analysis-reports'')'
) ON CONFLICT (id) DO UPDATE SET
  definition = '(bucket_id = ''video-analysis-reports'')',
  check_definition = '(bucket_id = ''video-analysis-reports'')';

-- Create storage policy for public access to read analysis reports
INSERT INTO storage.policies (id, bucket_id, name, definition, check_definition)
VALUES (
  'video-analysis-reports-select-policy',
  'video-analysis-reports', 
  'Public can view analysis reports',
  '(bucket_id = ''video-analysis-reports'')',
  NULL
) ON CONFLICT (id) DO UPDATE SET
  definition = '(bucket_id = ''video-analysis-reports'')';

-- Also check if ai_analysis_reports table exists, if not create it
CREATE TABLE IF NOT EXISTS ai_analysis_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id uuid REFERENCES videos(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  report_type text NOT NULL DEFAULT 'comprehensive',
  pdf_url text NOT NULL,
  report_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Make sure RLS is enabled
ALTER TABLE ai_analysis_reports ENABLE ROW LEVEL SECURITY;

-- Recreate the policies to ensure they work
DROP POLICY IF EXISTS "Teams can insert their analysis reports" ON ai_analysis_reports;
DROP POLICY IF EXISTS "Teams can view their analysis reports" ON ai_analysis_reports;
DROP POLICY IF EXISTS "Teams can update their analysis reports" ON ai_analysis_reports;
DROP POLICY IF EXISTS "Teams can delete their analysis reports" ON ai_analysis_reports;

-- Create comprehensive policies for ai_analysis_reports
CREATE POLICY "Teams can manage their analysis reports" 
ON ai_analysis_reports 
FOR ALL 
USING (
  team_id IN (
    SELECT t.id 
    FROM teams t 
    WHERE t.profile_id = auth.uid()
  )
)
WITH CHECK (
  team_id IN (
    SELECT t.id 
    FROM teams t 
    WHERE t.profile_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_ai_analysis_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ai_analysis_reports_updated_at_trigger ON ai_analysis_reports;
CREATE TRIGGER update_ai_analysis_reports_updated_at_trigger
  BEFORE UPDATE ON ai_analysis_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_analysis_reports_updated_at();
