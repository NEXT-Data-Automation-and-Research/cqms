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
        // Refresh failed - session is invalid
        logger.warn('Token refresh failed:', refreshError?.message);
        const status: AuthStatus = {
          isAuthenticated: false,
          userId: null,
          session: null,
          error: refreshError?.message || 'Session expired and refresh failed',
        };
        authStatusCache = { status, timestamp: Date.now() - (AUTH_CACHE_DURATION - 5000) };
        return status;
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
    
    // If getUser fails but we have a valid session, still allow access
    // (getUser might fail due to network issues, but session is still valid)
    if (userError && !user) {
      // Only fail if we can't get user AND session user doesn't match
      if (!session.user || (user && user.id !== session.user.id)) {
        const status: AuthStatus = {
          isAuthenticated: false,
          userId: null,
          session: null,
          error: userError?.message || 'User verification failed',
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
 */
export function initializeAuthStateListener(): void {
  if (typeof window === 'undefined') {
    return; // Server-side, no listener needed
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
 */
function setupListener(supabase: any): void {
  supabase.auth.onAuthStateChange((event: string, session: any) => {
    if (event === 'TOKEN_REFRESHED') {
      if (session) {
        clearAuthCache();
        logger.debug('Token refreshed - cleared auth cache for fresh verification');
      } else {
        console.error('Token refresh failed - No session returned');
      }
    } else if (event === 'SIGNED_OUT') {
      clearAuthCache();
      logger.debug('User signed out - cleared auth cache');
    } else if (event === 'SIGNED_IN') {
      clearAuthCache();
      logger.debug('User signed in - cleared auth cache');
    }
  });
}

