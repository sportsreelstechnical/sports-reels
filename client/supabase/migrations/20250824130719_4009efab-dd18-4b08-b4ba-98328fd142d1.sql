
-- First, let's check if we have a trigger to auto-create profiles for new users
-- If not, we'll create one

-- Check if the handle_new_user function exists and create/update it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_profile public.profiles%ROWTYPE;
BEGIN
  RAISE NOTICE 'Starting handle_new_user for user ID: %', NEW.id;

  -- Check if the profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = NEW.id) THEN
    RAISE NOTICE 'Inserting new profile for user ID: %', NEW.id;
    INSERT INTO public.profiles (user_id, full_name, email, user_type)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'New User'),
      NEW.email,
      CASE 
        WHEN NEW.raw_user_meta_data->>'user_type' = 'agent' THEN 'agent'::text
        ELSE 'team'::text
      END
    )
    RETURNING * INTO new_profile;
  ELSE
    RAISE NOTICE 'Profile already exists for user ID: %', NEW.id;
    SELECT * INTO new_profile FROM public.profiles WHERE user_id = NEW.id;
  END IF;

  RAISE NOTICE 'Returning profile for user ID: %', NEW.id;
  RETURN new_profile;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error inserting profile for user ID %: %', NEW.id, SQLERRM;
    RETURN NULL;
END;
$$;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
