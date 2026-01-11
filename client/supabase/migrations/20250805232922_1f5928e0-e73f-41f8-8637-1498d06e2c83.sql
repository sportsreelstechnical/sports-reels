
-- Add comprehensive foreign key constraints for complete cascade deletion
-- This will ensure all related data is properly cleaned up when deleting users

-- Check if players table exists and fix its foreign key to teams
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players') THEN
        -- Fix players table cascade from teams
        ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_id_fkey;
        ALTER TABLE players 
        ADD CONSTRAINT players_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix video-related tables
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'videos') THEN
        -- Fix videos cascade from teams and players
        ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_team_id_fkey;
        ALTER TABLE videos 
        ADD CONSTRAINT videos_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
        
        ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_player_id_fkey;
        ALTER TABLE videos 
        ADD CONSTRAINT videos_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix transfer pitches
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfer_pitches') THEN
        ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_team_id_fkey;
        ALTER TABLE transfer_pitches 
        ADD CONSTRAINT transfer_pitches_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
        
        ALTER TABLE transfer_pitches DROP CONSTRAINT IF EXISTS transfer_pitches_player_id_fkey;
        ALTER TABLE transfer_pitches 
        ADD CONSTRAINT transfer_pitches_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix message-related cascade issues
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_pitch_id_fkey;
ALTER TABLE messages 
ADD CONSTRAINT messages_pitch_id_fkey 
FOREIGN KEY (pitch_id) REFERENCES transfer_pitches(id) ON DELETE CASCADE;

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_player_id_fkey;
ALTER TABLE messages 
ADD CONSTRAINT messages_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Fix player messages
ALTER TABLE player_messages DROP CONSTRAINT IF EXISTS player_messages_pitch_id_fkey;
ALTER TABLE player_messages 
ADD CONSTRAINT player_messages_pitch_id_fkey 
FOREIGN KEY (pitch_id) REFERENCES transfer_pitches(id) ON DELETE CASCADE;

ALTER TABLE player_messages DROP CONSTRAINT IF EXISTS player_messages_player_id_fkey;
ALTER TABLE player_messages 
ADD CONSTRAINT player_messages_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Fix shortlist cascade from pitches and players
ALTER TABLE shortlist DROP CONSTRAINT IF EXISTS shortlist_pitch_id_fkey;
ALTER TABLE shortlist 
ADD CONSTRAINT shortlist_pitch_id_fkey 
FOREIGN KEY (pitch_id) REFERENCES transfer_pitches(id) ON DELETE CASCADE;

ALTER TABLE shortlist DROP CONSTRAINT IF EXISTS shortlist_player_id_fkey;
ALTER TABLE shortlist 
ADD CONSTRAINT shortlist_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- Create a function to safely delete users and all related data
CREATE OR REPLACE FUNCTION delete_user_completely(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_id_to_delete UUID;
BEGIN
    -- Get the profile ID first
    SELECT id INTO profile_id_to_delete 
    FROM profiles 
    WHERE user_id = user_uuid;
    
    -- If no profile found, still try to delete from auth
    IF profile_id_to_delete IS NULL THEN
        -- Delete from auth.users directly
        DELETE FROM auth.users WHERE id = user_uuid;
        RETURN TRUE;
    END IF;
    
    -- Delete the profile (this will cascade to all related tables)
    DELETE FROM profiles WHERE id = profile_id_to_delete;
    
    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = user_uuid;
    
    RETURN TRUE;
EXCEPTION
    WHEN others THEN
        RAISE LOG 'Error deleting user %: %', user_uuid, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users (for admin functionality)
GRANT EXECUTE ON FUNCTION delete_user_completely(UUID) TO authenticated;
