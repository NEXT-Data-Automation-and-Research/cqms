/**
 * Authentication Verification for Supabase
 * Handles authentication status checking and caching
 */

import { getSupabase } from './supabase-init.js';
import { createLogger } from './logger.js';

const logger = createLogger('AuthVerification');

/**
 * Authentication verification result
 */
export interface AuthStatus {
  isAuthenticated: boolean;
  userId: string | null;
  session: any | null;
  error?: string;
}

/**
 * Cache for authentication status (valid for 30 seconds)
 */
let authStatusCache: {
  status: AuthStatus;
  timestamp: number;
} | null = null;

const AUTH_CACHE_DURATION = 30000; // 30 seconds

/**
 * TEST MODE: Force token refresh earlier for testing
 * Set this to a lower number (in seconds) to test token refresh behavior
 * Example: 300 = 5 minutes, 60 = 1 minute, 30 = 30 seconds
 * 
 * Set via environment variable: SUPABASE_TOKEN_REFRESH_TEST_INTERVAL
 * Or set window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL in browser console
 * 
 * Default: null (uses Supabase's default ~1 hour expiration)
 */
function getTokenRefreshTestInterval(): number | null {
  if (typeof window !== 'undefined') {
    // Check browser console override first (for quick testing)
    const windowOverride = (window as any).SUPABASE_TOKEN_REFRESH_TEST_INTERVAL;
    if (windowOverride && typeof windowOverride === 'number') {
      return windowOverride;
    }
  }
  
  // Check environment variable (for server-side or build-time config)
  // Note: This would need to be passed from server to client
  return null; // Default: use Supabase's server-side JWT expiry
}

/**
 * Verify user authentication
 * Uses caching to avoid excessive API calls
 */
export async function verifyAuth(): Promise<AuthStatus> {
  // Check cache first
  if (authStatusCache && (Date.now() - authStatusCache.timestamp) < AUTH_CACHE_DURATION) {
    return authStatusCache.status;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const status: AuthStatus = {
      isAuthenticated: false,
      userId: null,
      session: null,
      error: 'Supabase client not initialized',
    };
    authStatusCache = { status, timestamp: Date.now() };
    return status;
  }

  try {
    // First check session - this is faster and uses cached session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session || !session.user) {
      const status: AuthStatus = {
        isAuthenticated: false,
        userId: null,
        session: null,
        error: sessionError?.message || 'No active session',
      };
      authStatusCache = { status, timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000) };
      return status;
    }

    // Check if session is expired (with buffer for refresh)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    
    // TEST MODE: Use test interval if set, otherwise use 1 minute buffer
    const testInterval = getTokenRefreshTestInterval();
    let shouldRefresh = false;
    
    if (testInterval !== null && expiresAt > 0) {
      // TEST MODE: Force refresh if time until expiry is less than test interval
      // This simulates an earlier expiration for testing
      const timeUntilExpiry = expiresAt - now;
      if (timeUntilExpiry <= testInterval) {
        shouldRefresh = true;
        logger.debug(`TEST MODE: Time until expiry (${timeUntilExpiry}s) <= test interval (${testInterval}s) - forcing refresh`);
      }
    } else {
      // Normal mode: Check if expiring soon (within 1 minute)
      const bufferTime = 60; // 1 minute buffer
      if (expiresAt > 0 && expiresAt < (now + bufferTime)) {
        shouldRefresh = true;
      }
    }
    
    if (shouldRefresh) {
      // Session is expired or expiring soon - try to refresh
      logger.debug('Session expiring soon, attempting refresh...');
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        // Check if refresh token itself is expired (user needs to re-login)
        const isRefreshTokenExpired = refreshError?.message?.includes('refresh_token') || 
                                       refreshError?.message?.includes('expired') ||
                                       refreshError?.message?.includes('invalid_grant') ||
                                       refreshError?.message?.includes('token_not_found');
        
        if (isRefreshTokenExpired) {
          // Refresh token expired - session is invalid
          logger.warn('Refresh token expired - user needs to re-login:', refreshError?.message);
          const status: AuthStatus = {
            isAuthenticated: false,
            userId: null,
            session: null,
            error: refreshError?.message || 'Refresh token expired',
          };
          authStatusCache = { status, timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000) };
          return status;
        } else {
          // Network or temporary error - don't invalidate session
          // Trust existing session and let Supabase auto-refresh handle it
          logger.warn('Token refresh failed (likely network issue), continuing with existing session:', refreshError?.message);
          // Return existing session as valid - Supabase will auto-refresh when possible
          const status: AuthStatus = {
            isAuthenticated: true,
            userId: session.user.id,
            session: session,
            error: refreshError?.message || 'Refresh failed but session still valid',
          };
          authStatusCache = { status, timestamp: Date.now() };
          return status;
        }
      }
      
      // Use refreshed session
      const refreshedUser = refreshedSession.user;
      const status: AuthStatus = {
        isAuthenticated: true,
        userId: refreshedUser.id,
        session: refreshedSession,
      };
      authStatusCache = { status, timestamp: Date.now() };
      logger.debug('Session refreshed successfully');
      return status;
    }

    // Session is valid - verify user with server (but don't fail if getUser has minor issues)
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    // If getUser fails, check if it's a network error or actual token invalidation
    if (userError && !user) {
      // Check if it's a network error (not a token expiration issue)
      const isNetworkError = userError?.message?.includes('network') || 
                            userError?.message?.includes('fetch') ||
                            userError?.message?.includes('timeout') ||
                            userError?.status === 0; // Network error status
      
      if (isNetworkError && session.user) {
        // Network error but we have a valid session - trust the session
        logger.warn('getUser() failed due to network issue, but session is valid. Continuing with session:', userError?.message);
        const status: AuthStatus = {
          isAuthenticated: true,
          userId: session.user.id,
          session: session,
          error: userError?.message || 'Network error but session valid',
        };
        authStatusCache = { status, timestamp: Date.now() };
        return status;
      }
      
      // Token is actually invalid (not just network error) - only fail if session user doesn't exist
      if (!session.user) {
        const status: AuthStatus = {
          isAuthenticated: false,
          userId: null,
          session: null,
          error: userError?.message || 'User verification failed',
        };
        authStatusCache = { status, timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000) };
        return status;
      }
      
      // Session user exists, but getUser failed - check if IDs match
      if (user && user.id !== session.user.id) {
        const status: AuthStatus = {
          isAuthenticated: false,
          userId: null,
          session: null,
          error: 'User ID mismatch',
        };
        authStatusCache = { status, timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000) };
        return status;
      }
    }
    
    // Use session user if getUser failed but session is valid
    const verifiedUser = user || session.user;
    if (!verifiedUser) {
      const status: AuthStatus = {
        isAuthenticated: false,
        userId: null,
        session: null,
        error: 'No user found in session',
      };
      authStatusCache = { status, timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000) };
      return status;
    }

    const status: AuthStatus = {
      isAuthenticated: true,
      userId: verifiedUser.id,
      session: session,
    };
    authStatusCache = { status, timestamp: Date.now() };
    return status;
  } catch (error: any) {
    const status: AuthStatus = {
      isAuthenticated: false,
      userId: null,
      session: null,
      error: error.message || 'Authentication verification failed',
    };
    authStatusCache = { status, timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000) };
    return status;
  }
}

