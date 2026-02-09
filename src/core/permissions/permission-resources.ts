/**
 * Permission Resources Registry
 * Canonical resource names for pages and features. Use these everywhere:
 * - Route config (permissionResource)
 * - Backend requirePermission(resource, type)
 * - access_control_rules / user_access_rule.resource_name
 */

export const RuleType = ['page', 'feature', 'api_endpoint', 'action'] as const;
export type PermissionRuleType = (typeof RuleType)[number];

/**
 * Page resources (one per app page). Used for route visibility and page guards.
 */
export const PAGE_RESOURCES = {
  HOME: 'home',
  DASHBOARD: 'dashboard',
  AUDIT_DISTRIBUTION: 'audit-distribution',
  CREATE_AUDIT: 'create-audit',
  AUDIT_REPORTS: 'audit-reports',
  AI_AUDIT_REPORTS: 'ai-audit-reports',
  PERFORMANCE: 'performance',
  PERFORMANCE_ANALYTICS: 'performance-analytics',
  BAU_METRICS: 'bau-metrics',
  ACTIVE_USERS_DASHBOARD: 'active-users-dashboard',
  COACHING_REMEDIATION: 'coaching-remediation',
  REVERSAL: 'reversal',
  EVENT_MANAGEMENT: 'event-management',
  SETTINGS_SCORECARDS: 'settings/scorecards',
  SETTINGS_USER_MANAGEMENT: 'settings/user-management',
  SETTINGS_PERMISSIONS: 'settings/permissions',
  SETTINGS_ACCESS_CONTROL: 'settings/access-control',
  SETTINGS_IMPERSONATION: 'settings/impersonation',
  PROFILE: 'profile',
  HELP: 'help',
  NOTIFICATION_TEST: 'notification-test',
  SANDBOX: 'sandbox',
  AUDIT_FORM: 'audit-form',
} as const;

export type PageResourceSlug = (typeof PAGE_RESOURCES)[keyof typeof PAGE_RESOURCES];

/**
 * Feature/API resources (for actions and API endpoints).
 */
export const FEATURE_RESOURCES = {
  USER_IMPERSONATION: 'settings/impersonation',
  PEOPLE_LIST: 'settings/user-management',
  PERMISSION_MANAGEMENT: 'settings/permissions',
} as const;

/**
 * All resources for Permission Management UI dropdowns (pages first, then features).
 */
export const ALL_RESOURCES_FOR_UI: Array<{ value: string; label: string; type: PermissionRuleType }> = [
  { value: PAGE_RESOURCES.HOME, label: 'Home', type: 'page' },
  { value: PAGE_RESOURCES.DASHBOARD, label: "Auditors' Dashboard", type: 'page' },
  { value: PAGE_RESOURCES.AUDIT_DISTRIBUTION, label: 'Audit Distribution', type: 'page' },
  { value: PAGE_RESOURCES.CREATE_AUDIT, label: 'Create Audit', type: 'page' },
  { value: PAGE_RESOURCES.AUDIT_REPORTS, label: 'Audit Reports', type: 'page' },
  { value: PAGE_RESOURCES.AI_AUDIT_REPORTS, label: 'AI Audit Reports', type: 'page' },
  { value: PAGE_RESOURCES.PERFORMANCE, label: 'Performance', type: 'page' },
  { value: PAGE_RESOURCES.PERFORMANCE_ANALYTICS, label: 'Performance Analytics', type: 'page' },
  { value: PAGE_RESOURCES.BAU_METRICS, label: 'BAU Metrics', type: 'page' },
  { value: PAGE_RESOURCES.ACTIVE_USERS_DASHBOARD, label: 'Active Users Dashboard', type: 'page' },
  { value: PAGE_RESOURCES.COACHING_REMEDIATION, label: 'Coaching & Remediation', type: 'page' },
  { value: PAGE_RESOURCES.REVERSAL, label: 'Reversal', type: 'page' },
  { value: PAGE_RESOURCES.EVENT_MANAGEMENT, label: 'Event Management', type: 'page' },
  { value: PAGE_RESOURCES.SETTINGS_SCORECARDS, label: 'Scorecards', type: 'page' },
  { value: PAGE_RESOURCES.SETTINGS_USER_MANAGEMENT, label: 'User Management', type: 'page' },
  { value: PAGE_RESOURCES.SETTINGS_PERMISSIONS, label: 'Permission Management', type: 'page' },
  { value: PAGE_RESOURCES.SETTINGS_ACCESS_CONTROL, label: 'Access Control', type: 'page' },
  { value: PAGE_RESOURCES.SETTINGS_IMPERSONATION, label: 'View as User', type: 'page' },
  { value: PAGE_RESOURCES.PROFILE, label: 'Profile', type: 'page' },
  { value: PAGE_RESOURCES.HELP, label: 'Help', type: 'page' },
  { value: PAGE_RESOURCES.NOTIFICATION_TEST, label: 'Notification Test', type: 'page' },
  { value: PAGE_RESOURCES.SANDBOX, label: 'Sandbox', type: 'page' },
  { value: PAGE_RESOURCES.AUDIT_FORM, label: 'Audit Form', type: 'page' },
  { value: FEATURE_RESOURCES.USER_IMPERSONATION, label: 'View as User (API)', type: 'api_endpoint' },
  { value: FEATURE_RESOURCES.PEOPLE_LIST, label: 'People/User Management (API)', type: 'api_endpoint' },
  { value: FEATURE_RESOURCES.PERMISSION_MANAGEMENT, label: 'Permission Management (API)', type: 'api_endpoint' },
];

/**
 * Map route path or slug to permission resource name (page).
 */
export function getPageResourceBySlug(slug: string): string | null {
  const map: Record<string, string> = {
    home: PAGE_RESOURCES.HOME,
    dashboard: PAGE_RESOURCES.DASHBOARD,
    'audit-distribution': PAGE_RESOURCES.AUDIT_DISTRIBUTION,
    'create-audit': PAGE_RESOURCES.CREATE_AUDIT,
    'audit-reports': PAGE_RESOURCES.AUDIT_REPORTS,
    'ai-audit-reports': PAGE_RESOURCES.AI_AUDIT_REPORTS,
    performance: PAGE_RESOURCES.PERFORMANCE,
    'performance-analytics': PAGE_RESOURCES.PERFORMANCE_ANALYTICS,
    'bau-metrics': PAGE_RESOURCES.BAU_METRICS,
    'active-users-dashboard': PAGE_RESOURCES.ACTIVE_USERS_DASHBOARD,
    'coaching-remediation': PAGE_RESOURCES.COACHING_REMEDIATION,
    reversal: PAGE_RESOURCES.REVERSAL,
    'event-management': PAGE_RESOURCES.EVENT_MANAGEMENT,
    scorecards: PAGE_RESOURCES.SETTINGS_SCORECARDS,
    'user-management': PAGE_RESOURCES.SETTINGS_USER_MANAGEMENT,
    permissions: PAGE_RESOURCES.SETTINGS_PERMISSIONS,
    'access-control': PAGE_RESOURCES.SETTINGS_ACCESS_CONTROL,
    impersonation: PAGE_RESOURCES.SETTINGS_IMPERSONATION,
    profile: PAGE_RESOURCES.PROFILE,
    help: PAGE_RESOURCES.HELP,
    'notification-test': PAGE_RESOURCES.NOTIFICATION_TEST,
    sandbox: PAGE_RESOURCES.SANDBOX,
    'audit-form': PAGE_RESOURCES.AUDIT_FORM,
  };
  return map[slug.toLowerCase()] ?? null;
}
