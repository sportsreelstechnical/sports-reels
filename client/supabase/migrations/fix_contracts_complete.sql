-- Complete fix for contracts table issues
-- This script fixes both foreign key relationships and RLS policies

-- Step 1: Check current contracts table structure
SELECT '🔍 CHECKING CONTRACTS TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contracts' 
ORDER BY column_name;

-- Step 2: Check current foreign key constraints
SELECT '🔍 CHECKING FOREIGN KEY CONSTRAINTS:' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'contracts'
ORDER BY tc.constraint_name;

-- Step 3: Ensure all required columns exist
SELECT '🔧 ENSURING REQUIRED COLUMNS:' as info;

DO $$ 
BEGIN
    -- Add pitch_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' 
        AND column_name = 'pitch_id'
    ) THEN
        ALTER TABLE contracts ADD COLUMN pitch_id UUID;
        RAISE NOTICE '✅ Added pitch_id column to contracts table';
    ELSE
        RAISE NOTICE 'ℹ️ pitch_id column already exists in contracts table';
    END IF;

    -- Add deal_stage column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' 
        AND column_name = 'deal_stage'
    ) THEN
        ALTER TABLE contracts ADD COLUMN deal_stage TEXT DEFAULT 'draft';
        RAISE NOTICE '✅ Added deal_stage column to contracts table';
    ELSE
        RAISE NOTICE 'ℹ️ deal_stage column already exists in contracts table';
    END IF;

    -- Add contract_value column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' 
        AND column_name = 'contract_value'
    ) THEN
        ALTER TABLE contracts ADD COLUMN contract_value NUMERIC;
        RAISE NOTICE '✅ Added contract_value column to contracts table';
    ELSE
        RAISE NOTICE 'ℹ️ contract_value column already exists in contracts table';
    END IF;

    -- Add currency column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contracts' 
        AND column_name = 'currency'
    ) THEN
        ALTER TABLE contracts ADD COLUMN currency TEXT DEFAULT 'USD';
        RAISE NOTICE '✅ Added currency column to contracts table';
    ELSE
        RAISE NOTICE 'ℹ️ currency column already exists in contracts table';
    END IF;
END $$;

-- Step 4: Drop existing foreign key constraints if they exist
SELECT '🗑️ DROPPING EXISTING CONSTRAINTS:' as info;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_pitch_id_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_team_id_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_agent_id_fkey;
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_player_id_fkey;

-- Step 5: Create proper foreign key constraints
SELECT '🔗 CREATING FOREIGN KEY CONSTRAINTS:' as info;

-- Create pitch_id foreign key constraint
ALTER TABLE contracts 
ADD CONSTRAINT contracts_pitch_id_fkey 
FOREIGN KEY (pitch_id) REFERENCES transfer_pitches(id) ON DELETE CASCADE;

-- Create team_id foreign key constraint
ALTER TABLE contracts 
ADD CONSTRAINT contracts_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Create agent_id foreign key constraint
ALTER TABLE contracts 
ADD CONSTRAINT contracts_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Create player_id foreign key constraint
ALTER TABLE contracts 
ADD CONSTRAINT contracts_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Step 6: Fix RLS policies to be more permissive
SELECT '🔧 FIXING RLS POLICIES:' as info;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view related contracts" ON contracts;
DROP POLICY IF EXISTS "Teams and agents can create contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update their contracts" ON contracts;

-- Create more permissive policies for contracts
-- Allow authenticated users to view all contracts (needed for contract loading, etc.)
CREATE POLICY "Authenticated users can view contracts" ON contracts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow teams to create contracts
CREATE POLICY "Teams can create contracts" ON contracts
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Allow agents to create contracts
CREATE POLICY "Agents can create contracts" ON contracts
    FOR INSERT WITH CHECK (
        agent_id IN (
            SELECT a.id FROM agents a
            JOIN profiles p ON a.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Allow teams to update their contracts
CREATE POLICY "Teams can update their contracts" ON contracts
    FOR UPDATE USING (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN profiles p ON t.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Allow agents to update their contracts
CREATE POLICY "Agents can update their contracts" ON contracts
    FOR UPDATE USING (
        agent_id IN (
            SELECT a.id FROM agents a
            JOIN profiles p ON a.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- Step 7: Create indexes for better performance
SELECT '📊 CREATING INDEXES:' as info;

CREATE INDEX IF NOT EXISTS idx_contracts_pitch_id ON contracts(pitch_id);
CREATE INDEX IF NOT EXISTS idx_contracts_team_id ON contracts(team_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agent_id ON contracts(agent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_player_id ON contracts(player_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_deal_stage ON contracts(deal_stage);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);

-- Step 8: Verify constraints were created
SELECT '✅ VERIFYING CONSTRAINTS:' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'contracts'
ORDER BY tc.constraint_name;

-- Step 9: Test the relationships
SELECT '🧪 TESTING RELATIONSHIPS:' as info;

-- Test if we can join contracts with transfer_pitches
SELECT 
    'Testing contracts -> transfer_pitches join:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM contracts c
            JOIN transfer_pitches tp ON c.pitch_id = tp.id
            LIMIT 1
        )
        THEN '✅ Join works - relationship is established'
        ELSE '⚠️ No valid relationships found (this is OK if table is empty)'
    END as result;

-- Test if we can join contracts with teams
SELECT 
    'Testing contracts -> teams join:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM contracts c
            JOIN teams t ON c.team_id = t.id
            LIMIT 1
        )
        THEN '✅ Join works - relationship is established'
        ELSE '⚠️ No valid relationships found (this is OK if table is empty)'
    END as result;

-- Test if we can join contracts with agents
SELECT 
    'Testing contracts -> agents join:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM contracts c
            JOIN agents a ON c.agent_id = a.id
            LIMIT 1
        )
        THEN '✅ Join works - relationship is established'
        ELSE '⚠️ No valid relationships found (this is OK if table is empty)'
    END as result;

-- Step 10: Show sample data
SELECT '📋 SAMPLE DATA:' as info;

-- Show contracts
SELECT 
    'Contracts:' as table_name,
    id,
    pitch_id,
    team_id,
    agent_id,
    player_id,
    status,
    deal_stage,
    contract_value,
    currency,
    created_at
FROM contracts 
LIMIT 3;

-- Show transfer_pitches
SELECT 
    'Transfer Pitches:' as table_name,
    id,
    team_id,
    player_id,
    transfer_type,
    status,
    created_at
FROM transfer_pitches 
LIMIT 3;

-- Step 11: Final verification
SELECT '🎯 FINAL VERIFICATION:' as info;

SELECT 
    'contracts' as table_name,
    COUNT(*) as total_records,
    COUNT(pitch_id) as records_with_pitch_id,
    COUNT(team_id) as records_with_team_id,
    COUNT(agent_id) as records_with_agent_id,
    COUNT(player_id) as records_with_player_id
FROM contracts;

-- Check if foreign key constraints exist
SELECT 
    'Foreign key constraints on contracts:' as info,
    COUNT(*) as constraint_count
FROM information_schema.table_constraints 
WHERE table_name = 'contracts' 
AND constraint_type = 'FOREIGN KEY';

-- Check RLS policies
SELECT 
    'RLS Policies on contracts:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'contracts'
ORDER BY policyname;

SELECT '🎉 FIX COMPLETE!' as info;
SELECT 'The contracts table should now work properly with all relationships and policies fixed.' as next_steps;
