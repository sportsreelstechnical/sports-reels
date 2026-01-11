-- Create permissive RLS policies for contracts
-- This script creates very permissive policies to allow immediate access

-- Step 1: Drop all existing policies
SELECT '🔧 DROPPING EXISTING POLICIES:' as info;

DROP POLICY IF EXISTS "Users can view relevant contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert relevant contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update relevant contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete relevant contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view their own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can insert their own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can update their own contracts" ON contracts;
DROP POLICY IF EXISTS "Users can delete their own contracts" ON contracts;
DROP POLICY IF EXISTS "Agents can view contracts" ON contracts;
DROP POLICY IF EXISTS "Teams can view contracts" ON contracts;
DROP POLICY IF EXISTS "Public contracts are viewable by everyone" ON contracts;

-- Step 2: Create very permissive policies
SELECT '🔧 CREATING PERMISSIVE RLS POLICIES:' as info;

-- Allow all authenticated users to view contracts
CREATE POLICY "Authenticated users can view contracts" ON contracts
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow all authenticated users to insert contracts
CREATE POLICY "Authenticated users can insert contracts" ON contracts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to update contracts
CREATE POLICY "Authenticated users can update contracts" ON contracts
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow all authenticated users to delete contracts
CREATE POLICY "Authenticated users can delete contracts" ON contracts
    FOR DELETE USING (auth.role() = 'authenticated');

-- Step 3: Enable RLS
SELECT '🔧 ENABLING RLS:' as info;

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify policies
SELECT '✅ VERIFYING POLICIES:' as info;

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'contracts'
ORDER BY policyname;

-- Step 5: Test contract access
SELECT '🧪 TESTING CONTRACT ACCESS:' as info;

-- Test if we can query contracts
SELECT 
    COUNT(*) as total_contracts
FROM contracts;

-- Step 6: Check specific contract
SELECT '🔍 CHECKING SPECIFIC CONTRACT:' as info;

SELECT 
    id,
    status,
    current_step,
    created_at
FROM contracts 
WHERE id = 'a0b0f3d5-d0fe-4f1b-8470-5a8066e57ecf';

SELECT '🎉 PERMISSIVE RLS POLICIES CREATED!' as info;
SELECT 'All authenticated users can now access contracts.' as next_steps;
SELECT 'The 406 error should be resolved.' as recommendation;
