-- Migration: Allow anyone above Employee role to update (reassign) audit assignments
-- Roles: Quality Analyst, Auditor, Quality Supervisor, Manager, Admin, Super Admin
-- (excludes General User and Employee). Uses public.people.role.

-- Drop if exists so we can re-run or replace a narrower policy
DROP POLICY IF EXISTS "Admins and supervisors can update audit assignments" ON audit_assignments;

-- Policy: Users with role above Employee can update any audit assignment (reassign)
CREATE POLICY "Roles above Employee can update audit assignments"
ON audit_assignments FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.email = (auth.jwt() ->> 'email')
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
    WHERE p.email = (auth.jwt() ->> 'email')
      AND p.role IN (
        'Quality Analyst', 'Auditor', 'Quality Supervisor',
        'Manager', 'Admin', 'Super Admin'
      )
  )
);
