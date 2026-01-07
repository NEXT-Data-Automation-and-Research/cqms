/**
 * Notification Consent Manager
 * Orchestrates the notification consent flow
 */

import { NotificationConsentService } from '../application/notification-consent-service.js';
import { NotificationConsentRepository } from '../infrastructure/notification-consent-repository.js';
import { NotificationConsentModal } from './notification-consent-modal.js';
import { saveNotificationSubscription } from '../../../utils/notification-subscriptions.js';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../domain/notification-types.js';
import type { NotificationPreferences } from '../domain/notification-types.js';
import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js';

export class NotificationConsentManager {
  private service: NotificationConsentService;
  private modal: NotificationConsentModal;
  private userId: string | null = null;

  constructor() {
    const repository = new NotificationConsentRepository();
    this.service = new NotificationConsentService(repository);
    this.modal = new NotificationConsentModal();
    this.setupModalCallbacks();
  }

  /**
   * Setup modal callbacks
   */
  private setupModalCallbacks(): void {
    this.modal.setOnAllow(async () => {
      await this.handleAllowNotifications();
    });

    this.modal.setOnSave(async (channels) => {
      await this.handleSavePreferences(channels);
    });

    this.modal.setOnSkip(() => {
      this.handleSkip();
    });
  }

  /**
   * Check if consent popup should be shown and show it if needed
   */
  async checkAndShowConsent(userId: string, isNewDevice: boolean): Promise<void> {
    this.userId = userId;

    try {
      const consentNeeded = await this.service.isConsentNeeded(userId, isNewDevice);
      
      if (consentNeeded) {
        // Update modal with current browser permission status
        const permission = this.service.getBrowserPermissionStatus();
        this.modal.updateBrowserPermissionStatus(permission);
        
        // Show modal after a short delay to ensure page is loaded
        setTimeout(() => {
          this.modal.show();
        }, 500);
      }
    } catch (error) {
      logError('Error checking notification consent:', error);
    }
  }

