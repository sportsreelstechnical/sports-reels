-- FIX VIDEOS TABLE SCHEMA
-- Run this script directly in your Supabase SQL Editor to fix missing columns

-- Step 1: Check current videos table structure
SELECT '🔍 CHECKING CURRENT VIDEOS TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'videos' 
ORDER BY ordinal_position;

-- Step 2: Add missing columns to videos table
SELECT '🔧 ADDING MISSING COLUMNS TO VIDEOS:' as info;

DO $$ 
BEGIN
    -- Add score column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'score') THEN
        ALTER TABLE videos ADD COLUMN score TEXT;
        RAISE NOTICE '✅ Added score column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ score column already exists in videos table';
    END IF;

    -- Add league_competition column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'league_competition') THEN
        ALTER TABLE videos ADD COLUMN league_competition TEXT;
        RAISE NOTICE '✅ Added league_competition column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ league_competition column already exists in videos table';
    END IF;

    -- Add opposing_team column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'opposing_team') THEN
        ALTER TABLE videos ADD COLUMN opposing_team TEXT;
        RAISE NOTICE '✅ Added opposing_team column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ opposing_team column already exists in videos table';
    END IF;

    -- Add match_date column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'match_date') THEN
        ALTER TABLE videos ADD COLUMN match_date DATE;
        RAISE NOTICE '✅ Added match_date column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ match_date column already exists in videos table';
    END IF;

    -- Add video_type column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'video_type') THEN
        ALTER TABLE videos ADD COLUMN video_type TEXT DEFAULT 'highlight';
        RAISE NOTICE '✅ Added video_type column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ video_type column already exists in videos table';
    END IF;

    -- Add duration column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'duration') THEN
        ALTER TABLE videos ADD COLUMN duration INTEGER;
        RAISE NOTICE '✅ Added duration column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ duration column already exists in videos table';
    END IF;

    -- Add tags column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'tags') THEN
        ALTER TABLE videos ADD COLUMN tags TEXT[] DEFAULT '{}';
        RAISE NOTICE '✅ Added tags column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ tags column already exists in videos table';
    END IF;

    -- Add ai_analysis_status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'ai_analysis_status') THEN
        ALTER TABLE videos ADD COLUMN ai_analysis_status TEXT DEFAULT 'pending';
        RAISE NOTICE '✅ Added ai_analysis_status column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ ai_analysis_status column already exists in videos table';
    END IF;

    -- Add description column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'description') THEN
        ALTER TABLE videos ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ description column already exists in videos table';
    END IF;

    -- Add home_or_away column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'home_or_away') THEN
        ALTER TABLE videos ADD COLUMN home_or_away TEXT CHECK (home_or_away IN ('home', 'away'));
        RAISE NOTICE '✅ Added home_or_away column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ home_or_away column already exists in videos table';
    END IF;

    -- Add final_score_home column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'final_score_home') THEN
        ALTER TABLE videos ADD COLUMN final_score_home INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added final_score_home column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ final_score_home column already exists in videos table';
    END IF;

    -- Add final_score_away column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'final_score_away') THEN
        ALTER TABLE videos ADD COLUMN final_score_away INTEGER DEFAULT 0;
        RAISE NOTICE '✅ Added final_score_away column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ final_score_away column already exists in videos table';
    END IF;

    -- Add file_size column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'file_size') THEN
        ALTER TABLE videos ADD COLUMN file_size BIGINT;
        RAISE NOTICE '✅ Added file_size column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ file_size column already exists in videos table';
    END IF;

    -- Add compressed_url column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'compressed_url') THEN
        ALTER TABLE videos ADD COLUMN compressed_url TEXT;
        RAISE NOTICE '✅ Added compressed_url column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ compressed_url column already exists in videos table';
    END IF;

    -- Add upload_status column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'upload_status') THEN
        ALTER TABLE videos ADD COLUMN upload_status TEXT DEFAULT 'processing' CHECK (upload_status IN ('processing', 'completed', 'failed'));
        RAISE NOTICE '✅ Added upload_status column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ upload_status column already exists in videos table';
    END IF;

    -- Add is_public column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'is_public') THEN
        ALTER TABLE videos ADD COLUMN is_public BOOLEAN DEFAULT true;
        RAISE NOTICE '✅ Added is_public column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ is_public column already exists in videos table';
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'updated_at') THEN
        ALTER TABLE videos ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
        RAISE NOTICE '✅ Added updated_at column to videos table';
    ELSE
        RAISE NOTICE 'ℹ️ updated_at column already exists in videos table';
    END IF;
END $$;

-- Step 3: Verify the new structure
SELECT '🔍 VERIFYING NEW VIDEOS TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'videos' 
ORDER BY ordinal_position;

-- Step 4: Test inserting a video with the new schema
SELECT '🧪 TESTING VIDEO INSERTION:' as info;

DO $$ 
DECLARE
    test_team_id UUID;
    test_result TEXT;
BEGIN
    -- Get a valid team_id for testing
    SELECT id INTO test_team_id FROM teams LIMIT 1;
    
    IF test_team_id IS NOT NULL THEN
        -- Try to insert a test video (will be rolled back)
        BEGIN
            INSERT INTO videos (
                title, 
                description, 
                video_url, 
                thumbnail_url, 
                duration, 
                tags, 
                opposing_team, 
                match_date, 
                score, 
                league_competition, 
                video_type, 
                ai_analysis_status, 
                team_id
            ) VALUES (
                'Test Match Video', 
                'Test description', 
                'https://example.com/test.mp4', 
                'https://example.com/thumbnail.jpg', 
                120, 
                ARRAY['Player1', 'Player2'], 
                'Opposing Team', 
                '2025-01-01', 
                '2-1', 
                'Test League', 
                'match', 
                'pending', 
                test_team_id
            );
            
            -- If we get here, the insert works
            ROLLBACK;
            test_result := '✅ Video insertion working correctly with new schema';
        EXCEPTION 
            WHEN OTHERS THEN
                test_result := '❌ Video insertion failed: ' || SQLERRM;
        END;
    ELSE
        test_result := '⚠️ No teams available for testing';
    END IF;
    
    RAISE NOTICE '%', test_result;
END $$;

-- Step 5: Show sample data structure
SELECT '📊 SAMPLE DATA STRUCTURE:' as info;

-- Show videos table with new columns
SELECT 
    'videos' as table_name,
    COUNT(*) as total_videos,
    COUNT(team_id) as videos_with_team,
    COUNT(player_id) as videos_with_player,
    COUNT(score) as videos_with_score,
    COUNT(league_competition) as videos_with_league,
    COUNT(opposing_team) as videos_with_opponent
FROM videos;

-- Step 6: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'Videos table schema has been updated successfully!' as message,
    'You should now be able to insert videos with all the required columns including score, league_competition, etc.' as next_step;
