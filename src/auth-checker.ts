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
 * Cross-tab auth sync
 *
 * Supabase syncs auth across tabs via storage/broadcast, but our UI relies on `userInfo`
 * and custom events. When `userInfo` changes in another tab, this tab won't receive
 * the `userInfoUpdated` event automatically, so the sidebar can show stale user info.
 *
 * ✅ Enhanced to handle:
 * - Login in another tab (Scenario 15)
 * - Logout in another tab (Scenario 16)
 * - Session refresh across tabs (Scenario 17)
 * - Impersonation changes (Scenario 18-19)
 */
function setupCrossTabAuthSync(): void {
  if (typeof window === 'undefined') return;
  if ((window as any).__crossTabAuthSyncSetup) return;
  (window as any).__crossTabAuthSyncSetup = true;

  window.addEventListener('storage', (evt: StorageEvent) => {
    try {
      // ✅ FIX: Don't process storage events during our own auth transitions
      if (isOAuthCallbackInProgress()) {
        logInfo('[CrossTabSync] Ignoring storage event during OAuth callback');
        return;
      }

      // User info changes (e.g., another tab completed OAuth and wrote userInfo)
      if (evt.key === 'userInfo') {
        // ✅ FIX: Handle logout (userInfo removed)
        if (!evt.newValue && evt.oldValue) {
          logInfo('[CrossTabSync] User logged out in another tab');
          // Show notification and redirect
          showCrossTabLogoutNotification();
          return;
        }
        
        if (!evt.newValue) return;
        
        const parsed = JSON.parse(evt.newValue);
        if (parsed && parsed.id && parsed.email) {
          // ✅ FIX: Check if user changed (different user logged in)
          if (evt.oldValue) {
            try {
              const oldParsed = JSON.parse(evt.oldValue);
              if (oldParsed.id !== parsed.id) {
                logInfo('[CrossTabSync] Different user logged in - reloading page');
                // Different user logged in - reload to get fresh state
                window.location.reload();
                return;
              }
            } catch (e) {
              // Old value was invalid, just update
            }
          }
          
          document.dispatchEvent(new CustomEvent('userInfoUpdated', { detail: { userInfo: parsed } }));
        }
        return;
      }

      // Auth token changes: clear auth caches so subsequent checks re-verify with latest token.
      if (evt.key === 'supabase.auth.token') {
        // ✅ FIX: If token was removed, user logged out
        if (!evt.newValue && evt.oldValue) {
          logInfo('[CrossTabSync] Auth token removed in another tab - session ended');
          showCrossTabLogoutNotification();
          return;
        }
        
        import('./utils/authenticated-supabase.js')
          .then((module) => {
            if (typeof module.clearAuthCache === 'function') {
              module.clearAuthCache();
            }
          })
          .catch(() => {
            // Ignore if module isn't available yet
          });
      }
      
      // ✅ FIX: Handle impersonation end in another tab
      if (evt.key === 'impersonationEnded' && evt.newValue === 'true') {
        logInfo('[CrossTabSync] Impersonation ended in another tab - reloading');
        try {
          localStorage.removeItem('impersonationEnded');
        } catch (e) {}
        window.location.reload();
      }
      
      // ✅ FIX: Handle cross-tab login signal
      if (evt.key === 'crossTabLoginCompleted' && evt.newValue) {
        logInfo('[CrossTabSync] Login completed in another tab');
        try {
          localStorage.removeItem('crossTabLoginCompleted');
        } catch (e) {}
        // Refresh the page to load with new auth state
        window.location.reload();
      }
    } catch {
      // Ignore cross-tab sync errors
    }
  });
  
  // ✅ FIX: Also listen for visibility change to re-check auth when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      // Tab became visible - check if auth state changed while we were hidden
      checkAuthStateOnVisibilityChange();
    }
  });
}

/**
 * Show notification that user was logged out in another tab
 */
function showCrossTabLogoutNotification(): void {
  // Don't show if already on auth page
  const currentPath = window.location.pathname;
  if (currentPath.includes('auth-page')) return;
  
  const notification = document.createElement('div');
  notification.id = 'cross-tab-logout-notification';
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 99999;
    text-align: center;
    max-width: 400px;
  `;
  notification.innerHTML = `
    <h3 style="margin-bottom: 1rem; color: #1f2937;">Session Ended</h3>
    <p style="color: #6b7280; margin-bottom: 1.5rem;">You were logged out in another tab.</p>
    <button onclick="window.location.href='/src/auth/presentation/auth-page.html'" style="
      background: #1A733E;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      cursor: pointer;
      font-weight: 500;
    ">Sign In Again</button>
  `;
  
  // Add backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 99998;
  `;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(notification);
}

