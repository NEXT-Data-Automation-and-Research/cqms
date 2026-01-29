/**
 * Platform Notifications Repository
 * Database operations for platform notifications
 */

import type { 
  PlatformNotification, 
  PlatformNotificationWithStatus,
  CreatePlatformNotificationRequest,
  UpdatePlatformNotificationRequest 
} from '../domain/types.js';

declare const window: Window & {
  supabaseClient?: any;
};

/**
 * Get Supabase client
 */
function getSupabase() {
  if (!window.supabaseClient) {
    throw new Error('Supabase client not initialized');
  }
  return window.supabaseClient;
}

/**
 * Get active platform notifications for the current user
 * Includes dismissal status for each notification
 */
export async function getActiveNotifications(
  userId: string,
  userRole: string
): Promise<PlatformNotificationWithStatus[]> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  // Get all active notifications that are within their active period
  const { data: notifications, error } = await supabase
    .from('platform_notifications')
    .select('*')
    .eq('is_active', true)
    .lte('starts_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('is_pinned', { ascending: false })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching platform notifications:', error);
    throw error;
  }

  if (!notifications || notifications.length === 0) {
    return [];
  }

  // Filter notifications by target roles
  const filteredNotifications = notifications.filter((n: PlatformNotification) => {
    // If no target roles specified, show to everyone
    if (!n.target_roles || n.target_roles.length === 0) {
      return true;
    }
    // Check if user's role is in target roles
    return n.target_roles.includes(userRole);
  });

  if (filteredNotifications.length === 0) {
    return [];
  }

  // Get dismissals for this user
  const notificationIds = filteredNotifications.map((n: PlatformNotification) => n.id);
  const { data: dismissals, error: dismissalError } = await supabase
    .from('platform_notification_dismissals')
    .select('notification_id, dismissed_at')
    .eq('user_id', userId)
    .in('notification_id', notificationIds);

  if (dismissalError) {
    console.error('Error fetching dismissals:', dismissalError);
    // Continue without dismissal data
  }

  // Create a map of dismissals
  const dismissalMap = new Map<string, string>();
  if (dismissals) {
    dismissals.forEach((d: { notification_id: string; dismissed_at: string }) => {
      dismissalMap.set(d.notification_id, d.dismissed_at);
    });
  }

  // Combine notifications with dismissal status
  return filteredNotifications.map((n: PlatformNotification) => ({
    ...n,
    is_dismissed: dismissalMap.has(n.id),
    dismissed_at: dismissalMap.get(n.id) || null
  }));
}

/**
 * Get count of undismissed notifications for the current user
 */
export async function getUndismissedCount(userId: string, userRole: string): Promise<number> {
  const notifications = await getActiveNotifications(userId, userRole);
  return notifications.filter(n => !n.is_dismissed).length;
}

/**
 * Dismiss a notification for the current user
 */
export async function dismissNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('platform_notification_dismissals')
    .upsert({
      notification_id: notificationId,
      user_id: userId,
      dismissed_at: new Date().toISOString()
    }, {
      onConflict: 'notification_id,user_id'
    });

  if (error) {
    console.error('Error dismissing notification:', error);
    throw error;
  }
}

/**
 * Admin: Get all platform notifications (for management)
 */
export async function getAllNotifications(): Promise<PlatformNotification[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('platform_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all notifications:', error);
    throw error;
  }

  return data || [];
}

/**
 * Admin: Create a new platform notification
 */
export async function createNotification(
  notification: CreatePlatformNotificationRequest,
  createdBy: { id: string; email: string }
): Promise<PlatformNotification> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('platform_notifications')
    .insert({
      ...notification,
      created_by: createdBy.id,
      created_by_email: createdBy.email
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }

  return data;
}

/**
 * Admin: Update a platform notification
 */
export async function updateNotification(
  notificationId: string,
  updates: UpdatePlatformNotificationRequest
): Promise<PlatformNotification> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('platform_notifications')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating notification:', error);
    throw error;
  }

  return data;
}

/**
 * Admin: Delete a platform notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('platform_notifications')
    .delete()
    .eq('id', notificationId);

  if (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Admin: Toggle notification active status
 */
export async function toggleNotificationActive(
  notificationId: string,
  isActive: boolean
): Promise<PlatformNotification> {
  return updateNotification(notificationId, { is_active: isActive });
}
