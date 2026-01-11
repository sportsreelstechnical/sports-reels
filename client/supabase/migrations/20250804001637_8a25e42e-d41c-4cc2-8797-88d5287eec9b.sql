
-- Add CASCADE behavior to the foreign key constraint in player_messages table
-- This will automatically delete related messages when a profile is deleted

-- First, drop the existing foreign key constraint
ALTER TABLE player_messages DROP CONSTRAINT IF EXISTS player_messages_sender_id_fkey;

-- Recreate the constraint with CASCADE behavior
ALTER TABLE player_messages 
ADD CONSTRAINT player_messages_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also check and update the receiver_id foreign key if it exists
ALTER TABLE player_messages DROP CONSTRAINT IF EXISTS player_messages_receiver_id_fkey;

ALTER TABLE player_messages 
ADD CONSTRAINT player_messages_receiver_id_fkey 
FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;
