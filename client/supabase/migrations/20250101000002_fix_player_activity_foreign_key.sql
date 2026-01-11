-- Fix the foreign key constraint to preserve activity history when players are deleted
-- Instead of CASCADE DELETE, we'll use SET NULL to preserve the history

-- First, drop the existing foreign key constraint
ALTER TABLE public.player_activities 
DROP CONSTRAINT IF EXISTS player_activities_player_id_fkey;

-- Add the new foreign key constraint with SET NULL instead of CASCADE
ALTER TABLE public.player_activities 
ADD CONSTRAINT player_activities_player_id_fkey 
FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;

-- Also update the player_name to be NOT NULL since we'll always store it
-- This ensures we can still identify the player even if the player record is deleted
ALTER TABLE public.player_activities 
ALTER COLUMN player_name SET NOT NULL;

-- Add a comment to explain the design
COMMENT ON TABLE public.player_activities IS 'Player activity log that preserves history even when players are deleted. player_id can be NULL if player is deleted, but player_name is always preserved.';
