-- Create agent_interest table to track agent interest in transfer pitches
CREATE TABLE IF NOT EXISTS agent_interest (
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_interest_pitch_id ON agent_interest(pitch_id);
CREATE INDEX IF NOT EXISTS idx_agent_interest_agent_id ON agent_interest(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_interest_status ON agent_interest(status);

-- Enable Row Level Security
ALTER TABLE agent_interest ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Agents can view their own interest
CREATE POLICY "Agents can view their own interest" ON agent_interest
    FOR SELECT USING (auth.uid() = agent_id);

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
    FOR INSERT WITH CHECK (auth.uid() = agent_id);

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

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_agent_interest_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_agent_interest_updated_at
    BEFORE UPDATE ON agent_interest
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_interest_updated_at();
