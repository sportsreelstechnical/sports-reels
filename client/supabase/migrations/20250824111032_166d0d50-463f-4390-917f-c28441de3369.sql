
-- Set default value for is_verified to true for new profiles
ALTER TABLE public.profiles 
ALTER COLUMN is_verified SET DEFAULT true;

-- Update existing profiles to be verified
UPDATE public.profiles 
SET is_verified = true 
WHERE is_verified IS NULL OR is_verified = false;
