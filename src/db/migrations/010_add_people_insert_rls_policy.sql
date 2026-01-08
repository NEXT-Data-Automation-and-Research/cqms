-- Migration: Add INSERT RLS policy for people table
-- This allows authenticated users to insert new users via the API
-- Note: The API uses service role, but this policy ensures client-side operations work if needed

-- ============================================================================
-- PEOPLE TABLE INSERT POLICY
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'people') THEN
    -- Drop existing INSERT policy if it exists
    DROP POLICY IF EXISTS "Authenticated users can insert users" ON people;
    
    -- Create policy allowing authenticated users to insert new users
    -- This is needed for user management operations
    CREATE POLICY "Authenticated users can insert users"
    ON people FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');
    
    RAISE NOTICE 'INSERT RLS policy created for people table';
  ELSE
    RAISE NOTICE 'people table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this query to verify the INSERT policy was created:
-- SELECT policyname, cmd, permissive, roles 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND table_name = 'people' AND cmd = 'INSERT';

