-- FIX MISSING COLUMNS FOR ONBOARDING FUNCTIONALITY
-- Run this script directly in your Supabase SQL Editor to fix the "year_founded" error

-- Step 1: Add missing columns to teams table
DO $$ 
BEGIN
    -- Add year_founded column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'year_founded') THEN
        ALTER TABLE teams ADD COLUMN year_founded INTEGER;
        RAISE NOTICE '✅ Added year_founded column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ year_founded column already exists in teams table';
    END IF;

    -- Add member_association column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'member_association') THEN
        ALTER TABLE teams ADD COLUMN member_association TEXT;
        RAISE NOTICE '✅ Added member_association column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ member_association column already exists in teams table';
    END IF;

    -- Add description column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'description') THEN
        ALTER TABLE teams ADD COLUMN description TEXT;
        RAISE NOTICE '✅ Added description column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ description column already exists in teams table';
    END IF;

    -- Add titles column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'titles') THEN
        ALTER TABLE teams ADD COLUMN titles TEXT[] DEFAULT '{}';
        RAISE NOTICE '✅ Added titles column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ titles column already exists in teams table';
    END IF;

    -- Add website column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'website') THEN
        ALTER TABLE teams ADD COLUMN website TEXT;
        RAISE NOTICE '✅ Added website column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ website column already exists in teams table';
    END IF;

    -- Add division column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'division') THEN
        ALTER TABLE teams ADD COLUMN division TEXT;
        RAISE NOTICE '✅ Added division column to teams table';
    ELSE
        RAISE NOTICE 'ℹ️ division column already exists in teams table';
    END IF;
END $$;

-- Step 2: Add missing columns to agents table
DO $$ 
BEGIN
    -- Add member_association column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'member_association') THEN
        ALTER TABLE agents ADD COLUMN member_association TEXT;
        RAISE NOTICE '✅ Added member_association column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ member_association column already exists in agents table';
    END IF;

    -- Add year_founded column
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'year_founded') THEN
        ALTER TABLE agents ADD COLUMN year_founded INTEGER;
        RAISE NOTICE '✅ Added year_founded column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ year_founded column already exists in agents table';
    END IF;
END $$;

-- Step 3: Verify the changes
SELECT '🔍 TEAMS TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'teams' 
ORDER BY ordinal_position;

SELECT '🔍 AGENTS TABLE STRUCTURE:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    COALESCE(column_default, 'NULL') as column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;

-- Step 4: Test if the problematic columns now exist
SELECT '🧪 TESTING MISSING COLUMNS:' as info;

-- Test teams table
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'year_founded') 
        THEN '✅ year_founded column exists in teams table'
        ELSE '❌ year_founded column missing from teams table'
    END as year_founded_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'member_association') 
        THEN '✅ member_association column exists in teams table'
        ELSE '❌ member_association column missing from teams table'
    END as member_association_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'description') 
        THEN '✅ description column exists in teams table'
        ELSE '❌ description column missing from teams table'
    END as description_status;

-- Test agents table
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'member_association') 
        THEN '✅ member_association column exists in agents table'
        ELSE '❌ member_association column missing from agents table'
    END as agents_member_association_status;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'year_founded') 
        THEN '✅ year_founded column exists in agents table'
        ELSE '❌ year_founded column missing from agents table'
    END as agents_year_founded_status;

-- Step 5: Summary
SELECT '🎯 SUMMARY:' as info;
SELECT 
    'All missing columns have been added successfully!' as message,
    'You can now complete the onboarding process without errors.' as next_step;
