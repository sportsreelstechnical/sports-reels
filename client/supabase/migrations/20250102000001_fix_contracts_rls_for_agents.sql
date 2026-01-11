-- Fix RLS policies to allow agents to update contracts they are part of
-- This fixes the 403 Forbidden error when agents try to counter-propose

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can update their own contracts" ON contracts;
DROP POLICY IF EXISTS "Teams can update contracts" ON contracts;
DROP POLICY IF EXISTS "Agents can update contracts" ON contracts;

-- Create comprehensive RLS policies for contract updates
CREATE POLICY "Teams can update their contracts" ON contracts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM teams t 
            WHERE t.id = contracts.team_id 
            AND t.profile_id = auth.uid()
        )
    );

CREATE POLICY "Agents can update their contracts" ON contracts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM agents a 
            WHERE a.id = contracts.agent_id 
            AND a.profile_id = auth.uid()
        )
    );

-- Also ensure agents can insert contract messages
CREATE POLICY "Agents can insert contract messages" ON contract_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM contracts c
            JOIN agents a ON a.id = c.agent_id
            WHERE c.id = contract_messages.contract_id
            AND a.profile_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM contracts c
            JOIN teams t ON t.id = c.team_id
            WHERE c.id = contract_messages.contract_id
            AND t.profile_id = auth.uid()
        )
    );

-- Fix contract_versions table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contract_versions') THEN
        -- Drop restrictive policies on contract_versions
        DROP POLICY IF EXISTS "contract_versions_policy" ON contract_versions;
        
        -- Create proper RLS policy for contract versions
        CREATE POLICY "Users can manage contract versions" ON contract_versions
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM contracts c
                    JOIN teams t ON t.id = c.team_id
                    WHERE c.id = contract_versions.contract_id
                    AND t.profile_id = auth.uid()
                )
                OR
                EXISTS (
                    SELECT 1 FROM contracts c
                    JOIN agents a ON a.id = c.agent_id
                    WHERE c.id = contract_versions.contract_id
                    AND a.profile_id = auth.uid()
                )
            );
    END IF;
END $$;
