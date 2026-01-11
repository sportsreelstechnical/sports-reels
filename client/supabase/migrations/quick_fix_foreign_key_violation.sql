-- Quick fix for foreign key constraint violation
-- This script will clean up orphaned records and fix the constraint issue

-- Step 1: Check current state
SELECT '🔍 CHECKING CURRENT STATE:' as info;

SELECT 
    'Orphaned records count:' as info,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN teams t ON tp.team_id = t.id
     WHERE tp.team_id IS NOT NULL AND t.id IS NULL) as invalid_team_refs,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN players p ON tp.player_id = p.id
     WHERE tp.player_id IS NOT NULL AND p.id IS NULL) as invalid_player_refs;

-- Step 2: Clean up orphaned records
SELECT '🧹 CLEANING UP ORPHANED RECORDS:' as info;

-- Delete records with invalid team_id
DELETE FROM transfer_pitches 
WHERE team_id IS NOT NULL 
AND team_id NOT IN (SELECT id FROM teams);

-- Delete records with invalid player_id
DELETE FROM transfer_pitches 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM players);

SELECT '✅ Orphaned records cleaned up.' as info;

-- Step 3: Verify the fix
SELECT '✅ VERIFYING FIX:' as info;

SELECT 
    'Remaining orphaned records:' as info,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN teams t ON tp.team_id = t.id
     WHERE tp.team_id IS NOT NULL AND t.id IS NULL) as invalid_team_refs,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN players p ON tp.player_id = p.id
     WHERE tp.player_id IS NOT NULL AND p.id IS NULL) as invalid_player_refs;

-- Step 4: Test the constraint
SELECT '🧪 TESTING CONSTRAINT:' as info;

-- Show available teams and players for testing
SELECT 
    'Available teams:' as info,
    COUNT(*) as team_count
FROM teams;

SELECT 
    'Available players:' as info,
    COUNT(*) as player_count
FROM players;

-- Step 5: Final status
SELECT '🎯 FINAL STATUS:' as info;

SELECT 
    'transfer_pitches table status:' as info,
    COUNT(*) as total_records,
    COUNT(team_id) as records_with_team_id,
    COUNT(player_id) as records_with_player_id
FROM transfer_pitches;

SELECT '✅ Foreign key constraint should now work properly.' as info;
