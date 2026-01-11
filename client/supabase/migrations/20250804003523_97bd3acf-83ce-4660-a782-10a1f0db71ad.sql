
-- Fix all foreign key constraints that reference profiles to allow proper cascade deletion
-- This ensures users can be deleted from the authentication system

-- First, let's fix the agents table foreign key
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_profile_id_fkey;
ALTER TABLE agents 
ADD CONSTRAINT agents_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix shortlist table that might reference profiles through agents
-- We need to ensure shortlist entries are deleted when agents are deleted
ALTER TABLE shortlist DROP CONSTRAINT IF EXISTS shortlist_agent_id_fkey;
ALTER TABLE shortlist 
ADD CONSTRAINT shortlist_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Fix agent_requests table
ALTER TABLE agent_requests DROP CONSTRAINT IF EXISTS agent_requests_agent_id_fkey;
ALTER TABLE agent_requests 
ADD CONSTRAINT agent_requests_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

-- Fix agent_request_comments table
ALTER TABLE agent_request_comments DROP CONSTRAINT IF EXISTS agent_request_comments_profile_id_fkey;
ALTER TABLE agent_request_comments 
ADD CONSTRAINT agent_request_comments_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix contracts table
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_agent_id_fkey;
ALTER TABLE contracts 
ADD CONSTRAINT contracts_agent_id_fkey 
FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_team_id_fkey;
ALTER TABLE contracts 
ADD CONSTRAINT contracts_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Fix messages table to handle profile deletion
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages 
ADD CONSTRAINT messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
ALTER TABLE messages 
ADD CONSTRAINT messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix player_messages table
ALTER TABLE player_messages DROP CONSTRAINT IF EXISTS player_messages_sender_id_fkey;
ALTER TABLE player_messages 
ADD CONSTRAINT player_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE player_messages DROP CONSTRAINT IF EXISTS player_messages_receiver_id_fkey;
ALTER TABLE player_messages 
ADD CONSTRAINT player_messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Fix notification_preferences table
ALTER TABLE notification_preferences DROP CONSTRAINT IF EXISTS notification_preferences_user_id_fkey;
ALTER TABLE notification_preferences 
ADD CONSTRAINT notification_preferences_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Ensure the profiles table itself properly cascades from auth.users
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE profiles 
ADD CONSTRAINT profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
