/**
 * Real-time cache clear listener
 *
 * Subscribes to Supabase Postgres Changes on cache_versions table.
 * When an admin inserts a new cache version, this triggers cache clearing
 * for all connected users across the platform.
 *
 * Set up once per session from the sidebar (all pages) so users receive
 * the cache clear command no matter which page they are on.
 */

import { getSupabase, initSupabase } from '../../../utils/supabase-init.js';
import { verifyAuth } from '../../../utils/authenticated-supabase-auth.js';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const CHANNEL_NAME = 'cache-versions-changes';
const LAST_CLEAR_VERSION_KEY = 'qms_last_cache_clear_version';
const SKIPPED_VERSIONS_KEY = 'qms_skipped_cache_versions';
const CACHE_CLEARED_AT_KEY = 'qms_cache_cleared_at';

let cacheVersionsChannel: RealtimeChannel | null = null;
let isSubscribed = false;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Track if a cache clear is currently in progress (prevents double-triggers)
let isCacheClearInProgress = false;

/**
 * Add cache clear notification styles
 */
function addCacheClearStyles(): void {
  if (document.getElementById('cache-clear-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'cache-clear-styles';
  style.textContent = `
    @keyframes cacheClearSlideIn {
      from { transform: translateY(-100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes cacheClearPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes cacheClearFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    #cache-clear-notification {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 2147483647;
      animation: cacheClearSlideIn 0.3s ease-out forwards;
    }
    #cache-clear-notification .pulse-dot {
      animation: cacheClearPulse 1s ease-in-out infinite;
    }
    #cache-clear-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      z-index: 2147483646;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: cacheClearFadeIn 0.2s ease-out forwards;
    }
    #cache-clear-modal {
      background: white;
      border-radius: 16px;
      max-width: 420px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      animation: cacheClearSlideIn 0.3s ease-out forwards;
    }
    .cache-modal-btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      font-family: inherit;
    }
    .cache-modal-btn:hover {
      transform: translateY(-1px);
    }
    .cache-modal-btn.primary {
      background: linear-gradient(135deg, #1a733e 0%, #0d5e3a 100%);
      color: white;
    }
    .cache-modal-btn.secondary {
      background: #f3f4f6;
      color: #374151;
    }
    .cache-modal-btn.secondary:hover {
      background: #e5e7eb;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Show a styled notification for FORCED cache clear (no skip option)
 */
function showForcedCacheClearNotification(data: {
  version: string;
  reason?: string;
  clearType: string;
}): void {
  console.log('[Cache clear realtime] 🔄 Showing FORCED cache clear notification');
  
  // Remove any existing notification first
  document.getElementById('cache-clear-notification')?.remove();
  document.getElementById('cache-clear-modal-overlay')?.remove();
  
  addCacheClearStyles();
  
  const reasonText = data.reason ? `<div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 4px;">Reason: ${data.reason}</div>` : '';
  
  // Create notification element
  const notificationDiv = document.createElement('div');
  notificationDiv.id = 'cache-clear-notification';
  notificationDiv.innerHTML = `
    <div style="
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
      color: white;
      padding: 16px 24px;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    ">
      <div class="pulse-dot" style="
        width: 10px;
        height: 10px;
        background: white;
        border-radius: 50%;
        flex-shrink: 0;
      "></div>
      <div style="text-align: center;">
        <div style="font-size: 14px; font-weight: 600;">
          Critical Platform Update
        </div>
        <div style="font-size: 12px; opacity: 0.9; margin-top: 2px;">
          Clearing cache and signing out... Please wait.
        </div>
        ${reasonText}
      </div>
    </div>
  `;
  
  document.body.appendChild(notificationDiv);
  console.log('[Cache clear realtime] ✅ Forced notification displayed');
}

/**
 * Show a modal for SKIPPABLE cache clear (user can choose)
 * Returns a promise that resolves to true if user wants to clear, false if skipped
 */
function showSkippableCacheClearModal(data: {
  version: string;
  reason?: string;
  clearType: string;
}): Promise<boolean> {
  return new Promise((resolve) => {
    console.log('[Cache clear realtime] 🔄 Showing SKIPPABLE cache clear modal');
    
    // Remove any existing modals
    document.getElementById('cache-clear-notification')?.remove();
    document.getElementById('cache-clear-modal-overlay')?.remove();
    
    addCacheClearStyles();
    
    const reasonText = data.reason 
      ? `<p style="font-size: 13px; color: #6b7280; margin: 0 0 16px 0; padding: 10px 12px; background: #f9fafb; border-radius: 6px;"><strong>Update:</strong> ${data.reason}</p>` 
      : '';
    
    // Create modal overlay
    const overlayDiv = document.createElement('div');
    overlayDiv.id = 'cache-clear-modal-overlay';
    overlayDiv.innerHTML = `
      <div id="cache-clear-modal">
        <div style="padding: 24px 24px 0; text-align: center;">
          <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #1a733e 0%, #0d5e3a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
            <svg fill="none" stroke="white" viewBox="0 0 24 24" width="28" height="28">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </div>
          <h3 style="font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 8px;">Platform Update Available</h3>
          <p style="font-size: 14px; color: #6b7280; margin: 0 0 16px; line-height: 1.5;">
            A new version of the platform is available. We recommend clearing your cache for the best experience.
          </p>
          ${reasonText}
        </div>
        <div style="padding: 0 24px 24px;">
          <div style="background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; margin-bottom: 20px;">
            <p style="font-size: 12px; color: #92400e; margin: 0; line-height: 1.4;">
              <strong>Note:</strong> Clearing cache will sign you out. You'll need to log back in.
            </p>
          </div>
          <div style="display: flex; gap: 12px;">
            <button id="cache-clear-skip-btn" class="cache-modal-btn secondary" style="flex: 1;">
              Skip for Now
            </button>
            <button id="cache-clear-accept-btn" class="cache-modal-btn primary" style="flex: 1;">
              Clear & Update
            </button>
          </div>
          <p style="font-size: 11px; color: #9ca3af; margin: 12px 0 0; text-align: center;">
            You can also clear cache later from browser settings
          </p>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlayDiv);
    
    // Add event listeners
    const skipBtn = document.getElementById('cache-clear-skip-btn');
    const acceptBtn = document.getElementById('cache-clear-accept-btn');
    
    skipBtn?.addEventListener('click', () => {
      overlayDiv.remove();
      resolve(false);
    });
    
    acceptBtn?.addEventListener('click', () => {
      overlayDiv.remove();
      // Show the forced notification after user accepts
      showForcedCacheClearNotification(data);
      resolve(true);
    });
    
    console.log('[Cache clear realtime] ✅ Skippable modal displayed');
  });
}

/**
 * Get list of skipped versions
 */
function getSkippedVersions(): string[] {
  try {
    const skipped = localStorage.getItem(SKIPPED_VERSIONS_KEY);
    return skipped ? JSON.parse(skipped) : [];
  } catch {
    return [];
  }
}

/**
 * Add a version to skipped list
 */
function addSkippedVersion(version: string): void {
  try {
    const skipped = getSkippedVersions();
    if (!skipped.includes(version)) {
      skipped.push(version);
      // Keep only last 10 skipped versions to prevent storage bloat
      const trimmed = skipped.slice(-10);
      localStorage.setItem(SKIPPED_VERSIONS_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // Storage might be full
  }
}

/**
 * Check if a version was skipped
 */
function wasVersionSkipped(version: string): boolean {
  return getSkippedVersions().includes(version);
}

/**
 * Clear all browser caches and storage including IndexedDB
 */
async function clearAllCaches(clearType: string): Promise<void> {
  console.log(`[Cache clear realtime] 🧹 Clearing all caches (type: ${clearType})`);
  
  const clearedItems: string[] = [];
  
  try {
    // 1. Clear Service Worker caches (Cache API)
    if (clearType === 'full' || clearType === 'service_worker') {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`[Cache clear realtime] Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
        clearedItems.push(`Cache Storage (${cacheNames.length} caches)`);
        console.log('[Cache clear realtime] ✅ All Cache Storage cleared');
      }
      
      // 2. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
        if (registrations.length > 0) {
          clearedItems.push(`Service Workers (${registrations.length})`);
          console.log('[Cache clear realtime] ✅ Service workers unregistered');
        }
      }
      
      // 3. Post message to active service worker to clear its caches
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_ALL_CACHES'
        });
      }
    }
    
    // 4. Clear IndexedDB databases
    if (clearType === 'full' || clearType === 'storage') {
      try {
        if ('indexedDB' in window) {
          // Get all database names if supported
          if (indexedDB.databases) {
            const databases = await indexedDB.databases();
            for (const db of databases) {
              if (db.name) {
                try {
                  indexedDB.deleteDatabase(db.name);
                  console.log(`[Cache clear realtime] Deleted IndexedDB: ${db.name}`);
                } catch (e) {
                  console.warn(`[Cache clear realtime] Could not delete IndexedDB ${db.name}:`, e);
                }
              }
            }
            if (databases.length > 0) {
              clearedItems.push(`IndexedDB (${databases.length} databases)`);
            }
          } else {
            // Fallback: try to delete known Supabase databases
            const knownDatabases = [
              'supabase-auth-token',
              'supabase-realtime',
              'firebaseLocalStorageDb',
              'workbox-expiration'
            ];
            for (const dbName of knownDatabases) {
              try {
                indexedDB.deleteDatabase(dbName);
              } catch (e) {
                // Ignore errors for non-existent databases
              }
            }
            clearedItems.push('IndexedDB (known databases)');
          }
          console.log('[Cache clear realtime] ✅ IndexedDB cleared');
        }
      } catch (idbError) {
        console.warn('[Cache clear realtime] IndexedDB clear error:', idbError);
      }
    }
    
    // 5. Clear localStorage and sessionStorage
    if (clearType === 'full' || clearType === 'storage') {
      // IMPORTANT: Preserve critical items to prevent infinite loops and maintain state
      const preserveKeys = [
        'qms_impersonation_original_user',
        LAST_CLEAR_VERSION_KEY,  // Critical: prevents cache clear loop on re-login
        CACHE_CLEARED_AT_KEY,    // Track when cache was last cleared
        SKIPPED_VERSIONS_KEY     // Remember which versions user skipped
      ];
      const preserved: Record<string, string | null> = {};
      
      preserveKeys.forEach(key => {
        preserved[key] = localStorage.getItem(key);
      });
      
      const localStorageCount = localStorage.length;
      const sessionStorageCount = sessionStorage.length;
      
      localStorage.clear();
      sessionStorage.clear();
      
      // Restore preserved items
      preserveKeys.forEach(key => {
        if (preserved[key]) {
          localStorage.setItem(key, preserved[key]!);
        }
      });
      
      // Also mark the timestamp when cache was cleared (for extra protection)
      localStorage.setItem('qms_cache_cleared_at', Date.now().toString());
      
      clearedItems.push(`localStorage (${localStorageCount} items)`);
      clearedItems.push(`sessionStorage (${sessionStorageCount} items)`);
      console.log('[Cache clear realtime] ✅ localStorage and sessionStorage cleared');
    }
    
    // 6. Clear cookies (limited - only accessible cookies)
    if (clearType === 'full') {
      try {
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          }
        }
        if (cookies.length > 0 && cookies[0] !== '') {
          clearedItems.push(`Cookies (${cookies.length})`);
          console.log('[Cache clear realtime] ✅ Cookies cleared');
        }
      } catch (cookieError) {
        console.warn('[Cache clear realtime] Cookie clear error:', cookieError);
      }
    }
    
    console.log('[Cache clear realtime] 🎉 Cache clear complete:', clearedItems.join(', '));
    
  } catch (error) {
    console.error('[Cache clear realtime] Error clearing caches:', error);
  }
}