  /**
   * Handle "Allow Notifications" button click
   */
  private async handleAllowNotifications(): Promise<void> {
    if (!this.userId) return;

    try {
      // Request browser notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        
        this.modal.updateBrowserPermissionStatus(permission);
        
        if (permission === 'granted') {
          // Subscribe to push notifications
          await this.subscribeToPushNotifications();
        } else {
          logWarn('Browser notification permission denied');
        }
      }
    } catch (error) {
      logError('Error requesting notification permission:', error);
    }
  }

  /**
   * Handle "Save Preferences" button click
   */
  private async handleSavePreferences(channels: { web: boolean; email: boolean }): Promise<void> {
    if (!this.userId) return;

    try {
      // Get current browser permission status
      let browserPermission = this.service.getBrowserPermissionStatus();
      let browserPermissionGranted = browserPermission === 'granted';

      // If web notifications are enabled but permission not granted, request it
      if (channels.web && browserPermission !== 'granted' && browserPermission !== 'denied') {
        if ('Notification' in window) {
          logInfo('Requesting browser notification permission...');
          browserPermission = await Notification.requestPermission();
          browserPermissionGranted = browserPermission === 'granted';
          this.modal.updateBrowserPermissionStatus(browserPermission);
        }
      }

      // Build preferences object
      const preferences: NotificationPreferences = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        channels: {
          web: channels.web,
          email: channels.email,
          clickup: false, // Future
        },
        browser_permission_granted: browserPermissionGranted,
        email: channels.email,
        push: channels.web && browserPermissionGranted,
      };

      // Save preferences
      logInfo('Saving notification preferences...');
      await this.service.saveConsentPreferences(this.userId, preferences);
      logInfo('✅ Notification preferences saved');

      // If web notifications enabled and permission granted, subscribe
      if (channels.web && browserPermissionGranted) {
        logInfo('Web notifications enabled and permission granted, subscribing...');
        await this.subscribeToPushNotifications();
      } else if (channels.web && !browserPermissionGranted) {
        logWarn('Web notifications enabled but permission not granted');
      }

      // Hide modal
      this.modal.hide();
      
      // Clear new device flag
      sessionStorage.removeItem('isNewDeviceLogin');
      
      // Show success message
      logInfo('✅ Notification preferences saved successfully');
    } catch (error) {
      logError('❌ Error saving notification preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  }

  /**
   * Handle "Skip" button click
   */
  private handleSkip(): void {
    this.modal.hide();
    sessionStorage.removeItem('isNewDeviceLogin');
  }

  /**
   * Subscribe to push notifications
   */
  private async subscribeToPushNotifications(): Promise<void> {
    if (!this.userId) {
      logError('Cannot subscribe: userId is missing');
      return;
    }

    try {
      // Check if service worker and push manager are available
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        logWarn('Push notifications are not supported in this browser');
        return;
      }

      // Get or register service worker
      let registration: ServiceWorkerRegistration;
      try {
        // Check if service worker is already registered
        const existingRegistrations = await navigator.serviceWorker.getRegistrations();
        if (existingRegistrations.length > 0) {
          registration = existingRegistrations[0];
          logInfo('Using existing service worker registration');
        } else {
          // Register service worker if not registered
          logInfo('Registering service worker...');
          registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
          });
          logInfo('Service worker registered successfully');
        }

        // Wait for service worker to be ready
        registration = await navigator.serviceWorker.ready;
        logInfo('Service worker is ready');
      } catch (error: any) {
        logError('Service worker registration/ready failed:', error);
        // Try to continue with existing registration if available
        try {
          registration = await navigator.serviceWorker.ready;
        } catch (retryError) {
          logError('Service worker not available:', retryError);
          return;
        }
      }

      // Get VAPID public key
      const vapidPublicKey = this.getVapidPublicKey();
      if (!vapidPublicKey) {
        logWarn('VAPID public key not configured - push notifications will not work');
        logWarn('Please set VAPID_PUBLIC_KEY in your environment variables');
        return;
      }

      // Check if already subscribed
      let subscription: PushSubscription | null = null;
      try {
        subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          logInfo('Existing subscription found, updating in database...');
          const saved = await saveNotificationSubscription(subscription, this.userId);
          if (saved) {
            logInfo('✅ Existing subscription saved to database');
          } else {
            logError('❌ Failed to save existing subscription');
          }
          return;
        }
      } catch (error) {
        logWarn('Error checking existing subscription:', error);
        // Continue to create new subscription
      }

      // Subscribe to push notifications
      logInfo('Creating new push subscription...');
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
        logInfo('✅ Push subscription created successfully');
      } catch (subscribeError: any) {
        logError('❌ Failed to create push subscription:', subscribeError);
        if (subscribeError.message?.includes('VAPID')) {
          logError('VAPID key may be invalid. Please check your VAPID_PUBLIC_KEY configuration.');
        }
        return;
      }

      if (!subscription) {
        logError('❌ Subscription is null after creation');
        return;
      }

      // Save subscription to database
      logInfo('Saving subscription to database...');
      const saved = await saveNotificationSubscription(subscription, this.userId);
      if (saved) {
        logInfo('✅ Push subscription saved to database successfully', { endpoint: subscription.endpoint });
      } else {
        logError('❌ Failed to save subscription to database');
        // Subscription was created but not saved - user might need to try again
      }
    } catch (error: any) {
      logError('❌ Error subscribing to push notifications:', error);
    }
  }

  /**
   * Get VAPID public key from environment or window
   */
  private getVapidPublicKey(): string | null {
    // Check window.env (populated by server)
    if (typeof window !== 'undefined' && (window as any).env?.VAPID_PUBLIC_KEY) {
      return (window as any).env.VAPID_PUBLIC_KEY;
    }
    
    // Check process.env (for build-time)
    if (typeof process !== 'undefined' && process.env?.VAPID_PUBLIC_KEY) {
      return process.env.VAPID_PUBLIC_KEY;
    }
    
    return null;
  }

  /**
   * Convert VAPID key from base64 URL to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

