
-- Delete all profiles first (due to foreign key constraints)
DELETE FROM public.profiles;

-- Delete all users from auth.users table
-- Note: This will cascade and delete related data automatically
DELETE FROM auth.users;

-- Reset any sequences if needed (optional, but good practice)
-- This ensures that auto-generated IDs start from 1 again
SELECT setval(pg_get_serial_sequence('public.profiles', 'id'), 1, false);

-- Clean up any orphaned data in related tables (if any exists)
DELETE FROM public.teams WHERE profile_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.agents WHERE profile_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.players WHERE team_id NOT IN (SELECT id FROM public.teams);
DELETE FROM public.videos WHERE team_id NOT IN (SELECT id FROM public.teams);
DELETE FROM public.transfer_pitches WHERE team_id NOT IN (SELECT id FROM public.teams);
DELETE FROM public.messages WHERE sender_id NOT IN (SELECT id FROM public.profiles) OR receiver_id NOT IN (SELECT id FROM public.profiles);
DELETE FROM public.shortlist WHERE agent_id NOT IN (SELECT id FROM public.agents);
DELETE FROM public.contracts WHERE team_id NOT IN (SELECT id FROM public.teams) OR agent_id NOT IN (SELECT id FROM public.agents);
