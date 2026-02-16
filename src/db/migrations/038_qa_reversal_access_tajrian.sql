-- Grant QA/CQC reversal decision access to tajrian@nextventures.io (same as saif@nextventures.io).
-- Access is determined by: people.role = 'Super Admin' AND people.team = 'QC'.
-- This migration updates the existing people row for this email; no hardcoded allowlist in app code.

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'people') THEN
    UPDATE public.people
    SET role = 'Super Admin', team = 'QC'
    WHERE LOWER(TRIM(email)) = LOWER(TRIM('tajrian@nextventures.io'));
    RAISE NOTICE 'Updated people.role and people.team for QA reversal access (tajrian@nextventures.io)';
  ELSE
    RAISE NOTICE 'people table does not exist, skipping';
  END IF;
END $$;
