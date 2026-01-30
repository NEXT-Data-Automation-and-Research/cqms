/**
 * Real-time platform notifications
 *
 * Subscribes to Supabase Postgres Changes on platform_notifications.
 * When a notification is inserted or updated, shows a toast to all users.
 *
 * Set up once per session from the sidebar (all pages) so users see
 * the notification no matter which page they are on.
 */

import { getSupabase, initSupabase } from '../../../utils/supabase-init.js';
import { verifyAuth } from '../../../utils/authenticated-supabase-auth.js';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const CHANNEL_NAME = 'platform-notifications-changes';
let platformNotificationsChannel: RealtimeChannel | null = null;
let isSubscribed = false;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Track recently shown notifications to avoid duplicates
const recentlyShownNotifications = new Set<string>();

/**
 * Show a styled toast notification for platform announcements
 * Green-themed, minimal design matching the platform style
 */
function showPlatformNotificationToast(notification: {
  title: string;
  message: string;
  type: string;
  action_url?: string | null;
  action_label?: string | null;
}): void {
  console.log('[Platform notifications realtime] 🔔 Showing toast for:', notification.title);
  
  // Prevent showing same notification multiple times
  const notificationKey = `${notification.title}-${notification.message}`;
  if (recentlyShownNotifications.has(notificationKey)) {
    console.log('[Platform notifications realtime] Skipping duplicate toast');
    return;
  }
  recentlyShownNotifications.add(notificationKey);
  
  // Clear from set after 30 seconds to allow re-showing if needed
  setTimeout(() => recentlyShownNotifications.delete(notificationKey), 30000);
  
  // Remove any existing toast first
  document.getElementById('platform-notification-toast')?.remove();
  
  // Add animation styles if not present
  if (!document.getElementById('platform-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'platform-toast-styles';
    style.textContent = `
      @keyframes platformToastSlideIn {
        from { transform: translateY(-16px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes platformToastSlideOut {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-16px); opacity: 0; }
      }
      #platform-notification-toast {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        animation: platformToastSlideIn 0.25s ease-out forwards;
      }
      #platform-notification-toast.hiding {
        animation: platformToastSlideOut 0.2s ease-in forwards;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Type-based accent colors (subtle)
  const typeAccents: Record<string, string> = {
    info: '#0ea5e9',
    success: '#10b981',
    warning: '#f59e0b',
    alert: '#ef4444',
    maintenance: '#8b5cf6'
  };
  
  const accentColor = typeAccents[notification.type] || typeAccents.info;
  
  // Create action button HTML if there's an action URL
  const actionButtonHtml = notification.action_url ? `
    <a href="${notification.action_url}" target="_blank" style="
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-top: 10px;
      padding: 6px 10px;
      background: #1a733e;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      transition: background 0.15s;
    " onmouseover="this.style.background='#0d5e3a'" 
       onmouseout="this.style.background='#1a733e'">${notification.action_label || 'View'} →</a>
  ` : '';
  
  // Create toast element - clean, minimal design
  const toastDiv = document.createElement('div');
  toastDiv.id = 'platform-notification-toast';
  toastDiv.innerHTML = `
    <div style="
      background: white;
      border: 1px solid #e5e7eb;
      border-left: 3px solid ${accentColor};
      border-radius: 8px;
      padding: 14px 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      min-width: 280px;
      max-width: 360px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
        <div style="flex: 1; min-width: 0;">
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            font-weight: 600;
            color: #1a733e;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 4px;
          ">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            New Announcement
          </div>
          <div style="
            font-size: 13px;
            font-weight: 600;
            color: #111827;
            margin-bottom: 2px;
            line-height: 1.3;
          ">${notification.title}</div>
          <div style="
            font-size: 12px;
            color: #6b7280;
            line-height: 1.4;
          ">${notification.message.length > 100 ? notification.message.substring(0, 100) + '...' : notification.message}</div>
          ${actionButtonHtml}
        </div>
        <button onclick="
          this.closest('#platform-notification-toast').classList.add('hiding');
          setTimeout(() => this.closest('#platform-notification-toast')?.remove(), 200);
        " style="
          background: transparent;
          border: none;
          color: #9ca3af;
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 2px;
          margin: -4px -4px 0 0;
          transition: color 0.15s;
        " onmouseover="this.style.color='#374151'" 
           onmouseout="this.style.color='#9ca3af'">&times;</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(toastDiv);
  console.log('[Platform notifications realtime] ✅ Toast displayed');
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    const toast = document.getElementById('platform-notification-toast');
    if (toast) {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 250);
    }
  }, 8000);
}

/**
 * Get the raw Supabase client for realtime subscriptions
 */
async function getRawSupabaseClient(): Promise<SupabaseClient | null> {
  let supabase = getSupabase();
  if (!supabase) {
    await initSupabase();
    supabase = getSupabase();
  }
  return supabase;
}

/**
 * Set up real-time subscription for platform_notifications.
 * All authenticated users receive notifications.
 */
export async function setupPlatformNotificationsRealtime(): Promise<void> {
  // Verify the user is authenticated first
  const auth = await verifyAuth();
  if (!auth.isAuthenticated) {
    console.warn('[Platform notifications realtime] User not authenticated, skipping realtime setup');
    return;
  }

  const supabase = await getRawSupabaseClient();
  if (!supabase) {
    console.warn('[Platform notifications realtime] Supabase client not available');
    return;
  }

  if (typeof supabase.channel !== 'function') {
    console.warn('[Platform notifications realtime] Supabase realtime channel method not available');
    return;
  }

  // Avoid duplicate subscription
  if (platformNotificationsChannel && isSubscribed) {
    console.log('[Platform notifications realtime] Already subscribed');
    return;
  }

  // Clean up previous subscription if any
  if (platformNotificationsChannel) {
    try {
      supabase.removeChannel(platformNotificationsChannel);
    } catch (e) {
      console.warn('[Platform notifications realtime] Error removing previous channel:', e);
    }
    platformNotificationsChannel = null;
    isSubscribed = false;
  }

  retryCount = 0;
  createRealtimeSubscription(supabase);
}

