-- Migration: Allow Admin, Super Admin, and Quality Analyst to see ALL massive AI audit jobs
-- So they can view and filter batches run by anyone; other users still see only their own.

CREATE POLICY "Elevated roles can read all massive_ai_audit_jobs"
ON public.massive_ai_audit_jobs FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated'
  AND (
    created_by = (auth.jwt() ->> 'email')
    OR EXISTS (
      SELECT 1 FROM public.people p
      WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(auth.jwt() ->> 'email'))
        AND p.role IN ('Admin', 'Super Admin', 'Quality Analyst')
    )
  )
);

COMMENT ON POLICY "Elevated roles can read all massive_ai_audit_jobs" ON public.massive_ai_audit_jobs IS
  'Quality Analyst, Admin, Super Admin can see all batches; others see only their own.';
