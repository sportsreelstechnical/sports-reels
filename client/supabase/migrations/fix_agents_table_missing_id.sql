-- Fix agents table missing id column
-- This script adds the missing id column to the agents table

-- Step 1: Check current agents table structure
SELECT '🔍 CHECKING AGENTS TABLE STRUCTURE:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY column_name;

-- Step 2: Add missing id column if it doesn't exist
SELECT '🔧 ADDING MISSING ID COLUMN:' as info;

DO $$ 
BEGIN
    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'agents' 
        AND column_name = 'id'
    ) THEN
        -- Add the id column as primary key
        ALTER TABLE agents ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
        RAISE NOTICE '✅ Added id column to agents table';
    ELSE
        RAISE NOTICE 'ℹ️ id column already exists in agents table';
    END IF;
END $$;

-- Step 3: Verify the fix
SELECT '✅ VERIFYING FIX:' as info;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'agents' 
ORDER BY column_name;

-- Step 4: Test a simple query
SELECT '🧪 TESTING QUERY:' as info;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM agents LIMIT 1
        )
        THEN '✅ Agents table is accessible'
        ELSE '⚠️ Agents table is empty (this is OK)'
    END as test_result;

-- Step 5: Show sample data if any exists
SELECT '📋 SAMPLE DATA:' as info;

SELECT 
    id,
    profile_id,
    agency_name,
    created_at
FROM agents 
LIMIT 5;
