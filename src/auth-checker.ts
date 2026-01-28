/**
 * Authentication Checker
 * Checks if user is authenticated using Supabase and redirects to login if not
 * 
 * UX Improvements (v2.0):
 * - Added loading overlay during auth verification to prevent content flash
 * - Configurable behavior via AUTH_CHECKER_CONFIG
 */

import { checkSupabaseAuthentication, getUserInfo, isDevBypassActive } from './utils/auth.js';
import { initSupabase, getSupabase } from './utils/supabase-init.js';
import { logInfo, logError } from './utils/logging-helper.js';
import { initImpersonationBanner } from './components/impersonation-banner.js';

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
 * Configuration for auth checker behavior
 * Can be overridden via window.AUTH_CHECKER_CONFIG before this script loads
 */
interface AuthCheckerConfig {
  /** Show loading overlay during auth check (default: true) */
  showLoadingOverlay: boolean;
  /** Timeout before showing loading overlay in ms (default: 100) */
  loadingOverlayDelay: number;
  /** Use previous behavior without loading overlay (fallback mode) */
  useLegacyMode: boolean;
}

const DEFAULT_CONFIG: AuthCheckerConfig = {
  showLoadingOverlay: true,
  loadingOverlayDelay: 100,
  useLegacyMode: false,
};

// Allow runtime configuration override
const config: AuthCheckerConfig = {
  ...DEFAULT_CONFIG,
  ...((window as any).AUTH_CHECKER_CONFIG || {}),
};

/**
 * Check if we should show the auth loading overlay
 * ✅ FIX: Don't show overlay for already-verified sessions (prevents double loading on navigation)
 */
function shouldShowAuthOverlay(): boolean {
  // Skip if legacy mode or overlay disabled
  if (config.useLegacyMode || !config.showLoadingOverlay) {
    return false;
  }
  
  // ✅ FIX: Don't show overlay if session was recently verified in this browser session
  // This prevents the overlay from showing on every page navigation
  const sessionVerified = sessionStorage.getItem('authSessionVerified');
  if (sessionVerified) {
    const verifiedAt = parseInt(sessionVerified, 10);
    const now = Date.now();
    // If verified within the last 5 minutes, skip the overlay
    // Auth is still checked, just without the visual overlay
    if (now - verifiedAt < 5 * 60 * 1000) {
      logInfo('Session recently verified, skipping auth overlay');
      return false;
    }
  }
  
  // ✅ FIX: Don't show if we have valid user info in localStorage (quick check)
  // This is a fast heuristic - actual auth verification still happens
  const userInfo = localStorage.getItem('userInfo');
  if (userInfo) {
    try {
      const parsed = JSON.parse(userInfo);
      if (parsed && parsed.id && parsed.email) {
        // User info exists, likely authenticated - skip overlay
        logInfo('User info found, skipping auth overlay (auth still verified in background)');
        return false;
      }
    } catch (e) {
      // Invalid JSON, continue to show overlay
    }
  }
  
  return true;
}

/**
 * Mark session as verified (prevents overlay on subsequent navigations)
 */
function markSessionVerified(): void {
  sessionStorage.setItem('authSessionVerified', Date.now().toString());
}

/**
 * Create and show auth loading overlay
 * Prevents content flash during authentication verification
 * ✅ FIX: Only shows on initial load, not on every page navigation
 */
