/**
 * Platform Notifications Service
 * Business logic for platform notifications
 */

import { 
  getActiveNotifications, 
  getUndismissedCount,
  dismissNotification 
} from '../infrastructure/platform-notifications-repository.js';
import type { PlatformNotificationWithStatus } from '../domain/types.js';

/**
 * Service for managing platform notifications from user perspective
 */
export class PlatformNotificationsService {
  private userId: string;
  private userRole: string;
  private cachedNotifications: PlatformNotificationWithStatus[] | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(userId: string, userRole: string) {
    this.userId = userId;
    this.userRole = userRole;
  }

  /**
   * Get all active notifications for the current user
   */
  async getNotifications(forceRefresh = false): Promise<PlatformNotificationWithStatus[]> {
    const now = Date.now();
    
    // Use cache if available and not expired
    if (
      !forceRefresh && 
      this.cachedNotifications && 
      (now - this.lastFetchTime) < this.CACHE_TTL
    ) {
      return this.cachedNotifications;
    }

    try {
      this.cachedNotifications = await getActiveNotifications(this.userId, this.userRole);
      this.lastFetchTime = now;
      return this.cachedNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Return cached data if available, even if stale
      return this.cachedNotifications || [];
    }
  }

  /**
   * Get only undismissed notifications
   */
  async getUndismissedNotifications(): Promise<PlatformNotificationWithStatus[]> {
    const notifications = await this.getNotifications();
    return notifications.filter(n => !n.is_dismissed);
  }

  /**
   * Get count of undismissed notifications
   */
  async getUndismissedCount(): Promise<number> {
    try {
      return await getUndismissedCount(this.userId, this.userRole);
    } catch (error) {
      console.error('Error getting undismissed count:', error);
      return 0;
    }
  }

  /**
   * Dismiss a notification
   */
  async dismiss(notificationId: string): Promise<void> {
    await dismissNotification(notificationId, this.userId);
    
    // Update cache
    if (this.cachedNotifications) {
      const notification = this.cachedNotifications.find(n => n.id === notificationId);
      if (notification) {
        notification.is_dismissed = true;
        notification.dismissed_at = new Date().toISOString();
      }
    }
  }

  /**
   * Clear cache to force refresh on next fetch
   */
  clearCache(): void {
    this.cachedNotifications = null;
    this.lastFetchTime = 0;
  }
}

// Singleton instance for the current session
let serviceInstance: PlatformNotificationsService | null = null;

/**
 * Get or create the service instance
 */
export function getPlatformNotificationsService(
  userId: string,
  userRole: string
): PlatformNotificationsService {
  if (!serviceInstance || serviceInstance['userId'] !== userId) {
    serviceInstance = new PlatformNotificationsService(userId, userRole);
  }
  return serviceInstance;
}

/**
 * Clear the service instance (e.g., on logout)
 */
export function clearPlatformNotificationsService(): void {
  serviceInstance = null;
}
