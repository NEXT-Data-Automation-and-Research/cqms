-- Migration: Add RLS policies for audit tables
-- This migration adds generic RLS policies that can be applied to audit tables
-- These policies allow authenticated users to read audit data

-- Create a helper function to add RLS policies to audit tables
CREATE OR REPLACE FUNCTION add_audit_table_rls_policy(table_name TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Enable RLS if not already enabled
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
  
  -- Drop existing policy if it exists
  EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can read audits" ON %I', table_name);
  
  -- Create policy for authenticated users to read audits
  EXECUTE format(
    'CREATE POLICY "Authenticated users can read audits" ON %I 
     FOR SELECT 
     USING (auth.role() = ''authenticated'')',
    table_name
  );
  
  -- Drop existing insert policy if it exists
  EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can insert audits" ON %I', table_name);
  
  -- Create policy for authenticated users to insert audits
  EXECUTE format(
    'CREATE POLICY "Authenticated users can insert audits" ON %I 
     FOR INSERT 
     WITH CHECK (auth.role() = ''authenticated'')',
    table_name
  );
  
  -- Drop existing update policy if it exists
  EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can update audits" ON %I', table_name);
  
  -- Create policy for authenticated users to update audits
  EXECUTE format(
    'CREATE POLICY "Authenticated users can update audits" ON %I 
     FOR UPDATE 
     USING (auth.role() = ''authenticated'')',
    table_name
  );
  
  -- Drop existing delete policy if it exists
  EXECUTE format('DROP POLICY IF EXISTS "Authenticated users can delete audits" ON %I', table_name);
  
  -- Create policy for authenticated users to delete audits (optional - can be restricted)
  EXECUTE format(
    'CREATE POLICY "Authenticated users can delete audits" ON %I 
     FOR DELETE 
     USING (auth.role() = ''authenticated'')',
    table_name
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION add_audit_table_rls_policy(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION add_audit_table_rls_policy IS 'Adds RLS policies to an audit table for authenticated users';

-- Apply RLS policies to existing audit tables
-- Note: This will only affect tables that exist
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
      -- Try to add RLS policies
      PERFORM add_audit_table_rls_policy(table_record.table_name);
      RAISE NOTICE 'Added RLS policies to table: %', table_record.table_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not add RLS policies to table %: %', table_record.table_name, SQLERRM;
    END;
  END LOOP;
END;
$$;

