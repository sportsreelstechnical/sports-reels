-- Quick diagnostic script to identify the foreign key constraint issue
-- Run this first to understand what's happening

-- 1. Check what foreign key constraints exist on transfer_pitches
SELECT 
    'Foreign Key Constraints on transfer_pitches:' as info;

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
AND tc.table_name = 'transfer_pitches';

-- 2. Check for any orphaned records
SELECT 
    'Orphaned Records Check:' as info;

-- Check team_id references
SELECT 
    'Invalid team_id references' as issue,
    COUNT(*) as count
FROM transfer_pitches tp
LEFT JOIN teams t ON tp.team_id = t.id
WHERE tp.team_id IS NOT NULL AND t.id IS NULL;

-- Check player_id references  
SELECT 
    'Invalid player_id references' as issue,
    COUNT(*) as count
FROM transfer_pitches tp
LEFT JOIN players p ON tp.player_id = p.id
WHERE tp.player_id IS NOT NULL AND p.id IS NULL;

-- 3. Check if teams and players tables have data
SELECT 
    'Teams table count:' as info,
    COUNT(*) as count
FROM teams;

SELECT 
    'Players table count:' as info,
    COUNT(*) as count
FROM players;

SELECT 
    'Transfer_pitches table count:' as info,
    COUNT(*) as count
FROM transfer_pitches;

-- 4. Show sample data
SELECT 
    'Sample teams:' as info;
SELECT id, team_name, profile_id FROM teams LIMIT 3;

SELECT 
    'Sample players:' as info;
SELECT id, full_name FROM players LIMIT 3;

SELECT 
    'Sample transfer_pitches:' as info;
SELECT id, team_id, player_id, status FROM transfer_pitches LIMIT 3;