/**
 * Clear authentication cache
 */
export function clearAuthCache(): void {
  authStatusCache = null;
  logger.debug('Authentication cache cleared');
}

/**
 * Initialize auth state change listener
 * Clears cache on token refresh to prevent stale auth status
 * ✅ FIX: Only sets up listener once to prevent duplicate registrations
 */
export function initializeAuthStateListener(): void {
  if (typeof window === 'undefined') {
    return; // Server-side, no listener needed
  }

  // ✅ FIX: Check if listener is already set up to prevent duplicates
  if ((window as any).__authCacheListenerSetup) {
    logger.debug('Auth cache listener already set up, skipping');
    return;
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Retry after a short delay if Supabase isn't initialized yet
    setTimeout(() => {
      const retrySupabase = getSupabase();
      if (retrySupabase) {
        setupListener(retrySupabase);
      }
    }, 1000);
    return;
  }

  setupListener(supabase);
}

/**
 * Setup auth state change listener
 * ✅ FIX: Only sets up listener once using singleton pattern
 */
function setupListener(supabase: any): void {
  // ✅ FIX: Double-check to prevent race conditions
  if ((window as any).__authCacheListenerSetup) {
    logger.debug('Auth cache listener already set up, skipping');
    return;
  }
  
  (window as any).__authCacheListenerSetup = true;
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
    if (event === 'TOKEN_REFRESHED') {
      if (session) {
        clearAuthCache();
        logger.debug('Token refreshed - cleared auth cache for fresh verification');
      } else {
        logger.error('Token refresh failed - No session returned');
      }
    } else if (event === 'SIGNED_OUT') {
      clearAuthCache();
      logger.debug('User signed out - cleared auth cache');
    } else if (event === 'SIGNED_IN') {
      clearAuthCache();
      logger.debug('User signed in - cleared auth cache');
    }
  });
  
  // Store subscription for potential cleanup (though we keep it active for the session)
  (window as any).__authCacheListenerSubscription = subscription;
}

