/**
 * Profile Domain Entities
 * Data shapes for user profile information
 */

/**
 * User profile information
 */
export interface UserProfile {
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
}

/**
 * Profile update data
 */
export interface ProfileUpdateData {
  full_name?: string;
  avatar_url?: string;
  notification_preferences?: Record<string, any>;
}

