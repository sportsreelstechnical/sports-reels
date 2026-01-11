-- Add missing columns to teams table for onboarding functionality
-- This migration adds columns that are referenced in the frontend but missing from the database

-- Add year_founded column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'year_founded') THEN
        ALTER TABLE teams ADD COLUMN year_founded INTEGER;
        RAISE NOTICE 'Added year_founded column to teams table';
    ELSE
        RAISE NOTICE 'year_founded column already exists in teams table';
    END IF;
END $$;

-- Add member_association column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'member_association') THEN
        ALTER TABLE teams ADD COLUMN member_association TEXT;
        RAISE NOTICE 'Added member_association column to teams table';
    ELSE
        RAISE NOTICE 'member_association column already exists in teams table';
    END IF;
END $$;

-- Add description column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'description') THEN
        ALTER TABLE teams ADD COLUMN description TEXT;
        RAISE NOTICE 'Added description column to teams table';
    ELSE
        RAISE NOTICE 'description column already exists in teams table';
    END IF;
END $$;

-- Add titles column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'titles') THEN
        ALTER TABLE teams ADD COLUMN titles TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added titles column to teams table';
    ELSE
        RAISE NOTICE 'titles column already exists in teams table';
    END IF;
END $$;

-- Add website column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'website') THEN
        ALTER TABLE teams ADD COLUMN website TEXT;
        RAISE NOTICE 'Added website column to teams table';
    ELSE
        RAISE NOTICE 'website column already exists in teams table';
    END IF;
END $$;

-- Add division column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'teams' AND column_name = 'division') THEN
        ALTER TABLE teams ADD COLUMN division TEXT;
        RAISE NOTICE 'Added division column to teams table';
    ELSE
        RAISE NOTICE 'division column already exists in teams table';
    END IF;
END $$;

-- Add missing columns to agents table as well
-- Add member_association column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'member_association') THEN
        ALTER TABLE agents ADD COLUMN member_association TEXT;
        RAISE NOTICE 'Added member_association column to agents table';
    ELSE
        RAISE NOTICE 'member_association column already exists in agents table';
    END IF;
END $$;

-- Add year_founded column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'agents' AND column_name = 'year_founded') THEN
        ALTER TABLE agents ADD COLUMN year_founded INTEGER;
        RAISE NOTICE 'Added year_founded column to agents table';
    ELSE
        RAISE NOTICE 'year_founded column already exists in agents table';
    END IF;
END $$;

-- Verify the current teams table structure
SELECT 
    'teams' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'teams' 
ORDER BY ordinal_position;

-- Verify the current agents table structure
SELECT 
    'agents' as table_name,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY ordinal_position;
