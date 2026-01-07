-- Migration: Add Row Level Security policies for audit_assignments table
-- This migration creates secure RLS policies for audit assignment operations
-- while maintaining proper access control

-- ============================================================================
-- AUDIT_ASSIGNMENTS TABLE POLICIES
-- ============================================================================

-- Ensure RLS is enabled on audit_assignments table
ALTER TABLE audit_assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert audit assignments
-- Security: Only authenticated users can create assignments
-- The assigned_by field should match the current user's email
CREATE POLICY "Authenticated users can insert audit assignments"
ON audit_assignments FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  -- Verify that assigned_by matches the current user's email from JWT
  assigned_by = (SELECT (auth.jwt() ->> 'email'))
);

-- Policy: Users can read assignments where they are the auditor
-- Security: Auditors can see assignments assigned to them
CREATE POLICY "Auditors can read their assignments"
ON audit_assignments FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auditor_email = (SELECT (auth.jwt() ->> 'email'))
);

-- Policy: Users can read assignments where they are the employee
-- Security: Employees can see assignments for their audits
CREATE POLICY "Employees can read their audit assignments"
ON audit_assignments FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  employee_email = (SELECT (auth.jwt() ->> 'email'))
);

-- Policy: Users can read assignments they created
-- Security: Users can see assignments they assigned
CREATE POLICY "Users can read assignments they created"
ON audit_assignments FOR SELECT
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  assigned_by = (SELECT (auth.jwt() ->> 'email'))
);

-- Policy: Auditors can update their own assignments
-- Security: Only the assigned auditor can update assignment status
CREATE POLICY "Auditors can update their assignments"
ON audit_assignments FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auditor_email = (SELECT (auth.jwt() ->> 'email'))
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auditor_email = (SELECT (auth.jwt() ->> 'email'))
);

-- Policy: Users who created assignments can update them
-- Security: The person who assigned can update (e.g., cancel assignments)
CREATE POLICY "Assigners can update their assignments"
ON audit_assignments FOR UPDATE
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  assigned_by = (SELECT (auth.jwt() ->> 'email'))
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  assigned_by = (SELECT (auth.jwt() ->> 'email'))
);

-- Policy: Users who created assignments can delete them
-- Security: Only the person who assigned can delete (cancel) assignments
CREATE POLICY "Assigners can delete their assignments"
ON audit_assignments FOR DELETE
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  assigned_by = (SELECT (auth.jwt() ->> 'email'))
);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- These policies ensure:
-- 1. Only authenticated users can create audit assignments
-- 2. Users can only see assignments relevant to them (as auditor, employee, or assigner)
-- 3. Only auditors can update their own assignments (status changes)
-- 4. Only assigners can delete/cancel assignments they created
-- 5. All operations require authentication
-- 
-- The policies use auth.jwt() ->> 'email' to get the current user's email
-- from the JWT token, which matches the email-based identification used in
-- the audit_assignments table (auditor_email, employee_email, assigned_by).

