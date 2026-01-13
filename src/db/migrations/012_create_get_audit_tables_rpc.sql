-- Migration: Create get_audit_tables RPC function
-- This function returns a list of all audit tables in the database
-- Used by audit reports feature to discover available audit tables

CREATE OR REPLACE FUNCTION get_audit_tables()
RETURNS TABLE(table_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Return all tables that match audit table naming patterns
  -- Exclude system tables and the scorecards table
  RETURN QUERY
  SELECT 
    t.table_name::TEXT
  FROM 
    information_schema.tables t
  WHERE 
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('scorecards', 'users', 'notifications', 'notification_subscriptions', 'audit_logs', 'audit_assignments', 'people')
    AND (
      -- Match common audit table patterns
      t.table_name LIKE '%_audit%'
      OR t.table_name LIKE '%_cfd%'
      OR t.table_name LIKE '%_dev%'
      OR t.table_name LIKE 'fnchat%'
      OR t.table_name LIKE 'b_%'
    )
  ORDER BY 
    t.table_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_audit_tables() TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_tables() TO anon;

-- Add comment
COMMENT ON FUNCTION get_audit_tables IS 'Returns a list of all audit tables in the database for the audit reports feature';

