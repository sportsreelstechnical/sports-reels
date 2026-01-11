-- Fix transfer_pitches RLS policy to allow access for contract management
-- This will resolve the 406 Not Acceptable error

-- Check current RLS policies on transfer_pitches
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'transfer_pitches'
ORDER BY policyname;

-- Create a more permissive RLS policy for authenticated users
-- This allows teams and agents to read transfer pitch data for contract purposes

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view active transfer pitches" ON transfer_pitches;
DROP POLICY IF EXISTS "Team owners can manage their pitches v2" ON transfer_pitches;
DROP POLICY IF EXISTS "Authenticated users can view active pitches" ON transfer_pitches;

-- Create new permissive policies
CREATE POLICY "Authenticated users can view transfer pitches" ON transfer_pitches
  FOR SELECT 
  USING (
    -- Allow authenticated users to view active pitches
    auth.role() = 'authenticated' AND (
      status = 'active' OR
      -- Team owners can view their own pitches regardless of status
      team_id IN (
        SELECT t.id FROM teams t 
        JOIN profiles p ON t.profile_id = p.id 
        WHERE p.user_id = auth.uid()
      ) OR
      -- Allow viewing pitches that have contracts involving the user
      id IN (
        SELECT DISTINCT c.pitch_id FROM contracts c
        WHERE c.agent_id IN (
          SELECT a.id FROM agents a
          JOIN profiles p ON a.profile_id = p.id
          WHERE p.user_id = auth.uid()
        )
        OR c.team_id IN (
          SELECT t.id FROM teams t
          JOIN profiles p ON t.profile_id = p.id
          WHERE p.user_id = auth.uid()
        )
      )
    )
  );

-- Allow team owners to manage their own pitches
CREATE POLICY "Team owners can manage their transfer pitches" ON transfer_pitches
  FOR ALL 
  USING (
    team_id IN (
      SELECT t.id FROM teams t 
      JOIN profiles p ON t.profile_id = p.id 
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    team_id IN (
      SELECT t.id FROM teams t 
      JOIN profiles p ON t.profile_id = p.id 
      WHERE p.user_id = auth.uid()
    )
  );

-- Verify the new policies
SELECT 
  'New RLS policies created for transfer_pitches' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'transfer_pitches';
