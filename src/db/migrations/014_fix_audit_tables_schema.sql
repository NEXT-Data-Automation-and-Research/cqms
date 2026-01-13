-- Migration: Fix audit tables schema
-- This migration adds missing columns to existing audit tables to match the expected schema
-- Based on AUDIT_TABLE_COMMON_FIELDS from field-whitelists.ts

-- Function to add missing columns to an audit table
CREATE OR REPLACE FUNCTION fix_audit_table_schema(table_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check and add missing columns one by one
  -- Using DO blocks for each column to handle errors gracefully
  
  -- employee_email
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'employee_email'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN employee_email TEXT', table_name);
  END IF;
  
  -- employee_name
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'employee_name'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN employee_name TEXT', table_name);
  END IF;
  
  -- employee_type
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'employee_type'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN employee_type TEXT', table_name);
  END IF;
  
  -- auditor_email
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'auditor_email'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN auditor_email TEXT', table_name);
  END IF;
  
  -- auditor_name
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'auditor_name'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN auditor_name TEXT', table_name);
  END IF;
  
  -- interaction_id
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'interaction_id'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN interaction_id TEXT', table_name);
  END IF;
  
  -- interaction_date
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'interaction_date'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN interaction_date DATE', table_name);
  END IF;
  
  -- audit_type
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'audit_type'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN audit_type TEXT', table_name);
  END IF;
  
  -- channel
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'channel'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN channel TEXT', table_name);
  END IF;
  
  -- quarter
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'quarter'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN quarter TEXT', table_name);
  END IF;
  
  -- week
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'week'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN week INTEGER', table_name);
  END IF;
  
  -- country_of_employee
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'country_of_employee'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN country_of_employee TEXT', table_name);
  END IF;
  
  -- client_email
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'client_email'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN client_email TEXT', table_name);
  END IF;
  
  -- client_name
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'client_name'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN client_name TEXT', table_name);
  END IF;
  
  -- agent_pre_status
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'agent_pre_status'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN agent_pre_status TEXT', table_name);
  END IF;
  
  -- agent_post_status
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'agent_post_status'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN agent_post_status TEXT', table_name);
  END IF;
  
  -- passing_status
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'passing_status'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN passing_status TEXT', table_name);
  END IF;
  
  -- validation_status
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'validation_status'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN validation_status TEXT', table_name);
  END IF;
  
  -- average_score
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'average_score'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN average_score NUMERIC', table_name);
  END IF;
  
  -- critical_errors
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'critical_errors'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN critical_errors INTEGER', table_name);
  END IF;
  
  -- total_errors_count
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'total_errors_count'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN total_errors_count INTEGER', table_name);
  END IF;
  
  -- transcript
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'transcript'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN transcript TEXT', table_name);
  END IF;
  
  -- error_description
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'error_description'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN error_description TEXT', table_name);
  END IF;
  
  -- critical_fail_error
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'critical_fail_error'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN critical_fail_error INTEGER', table_name);
  END IF;
  
  -- critical_error
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'critical_error'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN critical_error INTEGER', table_name);
  END IF;
  
  -- significant_error
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'significant_error'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN significant_error INTEGER', table_name);
  END IF;
  
  -- recommendations
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'recommendations'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN recommendations TEXT', table_name);
  END IF;
  
  -- reversal_requested_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'reversal_requested_at'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN reversal_requested_at TIMESTAMPTZ', table_name);
  END IF;
  
  -- reversal_responded_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'reversal_responded_at'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN reversal_responded_at TIMESTAMPTZ', table_name);
  END IF;
  
  -- reversal_approved
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'reversal_approved'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN reversal_approved BOOLEAN', table_name);
  END IF;
  
  -- acknowledgement_status
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'acknowledgement_status'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN acknowledgement_status TEXT', table_name);
  END IF;
  
  -- acknowledgement_status_updated_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'acknowledgement_status_updated_at'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN acknowledgement_status_updated_at TIMESTAMPTZ', table_name);
  END IF;
  
  -- audit_duration
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'audit_duration'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN audit_duration INTEGER', table_name);
  END IF;
  
  -- submitted_at
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'submitted_at'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN submitted_at TIMESTAMPTZ', table_name);
  END IF;
  
  -- audit_timestamp
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'audit_timestamp'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN audit_timestamp TIMESTAMPTZ', table_name);
  END IF;
  
  -- audit_start_time
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'audit_start_time'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN audit_start_time TIMESTAMPTZ', table_name);
  END IF;
  
  -- audit_end_time
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'audit_end_time'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN audit_end_time TIMESTAMPTZ', table_name);
  END IF;
  
  -- created_at (if not exists)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'created_at'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW()', table_name);
  END IF;
  
  -- updated_at (if not exists)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = fix_audit_table_schema.table_name 
    AND column_name = 'updated_at'
  ) INTO column_exists;
  IF NOT column_exists THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()', table_name);
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION fix_audit_table_schema(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION fix_audit_table_schema IS 'Adds missing columns to an audit table to match the expected schema';

-- Apply schema fixes to existing audit tables
DO $$
DECLARE
  table_record RECORD;
BEGIN
  -- Get all audit tables
  FOR table_record IN 
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('scorecards', 'users', 'notifications', 'notification_subscriptions', 'audit_logs', 'audit_assignments', 'people')
      AND (
        table_name LIKE '%_audit%'
        OR table_name LIKE '%_cfd%'
        OR table_name LIKE '%_dev%'
        OR table_name LIKE 'fnchat%'
        OR table_name LIKE 'b_%'
      )
  LOOP
    BEGIN
      -- Try to fix schema
      PERFORM fix_audit_table_schema(table_record.table_name);
      RAISE NOTICE 'Fixed schema for table: %', table_record.table_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not fix schema for table %: %', table_record.table_name, SQLERRM;
    END;
  END LOOP;
END;
$$;

