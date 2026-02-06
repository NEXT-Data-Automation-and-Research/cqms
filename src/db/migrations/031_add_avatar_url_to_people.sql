-- Migration: Add avatar_url to people table (Profile Picture URL)
-- Source: profile page stores avatar in users.avatar_url; we mirror in people
-- so home/audit views can show agent avatars by email (people is keyed by email).

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'people') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'people' AND column_name = 'avatar_url'
    ) THEN
      ALTER TABLE public.people ADD COLUMN avatar_url TEXT;
      RAISE NOTICE 'Added column avatar_url to people table';
    ELSE
      RAISE NOTICE 'Column people.avatar_url already exists, skipping';
    END IF;
  ELSE
    RAISE NOTICE 'people table does not exist, skipping';
  END IF;
END $$;
