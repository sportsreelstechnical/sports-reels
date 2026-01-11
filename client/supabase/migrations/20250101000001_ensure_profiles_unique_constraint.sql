-- Ensure profiles table has a unique constraint on user_id for ON CONFLICT to work
-- This fixes the 400 Bad Request error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- First, let's drop any existing unique constraints on user_id to avoid conflicts
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop any existing unique constraint on user_id
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
        EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Now add a properly named unique constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Verify the constraint was created
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = 'public' 
        AND t.relname = 'profiles'
        AND c.conname = 'profiles_user_id_unique'
        AND c.contype = 'u'
    ) THEN
        RAISE EXCEPTION 'Failed to create unique constraint on profiles.user_id';
    END IF;
END $$;


