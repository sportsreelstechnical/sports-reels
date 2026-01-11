-- Safe fix for foreign key constraint violation
-- This script fixes the data without deleting contracts

-- Step 1: Check current state
SELECT '🔍 CHECKING CURRENT STATE:' as info;

-- Check what contracts reference transfer_pitches
SELECT 
    'Contracts referencing transfer_pitches:' as info;
SELECT 
    c.id as contract_id,
    c.pitch_id,
    tp.id as transfer_pitch_id,
    tp.team_id,
    tp.player_id,
    c.status as contract_status
FROM contracts c
LEFT JOIN transfer_pitches tp ON c.pitch_id = tp.id
ORDER BY c.created_at DESC;

-- Check for orphaned transfer_pitches
SELECT 
    'Orphaned transfer_pitches count:' as info,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN teams t ON tp.team_id = t.id
     WHERE tp.team_id IS NOT NULL AND t.id IS NULL) as invalid_team_refs,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN players p ON tp.player_id = p.id
     WHERE tp.player_id IS NOT NULL AND p.id IS NULL) as invalid_player_refs;

-- Step 2: Fix invalid team_id references
SELECT '🔧 FIXING INVALID TEAM_ID REFERENCES:' as info;

-- Set invalid team_id to NULL instead of deleting
UPDATE transfer_pitches 
SET team_id = NULL
WHERE team_id IS NOT NULL 
AND team_id NOT IN (SELECT id FROM teams);

SELECT '✅ Invalid team_id references set to NULL.' as info;

-- Step 3: Fix invalid player_id references
SELECT '🔧 FIXING INVALID PLAYER_ID REFERENCES:' as info;

-- Set invalid player_id to NULL instead of deleting
UPDATE transfer_pitches 
SET player_id = NULL
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM players);

SELECT '✅ Invalid player_id references set to NULL.' as info;

-- Step 4: Verify the fix
SELECT '✅ VERIFYING FIX:' as info;

-- Check remaining invalid references
SELECT 
    'Remaining invalid references:' as info,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN teams t ON tp.team_id = t.id
     WHERE tp.team_id IS NOT NULL AND t.id IS NULL) as invalid_team_refs,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN players p ON tp.player_id = p.id
     WHERE tp.player_id IS NOT NULL AND p.id IS NULL) as invalid_player_refs;

-- Check contracts status (should remain intact)
SELECT 
    'Contracts status:' as info,
    COUNT(*) as contract_count
FROM contracts;

-- Check transfer_pitches status
SELECT 
    'transfer_pitches status:' as info,
    COUNT(*) as total_records,
    COUNT(team_id) as records_with_team_id,
    COUNT(player_id) as records_with_player_id
FROM transfer_pitches;

-- Step 5: Test the constraint
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

-- Step 6: Final status
SELECT '🎯 FINAL STATUS:' as info;

SELECT 
    'transfer_pitches table status:' as info,
    COUNT(*) as total_records,
    COUNT(team_id) as records_with_team_id,
    COUNT(player_id) as records_with_player_id,
    COUNT(CASE WHEN team_id IS NULL AND player_id IS NULL THEN 1 END) as records_with_null_refs
FROM transfer_pitches;

SELECT '✅ Foreign key constraints should now work properly without losing contracts.' as info;
