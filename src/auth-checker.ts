/**
 * Authentication Checker
 * Checks if user is authenticated using Supabase and redirects to login if not
 */

import { checkSupabaseAuthentication, getUserInfo, isDevBypassActive } from './utils/auth.js';
import { initSupabase, getSupabase } from './utils/supabase-init.js';
import { logInfo, logError } from './utils/logging-helper.js';

interface UserInfo {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  role?: string;
  department?: string;
  designation?: string;
  employee_id?: string;
  avatar?: string;
  sub?: string;
  provider?: string;
  isDev?: boolean;
}

/**
 * Check if user is authenticated
 * Supports both Supabase auth and dev bypass
 * @returns true if authenticated, false otherwise
 */
async function isAuthenticated(): Promise<boolean> {
  try {
    // Check dev bypass first (faster check)
    if (isDevBypassActive()) {
      return true;
    }

    // Check Supabase authentication
    const isAuth = await checkSupabaseAuthentication();
    return isAuth;
  } catch (error) {
    logError('Error checking authentication:', error);
    return false;
  }
}

/**
 * Get current user info
 * @returns UserInfo object or null if not authenticated
 */
async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const userInfo = await getUserInfo();
    return userInfo as UserInfo | null;
  } catch (error) {
    logError('Error getting user info:', error);
    return null;
  }
}

/**
 * Redirect to login page
 * ✅ FIX: Add guard to prevent redirect loops
 */
function redirectToLogin(): void {
  // ✅ FIX: Prevent redirect loops - check if we're already redirecting
  if ((window as any).__redirectingToLogin) {
    logInfo('Redirect already in progress, skipping...');
    return;
  }
  
  // ✅ FIX: Check if login just completed (prevents immediate re-validation failures)
  if (sessionStorage.getItem('loginJustCompleted') === 'true') {
    logInfo('Login just completed, skipping redirect to prevent loop');
    return;
  }
  
  (window as any).__redirectingToLogin = true;
  const authPagePath = '/src/auth/presentation/auth-page.html';
  
  // Clear redirect flag after a delay to allow navigation
  setTimeout(() => {
    (window as any).__redirectingToLogin = false;
  }, 1000);
  
  window.location.href = authPagePath;
}

/**
 * Check if current page should be protected (requires authentication)
 */
function shouldProtectPage(): boolean {
  const currentPath = window.location.pathname;
  const authPagePath = '/src/auth/presentation/auth-page.html';
  
  // Don't protect the auth page itself
  if (currentPath === authPagePath || currentPath.endsWith('auth-page.html')) {
    return false;
  }
  
  // Don't protect the index page (it's the auth checker)
  if (currentPath === '/' || currentPath === '/index.html') {
    return false;
  }
  
  // Protect all other pages
  return true;
}

/**
 * Initialize authentication check
 * This function runs when the page loads
 * Protects all pages except auth-page.html and index.html
 * ✅ SECURITY FIX: Verifies token with server BEFORE any redirects to prevent homepage flash
 */
