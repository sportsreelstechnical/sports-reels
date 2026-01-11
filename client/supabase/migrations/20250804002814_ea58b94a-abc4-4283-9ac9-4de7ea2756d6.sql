
-- Fix the video_requirements foreign key constraint to allow proper cascade deletion
-- This will automatically delete video requirements when a team is deleted

-- Drop the existing foreign key constraint
ALTER TABLE video_requirements DROP CONSTRAINT IF EXISTS video_requirements_team_id_fkey;

-- Recreate the constraint with CASCADE behavior
ALTER TABLE video_requirements 
ADD CONSTRAINT video_requirements_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

-- Also ensure teams table has proper cascade behavior with profiles
-- This ensures the full deletion chain works: profiles -> teams -> video_requirements
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_profile_id_fkey;

ALTER TABLE teams 
ADD CONSTRAINT teams_profile_id_fkey 
FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
