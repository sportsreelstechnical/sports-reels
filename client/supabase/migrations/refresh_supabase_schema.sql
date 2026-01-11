-- Refresh Supabase schema cache
-- This script helps refresh the schema cache after making changes

-- Step 1: Check current schema version
SELECT '🔍 CHECKING SCHEMA VERSION:' as info;

SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('transfer_pitches', 'teams', 'players', 'agent_interest')
ORDER BY tablename;

-- Step 2: Refresh schema cache by querying the tables
SELECT '🔄 REFRESHING SCHEMA CACHE:' as info;

-- Query each table to refresh the cache
SELECT 'Refreshing transfer_pitches table...' as info;
SELECT COUNT(*) as transfer_pitches_count FROM transfer_pitches;

SELECT 'Refreshing teams table...' as info;
SELECT COUNT(*) as teams_count FROM teams;

SELECT 'Refreshing players table...' as info;
SELECT COUNT(*) as players_count FROM players;

SELECT 'Refreshing agent_interest table...' as info;
SELECT COUNT(*) as agent_interest_count FROM agent_interest;

-- Step 3: Test the relationships
SELECT '🧪 TESTING RELATIONSHIPS:' as info;

-- Test transfer_pitches -> teams relationship
SELECT 
    'Testing transfer_pitches -> teams relationship:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'transfer_pitches' 
            AND constraint_name = 'transfer_pitches_team_id_fkey'
            AND constraint_type = 'FOREIGN KEY'
        )
        THEN '✅ Foreign key constraint exists'
        ELSE '❌ Foreign key constraint missing'
    END as constraint_status;

-- Test transfer_pitches -> players relationship
SELECT 
    'Testing transfer_pitches -> players relationship:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'transfer_pitches' 
            AND constraint_name = 'transfer_pitches_player_id_fkey'
            AND constraint_type = 'FOREIGN KEY'
        )
        THEN '✅ Foreign key constraint exists'
        ELSE '❌ Foreign key constraint missing'
    END as constraint_status;

-- Step 4: Show all foreign key constraints
SELECT '📋 ALL FOREIGN KEY CONSTRAINTS:' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('transfer_pitches', 'teams', 'players', 'agent_interest')
ORDER BY tc.table_name, tc.constraint_name;

-- Step 5: Test a sample query that should work
SELECT '🔍 TESTING SAMPLE QUERY:' as info;

-- This is the type of query that should work after the fix
SELECT 
    'Sample query test:' as test,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM transfer_pitches tp
            LEFT JOIN teams t ON tp.team_id = t.id
            LEFT JOIN players p ON tp.player_id = p.id
            LIMIT 1
        )
        THEN '✅ Sample query works'
        ELSE '⚠️ Sample query failed or no data'
    END as result;

-- Step 6: Show table statistics
SELECT '📊 TABLE STATISTICS:' as info;

SELECT 
    'transfer_pitches' as table_name,
    COUNT(*) as total_records,
    COUNT(team_id) as records_with_team_id,
    COUNT(player_id) as records_with_player_id
FROM transfer_pitches

UNION ALL

SELECT 
    'teams' as table_name,
    COUNT(*) as total_records,
    COUNT(id) as records_with_team_id,
    0 as records_with_player_id
FROM teams

UNION ALL

SELECT 
    'players' as table_name,
    COUNT(*) as total_records,
    0 as records_with_team_id,
    COUNT(id) as records_with_player_id
FROM players;