async function initAuthCheck(): Promise<void> {
  // ✅ FIX: Prevent multiple simultaneous auth checks
  if ((window as any).__authCheckInProgress) {
    logInfo('Auth check already in progress, skipping...');
    return;
  }
  
  (window as any).__authCheckInProgress = true;
  
  try {
    // Check if this page should be protected
    if (!shouldProtectPage()) {
      const currentPath = window.location.pathname;
      
      // For index page, check auth and redirect authenticated users to home
      if (currentPath === '/' || currentPath === '/index.html') {
        // Initialize Supabase first
        try {
          await initSupabase();
        } catch (error) {
          logError('Failed to initialize Supabase:', error);
          // If Supabase init fails, redirect to auth page
          redirectToLogin();
          return;
        }

        // ✅ SECURITY FIX: Verify authentication with server BEFORE redirecting
        // This prevents the flash of homepage when token is copied to another browser
        // ✅ FIX: Skip check if login just completed
        if (sessionStorage.getItem('loginJustCompleted') === 'true') {
          logInfo('Login just completed, skipping auth check');
          return;
        }
        
        const authenticated = await isAuthenticated();
      
        if (authenticated) {
          // Double-check by getting user info (ensures token is still valid)
          const user = await getCurrentUser();
          if (user) {
            logInfo('User authenticated, redirecting to home page...');
            // Use replace to prevent back button issues
            // Use clean URL for better UX
            window.location.replace('/home');
          } else {
            // Token appeared valid but user fetch failed - redirect to login
            logInfo('Token validation failed, redirecting to auth page...');
            redirectToLogin();
          }
        } else {
          // User not authenticated, redirect to auth page
          logInfo('User not authenticated, redirecting to auth page...');
          redirectToLogin();
        }
        return;
      }
      
      // ✅ FIX: For auth page, check if user is already authenticated and redirect to home
      const authPagePath = '/src/auth/presentation/auth-page.html';
      if (currentPath === authPagePath || currentPath.endsWith('auth-page.html')) {
        console.log('[Auth-Checker] Running on auth page, checking authentication status...');
        
        // Initialize Supabase first
        try {
          await initSupabase();
          console.log('[Auth-Checker] Supabase initialized successfully');
        } catch (error) {
          logError('Failed to initialize Supabase:', error);
          console.error('[Auth-Checker] Supabase initialization failed:', error);
          // If Supabase init fails, stay on auth page
          return;
        }

        // ✅ FIX: Skip check if login just completed (prevents redirect loops during OAuth callback)
        if (sessionStorage.getItem('loginJustCompleted') === 'true') {
          console.log('[Auth-Checker] Login just completed flag set, skipping auth check on auth page');
          logInfo('Login just completed, skipping auth check on auth page');
          return;
        }
        
        // Check if user is already authenticated
        console.log('[Auth-Checker] Checking if user is authenticated...');
        const authenticated = await isAuthenticated();
        console.log('[Auth-Checker] Authentication check result:', authenticated);
        
        if (authenticated) {
          // Double-check by getting user info (ensures token is still valid)
          console.log('[Auth-Checker] User appears authenticated, fetching user info...');
          const user = await getCurrentUser();
          console.log('[Auth-Checker] User info:', user ? { id: user.id, email: user.email } : 'null');
          
          if (user) {
            console.log('[Auth-Checker] ✅ User authenticated, redirecting to home...');
            logInfo('User already authenticated on auth page, redirecting to home...');
            // Use replace to prevent back button issues
            window.location.replace('/home');
            return;
          } else {
            console.warn('[Auth-Checker] Authentication check passed but user info fetch failed');
          }
        }
        
        // User not authenticated, stay on auth page (let them login)
        console.log('[Auth-Checker] User not authenticated, staying on auth page');
        logInfo('User not authenticated, staying on auth page');
        return;
      }
      
      // For other unprotected pages, don't do anything
      return;
    }

    // This is a protected page - check authentication
    // Initialize Supabase first
    try {
      await initSupabase();
    } catch (error) {
      logError('Failed to initialize Supabase:', error);
      // If Supabase init fails, redirect to auth page
      redirectToLogin();
      return;
    }

    // ✅ SECURITY FIX: Verify authentication with server BEFORE allowing page access
    // This prevents unauthorized access when token is copied to another browser
    // ✅ FIX: Skip check if login just completed
    if (sessionStorage.getItem('loginJustCompleted') === 'true') {
      logInfo('Login just completed, skipping auth check');
      return;
    }
    
    const authenticated = await isAuthenticated();
  
    if (!authenticated) {
      logInfo('User not authenticated, redirecting to auth page...');
      // Store current path for redirect after login
      const currentPath = window.location.pathname;
      if (currentPath && currentPath !== '/src/auth/presentation/auth-page.html') {
        sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
      }
      redirectToLogin();
      return;
    }

    // Double-check by getting user info (ensures token is still valid)
    const user = await getCurrentUser();
    if (!user) {
      // Token appeared valid but user fetch failed - redirect to login
      logInfo('Token validation failed, redirecting to auth page...');
      // Store current path for redirect after login
      const currentPath = window.location.pathname;
      if (currentPath && currentPath !== '/src/auth/presentation/auth-page.html') {
        sessionStorage.setItem('redirectAfterLogin', currentPath + window.location.search);
      }
      redirectToLogin();
      return;
    }

    // User is authenticated - allow access to the page
    
    // Set up auth state listener to handle token expiration in real-time
    // ✅ FIX: Only set up listener once to prevent multiple registrations causing login/logout loops
    const supabase = getSupabase();
    if (supabase) {
      // H3 FIX: Start session monitoring for expiry warnings
      import('./utils/session-warning.js')
        .then((module) => {
          module.startSessionMonitoring();
        })
        .catch(() => {
          // Ignore if module not loaded yet
        });

      // ✅ FIX: Store subscription to prevent duplicate listeners
      // Check if listener is already set up (using a global flag)
      if (!(window as any).__authStateListenerSetup) {
        (window as any).__authStateListenerSetup = true;
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: any) => {
          // ✅ FIX: Don't interfere with login process on auth page
          const currentPath = window.location.pathname;
          const isAuthPage = currentPath === '/src/auth/presentation/auth-page.html' || currentPath.endsWith('auth-page.html');
          
          // ✅ FIX: Don't redirect if login just completed
          if (sessionStorage.getItem('loginJustCompleted') === 'true') {
            return;
          }
          
          // On auth page, only handle SIGNED_OUT (user manually logged out)
          // Don't interfere with SIGNED_IN or TOKEN_REFRESHED during login
          if (isAuthPage && event !== 'SIGNED_OUT') {
            return;
          }
          
          if (event === 'SIGNED_OUT') {
            // H3 FIX: Handle session expiry with auto-save
            import('./utils/session-warning.js')
              .then((module) => {
                module.handleSessionExpiry();
              })
              .catch(() => {
                // Only redirect if not already on auth page
                if (!isAuthPage) {
                  redirectToLogin();
                }
              });
          } else if (event === 'TOKEN_REFRESHED') {
            if (!session) {
              logError('Auth Checker: Token refresh failed - redirecting to login');
              // H3 FIX: Handle session expiry with auto-save
              import('./utils/session-warning.js')
                .then((module) => {
                  module.handleSessionExpiry();
                })
                .catch(() => {
                  // Only redirect if not already on auth page
                  if (!isAuthPage) {
                    redirectToLogin();
                  }
                });
            } else {
              // Clear auth cache to get fresh verification with new token
              import('./utils/authenticated-supabase.js')
                .then((module) => {
                  module.clearAuthCache();
                })
                .catch(() => {
                  // Ignore if module not loaded yet
                });
            }
          }
          // ✅ FIX: Ignore SIGNED_IN event to prevent redirect loops during login
          // The OAuth callback handler will manage redirects after successful login
        });
        
        // Store subscription for potential cleanup (though we keep it active for the session)
        (window as any).__authStateSubscription = subscription;
      }
    } else {
      logError('Auth Checker: Supabase client not available');
    }
  } finally {
    // Clear the in-progress flag
    (window as any).__authCheckInProgress = false;
  }
}

// Run auth check when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuthCheck();
  });
} else {
  initAuthCheck();
}

// Export functions for use in other modules
export { isAuthenticated, getCurrentUser, redirectToLogin, initAuthCheck };
export type { UserInfo };

