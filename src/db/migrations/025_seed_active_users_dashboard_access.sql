-- Seed default access rule for Active Users Dashboard.
-- This keeps the page "Super Admin only" by default, while still allowing future changes
-- via Permission Management UI (access_control_rules updates) without code changes.

INSERT INTO access_control_rules (
  rule_type,
  resource_name,
  allowed_roles,
  min_role_level,
  is_active,
  description
)
VALUES (
  'page',
  'active-users-dashboard',
  ARRAY['Super Admin'],
  NULL,
  true,
  'Active Users Dashboard (default: Super Admin only)'
)
ON CONFLICT (rule_type, resource_name) DO NOTHING;

