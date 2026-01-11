-- FIX FOREIGN KEY RELATIONSHIPS
-- Run this script directly in your Supabase SQL Editor to fix the PGRST200 errors

-- Step 1: Check current table structures
SELECT '🔍 CHECKING CURRENT TABLE STRUCTURES:' as info;

-- Check videos table
SELECT '📹 VIDEOS TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'videos' 
ORDER BY ordinal_position;

-- Check players table
SELECT '👤 PLAYERS TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'players' 
ORDER BY ordinal_position;

-- Check teams table
SELECT '🏆 TEAMS TABLE:' as table_name;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'teams' 
ORDER BY ordinal_position;

-- Step 2: Check existing foreign key constraints
SELECT '🔗 CHECKING EXISTING FOREIGN KEYS:' as info;

SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('videos', 'players', 'teams')
ORDER BY tc.table_name, kcu.column_name;

-- Step 3: Fix videos table foreign key relationships
SELECT '🔧 FIXING VIDEOS TABLE RELATIONSHIPS:' as info;

-- Ensure videos table has the required columns
DO $$ 
BEGIN
    -- Add team_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'team_id') THEN
        ALTER TABLE videos ADD COLUMN team_id UUID;
        RAISE NOTICE '✅ Added team_id column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ team_id column already exists in videos table';
    END IF;

    -- Add player_id column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'player_id') THEN
        ALTER TABLE videos ADD COLUMN player_id UUID;
        RAISE NOTICE '✅ Added player_id column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ player_id column already exists in videos table';
    END IF;
END $$;

-- Drop existing foreign key constraints if they exist
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_team_id_fkey;
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_player_id_fkey;

-- Create proper foreign key constraints
ALTER TABLE videos 
ADD CONSTRAINT videos_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE videos 
ADD CONSTRAINT videos_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Step 4: Fix players table foreign key relationships
SELECT '🔧 FIXING PLAYERS TABLE RELATIONSHIPS:' as info;

-- Ensure players table has team_id column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'team_id') THEN
        ALTER TABLE players ADD COLUMN team_id UUID;
        RAISE NOTICE '✅ Added team_id column to players table';
    ELSE
        RAISE NOTICE 'ℹ️ team_id column already exists in players table';
    END IF;
END $$;

-- Drop existing foreign key constraint if it exists
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_id_fkey;

-- Create proper foreign key constraint
ALTER TABLE players 
ADD CONSTRAINT players_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Step 5: Add missing columns to videos table if needed
SELECT '🔧 ADDING MISSING COLUMNS TO VIDEOS:' as info;

DO $$ 
BEGIN
    -- Add tagged_players column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'tagged_players') THEN
        ALTER TABLE videos ADD COLUMN tagged_players JSONB DEFAULT '[]';
        RAISE NOTICE '✅ Added tagged_players column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ tagged_players column already exists in videos table';
    END IF;

    -- Add title column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'title') THEN
        ALTER TABLE videos ADD COLUMN title TEXT DEFAULT 'Untitled Video';
        RAISE NOTICE '✅ Added title column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ title column already exists in videos table';
    END IF;

    -- Add video_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'video_url') THEN
        ALTER TABLE videos ADD COLUMN video_url TEXT;
        RAISE NOTICE '✅ Added video_url column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ video_url column already exists in videos table';
    END IF;

    -- Add thumbnail_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE videos ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE '✅ Added thumbnail_url column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ thumbnail_url column already exists in videos table';
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'created_at') THEN
        ALTER TABLE videos ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        RAISE NOTICE '✅ Added created_at column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ created_at column already exists in videos table';
    END IF;
END $$;

-- Step 6: Verify foreign key relationships
SELECT '🔍 VERIFYING FOREIGN KEY RELATIONSHIPS:' as info;

-- Test videos -> teams relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'videos_team_id_fkey' 
            AND table_name = 'videos'
        ) 
        THEN '✅ videos -> teams foreign key exists'
        ELSE '❌ videos -> teams foreign key missing'
    END as videos_teams_fk_status;

-- Test videos -> players relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'videos_player_id_fkey' 
            AND table_name = 'videos'
        ) 
        THEN '✅ videos -> players foreign key exists'
        ELSE '❌ videos -> players foreign key missing'
    END as videos_players_fk_status;

-- Test players -> teams relationship
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'players_team_id_fkey' 
            AND table_name = 'players'
        ) 
        THEN '✅ players -> teams foreign key exists'
        ELSE '❌ players -> teams foreign key missing'
    END as players_teams_fk_status;

-- Step 7: Test the relationships
SELECT '🧪 TESTING RELATIONSHIPS:' as info;

-- Test if we can query videos with team information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM videos v
            JOIN teams t ON v.team_id = t.id
            LIMIT 1
        ) 
        THEN '✅ videos JOIN teams works'
        ELSE '❌ videos JOIN teams fails'
    END as videos_teams_join_status;

-- Test if we can query videos with player information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM videos v
            JOIN players p ON v.player_id = p.id
            LIMIT 1
        ) 
        THEN '✅ videos JOIN players works'
        ELSE '❌ videos JOIN players fails'
    END as videos_players_join_status;

-- Test if we can query players with team information
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM players p
            JOIN teams t ON p.team_id = t.id
            LIMIT 1
        ) 
        THEN '✅ players JOIN teams works'
        ELSE '❌ players JOIN teams fails'
    END as players_teams_join_status;

-- Step 8: Show sample data structure
SELECT '📊 SAMPLE DATA STRUCTURE:' as info;

-- Show videos table with relationships
SELECT 
    'videos' as table_name,
    COUNT(*) as total_videos,
    COUNT(team_id) as videos_with_team,
    COUNT(player_id) as videos_with_player
FROM videos;

-- Show players table with relationships
SELECT 
    'players' as table_name,
    COUNT(*) as total_players,
    COUNT(team_id) as players_with_team
FROM players;

-- Show teams table
SELECT 
    'teams' as table_name,
    COUNT(*) as total_teams
FROM teams;

-- Step 9: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'Foreign key relationships have been fixed successfully!' as message,
    'You should now be able to query videos with team and player information without PGRST200 errors.' as next_step;
