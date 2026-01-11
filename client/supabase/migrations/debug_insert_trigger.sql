-- Debug script to test the INSERT trigger for agent interest notifications
-- Run this in Supabase SQL Editor to diagnose the issue

-- First, let's test the get_user_id_from_profile function
-- Replace with an actual team profile_id from your database
SELECT 
  'Testing get_user_id_from_profile function:' as test_info;

-- Check a sample team and their profile relationship
SELECT 
  t.id as team_id,
  t.team_name,
  t.profile_id as team_profile_id,
  p.user_id as team_user_id,
  p.full_name as team_name_from_profile,
  p.user_type
FROM teams t
JOIN profiles p ON t.profile_id = p.id
LIMIT 3;

-- Test the function with a real team profile_id
-- (Replace the UUID below with an actual team profile_id from above query)
SELECT 
  'Function test result:' as info,
  get_user_id_from_profile('REPLACE_WITH_ACTUAL_TEAM_PROFILE_ID'::UUID) as result_user_id;

-- Check recent agent interest records and their related data
SELECT 
  'Recent agent interest records:' as info;

SELECT 
  ai.id,
  ai.pitch_id,
  ai.agent_id,
  ai.status,
  ai.created_at,
  -- Pitch details
  tp.id as transfer_pitch_id,
  tp.team_id,
  tp.player_id,
  -- Team details
  t.team_name,
  t.profile_id as team_profile_id,
  tp_profiles.user_id as team_user_id_via_profiles,
  tp_profiles.full_name as team_full_name,
  tp_profiles.user_type as team_user_type,
  -- Player details
  p.full_name as player_name,
  -- Agent details
  a.profile_id as agent_profile_id,
  agent_profiles.user_id as agent_user_id,
  agent_profiles.full_name as agent_name
FROM agent_interest ai
JOIN transfer_pitches tp ON ai.pitch_id = tp.id
JOIN teams t ON tp.team_id = t.id
JOIN profiles tp_profiles ON t.profile_id = tp_profiles.id
JOIN players p ON tp.player_id = p.id
JOIN agents a ON ai.agent_id = a.id
JOIN profiles agent_profiles ON a.profile_id = agent_profiles.id
ORDER BY ai.created_at DESC
LIMIT 3;

-- Check if notifications are being created at all
SELECT 
  'Recent notifications:' as info;

SELECT 
  n.id,
  n.user_id,
  n.title,
  n.message,
  n.type,
  n.created_at,
  p.full_name as recipient_name,
  p.user_type as recipient_type,
  n.metadata->>'action' as action_type
FROM notifications n
LEFT JOIN profiles p ON n.user_id = p.user_id
WHERE n.type = 'agent_interest'
ORDER BY n.created_at DESC
LIMIT 10;

-- Check if the trigger function exists and is working
SELECT 
  'Trigger function info:' as info;

SELECT 
  routine_name, 
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_name = 'handle_agent_interest_notifications';

-- Check trigger exists
SELECT 
  'Trigger info:' as info;

SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_agent_interest_notifications';
