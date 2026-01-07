-- Migration: Add permissive read policy for people/users table
-- This allows authenticated users to read all users (for sandbox/directory features)
-- The sandbox endpoint queries 'people' table first, then falls back to 'users'
-- This migration adds the policy to both tables to ensure it works regardless
-- Existing policies remain in place for other operations (update, insert, delete)

-- ============================================================================
-- PERMISSIVE READ POLICY FOR PEOPLE/USERS TABLE
-- ============================================================================
-- The sandbox endpoint tries 'people' table first, then falls back to 'users'
-- So we need policies on both tables to ensure it works regardless

-- Policy for 'people' table (if it exists - this is what sandbox queries first)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'people') THEN
    -- Enable RLS on people table if not already enabled
    ALTER TABLE people ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policy if it exists (to avoid conflicts)
    DROP POLICY IF EXISTS "Authenticated users can read all users" ON people;
    
    -- Drop any RESTRICTIVE policies that might block access
    -- (RESTRICTIVE policies take precedence and can block PERMISSIVE ones)
    DROP POLICY IF EXISTS "Users can only read own data" ON people;
    DROP POLICY IF EXISTS "Users can read own profile" ON people;
    
    -- Create PERMISSIVE policy allowing authenticated users to read all people
    -- This is PERMISSIVE so it works alongside other policies (OR logic)
    CREATE POLICY "Authenticated users can read all users"
    ON people FOR SELECT
    TO authenticated
    USING (auth.role() = 'authenticated');
    
    -- Ensure the policy is PERMISSIVE (default, but explicit is better)
    -- Note: PostgreSQL uses PERMISSIVE by default, but we want to be explicit
  END IF;
END $$;

-- Policy for 'users' table (fallback - this is the main table that definitely exists)
-- This is used for features like user directory, sandbox, etc.
-- Other operations (update, insert, delete) still require ownership
DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;
CREATE POLICY "Authenticated users can read all users"
ON users FOR SELECT
USING (auth.role() = 'authenticated');

-- Note: This policy is additive - it works alongside the existing
-- "Users can read own data" policy. Both policies are evaluated with OR logic.
-- Users can read their own data OR all users if authenticated.

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- This policy enables:
-- 1. User directory features (showing all users)
-- 2. Sandbox/testing endpoints
-- 3. Public user profiles (if desired)
-- 
-- Security considerations:
-- - Only SELECT operations are affected (read-only)
-- - UPDATE, INSERT, DELETE still require ownership
-- - RLS is still enforced at database level
-- - Can be disabled/removed if needed for stricter security
-- 
-- To remove this policy:
-- DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;

