-- Diagnostic Query: Check RLS Status and Policies
-- Run this in Supabase SQL Editor to diagnose why you're only seeing your own data

-- 1. Check if 'people' table exists and has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('people', 'users')
ORDER BY tablename;

-- 2. Check all RLS policies on 'people' table (if it exists)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'people'
ORDER BY policyname;

-- 3. Check all RLS policies on 'users' table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- 4. Count records in each table (run as service role/admin)
SELECT 
  'people' as table_name,
  COUNT(*) as record_count
FROM people
UNION ALL
SELECT 
  'users' as table_name,
  COUNT(*) as record_count
FROM users;

-- Expected Results:
-- 1. Both tables should show rls_enabled = true
-- 2. 'people' table should have policy "Authenticated users can read all users"
-- 3. 'users' table should have policy "Authenticated users can read all users"
-- 4. Both tables should have record counts > 1 (if you have multiple users)

