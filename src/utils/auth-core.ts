/**
 * Core Authentication Functions
 * Main authentication checking and user management
 */

import { getSupabase } from './supabase-init.js';
import { getSecureSupabase } from './secure-supabase.js';
import { validateDeviceFingerprint, clearDeviceFingerprints } from './auth-device.js';
import { isDevBypassActive } from './auth-dev-bypass.js';
import { logError, logWarn, logInfo } from './logging-helper.js';

/**
 * Get current authenticated user from Supabase
 */
export async function getCurrentSupabaseUser(): Promise<any> {
  const supabase = getSupabase();
  if (!supabase) {
    return null;
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Check if user is authenticated with Supabase
 * Also handles token expiration and refresh
 * ✅ SECURITY: Always verifies token with server AND device fingerprint to prevent token copying attacks
 * ✅ FIX: Checks expiration and refreshes token BEFORE calling getUser() to prevent premature logouts
 * ✅ RELIABILITY: More graceful handling of temporary network issues
 */
export async function checkSupabaseAuthentication(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) {
    // RELIABILITY: If Supabase isn't ready yet, check cached session
    // This prevents false negatives during initialization
    const cachedSession = localStorage.getItem('supabase.auth.token');
    if (cachedSession) {
      try {
        const parsed = JSON.parse(cachedSession);
        // Check if session hasn't expired
        if (parsed?.currentSession?.expires_at) {
          const expiresAt = parsed.currentSession.expires_at;
          const now = Math.floor(Date.now() / 1000);
          if (expiresAt > now) {
            logInfo('Supabase not ready but valid cached session found - treating as authenticated');
            return true;
          }
        }
      } catch (parseError) {
        // Invalid cache, continue with false
      }
    }
    return false;
  }

  try {
    // First, get the session to check expiration BEFORE verifying with server
    // This prevents premature logout when token is expired but can be refreshed
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logError('Error getting session:', sessionError);
      return false;
    }

    if (!session || !session.user) {
      return false;
    }

    // Check if token is expired (with 1 minute buffer - aligned with verifyAuth())
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const bufferTime = 60; // 1 minute buffer (aligned with verifyAuth)
    
    let currentSession = session;
    
    if (expiresAt > 0 && expiresAt < (now + bufferTime)) {
      // Token is expiring soon or expired - try to refresh BEFORE verifying with getUser()
      logInfo('Token expiring soon, refreshing before verification...');
      
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        const refreshMessage = refreshError?.message || '';
        const isNetworkError =
          refreshMessage.includes('network') ||
          refreshMessage.includes('fetch') ||
          refreshMessage.includes('timeout') ||
          (refreshError as any)?.status === 0;

        /**
         * MULTI-TAB SAFETY:
         * In multi-tab scenarios, two tabs can refresh at the same time. Supabase rotates refresh tokens,
         * so the "losing" tab may get invalid_grant/token_not_found even though the session was refreshed
         * successfully in the other tab (and will be synced via storage/broadcast).
         *
         * If we treat that as "expired" and call signOut(), we log the user out across ALL tabs.
         *
         * So for these error shapes, re-read the latest session first and only sign out if no session exists.
         */
        const isPossiblyMultiTabRefreshRace =
          refreshMessage.includes('invalid_grant') || refreshMessage.includes('token_not_found');

        if (isPossiblyMultiTabRefreshRace) {
          logWarn('Token refresh failed (possible multi-tab refresh race):', refreshMessage);
          // Give the other tab a moment to persist the refreshed session
          await new Promise((r) => setTimeout(r, 300));
          const { data: { session: latestSession } } = await supabase.auth.getSession();
          if (latestSession && latestSession.user) {
            logInfo('Detected valid session after refresh failure (likely refreshed in another tab) - continuing');
            currentSession = latestSession;
          } else {
            logWarn('Refresh failed and no valid session found - user needs to re-login');
            try {
              await supabase.auth.signOut();
            } catch {
              // Ignore sign out errors
            }
            localStorage.removeItem('userInfo');
            const supabaseAuthKey = 'supabase.auth.token';
            if (localStorage.getItem(supabaseAuthKey)) {
              localStorage.removeItem(supabaseAuthKey);
            }
            return false;
          }
        } else if (refreshMessage.includes('refresh_token') || refreshMessage.includes('expired')) {
          logWarn('Refresh token expired - user needs to re-login:', refreshMessage);
          try {
            await supabase.auth.signOut();
          } catch {
            // Ignore sign out errors
          }
          localStorage.removeItem('userInfo');
          const supabaseAuthKey = 'supabase.auth.token';
          if (localStorage.getItem(supabaseAuthKey)) {
            localStorage.removeItem(supabaseAuthKey);
          }
          return false;
        } else if (isNetworkError) {
          // Network or temporary error - don't logout, trust the existing session
          // Supabase's autoRefreshToken will retry automatically
          logWarn('Token refresh failed (likely network issue):', refreshMessage);
          logInfo('Continuing with existing session - Supabase will auto-refresh when possible');
          // Continue with existing session - don't return false for network errors
        } else {
          // Unknown refresh failure - be conservative but avoid forced sign out across tabs.
          logWarn('Token refresh failed (unknown error), continuing with existing session:', refreshMessage);
        }
      } else {
        // Use refreshed session
        currentSession = refreshedSession;
        logInfo('Token refreshed successfully');
      }
    }

    // ✅ SECURITY FIX: Verify token with server AFTER ensuring it's not expired/refreshed
    // This prevents the flash of homepage when token is copied to another browser
    // getUser() makes an API call to Supabase to verify the token is valid
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // If getUser() fails, check if it's a network error or actual token invalidation
    if (userError || !user) {
      // Check if it's a network error (not a token expiration issue)
      const isNetworkError = userError?.message?.includes('network') || 
                            userError?.message?.includes('fetch') ||
                            userError?.message?.includes('timeout') ||
                            userError?.status === 0; // Network error status
      
      if (isNetworkError && currentSession && currentSession.user) {
        // Network error but we have a valid session - trust the session
        // Supabase's autoRefreshToken will handle token refresh when network is available
        logWarn('getUser() failed due to network issue, but session is valid. Continuing with session:', userError?.message);
        // Use session user instead
        const sessionUser = currentSession.user;
        
        // ✅ SECURITY: Still validate device fingerprint even with network error
        const accessToken = currentSession.access_token || '';
        const userId = sessionUser?.id;
        
        if (accessToken && userId) {
          if (!validateDeviceFingerprint(accessToken, userId)) {
            logError('🚨 SECURITY VIOLATION: Token appears to be copied to different device!');
            logError('Invalidating session for security.');
            
            try {
              await supabase.auth.signOut();
            } catch (signOutError) {
              // Ignore sign out errors
            }
            localStorage.removeItem('userInfo');
            const supabaseAuthKey = 'supabase.auth.token';
            if (localStorage.getItem(supabaseAuthKey)) {
              localStorage.removeItem(supabaseAuthKey);
            }
            clearDeviceFingerprints();
            return false;
          }
        }
        
        // Session is valid, network error is temporary - allow access
        return true;
      }
      
      // Token is actually invalid (not just network error) - clear everything
      logWarn('Token verification failed - invalid or expired token:', userError?.message);
      // Only logout if session is also invalid
      if (!currentSession || !currentSession.user) {
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          // Ignore sign out errors
        }
        localStorage.removeItem('userInfo');
        const supabaseAuthKey = 'supabase.auth.token';
        if (localStorage.getItem(supabaseAuthKey)) {
          localStorage.removeItem(supabaseAuthKey);
        }
      }
      return false;
    }

    // Check if session exists and matches verified user
    if (!currentSession || !currentSession.user) {
      logWarn('No valid session found');
      return false;
    }
    
    if (currentSession.user.id !== user.id) {
      logWarn('Session mismatch with verified user - clearing session');
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        // Ignore sign out errors
      }
      localStorage.removeItem('userInfo');
      return false;
    }

    // ✅ SECURITY: Validate device fingerprint to prevent token copying
    // If token was copied to another device, fingerprint will mismatch
    // Use user ID for fingerprint key so it persists across token refreshes
    const accessToken = currentSession.access_token || '';
    const userId = user?.id || currentSession.user?.id;
    
    // ✅ FIX: Skip fingerprint validation immediately after login to prevent race conditions
    const loginJustCompleted = sessionStorage.getItem('loginJustCompleted') === 'true';
    
    if (accessToken && userId && !loginJustCompleted) {
      if (!validateDeviceFingerprint(accessToken, userId)) {
        logError('🚨 SECURITY VIOLATION: Token appears to be copied to different device!');
        logError('Invalidating session for security.');
        
        // Clear session and redirect to login
        try {
          await supabase.auth.signOut();
        } catch (signOutError) {
          // Ignore sign out errors
        }
        localStorage.removeItem('userInfo');
        const supabaseAuthKey = 'supabase.auth.token';
        if (localStorage.getItem(supabaseAuthKey)) {
          localStorage.removeItem(supabaseAuthKey);
        }
        
        // Clear all device fingerprints
        clearDeviceFingerprints();
        
        return false;
      }
    } else if (loginJustCompleted) {
      // Ensure fingerprint is stored during grace period
      if (accessToken && userId) {
        validateDeviceFingerprint(accessToken, userId); // This will store if missing
      }
    }

    // Session is valid and verified with server
    return true;
  } catch (error) {
    logError('Error checking Supabase authentication:', error);
    return false;
  }
}

