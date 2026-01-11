-- Fix contracts table RLS policies to prevent 406 errors
-- Run this in Supabase SQL Editor

-- Check current RLS status on contracts table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'contracts';

-- Check existing RLS policies
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
WHERE tablename = 'contracts'
ORDER BY policyname;

-- If RLS is enabled, create permissive policies for authenticated users
-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can only view their own contracts" ON contracts;
DROP POLICY IF EXISTS "Teams can manage their contracts" ON contracts;
DROP POLICY IF EXISTS "Agents can view their contracts" ON contracts;

-- Create new permissive policies for contract access
CREATE POLICY "Authenticated users can view contracts" ON contracts
  FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND (
      -- Teams can view contracts for their team
      team_id IN (
        SELECT t.id FROM teams t 
        JOIN profiles p ON t.profile_id = p.id 
        WHERE p.user_id = auth.uid()
      ) OR
      -- Agents can view contracts for their agent
      agent_id IN (
        SELECT a.id FROM agents a
        JOIN profiles p ON a.profile_id = p.id
        WHERE p.user_id = auth.uid()
      )
    )
  );

-- Allow teams to create and manage contracts
CREATE POLICY "Teams can manage contracts" ON contracts
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

-- Allow agents to update contract status (for negotiations)
CREATE POLICY "Agents can update their contracts" ON contracts
  FOR UPDATE
  USING (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT a.id FROM agents a
      JOIN profiles p ON a.profile_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Verify the new policies
SELECT 
  'New RLS policies created for contracts' as status,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'contracts';
