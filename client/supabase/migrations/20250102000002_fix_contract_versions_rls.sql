-- Fix contract_versions RLS policies to allow proper contract updates
-- This addresses the 403 Forbidden error when updating contracts

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view contract versions they have access to" ON contract_versions;
DROP POLICY IF EXISTS "Users can create versions for their contracts" ON contract_versions;
DROP POLICY IF EXISTS "Users can manage contract versions" ON contract_versions;

-- Create comprehensive policies for contract_versions
CREATE POLICY "Teams can manage contract versions for their contracts" ON contract_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contracts c
            JOIN teams t ON t.id = c.team_id
            WHERE c.id = contract_versions.contract_id
            AND t.profile_id = auth.uid()
        )
    );

CREATE POLICY "Agents can manage contract versions for their contracts" ON contract_versions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM contracts c
            JOIN agents a ON a.id = c.agent_id
            WHERE c.id = contract_versions.contract_id
            AND a.profile_id = auth.uid()
        )
    );

-- Also ensure the contracts table has proper policies
DROP POLICY IF EXISTS "Teams can update their contracts" ON contracts;
DROP POLICY IF EXISTS "Agents can update their contracts" ON contracts;

-- Recreate with proper permissions
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

-- Add WITH CHECK clause for INSERT operations
CREATE POLICY "Teams can insert contract versions" ON contract_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM contracts c
            JOIN teams t ON t.id = c.team_id
            WHERE c.id = contract_versions.contract_id
            AND t.profile_id = auth.uid()
        )
    );

CREATE POLICY "Agents can insert contract versions" ON contract_versions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM contracts c
            JOIN agents a ON a.id = c.agent_id
            WHERE c.id = contract_versions.contract_id
            AND a.profile_id = auth.uid()
        )
    );
