-- Fix agent_interest table setup
-- This script checks and fixes any issues with the agent_interest table

-- First, check if the table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'agent_interest') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE agent_interest (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            pitch_id UUID NOT NULL REFERENCES transfer_pitches(id) ON DELETE CASCADE,
            agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            status TEXT NOT NULL CHECK (status IN ('interested', 'requested', 'negotiating')) DEFAULT 'interested',
            message TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Ensure unique agent-pitch combinations
            UNIQUE(pitch_id, agent_id)
        );
        
        RAISE NOTICE 'Created agent_interest table';
    ELSE
        RAISE NOTICE 'agent_interest table already exists';
    END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can view their own interest" ON agent_interest;
DROP POLICY IF EXISTS "Teams can view interest in their pitches" ON agent_interest;
DROP POLICY IF EXISTS "Agents can insert their own interest" ON agent_interest;
DROP POLICY IF EXISTS "Teams can update interest status for their pitches" ON agent_interest;

-- Enable RLS
ALTER TABLE agent_interest ENABLE ROW LEVEL SECURITY;

-- Create new policies
-- Agents can view their own interest
CREATE POLICY "Agents can view their own interest" ON agent_interest
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM agents a
            WHERE a.id = agent_interest.agent_id
            AND a.profile_id = auth.uid()
        )
    );

-- Teams can view interest in their pitches
CREATE POLICY "Teams can view interest in their pitches" ON agent_interest
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM transfer_pitches tp
            JOIN teams t ON tp.team_id = t.id
            WHERE tp.id = agent_interest.pitch_id
            AND t.profile_id = auth.uid()
        )
    );

-- Agents can insert their own interest
CREATE POLICY "Agents can insert their own interest" ON agent_interest
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents a
            WHERE a.id = agent_interest.agent_id
            AND a.profile_id = auth.uid()
        )
    );

-- Agents can update their own interest
CREATE POLICY "Agents can update their own interest" ON agent_interest
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM agents a
            WHERE a.id = agent_interest.agent_id
            AND a.profile_id = auth.uid()
        )
    );

-- Teams can update interest status for their pitches
CREATE POLICY "Teams can update interest status for their pitches" ON agent_interest
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM transfer_pitches tp
            JOIN teams t ON tp.team_id = t.id
            WHERE tp.id = agent_interest.pitch_id
            AND t.profile_id = auth.uid()
        )
    );

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_agent_interest_pitch_id ON agent_interest(pitch_id);
CREATE INDEX IF NOT EXISTS idx_agent_interest_agent_id ON agent_interest(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_interest_status ON agent_interest(status);

-- Create trigger for updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_agent_interest_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_agent_interest_updated_at ON agent_interest;
CREATE TRIGGER trigger_update_agent_interest_updated_at
    BEFORE UPDATE ON agent_interest
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_interest_updated_at();

-- Test the setup
SELECT 'agent_interest table setup completed successfully' as status;
