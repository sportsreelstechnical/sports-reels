-- Quick fix for profiles table ON CONFLICT issue
-- Run this directly in your Supabase SQL editor

-- First, check what constraints exist on the profiles table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND t.relname = 'profiles'
AND c.contype = 'u';

-- Drop any existing unique constraint on user_id (if it exists)
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- Find any existing unique constraint on user_id
    SELECT conname INTO constraint_name
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND t.relname = 'profiles'
    AND c.contype = 'u'
    AND c.conkey = (
        SELECT array_agg(attnum ORDER BY attnum)
        FROM pg_attribute 
        WHERE attrelid = t.oid 
        AND attname = 'user_id'
        AND attnum > 0
    );
    
    IF constraint_name IS NOT NULL THEN
        RAISE NOTICE 'Dropping existing constraint: %', constraint_name;
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name;
    ELSE
        RAISE NOTICE 'No existing unique constraint found on user_id';
    END IF;
END $$;

-- Add a properly named unique constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Verify the constraint was created successfully
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND t.relname = 'profiles'
AND c.conname = 'profiles_user_id_unique';


