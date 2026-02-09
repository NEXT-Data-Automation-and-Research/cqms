-- Migration: Allow Admins and supervisors to read ALL audit_assignments (for Performance Report)
-- Without this, SELECT only returns rows where the user is auditor_email, employee_email, or assigned_by.
-- Roles: Quality Analyst, Auditor, Quality Supervisor, Manager, Admin, Super Admin (same as update policy).

DROP POLICY IF EXISTS "Admins and supervisors can read all audit assignments" ON audit_assignments;

CREATE POLICY "Admins and supervisors can read all audit assignments"
ON audit_assignments FOR SELECT
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
);

COMMENT ON POLICY "Admins and supervisors can read all audit assignments" ON audit_assignments IS
  'Allows Performance Report and admin views to load all assignments when user has elevated role.';
