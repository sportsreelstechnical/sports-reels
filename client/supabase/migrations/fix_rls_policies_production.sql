-- Fix RLS policies for production database
-- Run this script directly on your Supabase database to fix the 406 errors

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Agents can view their own data" ON agents;
DROP POLICY IF EXISTS "Teams can view their own data" ON teams;
DROP POLICY IF EXISTS "Agents can update their own data" ON agents;
DROP POLICY IF EXISTS "Teams can update their own data" ON teams;
DROP POLICY IF EXISTS "Agents can view their own interest" ON agent_interest;
DROP POLICY IF EXISTS "Teams can view interest in their pitches" ON agent_interest;
DROP POLICY IF EXISTS "Agents can insert their own interest" ON agent_interest;
DROP POLICY IF EXISTS "Teams can update interest status for their pitches" ON agent_interest;

-- Create more permissive policies for teams table
-- Allow authenticated users to view all teams (needed for transfer pitches, etc.)
CREATE POLICY "Authenticated users can view teams" ON teams
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow teams to update their own data
CREATE POLICY "Teams can update their own data" ON teams
    FOR UPDATE USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Allow teams to insert their own data
CREATE POLICY "Teams can insert their own data" ON teams
    FOR INSERT WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create more permissive policies for agents table
-- Allow authenticated users to view all agents (needed for transfer pitches, etc.)
CREATE POLICY "Authenticated users can view agents" ON agents
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow agents to update their own data
CREATE POLICY "Agents can update their own data" ON agents
    FOR UPDATE USING (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Allow agents to insert their own data
CREATE POLICY "Agents can insert their own data" ON agents
    FOR INSERT WITH CHECK (profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create more permissive agent_interest policies
CREATE POLICY "Authenticated users can view agent interest" ON agent_interest
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Agents can insert their own interest" ON agent_interest
    FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Teams can update interest status for their pitches" ON agent_interest
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM transfer_pitches tp
            JOIN teams t ON tp.team_id = t.id
            WHERE tp.id = agent_interest.pitch_id
            AND t.profile_id = auth.uid()
        )
    );

-- Fix transfer_pitches policies
DROP POLICY IF EXISTS "Teams can view their own pitches" ON transfer_pitches;
DROP POLICY IF EXISTS "Teams can insert their own pitches" ON transfer_pitches;
DROP POLICY IF EXISTS "Teams can update their own pitches" ON transfer_pitches;

CREATE POLICY "Authenticated users can view transfer pitches" ON transfer_pitches
    FOR SELECT USING (auth.role() = 'authenticated');
    
CREATE POLICY "Teams can insert their own pitches" ON transfer_pitches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = transfer_pitches.team_id
            AND t.profile_id = auth.uid()
        )
    );
    
CREATE POLICY "Teams can update their own pitches" ON transfer_pitches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM teams t
            WHERE t.id = transfer_pitches.team_id
            AND t.profile_id = auth.uid()
        )
    );

-- Fix players policies
DROP POLICY IF EXISTS "Authenticated users can view players" ON players;

CREATE POLICY "Authenticated users can view players" ON players
    FOR SELECT USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT SELECT ON teams TO authenticated;
GRANT SELECT ON agents TO authenticated;
GRANT SELECT ON players TO authenticated;
GRANT SELECT ON transfer_pitches TO authenticated;
GRANT SELECT ON agent_interest TO authenticated;

-- Create indexes for better performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_teams_profile_id ON teams(profile_id);
CREATE INDEX IF NOT EXISTS idx_agents_profile_id ON agents(profile_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_team_id ON transfer_pitches(team_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_player_id ON transfer_pitches(player_id);
CREATE INDEX IF NOT EXISTS idx_agent_interest_pitch_id ON agent_interest(pitch_id);
CREATE INDEX IF NOT EXISTS idx_agent_interest_agent_id ON agent_interest(agent_id);

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('teams', 'agents', 'players', 'transfer_pitches', 'agent_interest')
ORDER BY tablename, policyname;