/**
 * Create the realtime subscription with error handling and retry logic
 */
function createRealtimeSubscription(supabase: SupabaseClient): void {
  console.log('[Platform notifications realtime] Creating subscription...');
  
  platformNotificationsChannel = supabase
    .channel(CHANNEL_NAME)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'platform_notifications',
      },
      (payload: { new?: Record<string, unknown>; old?: Record<string, unknown>; eventType?: string }) => {
        console.log('[Platform notifications realtime] 🚨 Event received:', payload);
        
        const newRow = payload?.new;
        const oldRow = payload?.old;
        const eventType =
          newRow && !oldRow ? 'INSERT' : oldRow && newRow ? 'UPDATE' : oldRow && !newRow ? 'DELETE' : null;
        
        // Only show toast for INSERT (new notification) or UPDATE that activates a notification
        if (eventType === 'INSERT' && newRow) {
          const isActive = newRow.is_active as boolean;
          
          if (isActive) {
            showPlatformNotificationToast({
              title: (newRow.title as string) || 'New Announcement',
              message: (newRow.message as string) || '',
              type: (newRow.type as string) || 'info',
              action_url: newRow.action_url as string | null,
              action_label: newRow.action_label as string | null
            });
          }
        } else if (eventType === 'UPDATE' && newRow && oldRow) {
          // Show toast if notification was just activated
          const wasInactive = !(oldRow.is_active as boolean);
          const isNowActive = newRow.is_active as boolean;
          
          if (wasInactive && isNowActive) {
            showPlatformNotificationToast({
              title: (newRow.title as string) || 'Announcement',
              message: (newRow.message as string) || '',
              type: (newRow.type as string) || 'info',
              action_url: newRow.action_url as string | null,
              action_label: newRow.action_label as string | null
            });
          }
        }
        
        // Dispatch event for pages to refresh their notification lists
        document.dispatchEvent(
          new CustomEvent('platformNotificationReceived', {
            detail: { type: eventType, notification: newRow || oldRow },
          })
        );
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[Platform notifications realtime] Subscription error:', {
          status,
          error: err,
          message: err?.message || 'Unknown error',
          retryCount
        });
        
        // ✅ FIX: Check if this is an auth-related error
        const errorMessage = err?.message?.toLowerCase() || '';
        const isAuthError = errorMessage.includes('jwt') || 
                           errorMessage.includes('token') ||
                           errorMessage.includes('auth') ||
                           errorMessage.includes('401') ||
                           errorMessage.includes('unauthorized');
        
        if (isAuthError) {
          console.log('[Platform notifications realtime] Auth error detected - will retry after session refresh');
          setTimeout(async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                console.log('[Platform notifications realtime] Session valid - retrying');
                if (platformNotificationsChannel) {
                  try {
                    supabase.removeChannel(platformNotificationsChannel);
                  } catch (_) {}
                  platformNotificationsChannel = null;
                }
                createRealtimeSubscription(supabase);
              } else {
                console.log('[Platform notifications realtime] No valid session - not retrying');
                platformNotificationsChannel = null;
                isSubscribed = false;
              }
            } catch (e) {
              console.warn('[Platform notifications realtime] Error checking session:', e);
            }
          }, 2000);
          return;
        }
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          console.log(`[Platform notifications realtime] Retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
          
          setTimeout(() => {
            if (platformNotificationsChannel) {
              try {
                supabase.removeChannel(platformNotificationsChannel);
              } catch (_) {}
              platformNotificationsChannel = null;
            }
            createRealtimeSubscription(supabase);
          }, delay);
        } else {
          console.error('[Platform notifications realtime] Max retries reached');
          platformNotificationsChannel = null;
          isSubscribed = false;
        }
      } else if (status === 'SUBSCRIBED') {
        console.log('[Platform notifications realtime] ✅ Successfully subscribed to platform_notifications');
        retryCount = 0;
        isSubscribed = true;
      } else if (status === 'CLOSED') {
        console.log('[Platform notifications realtime] Channel closed');
        platformNotificationsChannel = null;
        isSubscribed = false;
      } else if (status === 'TIMED_OUT') {
        console.warn('[Platform notifications realtime] Subscription timed out');
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          setTimeout(() => {
            if (platformNotificationsChannel) {
              try {
                supabase.removeChannel(platformNotificationsChannel);
              } catch (_) {}
              platformNotificationsChannel = null;
            }
            createRealtimeSubscription(supabase);
          }, delay);
        }
      }
    });

  // Set up cleanup on page unload
  const cleanup = () => {
    if (platformNotificationsChannel) {
      try {
        supabase.removeChannel(platformNotificationsChannel);
      } catch (_) {}
      platformNotificationsChannel = null;
      isSubscribed = false;
    }
    window.removeEventListener('beforeunload', cleanup);
  };

  window.addEventListener('beforeunload', cleanup);
}

/**
 * Tear down the subscription (e.g. on logout)
 */
export function teardownPlatformNotificationsRealtime(): void {
  if (!platformNotificationsChannel) return;
  try {
    const supabase = getSupabase();
    if (supabase?.removeChannel) {
      supabase.removeChannel(platformNotificationsChannel);
    }
  } catch (e) {
    console.warn('[Platform notifications realtime] Error during teardown:', e);
  }
  platformNotificationsChannel = null;
  isSubscribed = false;
  retryCount = 0;
}
