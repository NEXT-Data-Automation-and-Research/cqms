-- Migration: Make "Admins and supervisors can read all audit assignments" case-insensitive
-- JWT email and people.email may differ by casing; use LOWER(TRIM()) so RLS matches.

DROP POLICY IF EXISTS "Admins and supervisors can read all audit assignments" ON audit_assignments;

CREATE POLICY "Admins and supervisors can read all audit assignments"
ON audit_assignments FOR SELECT
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
);

COMMENT ON POLICY "Admins and supervisors can read all audit assignments" ON audit_assignments IS
  'Allows Performance Report and admin views to load all assignments when user has elevated role. Case-insensitive email match.';
