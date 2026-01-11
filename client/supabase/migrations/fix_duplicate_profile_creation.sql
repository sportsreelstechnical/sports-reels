-- Fix duplicate profile creation issue
-- This script addresses the "profiles_user_id_key" unique constraint violation

-- Step 1: Check current state
SELECT '🔍 CHECKING CURRENT STATE:' as info;

-- Check for duplicate user_id entries
SELECT 
    'Duplicate user_id entries:' as info;
SELECT 
    user_id,
    COUNT(*) as count,
    array_agg(id) as profile_ids,
    array_agg(full_name) as names,
    array_agg(created_at) as created_dates
FROM profiles
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Check the specific user_id that's causing the issue
SELECT 
    'Profiles for user_id 5c936709-914e-48c3-bc60-7972b048e1a7:' as info;
SELECT 
    id,
    user_id,
    full_name,
    user_type,
    created_at,
    updated_at
FROM profiles
WHERE user_id = '5c936709-914e-48c3-bc60-7972b048e1a7'
ORDER BY created_at;

-- Step 2: Check for orphaned profiles
SELECT '🧹 CHECKING FOR ORPHANED PROFILES:' as info;

-- Check if there are profiles without corresponding auth users
SELECT 
    'Profiles without auth users:' as info,
    COUNT(*) as count
FROM profiles p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE u.id IS NULL;

-- Step 3: Clean up duplicate profiles
SELECT '🔧 CLEANING UP DUPLICATE PROFILES:' as info;

-- Keep the oldest profile for each user_id, delete the rest
WITH duplicate_profiles AS (
    SELECT 
        id,
        user_id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
    FROM profiles
)
DELETE FROM profiles 
WHERE id IN (
    SELECT id FROM duplicate_profiles WHERE rn > 1
);

SELECT '✅ Duplicate profiles cleaned up.' as info;

-- Step 4: Verify the cleanup
SELECT '✅ VERIFYING CLEANUP:' as info;

-- Check if there are still duplicate user_id entries
SELECT 
    'Remaining duplicate user_id entries:' as info,
    COUNT(*) as count
FROM (
    SELECT user_id, COUNT(*) as cnt
    FROM profiles
    GROUP BY user_id
    HAVING COUNT(*) > 1
) duplicates;

-- Check the specific user_id again
SELECT 
    'Profiles for user_id 5c936709-914e-48c3-bc60-7972b048e1a7 after cleanup:' as info;
SELECT 
    id,
    user_id,
    full_name,
    user_type,
    created_at,
    updated_at
FROM profiles
WHERE user_id = '5c936709-914e-48c3-bc60-7972b048e1a7'
ORDER BY created_at;

-- Step 5: Check related tables
SELECT '🔍 CHECKING RELATED TABLES:' as info;

-- Check if there are agents/teams referencing the duplicate profiles
SELECT 
    'Agents referencing duplicate profiles:' as info;
SELECT 
    a.id as agent_id,
    a.profile_id,
    p.user_id,
    p.full_name
FROM agents a
JOIN profiles p ON a.profile_id = p.id
WHERE p.user_id = '5c936709-914e-48c3-bc60-7972b048e1a7';

SELECT 
    'Teams referencing duplicate profiles:' as info;
SELECT 
    t.id as team_id,
    t.profile_id,
    p.user_id,
    p.full_name
FROM teams t
JOIN profiles p ON t.profile_id = p.id
WHERE p.user_id = '5c936709-914e-48c3-bc60-7972b048e1a7';

-- Step 6: Final status
SELECT '🎯 FINAL STATUS:' as info;

SELECT 
    'Total profiles:' as info,
    COUNT(*) as count
FROM profiles;

SELECT 
    'Unique user_ids:' as info,
    COUNT(DISTINCT user_id) as count
FROM profiles;

SELECT '✅ Profile creation should now work without duplicate key errors.' as info;
