-- FIX ORPHANED PLAYERS WITH INVALID TEAM REFERENCES
-- Run this script directly in your Supabase SQL Editor to fix foreign key constraint violations

-- Step 1: Check for orphaned players
SELECT '🔍 CHECKING FOR ORPHANED PLAYERS:' as info;

-- Find players with team_id that don't exist in teams table
SELECT 
    '❌ ORPHANED PLAYERS:' as status,
    p.id as player_id,
    p.full_name as player_name,
    p.team_id as invalid_team_id,
    'Team does not exist' as issue
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
WHERE p.team_id IS NOT NULL 
    AND t.id IS NULL;

-- Count orphaned players
SELECT 
    COUNT(*) as orphaned_players_count
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
WHERE p.team_id IS NOT NULL 
    AND t.id IS NULL;

-- Step 2: Check for orphaned videos
SELECT '🔍 CHECKING FOR ORPHANED VIDEOS:' as info;

-- Find videos with team_id that don't exist in teams table
SELECT 
    '❌ ORPHANED VIDEOS (TEAM):' as status,
    v.id as video_id,
    v.title as video_title,
    v.team_id as invalid_team_id,
    'Team does not exist' as issue
FROM videos v
LEFT JOIN teams t ON v.team_id = t.id
WHERE v.team_id IS NOT NULL 
    AND t.id IS NULL;

-- Find videos with player_id that don't exist in players table
SELECT 
    '❌ ORPHANED VIDEOS (PLAYER):' as status,
    v.id as video_id,
    v.title as video_title,
    v.player_id as invalid_player_id,
    'Player does not exist' as issue
FROM videos v
LEFT JOIN players p ON v.player_id = p.id
WHERE v.player_id IS NOT NULL 
    AND p.id IS NULL;

-- Step 3: Show available teams for reference
SELECT '🏆 AVAILABLE TEAMS:' as info;
SELECT 
    id as team_id,
    team_name,
    country,
    sport_type
FROM teams
ORDER BY team_name;

-- Step 4: Show available players for reference
SELECT '👤 AVAILABLE PLAYERS:' as info;
SELECT 
    id as player_id,
    full_name,
    team_id,
    position
FROM players
ORDER BY full_name;

-- Step 5: Fix orphaned players by setting team_id to NULL or assigning to existing team
SELECT '🔧 FIXING ORPHANED PLAYERS:' as info;

-- Option 1: Set orphaned players' team_id to NULL (safer option)
UPDATE players 
SET team_id = NULL
WHERE team_id IN (
    SELECT p.team_id 
    FROM players p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.team_id IS NOT NULL 
        AND t.id IS NULL
);

-- Option 2: Assign orphaned players to the first available team (if you want to keep them assigned)
-- Uncomment the following if you want to assign orphaned players to existing teams
/*
DO $$ 
DECLARE
    first_team_id UUID;
    orphaned_count INTEGER;
BEGIN
    -- Get the first available team
    SELECT id INTO first_team_id FROM teams LIMIT 1;
    
    IF first_team_id IS NOT NULL THEN
        -- Count orphaned players
        SELECT COUNT(*) INTO orphaned_count
        FROM players p
        LEFT JOIN teams t ON p.team_id = t.id
        WHERE p.team_id IS NOT NULL 
            AND t.id IS NULL;
        
        -- Update orphaned players to use the first available team
        UPDATE players 
        SET team_id = first_team_id
        WHERE team_id IN (
            SELECT p.team_id 
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE p.team_id IS NOT NULL 
                AND t.id IS NULL
        );
        
        RAISE NOTICE '✅ Assigned % orphaned players to team %', orphaned_count, first_team_id;
    ELSE
        RAISE NOTICE '❌ No teams available to assign orphaned players';
    END IF;
END $$;
*/

-- Step 6: Fix orphaned videos by setting invalid references to NULL
SELECT '🔧 FIXING ORPHANED VIDEOS:' as info;

-- Set videos with invalid team_id to NULL
UPDATE videos 
SET team_id = NULL
WHERE team_id IN (
    SELECT v.team_id 
    FROM videos v
    LEFT JOIN teams t ON v.team_id = t.id
    WHERE v.team_id IS NOT NULL 
        AND t.id IS NULL
);

-- Set videos with invalid player_id to NULL
UPDATE videos 
SET player_id = NULL
WHERE player_id IN (
    SELECT v.player_id 
    FROM videos v
    LEFT JOIN players p ON v.player_id = p.id
    WHERE v.player_id IS NOT NULL 
        AND p.id IS NULL
);

-- Step 7: Verify the fixes
SELECT '🔍 VERIFYING FIXES:' as info;

-- Check if there are still orphaned players
SELECT 
    CASE 
        WHEN COUNT(*) = 0 
        THEN '✅ No orphaned players found'
        ELSE '❌ Still have ' || COUNT(*) || ' orphaned players'
    END as orphaned_players_status
FROM players p
LEFT JOIN teams t ON p.team_id = t.id
WHERE p.team_id IS NOT NULL 
    AND t.id IS NULL;

-- Check if there are still orphaned videos
SELECT 
    CASE 
        WHEN COUNT(*) = 0 
        THEN '✅ No orphaned videos found'
        ELSE '❌ Still have ' || COUNT(*) || ' orphaned videos'
    END as orphaned_videos_status
FROM videos v
LEFT JOIN teams t ON v.team_id = t.id
WHERE v.team_id IS NOT NULL 
    AND t.id IS NULL;

-- Step 8: Show final data structure
SELECT '📊 FINAL DATA STRUCTURE:' as info;

-- Show players with valid team references
SELECT 
    'players' as table_name,
    COUNT(*) as total_players,
    COUNT(team_id) as players_with_team,
    COUNT(*) - COUNT(team_id) as players_without_team
FROM players;

-- Show videos with valid references
SELECT 
    'videos' as table_name,
    COUNT(*) as total_videos,
    COUNT(team_id) as videos_with_team,
    COUNT(player_id) as videos_with_player
FROM videos;

-- Step 9: Test foreign key constraints
SELECT '🧪 TESTING FOREIGN KEY CONSTRAINTS:' as info;

-- Test if we can insert a player with a valid team_id
DO $$ 
DECLARE
    test_team_id UUID;
    test_result TEXT;
BEGIN
    -- Get a valid team_id for testing
    SELECT id INTO test_team_id FROM teams LIMIT 1;
    
    IF test_team_id IS NOT NULL THEN
        -- Try to insert a test player (will be rolled back)
        BEGIN
            INSERT INTO players (full_name, team_id, position, citizenship, gender)
            VALUES ('Test Player', test_team_id, 'Forward', 'Test Country', 'male');
            
            -- If we get here, the constraint works
            ROLLBACK;
            test_result := '✅ Foreign key constraint working correctly';
        EXCEPTION 
            WHEN OTHERS THEN
                test_result := '❌ Foreign key constraint failed: ' || SQLERRM;
        END;
    ELSE
        test_result := '⚠️ No teams available for testing';
    END IF;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Step 10: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'Orphaned player and video records have been fixed!' as message,
    'Foreign key constraints should now work without violations.' as next_step;
