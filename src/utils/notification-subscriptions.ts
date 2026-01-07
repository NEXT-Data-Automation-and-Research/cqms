/**
 * Notification Subscriptions Utility
 * Handles web push notification subscriptions for users
 */

import { getSecureSupabase } from './secure-supabase.js';
import { getDeviceInfo } from './device-info.js';
import { logError, logWarn, logInfo } from './logging-helper.js';

/**
 * Save or update a web push notification subscription
 * This stores the subscription details needed to send push notifications to the user's device
 */
export async function saveNotificationSubscription(
  subscription: PushSubscription,
  userId: string
): Promise<boolean> {
  try {
    // ✅ Get secure Supabase client (automatically verifies auth)
    const supabase = await getSecureSupabase();
    
    // ✅ Verify userId matches authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || authUser.id !== userId) {
      logError('❌ Security violation - user ID mismatch in notification subscription');
      return false;
    }

    // Get device information for analytics
    const deviceInfo = getDeviceInfo();
    
    // Extract subscription keys
    const subscriptionData = subscription.toJSON();
    const keys = subscriptionData.keys;
    
    if (!keys || !keys.p256dh || !keys.auth) {
      logError('Invalid subscription: missing keys');
      return false;
    }

    const subscriptionRecord = {
      user_id: userId,
      endpoint: subscriptionData.endpoint || '',
      p256dh: keys.p256dh,
      auth: keys.auth,
      // Device/browser metadata
      user_agent: deviceInfo.user_agent,
      platform: deviceInfo.platform,
      browser: deviceInfo.browser,
      browser_version: deviceInfo.browser_version,
      os: deviceInfo.os,
      os_version: deviceInfo.os_version,
      device_type: deviceInfo.device_type,
      screen_resolution: deviceInfo.screen?.resolution,
      language: deviceInfo.language,
      timezone: deviceInfo.timezone,
      is_active: true,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Upsert subscription (update if endpoint exists, insert if new)
    const { error } = await supabase
      .from('notification_subscriptions')
      .upsert(subscriptionRecord, {
        onConflict: 'endpoint',
        ignoreDuplicates: false,
      });

    if (error) {
      logError('Error saving notification subscription:', error);
      return false;
    }

    logInfo('Notification subscription saved successfully');
    return true;
  } catch (error: any) {
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_FAILED') {
      logError('❌ Authentication required for notification subscription:', error.message);
    } else {
      logError('Error in saveNotificationSubscription:', error);
    }
    return false;
  }
}

/**
 * Get all active notification subscriptions for a user
 */
export async function getUserNotificationSubscriptions(userId: string): Promise<any[]> {
  try {
    // ✅ Get secure Supabase client (automatically verifies auth)
    const supabase = await getSecureSupabase();
    
    // ✅ Verify userId matches authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || authUser.id !== userId) {
      logError('❌ Security violation - user ID mismatch');
      return [];
    }
    const { data, error } = await supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      logError('Error fetching notification subscriptions:', error);
      return [];
    }

    return data || [];
  } catch (error: any) {
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_FAILED') {
      logError('❌ Authentication required:', error.message);
    } else {
      logError('Error in getUserNotificationSubscriptions:', error);
    }
    return [];
  }
}

/**
 * Deactivate a notification subscription (when user unsubscribes)
 */
export async function deactivateNotificationSubscription(
  endpoint: string,
  userId: string
): Promise<boolean> {
  try {
    // ✅ Get secure Supabase client (automatically verifies auth)
    const supabase = await getSecureSupabase();
    
    // ✅ Verify userId matches authenticated user
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser || authUser.id !== userId) {
      logError('❌ Security violation - user ID mismatch');
      return false;
    }
    const { error } = await supabase
      .from('notification_subscriptions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('endpoint', endpoint)
      .eq('user_id', userId);

    if (error) {
      logError('Error deactivating notification subscription:', error);
      return false;
    }

    logInfo('Notification subscription deactivated');
    return true;
  } catch (error: any) {
    if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_FAILED') {
      logError('❌ Authentication required:', error.message);
    } else {
      logError('Error in deactivateNotificationSubscription:', error);
    }
    return false;
  }
}

/**
 * Update last used timestamp for a subscription
 */
export async function updateSubscriptionLastUsed(endpoint: string): Promise<boolean> {
  try {
    // ✅ Get secure Supabase client (automatically verifies auth)
    const supabase = await getSecureSupabase();
    const { error } = await supabase
      .from('notification_subscriptions')
      .update({
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('endpoint', endpoint);

    if (error) {
      logError('Error updating subscription last used:', error);
      return false;
    }

    return true;
  } catch (error) {
    logError('Error in updateSubscriptionLastUsed:', error);
    return false;
  }
}

/**
 * Request notification permission and subscribe to push notifications
 * This should be called when the user explicitly requests notifications
 */
export async function subscribeToPushNotifications(userId: string): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    logWarn('Push notifications are not supported in this browser');
    return null;
  }

  try {
    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      logWarn('Notification permission denied');
      return null;
    }

    // Register service worker (you'll need to implement this)
    // const registration = await navigator.serviceWorker.register('/sw.js');
    
    // For now, we'll assume service worker is already registered
    // In production, you should register it properly
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: getVapidPublicKey(), // You'll need to set this
    });

    // Save subscription to database
    await saveNotificationSubscription(subscription, userId);

    return subscription;
  } catch (error) {
    logError('Error subscribing to push notifications:', error);
    return null;
  }
}

/**
 * Get VAPID public key for push notifications
 * Reads from window.env which is populated by the server from environment variables
 * The VAPID_PUBLIC_KEY is safe to expose to the client (it's a public key)
 */
function getVapidPublicKey(): string {
  const env = (window as any).env || {};
  const publicKey = env.VAPID_PUBLIC_KEY || '';
  
  if (!publicKey) {
    logWarn('VAPID_PUBLIC_KEY not found in environment variables. Push notifications may not work.');
  }
  
  return publicKey;
}

