-- Fix contracts and transfer_pitches relationship
-- This script ensures the foreign key relationship is properly established

-- Step 1: Check current contracts table structure
SELECT '🔍 CHECKING CONTRACTS TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name IN ('pitch_id', 'team_id', 'agent_id', 'player_id')
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

-- Step 3: Ensure pitch_id column exists
SELECT '🔧 ENSURING PITCH_ID COLUMN:' as info;

DO $$ 
BEGIN
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

-- Step 6: Create indexes for better performance
SELECT '📊 CREATING INDEXES:' as info;

CREATE INDEX IF NOT EXISTS idx_contracts_pitch_id ON contracts(pitch_id);
CREATE INDEX IF NOT EXISTS idx_contracts_team_id ON contracts(team_id);
CREATE INDEX IF NOT EXISTS idx_contracts_agent_id ON contracts(agent_id);
CREATE INDEX IF NOT EXISTS idx_contracts_player_id ON contracts(player_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_deal_stage ON contracts(deal_stage);

-- Step 7: Verify constraints were created
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

-- Step 8: Test the relationship
SELECT '🧪 TESTING RELATIONSHIP:' as info;

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

-- Step 9: Show sample data
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

-- Step 10: Final verification
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

SELECT '🎉 FIX COMPLETE!' as info;
SELECT 'The contracts -> transfer_pitches relationship should now be working.' as next_steps;
