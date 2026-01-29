/**
 * Platform Notifications Domain Types
 * Types for system-wide platform notifications visible to all users
 */

/**
 * Platform notification type
 */
export type PlatformNotificationType = 'info' | 'warning' | 'alert' | 'success' | 'maintenance';

/**
 * Platform notification entity
 */
export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  type: PlatformNotificationType;
  priority: number;
  is_dismissible: boolean;
  is_pinned: boolean;
  target_roles: string[];
  action_url: string | null;
  action_label: string | null;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Platform notification with dismissal status (for user view)
 */
export interface PlatformNotificationWithStatus extends PlatformNotification {
  is_dismissed: boolean;
  dismissed_at: string | null;
}

/**
 * Create platform notification request
 */
export interface CreatePlatformNotificationRequest {
  title: string;
  message: string;
  type?: PlatformNotificationType;
  priority?: number;
  is_dismissible?: boolean;
  is_pinned?: boolean;
  target_roles?: string[];
  action_url?: string;
  action_label?: string;
  starts_at?: string;
  expires_at?: string;
}

/**
 * Update platform notification request
 */
export interface UpdatePlatformNotificationRequest {
  title?: string;
  message?: string;
  type?: PlatformNotificationType;
  priority?: number;
  is_dismissible?: boolean;
  is_pinned?: boolean;
  target_roles?: string[];
  action_url?: string | null;
  action_label?: string | null;
  is_active?: boolean;
  starts_at?: string;
  expires_at?: string | null;
}

/**
 * Notification dismissal record
 */
export interface NotificationDismissal {
  id: string;
  notification_id: string;
  user_id: string;
  dismissed_at: string;
}
