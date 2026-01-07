/**
 * Field Whitelists
 * Explicit field lists for database queries to prevent data over-exposure
 * 
 * NEVER use select('*') - always use these whitelists
 */

// User fields
export const USER_PUBLIC_FIELDS = 'id, email, full_name, avatar_url, created_at';
export const USER_PRIVATE_FIELDS = 'id, email, full_name, avatar_url, created_at, last_sign_in_at, sign_in_count';
export const USER_MINIMAL_FIELDS = 'id, email, full_name';
export const USER_NOTIFICATION_CONSENT_FIELDS = 'id, notification_consent_given, notification_consent_given_at, notification_preferences';

// Notification fields
export const NOTIFICATION_FIELDS = 'id, title, body, type, status, created_at, updated_at';
export const NOTIFICATION_MINIMAL_FIELDS = 'id, title, type, status, created_at';

// Notification subscription fields
export const NOTIFICATION_SUBSCRIPTION_FIELDS = 'id, user_id, endpoint, p256dh, auth, created_at, updated_at';

// Scorecard fields
export const SCORECARD_FIELDS = 'id, name, table_name, created_at, updated_at';
export const SCORECARD_MINIMAL_FIELDS = 'id, name, table_name';

// Audit assignment fields (matches actual table schema from audit_assignments table)
// Verified against database schema - includes all non-sensitive fields
// NOTE: Does NOT include interaction_id (that field doesn't exist in audit_assignments table)
// Version: 2025-01-29 - Removed interaction_id to match actual database schema
export const AUDIT_ASSIGNMENT_FIELDS = 'id, employee_email, employee_name, auditor_email, scorecard_id, status, scheduled_date, week, created_at, assigned_by, completed_at, audit_id, conversation_id, intercom_alias, source_type';
export const AUDIT_ASSIGNMENT_MINIMAL_FIELDS = 'id, auditor_email, employee_email, employee_name, scorecard_id, status, scheduled_date';

// People table fields (NOTE: people table does NOT have an 'id' column - email is the identifier)
// Verified against database schema - people table has no primary key, uses email as identifier
export const PEOPLE_PUBLIC_FIELDS = 'email, name, role, channel, team, team_supervisor, quality_mentor, employee_id, intercom_admin_alias, created_at, updated_at';
export const PEOPLE_MINIMAL_FIELDS = 'email, name, avatar_url';
export const PEOPLE_PROFILE_FIELDS = 'email, name, role, channel, team, team_supervisor, quality_mentor, employee_id, intercom_admin_alias, created_at, updated_at';

// Audit fields (generic audit table)
export const AUDIT_FIELDS = 'id, employee_id, interaction_id, scorecard_id, transcript, recommendations, parameters, created_at, updated_at';

// Generic audit table fields (for dynamic scorecard tables)
// These are common fields across all audit scorecard tables
export const AUDIT_TABLE_COMMON_FIELDS = 'id, employee_email, employee_name, auditor_email, scorecard_id, interaction_id, created_at, submitted_at, status, passing_status, audit_duration, reversal_requested_at, acknowledged_at, acknowledged_by, created_by, updated_at';

