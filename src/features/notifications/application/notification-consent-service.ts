/**
 * Notification Consent Service
 * Business logic for notification consent management
 */

import { BaseService } from '../../../core/service/base-service.js';
import { NotificationConsentRepository } from '../infrastructure/notification-consent-repository.js';
import type { NotificationPreferences } from '../domain/notification-types.js';

export class NotificationConsentService extends BaseService {
  private repository: NotificationConsentRepository;

  constructor(repository: NotificationConsentRepository) {
    super();
    this.repository = repository;
  }

  /**
   * Check if consent is needed (new device + no consent)
   */
  async isConsentNeeded(userId: string, isNewDevice: boolean): Promise<boolean> {
    this.validateInput(userId, (id) => id.length > 0 || 'User ID is required');

    return this.executeBusinessLogic(
      async () => {
        if (!isNewDevice) {
          return false;
        }

        const hasConsent = await this.repository.hasConsentBeenGiven(userId);
        return !hasConsent;
      },
      'Failed to check if consent is needed'
    );
  }

  /**
   * Check browser notification permission status
   */
  getBrowserPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Save notification consent preferences
   */
  async saveConsentPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    this.validateInput(userId, (id) => id.length > 0 || 'User ID is required');
    this.validateInput(preferences, (prefs) => prefs !== null || 'Preferences are required');

    return this.executeBusinessLogic(
      async () => {
        await this.repository.saveConsentPreferences(userId, preferences);
      },
      'Failed to save notification consent preferences'
    );
  }

  /**
   * Get user's notification consent status
   */
  async getConsentStatus(userId: string): Promise<{
    hasConsent: boolean;
    preferences: NotificationPreferences | null;
  }> {
    this.validateInput(userId, (id) => id.length > 0 || 'User ID is required');

    return this.executeBusinessLogic(
      async () => {
        const consent = await this.repository.getConsentPreferences(userId);
        
        return {
          hasConsent: consent?.consentGiven || false,
          preferences: consent?.preferences || null,
        };
      },
      'Failed to get notification consent status'
    );
  }
}

