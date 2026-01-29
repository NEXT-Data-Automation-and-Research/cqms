/**
 * Impersonation Service
 * Handles admin impersonation of other users for maintenance purposes
 * 
 * SECURITY:
 * - Only available to Admin and Super Admin roles
 * - All impersonations are logged server-side
 * - Original admin session is stored securely in sessionStorage
 * - Clear visual indicator when impersonating
 */

import { getSupabase } from './supabase-init.js';
import { logInfo, logError, logWarn } from './logging-helper.js';

/**
 * Get CSRF token from server
 * CSRF tokens are generated per-request, so we fetch a fresh token via a GET request
 */
/**
 * Clear all user-related caches from localStorage
 * This ensures no stale data persists between sessions/impersonation
 */
function clearAllUserCaches(): void {
  try {
    // Clear user info
    localStorage.removeItem('userInfo');
    localStorage.removeItem('userProfileLastFetch');
    
    // Clear sidebar state
    localStorage.removeItem('sidebarState');
    
    // Clear session verification
    sessionStorage.removeItem('session_verified');
    sessionStorage.removeItem('session_verified_at');
    
    // Clear notification and other user-specific caches
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('notification') || 
        key.includes('reversal') ||
        key.includes('cache') ||
        key.includes('_count') ||
        key.includes('_timestamp')
      )) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    logInfo('[Impersonation] All user caches cleared');
  } catch (e) {
    logWarn('[Impersonation] Error clearing caches:', e);
  }
}

/**
 * Perform complete system cleanup - removes ALL user data
 * This is more aggressive than clearAllUserCaches and ensures nothing remains
 */
function performCompleteCleanup(): void {
  logInfo('[Impersonation] Performing complete system cleanup...');
  
  try {
    // 1. Clear ALL localStorage (nuclear option for complete cleanup)
    const localStorageKeysToKeep: string[] = [
      'theme',          // Keep theme preference
      'language',       // Keep language preference
    ];
    
    const localStorageKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !localStorageKeysToKeep.includes(key)) {
        localStorageKeysToRemove.push(key);
      }
    }
    localStorageKeysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        // Ignore individual key removal errors
      }
    });
    logInfo('[Impersonation] localStorage cleared: ' + localStorageKeysToRemove.length + ' keys removed');
    
    // 2. Clear ALL sessionStorage
    const sessionStorageKeysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionStorageKeysToRemove.push(key);
      }
    }
    sessionStorageKeysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore individual key removal errors
      }
    });
    logInfo('[Impersonation] sessionStorage cleared: ' + sessionStorageKeysToRemove.length + ' keys removed');
    
    // 3. Clear cookies related to Supabase (if accessible)
    try {
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name] = cookie.trim().split('=');
        if (name && (name.includes('supabase') || name.includes('sb-'))) {
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
        }
      }
      logInfo('[Impersonation] Supabase cookies cleared');
    } catch (e) {
      logWarn('[Impersonation] Could not clear cookies:', e);
    }
    
    // 4. Clear IndexedDB if used by Supabase
    try {
      if (window.indexedDB) {
        // Supabase may use IndexedDB for caching
        const dbNames = ['supabase', 'supabase-auth'];
        dbNames.forEach(dbName => {
          try {
            window.indexedDB.deleteDatabase(dbName);
          } catch (e) {
            // Ignore if database doesn't exist
          }
        });
      }
    } catch (e) {
      logWarn('[Impersonation] Could not clear IndexedDB:', e);
    }
    
    // 5. Clear any global state
    try {
      if ((window as any).supabaseClient) {
        delete (window as any).supabaseClient;
      }
      if ((window as any).__authStateListenerSetup) {
        delete (window as any).__authStateListenerSetup;
      }
      if ((window as any).__authCheckInProgress) {
        delete (window as any).__authCheckInProgress;
      }
    } catch (e) {
      logWarn('[Impersonation] Could not clear global state:', e);
    }
    
    logInfo('[Impersonation] Complete system cleanup finished');
    
  } catch (e) {
    logError('[Impersonation] Error during complete cleanup:', e);
  }
}

