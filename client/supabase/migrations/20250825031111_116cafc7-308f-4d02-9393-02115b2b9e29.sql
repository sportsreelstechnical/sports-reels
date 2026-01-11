
-- Enable RLS on ai_analysis_reports table if not already enabled
ALTER TABLE ai_analysis_reports ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Teams can manage their analysis reports" ON ai_analysis_reports;
DROP POLICY IF EXISTS "Teams can insert their analysis reports" ON ai_analysis_reports;
DROP POLICY IF EXISTS "Teams can view their analysis reports" ON ai_analysis_reports;

-- Create policy for teams to insert their own analysis reports
CREATE POLICY "Teams can insert their analysis reports" 
ON ai_analysis_reports 
FOR INSERT 
WITH CHECK (
  team_id IN (
    SELECT t.id 
    FROM teams t 
    WHERE t.profile_id = auth.uid()
  )
);

-- Create policy for teams to view their own analysis reports
CREATE POLICY "Teams can view their analysis reports" 
ON ai_analysis_reports 
FOR SELECT 
USING (
  team_id IN (
    SELECT t.id 
    FROM teams t 
    WHERE t.profile_id = auth.uid()
  )
);

-- Create policy for teams to update their own analysis reports
CREATE POLICY "Teams can update their analysis reports" 
ON ai_analysis_reports 
FOR UPDATE 
USING (
  team_id IN (
    SELECT t.id 
    FROM teams t 
    WHERE t.profile_id = auth.uid()
  )
);

-- Create policy for teams to delete their own analysis reports
CREATE POLICY "Teams can delete their analysis reports" 
ON ai_analysis_reports 
FOR DELETE 
USING (
  team_id IN (
    SELECT t.id 
    FROM teams t 
    WHERE t.profile_id = auth.uid()
  )
);
