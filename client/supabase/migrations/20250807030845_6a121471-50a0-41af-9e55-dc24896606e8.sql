
-- Enhanced user deletion script with better constraint handling
-- This will force delete all users and data more aggressively

-- First, get count of current users for verification
DO $$
BEGIN
    RAISE NOTICE 'Current user count: %', (SELECT COUNT(*) FROM auth.users);
    RAISE NOTICE 'Current profile count: %', (SELECT COUNT(*) FROM public.profiles);
END $$;

-- Temporarily disable all triggers to prevent cascading issues
SET session_replication_role = replica;

-- Disable foreign key checks temporarily
ALTER TABLE public.profiles DISABLE TRIGGER ALL;
ALTER TABLE public.teams DISABLE TRIGGER ALL;
ALTER TABLE public.agents DISABLE TRIGGER ALL;
ALTER TABLE public.players DISABLE TRIGGER ALL;
ALTER TABLE public.videos DISABLE TRIGGER ALL;
ALTER TABLE public.messages DISABLE TRIGGER ALL;
ALTER TABLE public.transfer_pitches DISABLE TRIGGER ALL;
ALTER TABLE public.shortlist DISABLE TRIGGER ALL;
ALTER TABLE public.contracts DISABLE TRIGGER ALL;

-- Force delete everything in reverse dependency order
TRUNCATE TABLE public.agent_request_comments CASCADE;
TRUNCATE TABLE public.player_messages CASCADE;
TRUNCATE TABLE public.messages CASCADE;
TRUNCATE TABLE public.shortlist CASCADE;
TRUNCATE TABLE public.contracts CASCADE;
TRUNCATE TABLE public.service_charges CASCADE;
TRUNCATE TABLE public.transfer_pitches CASCADE;
TRUNCATE TABLE public.pitch_requirements CASCADE;
TRUNCATE TABLE public.player_stats CASCADE;
TRUNCATE TABLE public.player_performance CASCADE;
TRUNCATE TABLE public.player_international_duty CASCADE;
TRUNCATE TABLE public.player_transfer_history CASCADE;
TRUNCATE TABLE public.player_titles_achievements CASCADE;
TRUNCATE TABLE public.player_league_participation CASCADE;
TRUNCATE TABLE public.videos CASCADE;
TRUNCATE TABLE public.match_videos CASCADE;
TRUNCATE TABLE public.players CASCADE;
TRUNCATE TABLE public.teams CASCADE;
TRUNCATE TABLE public.agents CASCADE;
TRUNCATE TABLE public.agent_requests CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.notification_preferences CASCADE;
TRUNCATE TABLE public.message_violations CASCADE;
TRUNCATE TABLE public.video_requirements CASCADE;
TRUNCATE TABLE public.international_transfer_restrictions CASCADE;

-- Force delete profiles
TRUNCATE TABLE public.profiles CASCADE;

-- Re-enable triggers
ALTER TABLE public.profiles ENABLE TRIGGER ALL;
ALTER TABLE public.teams ENABLE TRIGGER ALL;
ALTER TABLE public.agents ENABLE TRIGGER ALL;
ALTER TABLE public.players ENABLE TRIGGER ALL;
ALTER TABLE public.videos ENABLE TRIGGER ALL;
ALTER TABLE public.messages ENABLE TRIGGER ALL;
ALTER TABLE public.transfer_pitches ENABLE TRIGGER ALL;
ALTER TABLE public.shortlist ENABLE TRIGGER ALL;
ALTER TABLE public.contracts ENABLE TRIGGER ALL;

-- Now force delete auth users using admin privileges
DELETE FROM auth.users;

-- If the above doesn't work, try deleting specific auth tables
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.identities;
DELETE FROM auth.users;

-- Re-enable RLS
SET session_replication_role = DEFAULT;

-- Reset sequences
DO $$
DECLARE
    seq_name text;
BEGIN
    FOR seq_name IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE 'SELECT setval(''' || seq_name || ''', 1, false)';
    END LOOP;
END $$;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE 'Final user count: %', (SELECT COUNT(*) FROM auth.users);
    RAISE NOTICE 'Final profile count: %', (SELECT COUNT(*) FROM public.profiles);
END $$;

-- Vacuum to reclaim space
VACUUM FULL;
