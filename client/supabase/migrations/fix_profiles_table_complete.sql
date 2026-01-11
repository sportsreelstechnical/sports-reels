-- Fix profiles table: Add missing unique constraint and missing columns
-- This addresses the 400 Bad Request error with on_conflict=user_id

-- Step 1: Ensure the profiles table has the correct structure
-- First, let's check if the unique constraint exists and add it if missing
DO $$ 
BEGIN
    -- Check if unique constraint on user_id exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_user_id_key' 
        AND conrelid = 'public.profiles'::regclass
    ) THEN
        -- Add unique constraint on user_id
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Step 2: Add all missing columns mentioned in the error
-- Add missing columns one by one with proper defaults

-- Basic profile columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS newsletter_consent BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS consent_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS contact_warnings INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_contact_check TIMESTAMP WITH TIME ZONE;

-- Ensure the role column exists (from previous migrations)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role DEFAULT 'user'::public.app_role;

-- Ensure the league column exists (from previous migrations)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS league TEXT;

-- Step 3: Update existing records to have proper defaults
UPDATE public.profiles 
SET 
    email_consent = COALESCE(email_consent, false),
    newsletter_consent = COALESCE(newsletter_consent, false),
    terms_accepted = COALESCE(terms_accepted, false),
    contact_verified = COALESCE(contact_verified, false),
    phone_verified = COALESCE(phone_verified, false),
    email_verified = COALESCE(email_verified, false),
    contact_warnings = COALESCE(contact_warnings, 0),
    role = COALESCE(role, 'user'::public.app_role)
WHERE 
    email_consent IS NULL 
    OR newsletter_consent IS NULL 
    OR terms_accepted IS NULL 
    OR contact_verified IS NULL 
    OR phone_verified IS NULL 
    OR email_verified IS NULL 
    OR contact_warnings IS NULL 
    OR role IS NULL;

-- Step 4: Ensure proper indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Step 5: Verify the table structure
-- This will help us confirm all columns are present
DO $$ 
DECLARE
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Profiles table now has % columns', column_count;
END $$;

-- Step 6: Test the unique constraint
DO $$ 
BEGIN
    -- This will fail if the constraint doesn't exist
    INSERT INTO public.profiles (user_id, user_type, full_name, email) 
    VALUES ('00000000-0000-0000-0000-000000000000', 'player', 'Test User', 'test@example.com')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Clean up test record
    DELETE FROM public.profiles WHERE user_id = '00000000-0000-0000-0000-000000000000';
    
    RAISE NOTICE 'Unique constraint on user_id is working correctly';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error testing unique constraint: %', SQLERRM;
END $$;
