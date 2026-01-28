-- Migration: Create user_access_rule table for individual user permissions
-- Used by Permission Management to grant/deny specific users access to resources (e.g. settings/impersonation)
-- Apply to staging (cqms-staging) if the table is missing or schema differs.

-- Individual user allow/deny rules (overrides role-based rules)
CREATE TABLE IF NOT EXISTS user_access_rule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('page', 'feature', 'api_endpoint', 'action')),
  resource_name TEXT NOT NULL,
  access_type TEXT NOT NULL CHECK (access_type IN ('allow', 'deny')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_access_rule_user_email ON user_access_rule(user_email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_access_rule_type_name ON user_access_rule(rule_type, resource_name) WHERE is_active = true;

-- Optional: ensure updated_at is set on update (if trigger not already present)
CREATE OR REPLACE FUNCTION update_user_access_rule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_access_rule_updated_at ON user_access_rule;
CREATE TRIGGER update_user_access_rule_updated_at
  BEFORE UPDATE ON user_access_rule
  FOR EACH ROW
  EXECUTE FUNCTION update_user_access_rule_updated_at();

-- RLS: access controlled via application layer (service role). No RLS policies required for service-role access.
