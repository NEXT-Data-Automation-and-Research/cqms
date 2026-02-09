-- Seed default access rule for Performance Analytics page.
-- All authenticated users can open the page; Super Admin sees all data, others see only their own.

INSERT INTO access_control_rules (
  rule_type,
  resource_name,
  allowed_roles,
  is_active,
  description
)
VALUES (
  'page',
  'performance-analytics',
  ARRAY['Super Admin', 'Admin', 'Manager', 'Quality Analyst', 'Quality Supervisor', 'Employee', 'General User'],
  true,
  'Performance Analytics: comprehensive view (Super Admin) or own performance (others)'
)
ON CONFLICT (rule_type, resource_name) DO UPDATE SET
  allowed_roles = EXCLUDED.allowed_roles,
  description = EXCLUDED.description,
  updated_at = NOW();
