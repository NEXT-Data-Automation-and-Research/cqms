-- Migration: Add employee_email and employee_name to reversal_requests table
-- Purpose: Allow employees to see reversals for their audits, even if someone else submitted the reversal
-- 
-- Previously, employees could only see reversals where they were the requester (requested_by_email).
-- With this change, employees can also see reversals where they are the subject of the audit (employee_email).
-- This is important when a team lead or manager submits a reversal on behalf of an employee.

-- Add employee_email column (the email of the employee whose audit is being reversed)
ALTER TABLE reversal_requests
ADD COLUMN IF NOT EXISTS employee_email TEXT;

-- Add employee_name column (the name of the employee whose audit is being reversed)
ALTER TABLE reversal_requests
ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- Create index on employee_email for efficient queries
CREATE INDEX IF NOT EXISTS idx_reversal_requests_employee_email 
ON reversal_requests(employee_email);

-- Create composite index for the common query pattern (either requester OR employee)
CREATE INDEX IF NOT EXISTS idx_reversal_requests_emails 
ON reversal_requests(requested_by_email, employee_email);

-- Add comment to explain the field
COMMENT ON COLUMN reversal_requests.employee_email IS 'Email of the employee whose audit is being reversed. May differ from requested_by_email when a team lead submits on behalf of an employee.';
COMMENT ON COLUMN reversal_requests.employee_name IS 'Name of the employee whose audit is being reversed.';
