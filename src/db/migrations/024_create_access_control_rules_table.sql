-- Migration: Create access_control_rules table (role-based permissions)
-- Used by:
-- - src/core/permissions/permission.service.ts
-- - src/api/routes/permissions.routes.ts
--
-- NOTE: This table intentionally stores role names (TEXT[]) to match application logic.

CREATE TABLE IF NOT EXISTS access_control_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type TEXT NOT NULL CHECK (rule_type IN ('page', 'feature', 'api_endpoint', 'action')),
  resource_name TEXT NOT NULL,
  allowed_roles TEXT[],
  min_role_level INTEGER,
  custom_check_function TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  description TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_rule_resource UNIQUE (rule_type, resource_name),
  CONSTRAINT valid_min_level CHECK (min_role_level IS NULL OR min_role_level >= 0)
);

CREATE INDEX IF NOT EXISTS idx_access_control_rules_type_name
  ON access_control_rules(rule_type, resource_name)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_access_control_rules_allowed_roles
  ON access_control_rules USING GIN(allowed_roles)
  WHERE is_active = true;

-- Optional: ensure updated_at is set on update
CREATE OR REPLACE FUNCTION update_access_control_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_access_control_rules_updated_at ON access_control_rules;
CREATE TRIGGER update_access_control_rules_updated_at
  BEFORE UPDATE ON access_control_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_access_control_rules_updated_at();

-- RLS: access controlled via application layer (service role). No RLS policies required for service-role access.

