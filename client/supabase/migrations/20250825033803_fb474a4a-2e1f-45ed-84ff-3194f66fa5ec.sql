
-- Drop existing policy and create a corrected one
DROP POLICY IF EXISTS "Teams can manage their analysis reports" ON ai_analysis_reports;

-- Create a more specific policy that properly joins through profiles
CREATE POLICY "Teams can insert analysis reports" 
ON ai_analysis_reports 
FOR INSERT 
WITH CHECK (
  team_id IN (
    SELECT t.id 
    FROM teams t
    JOIN profiles p ON t.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Teams can select analysis reports" 
ON ai_analysis_reports 
FOR SELECT 
USING (
  team_id IN (
    SELECT t.id 
    FROM teams t
    JOIN profiles p ON t.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Teams can update analysis reports" 
ON ai_analysis_reports 
FOR UPDATE 
USING (
  team_id IN (
    SELECT t.id 
    FROM teams t
    JOIN profiles p ON t.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Teams can delete analysis reports" 
ON ai_analysis_reports 
FOR DELETE 
USING (
  team_id IN (
    SELECT t.id 
    FROM teams t
    JOIN profiles p ON t.profile_id = p.id
    WHERE p.user_id = auth.uid()
  )
);
