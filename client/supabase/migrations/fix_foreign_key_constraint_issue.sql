-- Fix foreign key constraint issue for transfer_pitches table
-- This script addresses the "fk_transfer_pitches_team_id" constraint violation

-- Step 1: Check for orphaned records in transfer_pitches
SELECT '🔍 CHECKING FOR ORPHANED RECORDS:' as info;

-- Check for transfer_pitches with invalid team_id
SELECT 
    'transfer_pitches with invalid team_id' as issue,
    COUNT(*) as count
FROM transfer_pitches tp
LEFT JOIN teams t ON tp.team_id = t.id
WHERE tp.team_id IS NOT NULL AND t.id IS NULL;

-- Check for transfer_pitches with invalid player_id
SELECT 
    'transfer_pitches with invalid player_id' as issue,
    COUNT(*) as count
FROM transfer_pitches tp
LEFT JOIN players p ON tp.player_id = p.id
WHERE tp.player_id IS NOT NULL AND p.id IS NULL;

-- Check for transfer_pitches with NULL team_id
SELECT 
    'transfer_pitches with NULL team_id' as issue,
    COUNT(*) as count
FROM transfer_pitches
WHERE team_id IS NULL;

-- Check for transfer_pitches with NULL player_id
SELECT 
    'transfer_pitches with NULL player_id' as issue,
    COUNT(*) as count
FROM transfer_pitches
WHERE player_id IS NULL;

-- Step 2: Fix orphaned records
SELECT '🔧 FIXING ORPHANED RECORDS:' as info;

-- Option 1: Delete orphaned records (if they're test data)
-- Uncomment the following lines if you want to delete orphaned records
/*
DELETE FROM transfer_pitches 
WHERE team_id IS NOT NULL 
AND team_id NOT IN (SELECT id FROM teams);

DELETE FROM transfer_pitches 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM players);
*/

-- Option 2: Update orphaned records with valid IDs (if you want to keep them)
-- First, let's see what teams and players exist
SELECT 'Available teams:' as info;
SELECT id, team_name FROM teams LIMIT 5;

SELECT 'Available players:' as info;
SELECT id, full_name FROM players LIMIT 5;

-- Step 3: Check and fix foreign key constraints
SELECT '🔧 CHECKING FOREIGN KEY CONSTRAINTS:' as info;

-- Check if the constraint exists with the expected name
SELECT 
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM information_schema.key_column_usage kcu
JOIN information_schema.referential_constraints rc 
    ON kcu.constraint_name = rc.constraint_name
WHERE kcu.table_name = 'transfer_pitches' 
AND kcu.column_name = 'team_id';

-- Step 4: Drop and recreate the foreign key constraint with proper name
SELECT '🔧 RECREATING FOREIGN KEY CONSTRAINTS:' as info;

-- Drop existing constraints (both possible names)
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS fk_transfer_pitches_team_id;
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_team_id_fkey;
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS fk_transfer_pitches_player_id;
ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_player_id_fkey;

-- Recreate the constraints with the correct names
ALTER TABLE transfer_pitches 
ADD CONSTRAINT transfer_pitches_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE transfer_pitches 
ADD CONSTRAINT transfer_pitches_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Step 5: Verify the constraints were created
SELECT '✅ VERIFYING CONSTRAINTS:' as info;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transfer_pitches_team_id_fkey' 
            AND table_name = 'transfer_pitches'
        ) 
        THEN '✅ transfer_pitches -> teams foreign key exists'
        ELSE '❌ transfer_pitches -> teams foreign key missing'
    END as transfer_pitches_teams_fk_status;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'transfer_pitches_player_id_fkey' 
            AND table_name = 'transfer_pitches'
        ) 
        THEN '✅ transfer_pitches -> players foreign key exists'
        ELSE '❌ transfer_pitches -> players foreign key missing'
    END as transfer_pitches_players_fk_status;

-- Step 6: Test the constraints
SELECT '🧪 TESTING CONSTRAINTS:' as info;

-- This should work if constraints are properly set up
SELECT 
    'Testing valid team_id reference' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM transfer_pitches tp
            JOIN teams t ON tp.team_id = t.id
            LIMIT 1
        )
        THEN '✅ Valid team_id references exist'
        ELSE '⚠️ No valid team_id references found'
    END as result;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_team_id ON transfer_pitches(team_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_player_id ON transfer_pitches(player_id);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_status ON transfer_pitches(status);
CREATE INDEX IF NOT EXISTS idx_transfer_pitches_expires_at ON transfer_pitches(expires_at);

-- Step 8: Final verification
SELECT '🎯 FINAL VERIFICATION:' as info;

SELECT 
    'transfer_pitches' as table_name,
    COUNT(*) as total_records,
    COUNT(team_id) as records_with_team_id,
    COUNT(player_id) as records_with_player_id,
    COUNT(CASE WHEN team_id IS NOT NULL AND player_id IS NOT NULL THEN 1 END) as complete_records
FROM transfer_pitches;

-- Show sample of valid records
SELECT 
    'Sample valid transfer_pitches records:' as info;
    
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
WHERE tp.team_id IS NOT NULL AND tp.player_id IS NOT NULL
LIMIT 5;
