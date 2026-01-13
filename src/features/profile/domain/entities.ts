/**
 * Profile Domain Entities
 * Data shapes for user profile information
 */

/**
 * User profile information
 * Combines data from users table and people table
 */
export interface UserProfile {
  // From users table
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string;
  department?: string;
  notification_preferences?: Record<string, any>;
  device_info?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  
  // From people table
  employee_id?: number | string | null;
  channel?: string | null;
  team?: string | null;
  team_supervisor?: string | null;
  team_supervisor_name?: string | null; // Enriched supervisor name
  quality_mentor?: string | null;
  designation?: string | null;
  country?: string | null;
  intercom_admin_alias?: string | null;
  is_active?: boolean | null;
  last_login?: string | null;
  login_count?: number | string | null;
}

/**
 * Profile update data
 */
export interface ProfileUpdateData {
  full_name?: string;
  avatar_url?: string;
  notification_preferences?: Record<string, any>;
}

