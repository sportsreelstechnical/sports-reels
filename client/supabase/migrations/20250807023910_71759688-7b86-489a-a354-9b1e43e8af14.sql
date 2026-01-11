
-- WARNING: This will completely wipe all user data and associated records
-- This action is irreversible!

-- First, disable RLS temporarily to allow bulk deletion
SET session_replication_role = replica;

-- Delete all data in order of dependencies (children first, then parents)

-- Delete user-generated content
DELETE FROM public.agent_request_comments;
DELETE FROM public.player_messages;
DELETE FROM public.messages;
DELETE FROM public.shortlist;
DELETE FROM public.contracts;
DELETE FROM public.service_charges;
DELETE FROM public.transfer_pitches;
DELETE FROM public.pitch_requirements;

-- Delete player-related data
DELETE FROM public.player_stats;
DELETE FROM public.player_performance;
DELETE FROM public.player_international_duty;
DELETE FROM public.player_transfer_history;
DELETE FROM public.player_titles_achievements;
DELETE FROM public.player_league_participation;
DELETE FROM public.players;

-- Delete team and agent data
DELETE FROM public.videos;
DELETE FROM public.match_videos;
DELETE FROM public.teams;
DELETE FROM public.agents;
DELETE FROM public.agent_requests;

-- Delete user notifications and preferences
DELETE FROM public.notifications;
DELETE FROM public.notification_preferences;
DELETE FROM public.message_violations;

-- Delete video requirements and restrictions
DELETE FROM public.video_requirements;
DELETE FROM public.international_transfer_restrictions;

-- Delete all user profiles (this will cascade to related data)
DELETE FROM public.profiles;

-- Finally, delete all auth users (this removes authentication accounts)
DELETE FROM auth.users;

-- Re-enable RLS
SET session_replication_role = DEFAULT;

-- Reset any sequences if needed
SELECT setval(pg_get_serial_sequence('public.profiles', 'id'), 1, false);

-- Optional: Vacuum the tables to reclaim space
VACUUM FULL;
