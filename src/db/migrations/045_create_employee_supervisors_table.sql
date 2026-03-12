-- Migration: Create employee_supervisors junction table (many-to-many)
-- Allows one employee to be assigned to multiple supervisors.
-- Supervisors can then see audit_assignments for their assigned employees.

-- ============================================================================
-- 1. CREATE JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employee_supervisors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_email TEXT NOT NULL,
  supervisor_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  UNIQUE (employee_email, supervisor_email)
);

-- Index for fast lookups by supervisor
CREATE INDEX IF NOT EXISTS idx_employee_supervisors_supervisor
  ON public.employee_supervisors (supervisor_email);

-- Index for fast lookups by employee
CREATE INDEX IF NOT EXISTS idx_employee_supervisors_employee
  ON public.employee_supervisors (employee_email);

-- ============================================================================
-- 2. RLS ON employee_supervisors TABLE
-- ============================================================================

ALTER TABLE public.employee_supervisors ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on employee_supervisors"
ON public.employee_supervisors FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.email = (auth.jwt() ->> 'email')
      AND p.role IN ('Admin', 'Super Admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.people p
    WHERE p.email = (auth.jwt() ->> 'email')
      AND p.role IN ('Admin', 'Super Admin')
  )
);

-- Supervisors can read their own mappings
CREATE POLICY "Supervisors can read own mappings"
ON public.employee_supervisors FOR SELECT
TO authenticated
USING (
  supervisor_email = (auth.jwt() ->> 'email')
);

-- Employees can read their own mappings
CREATE POLICY "Employees can read own mappings"
ON public.employee_supervisors FOR SELECT
TO authenticated
USING (
  employee_email = (auth.jwt() ->> 'email')
);

-- ============================================================================
-- 3. NEW RLS POLICY ON audit_assignments
--    Supervisors can see audits of employees assigned to them
-- ============================================================================

CREATE POLICY "Supervisors can read assigned employees audit assignments"
ON public.audit_assignments FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.employee_supervisors es
    WHERE es.supervisor_email = (auth.jwt() ->> 'email')
      AND es.employee_email = audit_assignments.employee_email
  )
);

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- This migration:
-- 1. Creates a many-to-many junction table (employee_supervisors)
-- 2. Adds RLS so admins manage it, supervisors/employees see their own rows
-- 3. Adds a SELECT policy on audit_assignments so any user who is listed as
--    a supervisor for an employee can see that employee's audit assignments
--
-- The existing team_supervisor column in people table is NOT changed.
-- The existing admin/elevated role policies still grant full read access.
-- This adds a SEPARATE path for supervisor-specific scoped access.
