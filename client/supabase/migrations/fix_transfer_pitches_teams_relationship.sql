-- Comprehensive fix for transfer_pitches and teams relationship
-- This script ensures the foreign key relationship is properly established

-- Step 1: Check current state
SELECT '🔍 CHECKING CURRENT STATE:' as info;

-- Check if transfer_pitches table exists and has team_id column
SELECT 
    'transfer_pitches table structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transfer_pitches' 
AND column_name IN ('team_id', 'player_id')
ORDER BY column_name;

-- Check if teams table exists
SELECT 
    'teams table structure:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'teams' 
AND column_name = 'id'
ORDER BY column_name;

-- Step 2: Ensure transfer_pitches has the required columns
SELECT '🔧 ENSURING REQUIRED COLUMNS:' as info;

-- Add team_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transfer_pitches' 
        AND column_name = 'team_id'
    ) THEN
        ALTER TABLE transfer_pitches ADD COLUMN team_id UUID;
        RAISE NOTICE '✅ Added team_id column to transfer_pitches';
    ELSE
        RAISE NOTICE 'ℹ️ team_id column already exists in transfer_pitches';
    END IF;
END $$;

-- Add player_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transfer_pitches' 
        AND column_name = 'player_id'
    ) THEN
        ALTER TABLE transfer_pitches ADD COLUMN player_id UUID;
        RAISE NOTICE '✅ Added player_id column to transfer_pitches';
    ELSE
        RAISE NOTICE 'ℹ️ player_id column already exists in transfer_pitches';
    END IF;
END $$;

-- Step 3: Clean up orphaned records
SELECT '🧹 CLEANING UP ORPHANED RECORDS:' as info;

-- Check for orphaned records
SELECT 
    'Orphaned records check:' as info,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN teams t ON tp.team_id = t.id
     WHERE tp.team_id IS NOT NULL AND t.id IS NULL) as invalid_team_refs,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN players p ON tp.player_id = p.id
     WHERE tp.player_id IS NOT NULL AND p.id IS NULL) as invalid_player_refs;

-- Delete orphaned records (uncomment if you want to delete them)
/*
DELETE FROM transfer_pitches 
WHERE team_id IS NOT NULL 
AND team_id NOT IN (SELECT id FROM teams);

DELETE FROM transfer_pitches 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM players);
*/

-- Step 4: Drop existing foreign key constraints
SELECT '🗑️ DROPPING EXISTING CONSTRAINTS:' as info;

-- Drop all possible constraint names
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS fk_transfer_pitches_team_id;
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_team_id_fkey;
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS fk_transfer_pitches_player_id;
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_player_id_fkey;

-- Step 5: Create proper foreign key constraints
SELECT '🔗 CREATING FOREIGN KEY CONSTRAINTS:' as info;

-- Create team_id foreign key constraint
ALTER TABLE transfer_pitches 
ADD CONSTRAINT transfer_pitches_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Create player_id foreign key constraint
ALTER TABLE transfer_pitches 
ADD CONSTRAINT transfer_pitches_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Step 6: Verify constraints were created
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
AND tc.table_name = 'transfer_pitches'
ORDER BY tc.constraint_name;

-- Step 7: Create indexes for performance
SELECT '📊 CREATING INDEXES:' as info;

CREATE INDEX IF NOT EXISTS idx_transfer_pitches_team_id ON transfer_pitches(team_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_player_id ON transfer_pitches(player_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_status ON transfer_pitches(status);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_expires_at ON transfer_pitches(expires_at);

-- Step 8: Test the relationship
SELECT '🧪 TESTING RELATIONSHIP:' as info;

-- Test if we can join transfer_pitches with teams
SELECT 
    'Testing transfer_pitches -> teams join:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM transfer_pitches tp
            JOIN teams t ON tp.team_id = t.id
            LIMIT 1
        )
        THEN '✅ Join works - relationship is established'
        ELSE '⚠️ No valid relationships found (this is OK if table is empty)'
    END as result;

-- Test if we can join transfer_pitches with players
SELECT 
    'Testing transfer_pitches -> players join:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM transfer_pitches tp
            JOIN players p ON tp.player_id = p.id
            LIMIT 1
        )
        THEN '✅ Join works - relationship is established'
        ELSE '⚠️ No valid relationships found (this is OK if table is empty)'
    END as result;

-- Step 9: Show sample data
SELECT '📋 SAMPLE DATA:' as info;

-- Show teams
SELECT 'Available teams:' as info;
SELECT id, team_name, profile_id FROM teams LIMIT 5;

-- Show players
SELECT 'Available players:' as info;
SELECT id, full_name FROM players LIMIT 5;

-- Show transfer_pitches
SELECT 'Transfer pitches:' as info;
SELECT 
    tp.id,
    tp.team_id,
    t.team_name,
    tp.player_id,
    p.full_name as player_name,
    tp.status
FROM transfer_pitches tp
LEFT JOIN teams t ON tp.team_id = t.id
LEFT JOIN players p ON tp.player_id = p.id
LIMIT 5;

-- Step 10: Final verification
SELECT '🎯 FINAL VERIFICATION:' as info;

SELECT 
    'transfer_pitches' as table_name,
    COUNT(*) as total_records,
    COUNT(team_id) as records_with_team_id,
    COUNT(player_id) as records_with_player_id,
    COUNT(CASE WHEN team_id IS NOT NULL AND player_id IS NOT NULL THEN 1 END) as complete_records
FROM transfer_pitches;

-- Check if foreign key constraints exist
SELECT 
    'Foreign key constraints on transfer_pitches:' as info,
    COUNT(*) as constraint_count
FROM information_schema.table_constraints 
WHERE table_name = 'transfer_pitches' 
AND constraint_type = 'FOREIGN KEY';
