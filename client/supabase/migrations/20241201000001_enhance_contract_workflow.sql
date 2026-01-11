-- Enhance contracts table for complete workflow
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS transfer_type VARCHAR(20) DEFAULT 'permanent',
ADD COLUMN IF NOT EXISTS document_url TEXT,
ADD COLUMN IF NOT EXISTS current_step VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add status column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contracts' AND column_name = 'status') THEN
        ALTER TABLE contracts ADD COLUMN status VARCHAR(50) DEFAULT 'draft';
    END IF;
END $$;

-- Create contract_messages table for contract-specific discussions
CREATE TABLE IF NOT EXISTS contract_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'discussion',
    related_field VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for contract_messages
ALTER TABLE contract_messages ENABLE ROW LEVEL SECURITY;

-- Policy for agents to view and send contract messages
CREATE POLICY "Agents can view and send contract messages" ON contract_messages
    FOR ALL USING (
        sender_id IN (SELECT id FROM profiles WHERE id = auth.uid()) OR
        contract_id IN (
            SELECT id FROM contracts 
            WHERE agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid())
        )
    );

-- Policy for teams to view and send contract messages
CREATE POLICY "Teams can view and send contract messages" ON contract_messages
    FOR ALL USING (
        sender_id IN (SELECT id FROM profiles WHERE id = auth.uid()) OR
        contract_id IN (
            SELECT id FROM contracts 
            WHERE team_id IN (SELECT id FROM teams WHERE profile_id = auth.uid())
        )
    );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contract_messages_contract_id ON contract_messages(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_messages_sender_id ON contract_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_current_step ON contracts(current_step);

-- Update existing contracts to have proper status
UPDATE contracts SET status = 'draft' WHERE status IS NULL;
UPDATE contracts SET current_step = 'draft' WHERE current_step IS NULL;
