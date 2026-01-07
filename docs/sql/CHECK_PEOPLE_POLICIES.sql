-- Check RLS policies on people table
-- This will show if the permissive policy exists

-- 1. Check if RLS is enabled on people table
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'people';

-- 2. List ALL policies on people table
SELECT 
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'people'
ORDER BY policyname;

-- 3. Check if the permissive policy exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'people'
        AND policyname = 'Authenticated users can read all users'
    ) THEN 'EXISTS ✅'
    ELSE 'MISSING ❌'
  END as policy_status;

-- Expected: Should show "EXISTS ✅"
-- If it shows "MISSING ❌", the policy wasn't created

