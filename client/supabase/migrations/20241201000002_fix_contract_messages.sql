-- Fix contract_messages table if it doesn't exist or has wrong structure
DO $$ 
BEGIN
    -- Create contract_messages table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'contract_messages') THEN
        CREATE TABLE contract_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
            sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            message_type VARCHAR(50) DEFAULT 'discussion',
            related_field VARCHAR(100),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;

    -- Add content column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contract_messages' AND column_name = 'content') THEN
        ALTER TABLE contract_messages ADD COLUMN content TEXT NOT NULL DEFAULT '';
    END IF;

    -- Add message_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contract_messages' AND column_name = 'message_type') THEN
        ALTER TABLE contract_messages ADD COLUMN message_type VARCHAR(50) DEFAULT 'discussion';
    END IF;

    -- Add related_field column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'contract_messages' AND column_name = 'related_field') THEN
        ALTER TABLE contract_messages ADD COLUMN related_field VARCHAR(100);
    END IF;
END $$;

-- Enable RLS on contract_messages
ALTER TABLE contract_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Agents can view and send contract messages" ON contract_messages;
DROP POLICY IF EXISTS "Teams can view and send contract messages" ON contract_messages;

-- Create RLS policies for contract_messages
CREATE POLICY "Agents can view and send contract messages" ON contract_messages
    FOR ALL USING (
        sender_id IN (SELECT id FROM profiles WHERE id = auth.uid()) OR
        contract_id IN (
            SELECT id FROM contracts 
            WHERE agent_id IN (SELECT id FROM agents WHERE profile_id = auth.uid())
        )
    );

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
