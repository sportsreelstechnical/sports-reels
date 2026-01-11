-- Fix foreign key constraint violation for transfer_pitches
-- This script addresses the "transfer_pitches_team_id_fkey" constraint violation

-- Step 1: Diagnose the issue
SELECT '🔍 DIAGNOSING FOREIGN KEY VIOLATION:' as info;

-- Check what team_id values are being used in transfer_pitches
SELECT 
    'Current team_id values in transfer_pitches:' as info;
SELECT 
    tp.team_id,
    COUNT(*) as count,
    CASE 
        WHEN t.id IS NULL THEN '❌ INVALID - team does not exist'
        ELSE '✅ VALID - team exists'
    END as status
FROM transfer_pitches tp
LEFT JOIN teams t ON tp.team_id = t.id
GROUP BY tp.team_id, t.id
ORDER BY count DESC;

-- Check what teams actually exist
SELECT 
    'Available teams:' as info;
SELECT 
    id,
    team_name,
    profile_id
FROM teams
ORDER BY team_name;

-- Step 2: Find orphaned records
SELECT '🧹 FINDING ORPHANED RECORDS:' as info;

-- Find transfer_pitches with invalid team_id
SELECT 
    'Invalid team_id references:' as info,
    COUNT(*) as count
FROM transfer_pitches tp
LEFT JOIN teams t ON tp.team_id = t.id
WHERE tp.team_id IS NOT NULL AND t.id IS NULL;

-- Find transfer_pitches with invalid player_id
SELECT 
    'Invalid player_id references:' as info,
    COUNT(*) as count
FROM transfer_pitches tp
LEFT JOIN players p ON tp.player_id = p.id
WHERE tp.player_id IS NOT NULL AND p.id IS NULL;

-- Step 3: Show problematic records
SELECT '📋 PROBLEMATIC RECORDS:' as info;

-- Show transfer_pitches with invalid team_id
SELECT 
    'transfer_pitches with invalid team_id:' as info;
SELECT 
    tp.id,
    tp.team_id,
    tp.player_id,
    tp.status,
    tp.created_at,
    'INVALID TEAM_ID' as issue
FROM transfer_pitches tp
LEFT JOIN teams t ON tp.team_id = t.id
WHERE tp.team_id IS NOT NULL AND t.id IS NULL
LIMIT 10;

-- Show transfer_pitches with invalid player_id
SELECT 
    'transfer_pitches with invalid player_id:' as info;
SELECT 
    tp.id,
    tp.team_id,
    tp.player_id,
    tp.status,
    tp.created_at,
    'INVALID PLAYER_ID' as issue
FROM transfer_pitches tp
LEFT JOIN players p ON tp.player_id = p.id
WHERE tp.player_id IS NOT NULL AND p.id IS NULL
LIMIT 10;

-- Step 4: Fix options
SELECT '🔧 FIX OPTIONS:' as info;

-- Option 1: Delete orphaned records (uncomment if you want to delete them)
/*
SELECT 'Deleting orphaned transfer_pitches records...' as info;

-- Delete records with invalid team_id
DELETE FROM transfer_pitches 
WHERE team_id IS NOT NULL 
AND team_id NOT IN (SELECT id FROM teams);

-- Delete records with invalid player_id
DELETE FROM transfer_pitches 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM players);

SELECT 'Orphaned records deleted.' as info;
*/

-- Option 2: Set invalid references to NULL (uncomment if you want to nullify them)
/*
SELECT 'Setting invalid references to NULL...' as info;

-- Set invalid team_id to NULL
UPDATE transfer_pitches 
SET team_id = NULL
WHERE team_id IS NOT NULL 
AND team_id NOT IN (SELECT id FROM teams);

-- Set invalid player_id to NULL
UPDATE transfer_pitches 
SET player_id = NULL
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM players);

SELECT 'Invalid references set to NULL.' as info;
*/

-- Step 5: Verify the fix
SELECT '✅ VERIFYING FIX:' as info;

-- Check if there are still invalid references
SELECT 
    'Remaining invalid team_id references:' as info,
    COUNT(*) as count
FROM transfer_pitches tp
LEFT JOIN teams t ON tp.team_id = t.id
WHERE tp.team_id IS NOT NULL AND t.id IS NULL;

SELECT 
    'Remaining invalid player_id references:' as info,
    COUNT(*) as count
FROM transfer_pitches tp
LEFT JOIN players p ON tp.player_id = p.id
WHERE tp.player_id IS NOT NULL AND p.id IS NULL;

-- Step 6: Test inserting a valid record
SELECT '🧪 TESTING INSERT:' as info;

-- Show a valid team and player for testing
SELECT 
    'Valid team for testing:' as info,
    t.id as team_id,
    t.team_name
FROM teams t
LIMIT 1;

SELECT 
    'Valid player for testing:' as info,
    p.id as player_id,
    p.full_name
FROM players p
LIMIT 1;

-- Step 7: Final verification
SELECT '🎯 FINAL VERIFICATION:' as info;

-- Check foreign key constraints
SELECT 
    'Foreign key constraints on transfer_pitches:' as info;
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

-- Check table statistics
SELECT 
    'transfer_pitches table statistics:' as info,
    COUNT(*) as total_records,
    COUNT(team_id) as records_with_team_id,
    COUNT(player_id) as records_with_player_id,
    COUNT(CASE WHEN team_id IS NOT NULL AND player_id IS NOT NULL THEN 1 END) as complete_records
FROM transfer_pitches;
