-- Check ALL policies on people table to see if there's a conflict
-- There might be a more restrictive policy taking precedence

SELECT 
  policyname,
  cmd as command,
  permissive,  -- 'PERMISSIVE' or 'RESTRICTIVE'
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'people'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'people';

-- Expected: Should only see ONE policy: "authenticated users can read all users"
-- If you see multiple policies, that's the problem!

