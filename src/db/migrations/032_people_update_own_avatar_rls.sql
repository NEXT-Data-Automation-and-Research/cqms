-- Migration: Allow users to update their own avatar_url in people (for profile sync)
-- When a user updates Profile Picture URL, we sync to people.avatar_url by email.

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'people') THEN
    DROP POLICY IF EXISTS "Users can update own avatar_url" ON people;
    CREATE POLICY "Users can update own avatar_url"
    ON people FOR UPDATE
    TO authenticated
    USING (LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt() ->> 'email')))
    WITH CHECK (LOWER(TRIM(email)) = LOWER(TRIM(auth.jwt() ->> 'email')));
    RAISE NOTICE 'RLS policy created: users can update own avatar_url on people';
  ELSE
    RAISE NOTICE 'people table does not exist, skipping';
  END IF;
END $$;
