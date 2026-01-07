-- Diagnostic Query: Check why supervisor name lookup might be failing
-- Run this in Supabase SQL Editor to diagnose the RLS issue

-- ============================================================================
-- 1. Check if RLS is enabled on people table
-- ============================================================================
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'people';

-- ============================================================================
-- 2. List ALL policies on people table (check for conflicts)
-- ============================================================================
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
ORDER BY 
  permissive DESC,  -- RESTRICTIVE policies first (they take precedence)
  policyname;

-- ============================================================================
-- 3. Check if the permissive policy exists
-- ============================================================================
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename = 'people'
        AND policyname = 'Authenticated users can read all users'
    ) THEN 'EXISTS ✅'
    ELSE 'MISSING ❌ - Run migration 005_add_permissive_users_read_policy.sql'
  END as policy_status;

-- ============================================================================
-- 4. Test if you can read supervisor data (replace with actual supervisor email)
-- ============================================================================
-- Replace 'api@nextventures.io' with the actual supervisor email
SELECT 
  email,
  full_name,
  name
FROM people
WHERE email = 'api@nextventures.io';

-- If this query returns no rows (but you know the record exists), RLS is blocking it
-- If it returns rows, RLS is working correctly

-- ============================================================================
-- 5. Check for RESTRICTIVE policies that might block access
-- ============================================================================
SELECT 
  policyname,
  permissive,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'people'
  AND permissive = 'RESTRICTIVE';

-- RESTRICTIVE policies take precedence over PERMISSIVE policies
-- If you see any RESTRICTIVE policies, they might be blocking access

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- 1. RLS should be enabled (rls_enabled = true)
-- 2. Should see policy "Authenticated users can read all users" with permissive = 'PERMISSIVE'
-- 3. Should NOT see any RESTRICTIVE policies (unless they also allow reading)
-- 4. Test query should return supervisor's name
-- 
-- IF POLICY IS MISSING:
-- Run the migration: 005_add_permissive_users_read_policy.sql
--
-- IF RESTRICTIVE POLICY EXISTS:
-- You may need to drop it or modify it to allow reading other users' names