function showAuthLoadingOverlay(): HTMLElement | null {
  // ✅ FIX: Check if we should show overlay (skip for verified sessions)
  if (!shouldShowAuthOverlay()) {
    return null;
  }
  
  // Don't show if already exists
  if (document.getElementById('auth-loading-overlay')) {
    return document.getElementById('auth-loading-overlay');
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'auth-loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    opacity: 0;
    transition: opacity 0.15s ease-out;
  `;
  
  overlay.innerHTML = `
    <div style="text-align: center;">
      <div style="
        width: 40px;
        height: 40px;
        border: 3px solid #e5e7eb;
        border-top-color: #1A733E;
        border-radius: 50%;
        animation: auth-spinner 0.8s linear infinite;
        margin: 0 auto 1rem;
      "></div>
      <p style="color: #6b7280; font-size: 0.875rem; margin: 0;">Verifying session...</p>
    </div>
    <style>
      @keyframes auth-spinner {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.appendChild(overlay);
  
  // Fade in after brief delay (prevents flash for fast auth)
  setTimeout(() => {
    overlay.style.opacity = '1';
  }, config.loadingOverlayDelay);
  
  return overlay;
}

/**
 * Hide and remove auth loading overlay
 */
function hideAuthLoadingOverlay(): void {
  const overlay = document.getElementById('auth-loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
    }, 150);
  }
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
  
  // ✅ UX: Hide loading overlay before redirect
  hideAuthLoadingOverlay();
  
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
 * Ensure userInfo in localStorage is synced with people table
 * This handles cases like magic link login (impersonation) where
 * the OAuth callback doesn't run to populate user info
 */
async function ensureUserInfoSynced(user: UserInfo): Promise<void> {
  try {
    const userInfoStr = localStorage.getItem('userInfo');
    const existingUserInfo = userInfoStr ? JSON.parse(userInfoStr) : null;
    
    // Check if userInfo needs to be synced (email mismatch or missing role)
    const userEmail = user.email?.toLowerCase() || '';
    const storedEmail = existingUserInfo?.email?.toLowerCase() || '';
    
    // If email matches and role exists, no need to sync
    if (storedEmail === userEmail && existingUserInfo?.role) {
      return;
    }
    
    logInfo('[Auth-Checker] Syncing user info from people table...');
    
    const supabase = getSupabase();
    if (!supabase) return;
    
    // Fetch user profile from people table
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('name, role, department, designation, team, team_supervisor, avatar_url')
      .eq('email', userEmail)
      .maybeSingle();
    
    if (peopleError) {
      logError('[Auth-Checker] Failed to fetch people data:', peopleError);
      return;
    }
    
    if (!peopleData) {
      logInfo('[Auth-Checker] No people record found for user:', userEmail);
      // Still create basic userInfo from auth user
      const basicUserInfo = {
        id: user.id,
        email: user.email,
        name: user.name || user.email?.split('@')[0] || 'User',
        role: 'Employee',
        provider: 'magic_link',
      };
      localStorage.setItem('userInfo', JSON.stringify(basicUserInfo));
      return;
    }
    
    // Create full userInfo from people table
    const fullUserInfo = {
      id: user.id,
      email: user.email,
      name: peopleData.name || user.name || user.email?.split('@')[0] || 'User',
      avatar: peopleData.avatar_url || user.avatar || null,
      picture: peopleData.avatar_url || user.picture || null,
      avatar_url: peopleData.avatar_url || null,
      role: peopleData.role || 'Employee',
      department: peopleData.department || null,
      designation: peopleData.designation || null,
      team: peopleData.team || null,
      team_supervisor: peopleData.team_supervisor || null,
      provider: 'magic_link',
    };
    
    localStorage.setItem('userInfo', JSON.stringify(fullUserInfo));
    logInfo('[Auth-Checker] User info synced from people table:', { 
      email: fullUserInfo.email, 
      role: fullUserInfo.role 
    });
    
    // Dispatch event to update sidebar (on document, where sidebar listens)
    document.dispatchEvent(new CustomEvent('userInfoUpdated', { 
      detail: { userInfo: fullUserInfo } 
    }));
    
  } catch (error) {
    logError('[Auth-Checker] Error syncing user info:', error);
  }
}

/**
 * Initialize authentication check
 * This function runs when the page loads
 * Protects all pages except auth-page.html and index.html
 * ✅ SECURITY FIX: Verifies token with server BEFORE any redirects to prevent homepage flash
 * ✅ UX FIX: Shows loading overlay during auth check to prevent content flash
 */
async function initAuthCheck(): Promise<void> {
  // ✅ FIX: Prevent multiple simultaneous auth checks
  if ((window as any).__authCheckInProgress) {
    logInfo('Auth check already in progress, skipping...');
    return;
  }
  
  (window as any).__authCheckInProgress = true;
  
  // ✅ UX: Show loading overlay for protected pages to prevent content flash
  let loadingOverlay: HTMLElement | null = null;
  if (shouldProtectPage()) {
    loadingOverlay = showAuthLoadingOverlay();
  }
  
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
    // ✅ UX: Hide loading overlay now that auth is verified
    hideAuthLoadingOverlay();
    
    // ✅ FIX: Ensure userInfo is synced from people table (handles magic link login for impersonation)
    await ensureUserInfoSynced(user);
    
    // Initialize impersonation banner if in impersonation mode
    // This shows a prominent banner when an admin is logged in as another user
    try {
      initImpersonationBanner();
    } catch (bannerError) {
      // Don't block page load if banner fails
      logError('Failed to initialize impersonation banner:', bannerError);
    }
    // ✅ FIX: Mark session as verified to prevent overlay on subsequent navigations
    markSessionVerified();
    
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
  } catch (error) {
    logError('Error during auth check:', error);
    // ✅ UX: Ensure overlay is hidden on error
    hideAuthLoadingOverlay();
    throw error;
  } finally {
    // Clear the in-progress flag
    (window as any).__authCheckInProgress = false;
    // ✅ UX: Ensure overlay is always cleaned up (safety net)
    // Delay slightly to allow successful auth to show content first
    setTimeout(() => {
      hideAuthLoadingOverlay();
    }, 100);
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