/**
 * Sign out the current user
 * Handles both Supabase auth and dev bypass logout
 */
export async function signOut(): Promise<void> {
  // Check if it's a dev bypass user
  const isDevBypass = isDevBypassActive();
  
  // If Supabase is available, sign out from Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      // Update last logout time in database before signing out (only for real users, not dev bypass)
      if (!isDevBypass) {
        try {
          // ✅ Use secure client for database update
          const secureSupabase = await getSecureSupabase();
          const { data: { user } } = await secureSupabase.auth.getUser();
          if (user) {
            await secureSupabase
              .from('users')
              .update({ 
                last_sign_out_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);
          }
        } catch (error: any) {
          // Don't block logout if update fails
          if (error.code === 'AUTH_REQUIRED' || error.code === 'AUTH_FAILED') {
            logWarn('⚠️ Authentication required for logout update - continuing with logout anyway');
          } else {
            logError('Error updating logout time:', error);
          }
        }
      }

      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      logError('Error signing out from Supabase:', error);
      // Continue with cleanup even if Supabase signOut fails
    }
  }

  // Clear all authentication data from localStorage
  localStorage.removeItem('userInfo');
  
  // Clear any other auth-related data
  localStorage.removeItem('supabase.auth.token');
  
  // ✅ SECURITY: Clear all device fingerprints on logout
  clearDeviceFingerprints();
  
  // ✅ UX: Clear session verification flag so auth overlay shows on next login
  sessionStorage.removeItem('authSessionVerified');
  
  logInfo('User signed out successfully');
  
  // Redirect to auth page after logout
  window.location.href = '/src/auth/presentation/auth-page.html';
}

/**
 * Get user info in the format expected by the app
 */
export async function getUserInfo(): Promise<any> {
  // Check dev bypass first
  const userInfoStr = localStorage.getItem('userInfo');
  if (userInfoStr) {
    try {
      const userInfo = JSON.parse(userInfoStr);
      // If it's a dev bypass user, return it
      if (userInfo.isDev || userInfo.provider === 'dev-bypass') {
        return userInfo;
      }
    } catch (error) {
      // Continue to check Supabase
    }
  }
  
  // Get from Supabase
  const user = await getCurrentSupabaseUser();
  if (user) {
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      picture: user.user_metadata?.avatar_url || '',
      provider: 'google',
    };
  }
  
  return null;
}