/**
 * Sign out from Supabase and redirect to login
 */
async function signOutAndReload(): Promise<void> {
  console.log('[Cache clear realtime] 🔐 Signing out and reloading...');
  
  try {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
      console.log('[Cache clear realtime] ✅ Signed out from Supabase');
    }
  } catch (error) {
    console.error('[Cache clear realtime] Error signing out:', error);
  }
  
  // Small delay to let user see the notification
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Reload the page (will redirect to login since signed out)
  window.location.href = '/';
}

/**
 * Handle the cache clear event
 * Supports both forced (is_skippable=false) and optional (is_skippable=true) modes
 */
async function handleCacheClear(data: {
  version: string;
  reason?: string;
  clear_type: string;
  is_skippable?: boolean;
}): Promise<void> {
  // PROTECTION: Prevent concurrent cache clear operations
  if (isCacheClearInProgress) {
    console.log('[Cache clear realtime] Cache clear already in progress, ignoring');
    return;
  }
  
  // Check if we've already processed this version
  const lastVersion = localStorage.getItem(LAST_CLEAR_VERSION_KEY);
  if (lastVersion === data.version) {
    console.log('[Cache clear realtime] Already processed this version, skipping');
    return;
  }
  
  // Check if user already skipped this version
  if (data.is_skippable && wasVersionSkipped(data.version)) {
    console.log('[Cache clear realtime] User already skipped this version');
    return;
  }
  
  // PROTECTION: Check if we just cleared cache recently (within 30 seconds)
  const lastClearedAt = localStorage.getItem(CACHE_CLEARED_AT_KEY);
  if (lastClearedAt) {
    const clearedTime = parseInt(lastClearedAt, 10);
    const thirtySeconds = 30 * 1000;
    if (Date.now() - clearedTime < thirtySeconds) {
      console.log('[Cache clear realtime] Cache was cleared very recently, skipping to prevent loop');
      localStorage.setItem(LAST_CLEAR_VERSION_KEY, data.version);
      return;
    }
  }
  
  console.log(`[Cache clear realtime] Processing cache clear: ${data.version} (skippable: ${data.is_skippable})`);
  
  // Handle SKIPPABLE cache clear - show modal with choice
  if (data.is_skippable) {
    const userWantsToClear = await showSkippableCacheClearModal({
      version: data.version,
      reason: data.reason,
      clearType: data.clear_type
    });
    
    if (!userWantsToClear) {
      // User chose to skip - record it so we don't ask again
      addSkippedVersion(data.version);
      console.log('[Cache clear realtime] User skipped cache clear');
      return;
    }
    // User accepted - continue with clear
  } else {
    // FORCED cache clear - show notification immediately
    showForcedCacheClearNotification({
      version: data.version,
      reason: data.reason,
      clearType: data.clear_type
    });
  }
  
  // Mark as in progress
  isCacheClearInProgress = true;
  
  // Store this version as processed BEFORE clearing (critical for loop prevention)
  try {
    localStorage.setItem(LAST_CLEAR_VERSION_KEY, data.version);
    localStorage.setItem(CACHE_CLEARED_AT_KEY, Date.now().toString());
  } catch {
    // localStorage might be full or disabled
  }
  
  // Wait a moment for notification to be visible
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Clear caches
  await clearAllCaches(data.clear_type);
  
  // Sign out and reload
  await signOutAndReload();
  
  // Note: signOutAndReload will redirect, so we never reach here
  // But just in case:
  isCacheClearInProgress = false;
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
 * Set up real-time subscription for cache_versions.
 * All authenticated users receive cache clear commands.
 */
export async function setupCacheClearRealtime(): Promise<void> {
  // Verify the user is authenticated first
  const auth = await verifyAuth();
  if (!auth.isAuthenticated) {
    console.warn('[Cache clear realtime] User not authenticated, skipping realtime setup');
    return;
  }

  const supabase = await getRawSupabaseClient();
  if (!supabase) {
    console.warn('[Cache clear realtime] Supabase client not available');
    return;
  }

  if (typeof supabase.channel !== 'function') {
    console.warn('[Cache clear realtime] Supabase realtime channel method not available');
    return;
  }

  // Avoid duplicate subscription
  if (cacheVersionsChannel && isSubscribed) {
    console.log('[Cache clear realtime] Already subscribed');
    return;
  }

  // Clean up previous subscription if any
  if (cacheVersionsChannel) {
    try {
      supabase.removeChannel(cacheVersionsChannel);
    } catch (e) {
      console.warn('[Cache clear realtime] Error removing previous channel:', e);
    }
    cacheVersionsChannel = null;
    isSubscribed = false;
  }

  retryCount = 0;
  createRealtimeSubscription(supabase);
}

/**
 * Create the realtime subscription with error handling and retry logic
 */
function createRealtimeSubscription(supabase: SupabaseClient): void {
  console.log('[Cache clear realtime] Creating subscription...');
  
  cacheVersionsChannel = supabase
    .channel(CHANNEL_NAME)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'cache_versions',
      },
      (payload: { new?: Record<string, unknown> }) => {
        console.log('[Cache clear realtime] 🚨 Cache clear event received:', payload);
        
        const newRow = payload?.new;
        if (newRow) {
          handleCacheClear({
            version: newRow.version as string,
            reason: newRow.reason as string | undefined,
            clear_type: newRow.clear_type as string || 'full',
            is_skippable: newRow.is_skippable as boolean || false
          }).catch(err => {
            console.error('[Cache clear realtime] Error handling cache clear:', err);
          });
        }
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[Cache clear realtime] Subscription error:', {
          status,
          error: err,
          message: err?.message || 'Unknown error',
          retryCount
        });
        
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          console.log(`[Cache clear realtime] Retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
          
          setTimeout(() => {
            if (cacheVersionsChannel) {
              try {
                supabase.removeChannel(cacheVersionsChannel);
              } catch (_) {}
              cacheVersionsChannel = null;
            }
            createRealtimeSubscription(supabase);
          }, delay);
        } else {
          console.error('[Cache clear realtime] Max retries reached');
          cacheVersionsChannel = null;
          isSubscribed = false;
        }
      } else if (status === 'SUBSCRIBED') {
        console.log('[Cache clear realtime] ✅ Successfully subscribed to cache_versions');
        retryCount = 0;
        isSubscribed = true;
      } else if (status === 'CLOSED') {
        console.log('[Cache clear realtime] Channel closed');
        cacheVersionsChannel = null;
        isSubscribed = false;
      } else if (status === 'TIMED_OUT') {
        console.warn('[Cache clear realtime] Subscription timed out');
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          setTimeout(() => {
            if (cacheVersionsChannel) {
              try {
                supabase.removeChannel(cacheVersionsChannel);
              } catch (_) {}
              cacheVersionsChannel = null;
            }
            createRealtimeSubscription(supabase);
          }, delay);
        }
      }
    });

  // Set up cleanup on page unload
  const cleanup = () => {
    if (cacheVersionsChannel) {
      try {
        supabase.removeChannel(cacheVersionsChannel);
      } catch (_) {}
      cacheVersionsChannel = null;
      isSubscribed = false;
    }
    window.removeEventListener('beforeunload', cleanup);
  };

  window.addEventListener('beforeunload', cleanup);
}

/**
 * Tear down the subscription (e.g. on logout)
 */
export function teardownCacheClearRealtime(): void {
  if (!cacheVersionsChannel) return;
  try {
    const supabase = getSupabase();
    if (supabase?.removeChannel) {
      supabase.removeChannel(cacheVersionsChannel);
    }
  } catch (e) {
    console.warn('[Cache clear realtime] Error during teardown:', e);
  }
  cacheVersionsChannel = null;
  isSubscribed = false;
  retryCount = 0;
}

/**
 * Check for cache clear on page load (for users who were offline)
 * This is called separately after authentication
 * 
 * IMPORTANT: This function has safeguards to prevent infinite loops:
 * 1. Only triggers for cache clears in the last 2 minutes (not 24 hours)
 * 2. Checks if we recently cleared cache to avoid re-triggering
 * 3. Compares versions to avoid duplicate processing
 */
export async function checkCacheClearOnLoad(): Promise<void> {
  try {
    // PROTECTION: Check if we recently cleared cache (within last 5 minutes)
    // This prevents the loop where user logs back in after cache clear
    const lastClearedAt = localStorage.getItem('qms_cache_cleared_at');
    if (lastClearedAt) {
      const clearedTime = parseInt(lastClearedAt, 10);
      const fiveMinutes = 5 * 60 * 1000;
      if (Date.now() - clearedTime < fiveMinutes) {
        console.log('[Cache clear realtime] Cache was recently cleared locally, skipping check');
        return;
      }
    }
    
    const supabase = await getRawSupabaseClient();
    if (!supabase) return;
    
    // Get the latest cache version from the server
    const { data, error } = await supabase
      .from('cache_versions')
      .select('version, reason, clear_type, is_skippable, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      // No cache versions exist yet or table doesn't exist
      console.log('[Cache clear realtime] No cache versions found, skipping');
      return;
    }
    
    // Check if this is newer than what we've processed
    const lastVersion = localStorage.getItem(LAST_CLEAR_VERSION_KEY);
    if (lastVersion === data.version) {
      console.log('[Cache clear realtime] Already up to date with latest cache version');
      return;
    }
    
    // Check if the cache clear was VERY recent (within last 2 minutes only)
    // This is only to catch users who were briefly offline during a cache clear
    // We use a short window to prevent triggering on old cache clears
    const clearTime = new Date(data.created_at).getTime();
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000;
    
    if (now - clearTime > twoMinutes) {
      // Cache clear is not recent enough - just update version tracking silently
      // This ensures we don't trigger for old cache clears when a new user logs in
      localStorage.setItem(LAST_CLEAR_VERSION_KEY, data.version);
      console.log('[Cache clear realtime] Cache version is older than 2 minutes, updating tracking only');
      return;
    }
    
    // Recent cache clear (within 2 minutes) that we missed - trigger it now
    // This only happens if user was briefly offline during the cache clear broadcast
    console.log('[Cache clear realtime] Missed very recent cache clear (within 2 min), triggering now');
    await handleCacheClear({
      version: data.version,
      reason: data.reason,
      clear_type: data.clear_type,
      is_skippable: data.is_skippable || false
    });
    
  } catch (error) {
    console.error('[Cache clear realtime] Error checking cache version on load:', error);
  }
}