async function getCSRFToken(authToken: string): Promise<string | null> {
  try {
    // Make a GET request to fetch CSRF token from response headers
    // Using /api/env which is a simple public endpoint that returns CSRF token in headers
    const response = await fetch('/api/env', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    const token = response.headers.get('X-CSRF-Token') || response.headers.get('x-csrf-token');
    if (token) {
      logInfo('[Impersonation] CSRF token fetched successfully');
      return token;
    }
    
    logWarn('[Impersonation] CSRF token not found in response headers');
    return null;
  } catch (error) {
    logError('[Impersonation] Failed to get CSRF token:', error);
    return null;
  }
}

interface ImpersonationState {
  isImpersonating: boolean;
  originalSession: {
    accessToken: string;
    refreshToken: string;
    userInfo: any;
  } | null;
  adminEmail: string | null;
  targetEmail: string | null;
  startedAt: string | null;
}

const STORAGE_KEY = 'impersonation_state';

/**
 * Check if the current user can impersonate others (sync fallback from role).
 * For permission-based check (role + individual overrides), use hasPermission('settings/impersonation', 'page') or canImpersonateAsync().
 */
export function canImpersonate(): boolean {
  try {
    const userInfoStr = localStorage.getItem('userInfo');
    if (!userInfoStr) return false;
    const userInfo = JSON.parse(userInfoStr);
    const role = userInfo.role || '';
    return ['Super Admin', 'Admin'].includes(role);
  } catch {
    return false;
  }
}

/**
 * Check if the current user can impersonate (permission API: role + individual overrides).
 */
export async function canImpersonateAsync(): Promise<boolean> {
  try {
    const { hasPermission } = await import('./permissions.js');
    return await hasPermission('settings/impersonation', 'page');
  } catch {
    return false;
  }
}

/**
 * Get current impersonation state
 */
export function getImpersonationState(): ImpersonationState | null {
  try {
    const stateStr = sessionStorage.getItem(STORAGE_KEY);
    if (!stateStr) return null;
    return JSON.parse(stateStr);
  } catch {
    return null;
  }
}

/**
 * Check if currently in impersonation mode
 */
export function isImpersonating(): boolean {
  const state = getImpersonationState();
  return state?.isImpersonating === true;
}

/**
 * Start impersonation - saves current session and redirects to target user
 * @param targetEmail Email of user to impersonate
 * @param reason Optional reason for impersonation (logged for audit)
 */
export async function startImpersonation(targetEmail: string, reason?: string): Promise<void> {
  logInfo('[Impersonation] Starting impersonation for:', targetEmail);
  
  // EDGE CASE: Check if already impersonating (prevent nested impersonation)
  if (isImpersonating()) {
    throw new Error('Cannot start new impersonation while already impersonating. Please exit current impersonation first.');
  }
  
  // Validate target email
  if (!targetEmail || !targetEmail.includes('@')) {
    throw new Error('Invalid target email');
  }
  
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase not initialized');
  }
  
  // Get current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('No active session');
  }
  
  // EDGE CASE: Check if session will expire soon (within 5 minutes)
  let activeSession = session;
  const expiresAt = session.expires_at;
  if (expiresAt) {
    const expiresInSeconds = expiresAt - Math.floor(Date.now() / 1000);
    if (expiresInSeconds < 300) { // Less than 5 minutes
      logWarn('[Impersonation] Session expiring soon, attempting refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        throw new Error('Your session is expiring soon. Please refresh the page and try again.');
      }
      // Use the refreshed session
      activeSession = refreshData.session;
      logInfo('[Impersonation] Session refreshed successfully');
    }
  }
  
  const userInfoStr = localStorage.getItem('userInfo');
  const userInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
  
  if (!userInfo) {
    throw new Error('No user info found');
  }
  
  // EDGE CASE: Prevent impersonating yourself
  if (userInfo.email?.toLowerCase().trim() === targetEmail.toLowerCase().trim()) {
    throw new Error('Cannot impersonate yourself');
  }

  const { hasPermission } = await import('./permissions.js');
  const allowed = await hasPermission('settings/impersonation', 'page');
  if (!allowed) {
    throw new Error('You do not have permission to impersonate. Access is controlled by role and individual permissions.');
  }

  // Store original session in sessionStorage (cleared when tab closes)
  const state: ImpersonationState = {
    isImpersonating: true,
    originalSession: {
      accessToken: activeSession.access_token,
      refreshToken: activeSession.refresh_token,
      userInfo: userInfo
    },
    adminEmail: userInfo.email,
    targetEmail: targetEmail.toLowerCase().trim(),
    startedAt: new Date().toISOString()
  };
  
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  logInfo('[Impersonation] Original session stored');
  
  // Call backend to generate impersonation link
  try {
    // Get CSRF token first (required for POST requests)
    const csrfToken = await getCSRFToken(activeSession.access_token);
    if (!csrfToken) {
      sessionStorage.removeItem(STORAGE_KEY);
      throw new Error('Failed to get security token. Please refresh and try again.');
    }
    
    const response = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeSession.access_token}`,
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({
        targetEmail: targetEmail.toLowerCase().trim(),
        reason: reason || undefined
      })
    });
    
    if (!response.ok) {
      // Clean up stored state
      sessionStorage.removeItem(STORAGE_KEY);
      
      // Try to get detailed error from response
      let errorMessage = `Impersonation failed with status ${response.status}`;
      try {
        const errorText = await response.text();
        logError('[Impersonation] API Error Response:', errorText);
        
        // Try to parse as JSON
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch {
          // Not JSON, use text if it's not too long
          if (errorText && errorText.length < 200) {
            errorMessage = errorText;
          }
        }
      } catch (parseError) {
        logError('[Impersonation] Could not read error response:', parseError);
      }
      
      // Add helpful context for common errors
      if (response.status === 404) {
        errorMessage = `${errorMessage}. The target user may not exist in the authentication system (they might need to log in at least once).`;
      } else if (response.status === 403) {
        errorMessage = `${errorMessage}. You may not have permission to impersonate this user.`;
      }
      
      throw new Error(errorMessage);
    }
    
    const { tokenHash, targetRole } = await response.json();
    
    if (!tokenHash) {
      sessionStorage.removeItem(STORAGE_KEY);
      throw new Error('No impersonation token received from server');
    }
    
    logInfo('[Impersonation] Token received, switching to target user session...');
    
    // Clear ALL cached data before switching session
    clearAllUserCaches();
    
    // Sign out the admin first
    logInfo('[Impersonation] Signing out admin session...');
    await supabase.auth.signOut();
    
    // Small delay to ensure signOut is processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Use verifyOtp with the token_hash to create a session for the target user
    // This is the key step - it directly creates a session without redirect
    logInfo('[Impersonation] Verifying token and creating target user session...');
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'magiclink'
    });
    
    if (verifyError || !verifyData.session) {
      sessionStorage.removeItem(STORAGE_KEY);
      logError('[Impersonation] Failed to verify token:', verifyError);
      
      // Provide helpful error messages based on error type
      let errorMessage = 'Failed to create impersonation session';
      if (verifyError?.message?.includes('expired')) {
        errorMessage = 'Impersonation token has expired. Please try again.';
      } else if (verifyError?.message?.includes('invalid')) {
        errorMessage = 'Invalid impersonation token. The target user may have been deleted.';
      } else if (verifyError?.message) {
        errorMessage = verifyError.message;
      }
      
      throw new Error(errorMessage);
    }
    
    logInfo('[Impersonation] Session created successfully for target user');
    
    // Redirect to home page with impersonation flag
    window.location.href = '/home?impersonated=true';
    
  } catch (error: any) {
    // Clean up on error
    sessionStorage.removeItem(STORAGE_KEY);
    logError('[Impersonation] Failed:', error);
    throw error;
  }
}

/**
 * Exit impersonation - completely clean up and force fresh login
 * 
 * IMPORTANT: This performs a COMPLETE cleanup to ensure no impersonated user data remains.
 * The admin will need to log in again after exiting impersonation.
 */
export async function exitImpersonation(): Promise<void> {
  logInfo('[Impersonation] Exiting impersonation mode - performing complete cleanup...');
  
  const state = getImpersonationState();
  
  const supabase = getSupabase();
  
  try {
    // 1. Log impersonation end to server (best effort - don't block on failure)
    if (supabase && state?.adminEmail && state?.targetEmail) {
      try {
        const currentSession = await supabase.auth.getSession();
        if (currentSession.data.session) {
          const csrfToken = await getCSRFToken(currentSession.data.session.access_token);
          
          await fetch('/api/admin/end-impersonation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentSession.data.session.access_token}`,
              ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {})
            },
            body: JSON.stringify({
              adminEmail: state.adminEmail,
              targetEmail: state.targetEmail
            })
          });
          logInfo('[Impersonation] End logged to server');
        }
      } catch (logErr) {
        logWarn('[Impersonation] Could not log end to server (continuing with cleanup):', logErr);
      }
    }
    
    // 2. Sign out from Supabase (clears auth tokens)
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'global' }); // Sign out from all devices
        logInfo('[Impersonation] Signed out from Supabase');
      } catch (signOutErr) {
        logWarn('[Impersonation] Supabase signOut error (continuing with cleanup):', signOutErr);
      }
    }
    
    // 3. Perform COMPLETE system cleanup
    performCompleteCleanup();
    
    logInfo('[Impersonation] Cleanup complete - redirecting to login page');
    
    // 4. Force complete page refresh and redirect to login
    // Using replace() prevents back button from returning to impersonated state
    window.location.replace('/src/auth/presentation/auth-page.html');
    
  } catch (error: any) {
    logError('[Impersonation] Error during exit (forcing cleanup anyway):', error);
    
    // Even if something fails, force complete cleanup and redirect
    try {
      performCompleteCleanup();
    } catch (e) {
      // Last resort - clear what we can
      localStorage.clear();
      sessionStorage.clear();
    }
    
    window.location.replace('/src/auth/presentation/auth-page.html');
  }
}

/**
 * Get the real admin user (when impersonating)
 * Returns null if not impersonating
 */
export function getRealAdminUser(): any | null {
  const state = getImpersonationState();
  if (!state?.isImpersonating || !state.originalSession?.userInfo) {
    return null;
  }
  return state.originalSession.userInfo;
}

/**
 * Get info about current impersonation session
 */
export function getImpersonationInfo(): { adminEmail: string; targetEmail: string; startedAt: string } | null {
  const state = getImpersonationState();
  if (!state?.isImpersonating) {
    return null;
  }
  
  return {
    adminEmail: state.adminEmail || 'Unknown',
    targetEmail: state.targetEmail || 'Unknown',
    startedAt: state.startedAt || new Date().toISOString()
  };
}

// Check for impersonation on page load (from URL parameter)
export function checkImpersonationFromUrl(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const isImpersonated = urlParams.get('impersonated') === 'true';
  
  if (isImpersonated) {
    const state = getImpersonationState();
    if (state?.isImpersonating) {
      logInfo('[Impersonation] Page loaded in impersonation mode');
      
      // Clean up URL parameter
      urlParams.delete('impersonated');
      const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
      window.history.replaceState({}, document.title, newUrl);
    }
  }
}
