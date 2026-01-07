/**
 * Notification Types
 * TypeScript interfaces for notification preferences and consent
 */

/**
 * Notification channels that users can enable/disable
 */
export interface NotificationChannels {
  web: boolean;
  email: boolean;
  clickup: boolean; // Future integration
}

/**
 * Notification preferences structure
 */
export interface NotificationPreferences {
  // Channel preferences
  channels: NotificationChannels;
  
  // Browser permission status
  browser_permission_granted: boolean;
  
  // Legacy fields (maintained for backward compatibility)
  email: boolean;
  push: boolean;
  in_app: boolean;
  
  // Category preferences
  categories: {
    system: boolean;
    task: boolean;
    message: boolean;
    reminder: boolean;
  };
}

/**
 * Notification consent data
 */
export interface NotificationConsent {
  consentGiven: boolean;
  consentGivenAt: string | null;
  preferences: NotificationPreferences;
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  channels: {
    web: false,
    email: false,
    clickup: false,
  },
  browser_permission_granted: false,
  email: false,
  push: false,
  in_app: true,
  categories: {
    system: true,
    task: true,
    message: true,
    reminder: true,
  },
};

