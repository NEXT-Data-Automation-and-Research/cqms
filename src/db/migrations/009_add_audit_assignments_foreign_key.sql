-- Migration: Add foreign key relationship between audit_assignments and scorecards
-- This migration creates a foreign key constraint to enable Supabase PostgREST
-- to automatically join scorecards when querying audit_assignments

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINT
-- ============================================================================

-- Add foreign key constraint from audit_assignments.scorecard_id to scorecards.id
-- This enables Supabase PostgREST to use the relationship syntax:
-- scorecards:scorecard_id (id, name, table_name)
ALTER TABLE audit_assignments
ADD CONSTRAINT fk_audit_assignments_scorecard
FOREIGN KEY (scorecard_id)
REFERENCES scorecards(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- This foreign key:
-- 1. Enables automatic joins in Supabase queries using scorecards:scorecard_id syntax
-- 2. Ensures referential integrity (scorecard_id must exist in scorecards table)
-- 3. Sets scorecard_id to NULL if a scorecard is deleted (ON DELETE SET NULL)
-- 4. Updates scorecard_id if scorecard.id changes (ON UPDATE CASCADE)
-- 
-- After this migration, queries like this will work:
-- SELECT *, scorecards:scorecard_id (id, name, table_name)
-- FROM audit_assignments
-- WHERE auditor_email = 'user@example.com';

