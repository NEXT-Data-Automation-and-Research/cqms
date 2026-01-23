-- Migration: Create role hierarchy table for permission management
-- This table defines the hierarchy levels for roles (optional enhancement)

CREATE TABLE IF NOT EXISTS role_hierarchy (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  role_name TEXT UNIQUE NOT NULL,
  level INTEGER NOT NULL, -- 0 = lowest, 5 = highest
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_role_hierarchy_role_name ON role_hierarchy(role_name);
CREATE INDEX IF NOT EXISTS idx_role_hierarchy_level ON role_hierarchy(level);

-- Insert default roles with hierarchy levels
INSERT INTO role_hierarchy (role_name, level, description) VALUES
  ('General User', 0, 'Basic user with minimal access'),
  ('Employee', 1, 'Standard employee access'),
  ('Quality Analyst', 1, 'Quality analyst access'),
  ('Auditor', 2, 'Auditor access'),
  ('Quality Supervisor', 2, 'Quality supervisor access'),
  ('Manager', 3, 'Manager access'),
  ('Admin', 4, 'Administrator access'),
  ('Super Admin', 5, 'Full system access')
ON CONFLICT (role_name) DO UPDATE
SET level = EXCLUDED.level,
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_role_hierarchy_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_role_hierarchy_updated_at
  BEFORE UPDATE ON role_hierarchy
  FOR EACH ROW
  EXECUTE FUNCTION update_role_hierarchy_updated_at();

-- Note: RLS is disabled as requested - access controlled via application layer
