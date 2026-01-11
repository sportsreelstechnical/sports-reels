
-- Phase 1: Add role-based access control system
-- First, create app_role enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END $$;

-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.app_role DEFAULT 'user'::public.app_role;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::public.app_role)
$$;

-- Phase 1: Add DELETE policies for user-owned data

-- players: Teams can delete their own players
DROP POLICY IF EXISTS "Teams can delete their own players" ON public.players;
CREATE POLICY "Teams can delete their own players" ON public.players
FOR DELETE
USING (team_id IN (
  SELECT t.id FROM public.teams t WHERE t.profile_id = auth.uid()
));

-- teams: Users can delete their own team
DROP POLICY IF EXISTS "Users can delete their own team" ON public.teams;
CREATE POLICY "Users can delete their own team" ON public.teams
FOR DELETE
USING (profile_id = auth.uid());

-- shortlist: Agents can delete their own shortlist items (already exists, keeping it)

-- contracts: Teams/agents can delete their own contracts
DROP POLICY IF EXISTS "Users can delete their own contracts" ON public.contracts;
CREATE POLICY "Users can delete their own contracts" ON public.contracts
FOR DELETE
USING ((team_id IN (SELECT teams.id FROM public.teams WHERE teams.profile_id = auth.uid())) 
       OR (agent_id IN (SELECT agents.id FROM public.agents WHERE agents.profile_id = auth.uid())));

-- notifications: Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications" ON public.notifications
FOR DELETE
USING (user_id = auth.uid());

-- notification_preferences: Users can delete their own preferences
DROP POLICY IF EXISTS "Users can delete their own preferences" ON public.notification_preferences;
CREATE POLICY "Users can delete their own preferences" ON public.notification_preferences
FOR DELETE
USING (user_id = auth.uid());

-- Phase 1: Add DELETE policies for related data

-- player_stats: Teams can delete their players' stats
DROP POLICY IF EXISTS "Teams can delete their players stats" ON public.player_stats;
CREATE POLICY "Teams can delete their players stats" ON public.player_stats
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.teams t ON p.team_id = t.id
  WHERE p.id = player_stats.player_id AND t.profile_id = auth.uid()
));

-- player_performance: Teams can delete their players' performance
DROP POLICY IF EXISTS "Teams can delete their players performance" ON public.player_performance;
CREATE POLICY "Teams can delete their players performance" ON public.player_performance
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.teams t ON p.team_id = t.id
  WHERE p.id = player_performance.player_id AND t.profile_id = auth.uid()
));

-- player_international_duty: Teams can delete their players' international duty
DROP POLICY IF EXISTS "Teams can delete their players international duty" ON public.player_international_duty;
CREATE POLICY "Teams can delete their players international duty" ON public.player_international_duty
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.teams t ON p.team_id = t.id
  WHERE p.id = player_international_duty.player_id AND t.profile_id = auth.uid()
));

-- player_transfer_history: Teams can delete their players' transfer history
DROP POLICY IF EXISTS "Teams can delete their players transfer history" ON public.player_transfer_history;
CREATE POLICY "Teams can delete their players transfer history" ON public.player_transfer_history
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.teams t ON p.team_id = t.id
  WHERE p.id = player_transfer_history.player_id AND t.profile_id = auth.uid()
));

-- player_titles_achievements: Teams can delete their players' titles
DROP POLICY IF EXISTS "Teams can delete their players titles" ON public.player_titles_achievements;
CREATE POLICY "Teams can delete their players titles" ON public.player_titles_achievements
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.teams t ON p.team_id = t.id
  WHERE p.id = player_titles_achievements.player_id AND t.profile_id = auth.uid()
));

-- player_league_participation: Teams can delete their players' league participation
DROP POLICY IF EXISTS "Teams can delete their players league participation" ON public.player_league_participation;
CREATE POLICY "Teams can delete their players league participation" ON public.player_league_participation
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.players p
  JOIN public.teams t ON p.team_id = t.id
  WHERE p.id = player_league_participation.player_id AND t.profile_id = auth.uid()
));

