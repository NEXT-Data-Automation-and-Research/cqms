/**
 * Notification Utilities (Future)
 * Functions for managing web platform notifications via Supabase
 * 
 * This file is prepared for future notification implementation.
 * The user profile structure already supports notification preferences.
 */

import { getSecureSupabase } from './secure-supabase.js';
import { NOTIFICATION_SUBSCRIPTION_FIELDS } from '../core/constants/field-whitelists.js';
import { logError, logWarn } from './logging-helper.js';

/**
 * Save web push notification subscription
 * Call this when user grants notification permission
 * Also updates browser_permission_granted flag in user preferences
 * 
 * @param subscription - PushSubscription object from browser
 */
export async function saveNotificationSubscription(subscription: PushSubscription): Promise<void> {
  // ✅ Get secure Supabase client (automatically verifies auth)
  const supabase = await getSecureSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  // Check if browser permission is granted
  const browserPermissionGranted = 'Notification' in window && Notification.permission === 'granted';

  const subscriptionData = {
    user_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
    auth: arrayBufferToBase64(subscription.getKey('auth')!),
    user_agent: navigator.userAgent,
    platform: navigator.platform,
    browser: getBrowserName(),
    is_active: true,
  };

  const { error: subscriptionError } = await supabase
    .from('notification_subscriptions')
    .upsert(subscriptionData, {
      onConflict: 'endpoint',
      ignoreDuplicates: false,
    });

  if (subscriptionError) {
    throw subscriptionError;
  }

  // Update browser_permission_granted flag in user preferences
  if (browserPermissionGranted) {
    try {
      // Get current preferences
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('notification_preferences')
        .eq('id', user.id)
        .single();

      if (!fetchError && userData?.notification_preferences) {
        const preferences = userData.notification_preferences;
        
        // Update preferences with browser permission status
        const updatedPreferences = {
          ...preferences,
          browser_permission_granted: true,
          push: true,
          channels: {
            ...(preferences.channels || {}),
            web: true,
          },
        };

        const { error: updateError } = await supabase
          .from('users')
          .update({
            notification_preferences: updatedPreferences,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          logWarn('Failed to update browser permission flag:', updateError);
        }
      }
    } catch (error) {
      logWarn('Error updating browser permission flag:', error);
      // Don't throw - subscription was saved successfully
    }
  }
}

/**
 * Update user notification preferences
 * 
 * @param preferences - Notification preferences object
 */
export async function updateNotificationPreferences(preferences: any): Promise<void> {
  // ✅ Get secure Supabase client (automatically verifies auth)
  const supabase = await getSecureSupabase();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('users')
    .update({
      notification_preferences: preferences,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw error;
  }
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(): Promise<any> {
  try {
    // ✅ Get secure Supabase client (automatically verifies auth)
    const supabase = await getSecureSupabase();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return null;
    }

  const { data, error } = await supabase
    .from('users')
    .select('notification_preferences')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

    return data.notification_preferences;
  } catch (error: any) {
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_FAILED') {
      logError('❌ Authentication required:', error.message);
    }
    return null;
  }
}

/**
 * Get user's notification subscriptions
 */
export async function getUserNotificationSubscriptions(): Promise<any[]> {
  try {
    // ✅ Get secure Supabase client (automatically verifies auth)
    const supabase = await getSecureSupabase();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return [];
    }

  const { data, error } = await supabase
    .from('notification_subscriptions')
    .select(NOTIFICATION_SUBSCRIPTION_FIELDS)
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error) {
    return [];
  }

    return data || [];
  } catch (error: any) {
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_FAILED') {
      logError('❌ Authentication required:', error.message);
    }
    return [];
  }
}

/**
 * Helper: Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper: Get browser name from user agent
 */
function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Unknown';
}