/**
 * Check auth state when tab becomes visible after being hidden
 * This handles cases where session expired or user logged out while tab was hidden
 */
async function checkAuthStateOnVisibilityChange(): Promise<void> {
  // Skip if we're in an auth transition
  if (isOAuthCallbackInProgress()) return;
  if (sessionStorage.getItem('loginJustCompleted') === 'true') return;
  
  // Quick check: is userInfo still valid?
  const userInfo = localStorage.getItem('userInfo');
  const authToken = localStorage.getItem('supabase.auth.token');
  
  if (!userInfo || !authToken) {
    // Auth data missing - might have been logged out
    const currentPath = window.location.pathname;
    if (!currentPath.includes('auth-page')) {
      logInfo('[CrossTabSync] Auth data missing on visibility change - redirecting to login');
      redirectToLogin();
    }
  }
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

// Track authentication check promise to prevent duplicate simultaneous checks
let authCheckPromise: Promise<boolean> | null = null;
let lastAuthCheckTime = 0;
const AUTH_CHECK_DEBOUNCE_MS = 500; // Don't run auth check more than once per 500ms

/**
 * Check if user is authenticated
 * Supports both Supabase auth and dev bypass
 * RELIABILITY: More graceful handling of initialization failures
 * DEBOUNCING: Prevents multiple simultaneous auth checks
 * @returns true if authenticated, false otherwise
 */
async function isAuthenticated(): Promise<boolean> {
  // Debounce: If we just checked auth, return the cached promise
  const now = Date.now();
  if (authCheckPromise && (now - lastAuthCheckTime) < AUTH_CHECK_DEBOUNCE_MS) {
    logInfo('Auth check debounced, returning cached result');
    return authCheckPromise;
  }
  
  lastAuthCheckTime = now;
  
  authCheckPromise = (async () => {
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
      
      // RELIABILITY: If check failed but we have cached session, don't immediately lock out
      // This prevents locking out users during temporary network issues
      // BUT: Only trust cache if no OAuth is in progress
      if (!isOAuthCallbackInProgress()) {
        const cachedSession = localStorage.getItem('supabase.auth.token');
        const userInfo = localStorage.getItem('userInfo');
        
        if (cachedSession && userInfo) {
          try {
            const parsed = JSON.parse(userInfo);
            if (parsed && parsed.id && parsed.email) {
              logInfo('Auth check failed but valid cached session exists - allowing access');
              // Mark that we're in degraded mode so UI can show reconnection status if needed
              sessionStorage.setItem('authDegradedMode', 'true');
              return true;
            }
          } catch (parseError) {
            // Invalid cached data, proceed with false
          }
        }
      }
      
      return false;
    }
  })();
  
  return authCheckPromise;
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
 * ✅ FIX: Check for OAuth callback to prevent interfering with login flow
 * ✅ FIX: Save form data before redirecting (Scenario 55, 56)
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
  
  // ✅ FIX: Don't redirect if OAuth callback is in progress
  if (isOAuthCallbackInProgress()) {
    logInfo('OAuth callback in progress, skipping redirect to let OAuth complete');
    return;
  }
  
  // ✅ FIX: Don't interfere if cache reload is in progress
  // The cache-clear-realtime module handles its own redirect to auth page
  if ((window as any).__cacheReloadInProgress || sessionStorage.getItem('cacheReloadInProgress') === 'true') {
    logInfo('Cache reload in progress, skipping redirect to let cache-clear handle it');
    return;
  }
  
  // ✅ FIX: Don't redirect if we're already on the auth page
  const currentPath = window.location.pathname;
  if (currentPath.includes('auth-page')) {
    logInfo('Already on auth page, skipping redirect');
    return;
  }
  
  (window as any).__redirectingToLogin = true;
  const authPagePath = '/src/auth/presentation/auth-page.html';
  
  // ✅ FIX: Save any form data before redirecting
  try {
    if ((window as any).formProtection?.saveAllForms) {
      (window as any).formProtection.saveAllForms();
      logInfo('Saved form data before redirect');
    }
  } catch (e) {
    // Ignore form protection errors
  }
  
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
    
    // Fetch user profile from people table (try lowercase then original case - people.email may differ by case)
    let peopleData: { name?: string; role?: string; department?: string; designation?: string; team?: string; team_supervisor?: string; avatar_url?: string } | null = null;
    let peopleError: any = null;
    const { data: d1, error: e1 } = await supabase
      .from('people')
      .select('name, role, department, designation, team, team_supervisor, avatar_url')
      .eq('email', userEmail)
      .maybeSingle();
    peopleData = d1;
    peopleError = e1;
    if (!peopleData && user.email?.trim() && user.email.trim().toLowerCase() !== userEmail) {
      const { data: d2, error: e2 } = await supabase
        .from('people')
        .select('name, role, department, designation, team, team_supervisor, avatar_url')
        .eq('email', user.email.trim())
        .maybeSingle();
      if (d2) {
        peopleData = d2;
        peopleError = e2;
      }
    }
    
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
      document.dispatchEvent(new CustomEvent('userInfoUpdated', {
        detail: { userInfo: basicUserInfo }
      }));
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
 * Check if OAuth callback is in progress (synchronously)
 * This prevents race conditions where auth-checker redirects before OAuth completes
 */
function isOAuthCallbackInProgress(): boolean {
  // Check URL for OAuth parameters
  const urlHash = window.location.hash || '';
  const urlSearch = window.location.search || '';
  const hasOAuthParams = urlHash.includes('access_token') || 
                         urlHash.includes('code') ||
                         urlSearch.includes('code') ||
                         urlSearch.includes('access_token');
  
  // Check flags set by auth-page.html
  const oauthFlag = sessionStorage.getItem('oauthCallbackInProgress') === 'true';
  const windowFlag = (window as any).__oauthCallbackInProgress === true;
  
  return hasOAuthParams || oauthFlag || windowFlag;
}

/**
 * Check if user has a valid cached session (quick synchronous check)
 * Used for early bailout to prevent lockouts during network issues
 * 
 * IMPORTANT: This should NOT be used on auth page when OAuth callback is in progress
 * to prevent redirect loops during login
 */
function hasValidCachedSession(): { valid: boolean; userInfo: any } {
  try {
    // CRITICAL: Don't trust cache during OAuth callback - let the flow complete
    if (isOAuthCallbackInProgress()) {
      logInfo('OAuth callback in progress - skipping cached session check');
      return { valid: false, userInfo: null };
    }
    
    // Don't trust cache if login was recently completed - wait for full verification
    const loginJustCompleted = sessionStorage.getItem('loginJustCompleted') === 'true';
    if (loginJustCompleted) {
      logInfo('Login just completed - skipping cached session check');
      return { valid: false, userInfo: null };
    }
    
    const cachedSession = localStorage.getItem('supabase.auth.token');
    const userInfoStr = localStorage.getItem('userInfo');
    
    if (!cachedSession || !userInfoStr) {
      return { valid: false, userInfo: null };
    }
    
    const userInfo = JSON.parse(userInfoStr);
    if (!userInfo || !userInfo.id || !userInfo.email) {
      return { valid: false, userInfo: null };
    }
    
    // Check if session hasn't expired (if we can parse it)
    try {
      const sessionData = JSON.parse(cachedSession);
      if (sessionData?.currentSession?.expires_at) {
        const expiresAt = sessionData.currentSession.expires_at;
        const now = Math.floor(Date.now() / 1000);
        // Add 5 minute buffer - if expired less than 5 min ago, still consider valid
        // (Supabase can refresh it)
        if (expiresAt < now - 300) {
          logInfo('Cached session expired more than 5 minutes ago');
          return { valid: false, userInfo: null };
        }
      }
    } catch (parseError) {
      // Can't parse session expiry, but userInfo exists - trust it
    }
    
    return { valid: true, userInfo };
  } catch (error) {
    return { valid: false, userInfo: null };
  }
}

/**
 * Initialize authentication check
 * This function runs when the page loads
 * Protects all pages except auth-page.html and index.html
 * ✅ SECURITY FIX: Verifies token with server BEFORE any redirects to prevent homepage flash
 * ✅ UX FIX: Shows loading overlay during auth check to prevent content flash
 * ✅ RELIABILITY FIX: Early bailout for cached sessions to prevent lockouts
 */
async function initAuthCheck(): Promise<void> {
  // Set up cross-tab auth sync early (safe no-op if already set)
  setupCrossTabAuthSync();

  // ✅ FIX: Prevent multiple simultaneous auth checks
  if ((window as any).__authCheckInProgress) {
    logInfo('Auth check already in progress, skipping...');
    return;
  }
  
  (window as any).__authCheckInProgress = true;
  
  const currentPath = window.location.pathname;
  const isAuthPage = currentPath === '/src/auth/presentation/auth-page.html' || currentPath.endsWith('auth-page.html');
  const isIndexPage = currentPath === '/' || currentPath === '/index.html';
  
  // ✅ RELIABILITY: Early check for cached session BEFORE any async operations
  // This prevents users from being locked out during network issues
  // 
  // IMPORTANT: hasValidCachedSession() now checks for OAuth callback and loginJustCompleted
  // internally, so it will return { valid: false } during active login flows
  const cachedAuth = hasValidCachedSession();
  
  // If user is on auth page or index, but has valid cached session, redirect to home immediately
  // This is a fast path that doesn't require waiting for Supabase
  if ((isAuthPage || isIndexPage) && cachedAuth.valid) {
    // Double-check: Skip if any login-related flags are set
    const loginJustCompleted = sessionStorage.getItem('loginJustCompleted') === 'true';
    const oauthInProgress = isOAuthCallbackInProgress();
    
    if (loginJustCompleted || oauthInProgress) {
      logInfo('Login/OAuth in progress, skipping fast path redirect');
      (window as any).__authCheckInProgress = false;
      return;
    }
    
    logInfo('Valid cached session found on auth/index page - redirecting to home (fast path)');
    window.location.replace('/home');
    (window as any).__authCheckInProgress = false;
    return;
  }
  
  // ✅ UX: Show loading overlay for protected pages to prevent content flash
  let loadingOverlay: HTMLElement | null = null;
  if (shouldProtectPage()) {
    loadingOverlay = showAuthLoadingOverlay();
  }
  
  try {
    // Check if this page should be protected
    if (!shouldProtectPage()) {
      
      // For index page, check auth and redirect authenticated users to home
      if (currentPath === '/' || currentPath === '/index.html') {
        // Initialize Supabase first
        try {
          await initSupabase();
        } catch (error) {
          logError('Failed to initialize Supabase:', error);
          
          // RELIABILITY: Check if user has cached session before redirecting to login
          // This prevents locking out users during temporary network issues
          const cachedSession = localStorage.getItem('supabase.auth.token');
          const userInfo = localStorage.getItem('userInfo');
          
          if (cachedSession && userInfo) {
            try {
              const parsed = JSON.parse(userInfo);
              if (parsed && parsed.id && parsed.email) {
                logInfo('Supabase init failed but valid cached session exists - redirecting to home');
                sessionStorage.setItem('authDegradedMode', 'true');
                window.location.replace('/home');
                return;
              }
            } catch (parseError) {
              // Invalid cached data, proceed to login
            }
          }
          
          // If Supabase init fails and no valid cache, redirect to auth page
          redirectToLogin();
          return;
        }

        // ✅ SECURITY FIX: Verify authentication with server BEFORE redirecting
        // This prevents the flash of homepage when token is copied to another browser
        // ✅ FIX: Skip check if login just completed or OAuth in progress
        if (sessionStorage.getItem('loginJustCompleted') === 'true' || isOAuthCallbackInProgress()) {
          logInfo('Login/OAuth in progress, skipping auth check on index page');
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
        
        // ✅ FIX: Skip if OAuth callback is in progress to prevent double redirect race
        // Use robust detection that checks URL params, session storage, and window flags
        if (isOAuthCallbackInProgress()) {
          console.log('[Auth-Checker] OAuth callback in progress, skipping auth check on auth page');
          logInfo('OAuth callback in progress, skipping auth check on auth page');
          (window as any).__authCheckInProgress = false;
          return;
        }
        
        // Initialize Supabase first
        let initSucceeded = false;
        try {
          await initSupabase();
          console.log('[Auth-Checker] Supabase initialized successfully');
          initSucceeded = true;
        } catch (error) {
          logError('Failed to initialize Supabase:', error);
          console.error('[Auth-Checker] Supabase initialization failed:', error);
          
          // RELIABILITY: Check if user has cached session - they might just have network issues
          const cachedSession = localStorage.getItem('supabase.auth.token');
          const userInfo = localStorage.getItem('userInfo');
          
          if (cachedSession && userInfo) {
            try {
              const parsed = JSON.parse(userInfo);
              if (parsed && parsed.id && parsed.email) {
                console.log('[Auth-Checker] Init failed but valid cached session exists - redirecting to home');
                logInfo('Supabase init failed but valid cached session exists - redirecting to home');
                sessionStorage.setItem('authDegradedMode', 'true');
                window.location.replace('/home');
                return;
              }
            } catch (parseError) {
              // Invalid cached data, stay on auth page
            }
          }
          
          // If Supabase init fails and no valid cache, stay on auth page (let them login)
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
      
      // RELIABILITY: Check if user has cached session before redirecting to login
      // This prevents locking out users during temporary network issues on page navigation
      const cachedSession = localStorage.getItem('supabase.auth.token');
      const userInfo = localStorage.getItem('userInfo');
      
      if (cachedSession && userInfo) {
        try {
          const parsed = JSON.parse(userInfo);
          if (parsed && parsed.id && parsed.email) {
            logInfo('Supabase init failed but valid cached session exists - allowing access to protected page');
            sessionStorage.setItem('authDegradedMode', 'true');
            hideAuthLoadingOverlay();
            markSessionVerified();
            // Don't redirect - allow access to page with cached credentials
            // Supabase will auto-reconnect in background
            return;
          }
        } catch (parseError) {
          // Invalid cached data, proceed to login
        }
      }
      
      // If Supabase init fails and no valid cache, redirect to auth page
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
          
          // ✅ FIX: Don't interfere if cache reload is in progress
          // The cache-clear-realtime module handles its own redirect
          if ((window as any).__cacheReloadInProgress || sessionStorage.getItem('cacheReloadInProgress') === 'true') {
            logInfo('Cache reload in progress, skipping auth state change handling');
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

/**
 * Show a subtle reconnection indicator when in degraded mode
 */
function showReconnectionIndicator(): void {
  // Don't show if already exists
  if (document.getElementById('auth-reconnection-indicator')) {
    return;
  }
  
  const indicator = document.createElement('div');
  indicator.id = 'auth-reconnection-indicator';
  indicator.style.cssText = `
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    color: #92400e;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    z-index: 9999;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  
  indicator.innerHTML = `
    <div style="
      width: 12px;
      height: 12px;
      border: 2px solid #f59e0b;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    "></div>
    <span>Reconnecting...</span>
    <style>
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } }
    </style>
  `;
  
  document.body.appendChild(indicator);
}

/**
 * Hide the reconnection indicator
 */
function hideReconnectionIndicator(): void {
  const indicator = document.getElementById('auth-reconnection-indicator');
  if (indicator) {
    indicator.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => indicator.remove(), 300);
  }
}

/**
 * Attempt background reconnection when in degraded mode
 */
async function attemptBackgroundReconnection(): Promise<void> {
  if (sessionStorage.getItem('authDegradedMode') !== 'true') {
    return;
  }
  
  logInfo('Attempting background reconnection...');
  showReconnectionIndicator();
  
  let retryCount = 0;
  const maxRetries = 5;
  const retryDelays = [2000, 5000, 10000, 20000, 30000]; // Exponential backoff
  
  while (retryCount < maxRetries) {
    try {
      await new Promise(resolve => setTimeout(resolve, retryDelays[retryCount]));
      
      const result = await initSupabase();
      if (result) {
        logInfo('Background reconnection successful!');
        sessionStorage.removeItem('authDegradedMode');
        hideReconnectionIndicator();
        
        // Show success notification
        const successToast = document.createElement('div');
        successToast.style.cssText = `
          position: fixed;
          bottom: 1rem;
          right: 1rem;
          background: #d1fae5;
          border: 1px solid #10b981;
          color: #065f46;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          z-index: 9999;
          animation: slideIn 0.3s ease-out;
        `;
        successToast.textContent = '✓ Connection restored';
        document.body.appendChild(successToast);
        setTimeout(() => successToast.remove(), 3000);
        
        return;
      }
    } catch (error) {
      logInfo(`Reconnection attempt ${retryCount + 1} failed, will retry...`);
    }
    
    retryCount++;
  }
  
  // Max retries reached - update indicator
  const indicator = document.getElementById('auth-reconnection-indicator');
  if (indicator) {
    indicator.style.background = '#fee2e2';
    indicator.style.borderColor = '#ef4444';
    indicator.style.color = '#991b1b';
    indicator.innerHTML = `
      <span>⚠️ Connection issues - <a href="javascript:location.reload()" style="color: #991b1b; text-decoration: underline;">Refresh</a></span>
    `;
  }
}

// Run auth check when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAuthCheck().then(() => {
      // Start background reconnection if in degraded mode
      attemptBackgroundReconnection();
    });
  });
} else {
  initAuthCheck().then(() => {
    // Start background reconnection if in degraded mode
    attemptBackgroundReconnection();
  });
}

// Export functions for use in other modules
export { isAuthenticated, getCurrentUser, redirectToLogin, initAuthCheck };
export type { UserInfo };

