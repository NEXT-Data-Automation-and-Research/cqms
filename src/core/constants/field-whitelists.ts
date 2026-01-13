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
// Scorecard fields for audit form (includes all fields needed for scorecard selection and display)
export const SCORECARD_AUDIT_FORM_FIELDS = 'id, name, description, passing_threshold, table_name, scoring_type, channels, is_active, default_for_channels, allow_over_100, max_bonus_points, created_at';
// Scorecard parameter fields (matches actual database schema)
export const SCORECARD_PARAMETER_FIELDS = 'id, scorecard_id, error_name, penalty_points, parameter_type, error_category, field_type, field_id, description, enable_ai_audit, prompt, is_fail_all, points_direction, requires_feedback, display_order, is_active, created_at';

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
// User management fields - includes all fields needed for user management page
// Note: avatar_url may exist in some people tables - include it if available
export const PEOPLE_USER_MANAGEMENT_FIELDS = 'email, name, role, department, channel, team, designation, employee_id, country, team_supervisor, quality_mentor, is_active, intercom_admin_id, intercom_admin_alias, last_login, login_count, avatar_url, created_at, updated_at';

// Audit fields (generic audit table)
export const AUDIT_FIELDS = 'id, employee_id, interaction_id, scorecard_id, transcript, recommendations, parameters, created_at, updated_at';

// Generic audit table fields (for dynamic scorecard tables)
// These are common fields across all audit scorecard tables
// Used for audit reports feature - includes all fields needed for reporting
export const AUDIT_TABLE_COMMON_FIELDS = 'id, employee_email, employee_name, employee_type, auditor_email, auditor_name, interaction_id, interaction_date, audit_type, channel, quarter, week, country_of_employee, client_email, client_name, agent_pre_status, agent_post_status, passing_status, validation_status, average_score, critical_errors, total_errors_count, transcript, error_description, critical_fail_error, critical_error, significant_error, recommendations, reversal_requested_at, reversal_responded_at, reversal_approved, acknowledgement_status, acknowledgement_status_updated_at, audit_duration, submitted_at, audit_timestamp, audit_start_time, audit_end_time, created_at, updated_at';

// Audit form fields (for audit form feature)
export const AUDIT_FORM_FIELDS = [
  'id',
  'employee_email',
  'employee_name',
  'employee_type',
  'employee_department',
  'country_of_employee',
  'auditor_email',
  'auditor_name',
  'interaction_id',
  'interaction_date',
  'channel',
  'client_email',
  'client_name',
  'transcript',
  'scorecard_id',
  'quarter',
  'week',
  'audit_timestamp',
  'passing_status',
  'average_score',
  'total_errors_count',
  'recommendations',
  'validation_status',
  'audit_duration',
  'audit_start_time',
  'audit_end_time',
  'intercom_alias',
  'conversation_id',
  'parameter_comments'
];

// Channels table fields
export const CHANNEL_FIELDS = 'id, name, description, is_active';
export const CHANNEL_MINIMAL_FIELDS = 'id, name';

// Intercom admin cache table fields
export const INTERCOM_ADMIN_CACHE_FIELDS = 'id, email, name';
export const INTERCOM_ADMIN_CACHE_MINIMAL_FIELDS = 'id, name';

// Event fields
export const EVENT_FIELDS = 'id, title, type, date, start_time, end_time, description, participants, meet_link, created_by, created_at, updated_at';
export const EVENT_MINIMAL_FIELDS = 'id, title, type, date, start_time, end_time';