-- agent_requests: Agents can delete their own requests
DROP POLICY IF EXISTS "Agents can delete their own requests" ON public.agent_requests;
CREATE POLICY "Agents can delete their own requests" ON public.agent_requests
FOR DELETE
USING (agent_id IN (
  SELECT a.id FROM public.agents a 
  JOIN public.profiles p ON a.profile_id = p.id
  WHERE p.user_id = auth.uid()
));

-- match_videos: Teams can delete their own match videos
DROP POLICY IF EXISTS "Teams can delete their own match videos" ON public.match_videos;
CREATE POLICY "Teams can delete their own match videos" ON public.match_videos
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.teams t WHERE t.id = match_videos.team_id AND t.profile_id = auth.uid()
));

-- Phase 1: Admin-only DELETE policies

-- leagues: Admin-only deletion
DROP POLICY IF EXISTS "Admin can delete leagues" ON public.leagues;
CREATE POLICY "Admin can delete leagues" ON public.leagues
FOR DELETE
USING (public.is_admin());

-- leagues_competitions: Admin-only deletion
DROP POLICY IF EXISTS "Admin can delete leagues competitions" ON public.leagues_competitions;
CREATE POLICY "Admin can delete leagues competitions" ON public.leagues_competitions
FOR DELETE
USING (public.is_admin());

-- message_violations: Admin-only deletion
DROP POLICY IF EXISTS "Admin can delete message violations" ON public.message_violations;
CREATE POLICY "Admin can delete message violations" ON public.message_violations
FOR DELETE
USING (public.is_admin());

-- Phase 2: Fix overly permissive policies

-- Remove the "Allow all users to delete transfer pitches" policy
DROP POLICY IF EXISTS "Allow all users to delete transfer pitches" ON public.transfer_pitches;

-- Replace with proper team-owner-only deletion
DROP POLICY IF EXISTS "Team owners can delete their own pitches" ON public.transfer_pitches;
CREATE POLICY "Team owners can delete their own pitches" ON public.transfer_pitches
FOR DELETE
USING (team_id IN (
  SELECT teams.id FROM public.teams WHERE teams.profile_id = auth.uid()
));

-- Phase 3: Fix security definer functions - Set proper search paths

-- Update existing functions with proper search paths
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    profile_id_to_delete UUID;
BEGIN
    -- Get the profile ID first
    SELECT id INTO profile_id_to_delete 
    FROM public.profiles 
    WHERE user_id = user_uuid;
    
    -- If no profile found, still try to delete from auth
    IF profile_id_to_delete IS NULL THEN
        -- Delete from auth.users directly
        DELETE FROM auth.users WHERE id = user_uuid;
        RETURN TRUE;
    END IF;
    
    -- Delete the profile (this will cascade to all related tables)
    DELETE FROM public.profiles WHERE id = profile_id_to_delete;
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = user_uuid;
    
    RETURN TRUE;
EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error deleting user %: %', user_uuid, SQLERRM;
        RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_transfer_interest_notification(team_owner_id uuid, player_name text, agent_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    team_owner_id,
    'New Transfer Interest',
    agent_name || ' has expressed interest in ' || player_name,
    'transfer',
    jsonb_build_object('player_name', player_name, 'agent_name', agent_name)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_profile_change_notification(user_uuid uuid, change_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    user_uuid,
    'Profile Updated',
    'Your ' || change_type || ' has been updated successfully.',
    'profile',
    jsonb_build_object('change_type', change_type)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_notification_preferences()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.send_message_notification(receiver_id uuid, sender_name text, player_name text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  message_text TEXT;
BEGIN
  IF player_name IS NOT NULL THEN
    message_text := 'You have a new message from ' || sender_name || ' about ' || player_name;
  ELSE
    message_text := 'You have a new message from ' || sender_name;
  END IF;
  
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (
    receiver_id,
    'New Message',
    message_text,
    'message',
    jsonb_build_object('sender_name', sender_name, 'player_name', player_name)
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_welcome_notification(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Get user email and name
  SELECT email, full_name INTO user_email, user_name
  FROM public.profiles
  WHERE user_id = user_uuid;
  
  -- Create welcome notification
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    user_uuid,
    'Welcome to Reel Connect Sports Hub!',
    'Thank you for joining us. Your account has been created successfully.',
    'success'
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$function$;
