-- Migration: Make "Roles above Employee can update audit assignments" case-insensitive
-- JWT email and people.email may differ by casing; use LOWER(TRIM()) so RLS matches.

DROP POLICY IF EXISTS "Roles above Employee can update audit assignments" ON audit_assignments;

CREATE POLICY "Roles above Employee can update audit assignments"
ON audit_assignments FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.people p
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(auth.jwt() ->> 'email'))
      AND p.role IN (
        'Quality Analyst', 'Auditor', 'Quality Supervisor',
        'Manager', 'Admin', 'Super Admin'
      )
  )
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.people p
    WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(auth.jwt() ->> 'email'))
      AND p.role IN (
        'Quality Analyst', 'Auditor', 'Quality Supervisor',
        'Manager', 'Admin', 'Super Admin'
      )
  )
);

COMMENT ON POLICY "Roles above Employee can update audit assignments" ON audit_assignments IS
  'Elevated roles can update any audit assignment. Case-insensitive email match.';
