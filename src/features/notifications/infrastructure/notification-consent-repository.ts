/**
 * Notification Consent Repository
 * Handles database operations for notification consent and preferences
 */

import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import { logError } from '../../../utils/logging-helper.js';
import type { NotificationPreferences, NotificationConsent } from '../domain/notification-types.js';

export class NotificationConsentRepository {
  /**
   * Check if user has given notification consent
   */
  async hasConsentBeenGiven(userId: string): Promise<boolean> {
    try {
      const supabase = await getAuthenticatedSupabase();
      
      const { data, error } = await supabase
        .from('users')
        .select('notification_consent_given')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return false;
      }

      return data.notification_consent_given === true;
    } catch (error) {
      logError('Error checking notification consent:', error);
      return false;
    }
  }

  /**
   * Get user's notification consent preferences
   */
  async getConsentPreferences(userId: string): Promise<NotificationConsent | null> {
    try {
      const supabase = await getAuthenticatedSupabase();
      
      const { data, error } = await supabase
        .from('users')
        .select('notification_consent_given, notification_consent_given_at, notification_preferences')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        consentGiven: data.notification_consent_given === true,
        consentGivenAt: data.notification_consent_given_at || null,
        preferences: data.notification_preferences || null,
      };
    } catch (error) {
      logError('Error getting notification consent preferences:', error);
      return null;
    }
  }

  /**
   * Save notification consent preferences
   */
  async saveConsentPreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      const supabase = await getAuthenticatedSupabase();
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('users')
        .update({
          notification_consent_given: true,
          notification_consent_given_at: now,
          notification_preferences: preferences,
          updated_at: now,
        })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to save notification preferences: ${error.message}`);
      }
    } catch (error) {
      logError('Error saving notification consent preferences:', error);
      throw error;
    }
  }
}

