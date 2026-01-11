-- Fix orphaned player and video records that violate foreign key constraints
-- This migration cleans up data integrity issues before enforcing foreign keys

-- Step 1: Fix orphaned players by setting invalid team_id to NULL
UPDATE players 
SET team_id = NULL
WHERE team_id IN (
    SELECT p.team_id 
    FROM players p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.team_id IS NOT NULL 
        AND t.id IS NULL
);

-- Step 2: Fix orphaned videos by setting invalid team_id to NULL
UPDATE videos 
SET team_id = NULL
WHERE team_id IN (
    SELECT v.team_id 
    FROM videos v
    LEFT JOIN teams t ON v.team_id = t.id
    WHERE v.team_id IS NOT NULL 
        AND t.id IS NULL
);

-- Step 3: Fix orphaned videos by setting invalid player_id to NULL
UPDATE videos 
SET player_id = NULL
WHERE player_id IN (
    SELECT v.player_id 
    FROM videos v
    LEFT JOIN players p ON v.player_id = p.id
    WHERE v.player_id IS NOT NULL 
        AND p.id IS NULL
);

-- Step 4: Create indexes for better performance after cleanup
CREATE INDEX IF NOT EXISTS idx_players_team_id_valid ON players(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_team_id_valid ON videos(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_videos_player_id_valid ON videos(player_id) WHERE player_id IS NOT NULL;
