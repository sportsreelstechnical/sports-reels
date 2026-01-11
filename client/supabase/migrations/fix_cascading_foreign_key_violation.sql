-- Fix cascading foreign key constraint violation
-- This script handles the contracts_pitch_id_fkey constraint when cleaning up transfer_pitches

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
    c.status as contract_status,
    c.created_at as contract_created
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

-- Step 2: Handle contracts first
SELECT '🔧 HANDLING CONTRACTS:' as info;

-- Option 1: Delete contracts that reference invalid transfer_pitches
SELECT 'Deleting contracts with invalid pitch references...' as info;

DELETE FROM contracts 
WHERE pitch_id IN (
    SELECT tp.id FROM transfer_pitches tp
    LEFT JOIN teams t ON tp.team_id = t.id
    WHERE tp.team_id IS NOT NULL AND t.id IS NULL
);

DELETE FROM contracts 
WHERE pitch_id IN (
    SELECT tp.id FROM transfer_pitches tp
    LEFT JOIN players p ON tp.player_id = p.id
    WHERE tp.player_id IS NOT NULL AND p.id IS NULL
);

SELECT '✅ Contracts with invalid pitch references deleted.' as info;

-- Step 3: Now clean up transfer_pitches
SELECT '🧹 CLEANING UP TRANSFER_PITCHES:' as info;

-- Delete records with invalid team_id
DELETE FROM transfer_pitches 
WHERE team_id IS NOT NULL 
AND team_id NOT IN (SELECT id FROM teams);

-- Delete records with invalid player_id
DELETE FROM transfer_pitches 
WHERE player_id IS NOT NULL 
AND player_id NOT IN (SELECT id FROM players);

SELECT '✅ Orphaned transfer_pitches records cleaned up.' as info;

-- Step 4: Verify the fix
SELECT '✅ VERIFYING FIX:' as info;

-- Check remaining orphaned records
SELECT 
    'Remaining orphaned records:' as info,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN teams t ON tp.team_id = t.id
     WHERE tp.team_id IS NOT NULL AND t.id IS NULL) as invalid_team_refs,
    (SELECT COUNT(*) FROM transfer_pitches tp
     LEFT JOIN players p ON tp.player_id = p.id
     WHERE tp.player_id IS NOT NULL AND p.id IS NULL) as invalid_player_refs;

-- Check contracts status
SELECT 
    'Remaining contracts:' as info,
    COUNT(*) as contract_count
FROM contracts;

-- Check transfer_pitches status
SELECT 
    'Remaining transfer_pitches:' as info,
    COUNT(*) as pitch_count
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
    COUNT(player_id) as records_with_player_id
FROM transfer_pitches;

SELECT 
    'contracts table status:' as info,
    COUNT(*) as total_contracts,
    COUNT(pitch_id) as contracts_with_pitch_id
FROM contracts;

SELECT '✅ Foreign key constraints should now work properly.' as info;
