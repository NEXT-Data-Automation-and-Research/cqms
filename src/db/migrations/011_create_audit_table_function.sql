-- Migration: Create create_audit_table RPC function
-- This function creates a new audit table for a scorecard with dynamic columns based on parameters

CREATE OR REPLACE FUNCTION create_audit_table(
  table_name TEXT,
  parameters JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  param_record RECORD;
  column_definitions TEXT := '';
  sql_statement TEXT;
  result JSONB;
  v_table_name TEXT;
  v_parameters JSONB;
BEGIN
  -- Store parameters in local variables to avoid ambiguity
  v_table_name := create_audit_table.table_name;
  v_parameters := create_audit_table.parameters;
  
  -- Validate inputs
  IF v_table_name IS NULL OR v_table_name = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table name is required');
  END IF;

  IF v_parameters IS NULL OR jsonb_array_length(v_parameters) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'At least one parameter is required');
  END IF;

  -- Check if table already exists (use table alias to avoid ambiguity)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables AS ist
    WHERE ist.table_schema = 'public' 
    AND ist.table_name = v_table_name
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Table ' || v_table_name || ' already exists');
  END IF;

  -- Build column definitions from parameters
  -- Start with standard audit table columns
  column_definitions := column_definitions || 'id UUID PRIMARY KEY DEFAULT gen_random_uuid(),';
  column_definitions := column_definitions || 'audit_duration INTEGER,';
  column_definitions := column_definitions || 'submitted_at TIMESTAMPTZ,';
  column_definitions := column_definitions || 'auditor_email TEXT,';
  column_definitions := column_definitions || 'audit_start_time TIMESTAMPTZ,';
  column_definitions := column_definitions || 'audit_end_time TIMESTAMPTZ,';
  column_definitions := column_definitions || 'created_at TIMESTAMPTZ DEFAULT NOW(),';
  column_definitions := column_definitions || 'version INTEGER DEFAULT 1';

  -- Add parameter columns
  FOR param_record IN SELECT * FROM jsonb_array_elements(v_parameters)
  LOOP
    DECLARE
      field_id TEXT;
      error_name TEXT;
    BEGIN
      field_id := param_record.value->>'field_id';
      error_name := param_record.value->>'error_name';

      -- Validate parameter fields
      IF field_id IS NULL OR field_id = '' THEN
        CONTINUE; -- Skip invalid parameters
      END IF;

      -- Sanitize field_id (ensure it's safe for column name)
      field_id := lower(regexp_replace(field_id, '[^a-z0-9_]', '_', 'g'));

      -- Add column for this parameter (as INTEGER for counter fields)
      -- Note: Field type handling can be extended later if needed
      column_definitions := column_definitions || ',' || quote_ident(field_id) || ' INTEGER DEFAULT 0';
    END;
  END LOOP;

  -- Build CREATE TABLE statement
  sql_statement := format('CREATE TABLE IF NOT EXISTS %I (%s)', v_table_name, column_definitions);

  -- Execute the CREATE TABLE statement
  EXECUTE sql_statement;

  -- Create indexes on commonly queried columns
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_submitted_at ON %I(submitted_at)', v_table_name, v_table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_auditor_email ON %I(auditor_email)', v_table_name, v_table_name);
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_created_at ON %I(created_at)', v_table_name, v_table_name);

  -- Enable RLS on the new table
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table_name);

  -- Create a policy to allow authenticated users to read/write their own audits
  -- This is a basic policy - can be customized per project needs
  EXECUTE format('CREATE POLICY "Authenticated users can manage audits" ON %I FOR ALL USING (auth.role() = ''authenticated'')', v_table_name);

  -- Return success
  RETURN jsonb_build_object('success', true, 'table_name', v_table_name);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_audit_table(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION create_audit_table(TEXT, JSONB) TO anon;

-- Add comment
COMMENT ON FUNCTION create_audit_table IS 'Creates a new audit table with dynamic columns based on scorecard parameters';

