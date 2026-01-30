/**
 * Auth State Manager
 * 
 * Single source of truth for authentication state.
 * Provides consistent auth behavior across all tabs and components.
 * 
 * DESIGN PRINCIPLES:
 * 1. Supabase session is the source of truth (not localStorage caches)
 * 2. Cross-tab sync via storage events
 * 3. Graceful degradation on network issues
 * 4. Auto-recovery from stale states
 * 5. Clean subscription lifecycle
 */

import { getSupabase, initSupabase } from './supabase-init.js';
import { logInfo, logWarn, logError } from './logging-helper.js';

// ============================================================================
// Types
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role?: string;
  department?: string;
  designation?: string;
  team?: string;
  team_supervisor?: string;
  provider?: string;
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthStateInfo {
  state: AuthState;
  user: AuthUser | null;
  isImpersonating: boolean;
  impersonatorEmail?: string;
  error?: string;
}

type AuthStateListener = (info: AuthStateInfo) => void;

// ============================================================================
// State
// ============================================================================

let currentState: AuthStateInfo = {
  state: 'loading',
  user: null,
  isImpersonating: false,
};

const listeners: Set<AuthStateListener> = new Set();
let supabaseListenerSetup = false;
let crossTabListenerSetup = false;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get current auth state (synchronous, from cache)
 */
export function getAuthState(): AuthStateInfo {
  return { ...currentState };
}

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function onAuthStateChange(listener: AuthStateListener): () => void {
  listeners.add(listener);
  // Immediately call with current state
  listener(getAuthState());
  return () => listeners.delete(listener);
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(): void {
  const state = getAuthState();
  listeners.forEach(listener => {
    try {
      listener(state);
    } catch (err) {
      logError('[AuthStateManager] Listener error:', err);
    }
  });
}

/**
 * Update auth state and notify listeners
 */
function updateState(newState: Partial<AuthStateInfo>): void {
  const oldState = currentState;
  currentState = { ...currentState, ...newState };
  
  // Only notify if something actually changed
  if (JSON.stringify(oldState) !== JSON.stringify(currentState)) {
    logInfo(`[AuthStateManager] State changed: ${currentState.state} - ${currentState.user?.email || 'no user'}`);
    
    // Persist user info to localStorage for quick access
    if (currentState.user) {
      try {
        localStorage.setItem('userInfo', JSON.stringify(currentState.user));
      } catch (e) {
        // Ignore storage errors
      }
    }
    
    // Dispatch DOM event for components that use events
    if (typeof document !== 'undefined') {
      document.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { ...currentState }
      }));
      
      // Also dispatch userInfoUpdated for backward compatibility with sidebar
      if (currentState.user) {
        document.dispatchEvent(new CustomEvent('userInfoUpdated', {
          detail: { userInfo: currentState.user }
        }));
      }
    }
    
    notifyListeners();
  }
}

// ============================================================================
// Session Verification
// ============================================================================

/**
 * Check if OAuth callback is in progress
 */
function isOAuthInProgress(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check URL for OAuth parameters
  const urlHash = window.location.hash || '';
  const urlSearch = window.location.search || '';
  const hasOAuthParams = urlHash.includes('access_token') || 
                         urlHash.includes('code') ||
                         urlSearch.includes('code') ||
                         urlSearch.includes('access_token');
  if (hasOAuthParams) return true;
  
  // Check flags
  try {
    if (sessionStorage.getItem('oauthCallbackInProgress') === 'true') return true;
    if ((window as any).__oauthCallbackInProgress === true) return true;
  } catch (e) {
    // sessionStorage may not be available
  }
  
  return false;
}

/**
 * Verify current session with Supabase (async, authoritative)
 * This is the source of truth - it checks with the server
 */
export async function verifySession(): Promise<AuthStateInfo> {
  try {
    // If OAuth is in progress, wait for it to complete instead of checking
    if (isOAuthInProgress()) {
      logInfo('[AuthStateManager] OAuth in progress, deferring verification');
      // Return current state or loading state to prevent premature decisions
      if (currentState.state === 'authenticated' && currentState.user) {
        return getAuthState();
      }
      return { state: 'loading', user: null, isImpersonating: false };
    }
    
    // Ensure Supabase is initialized
    let supabase = getSupabase();
    if (!supabase) {
      await initSupabase();
      supabase = getSupabase();
    }
    
    if (!supabase) {
      updateState({ state: 'error', user: null, error: 'Failed to initialize auth' });
      return getAuthState();
    }
    
    // Get session from Supabase
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      logWarn('[AuthStateManager] Session error:', sessionError.message);
      updateState({ state: 'unauthenticated', user: null, error: sessionError.message });
      return getAuthState();
    }
    
    if (!session || !session.user) {
      updateState({ state: 'unauthenticated', user: null });
      return getAuthState();
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    
    if (expiresAt > 0 && expiresAt < now) {
      // Try to refresh
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshedSession) {
        logWarn('[AuthStateManager] Session expired and refresh failed');
        updateState({ state: 'unauthenticated', user: null });
        return getAuthState();
      }
      
      // Use refreshed session
      return await buildUserFromSession(supabase, refreshedSession);
    }
    
    return await buildUserFromSession(supabase, session);
    
  } catch (error: any) {
    logError('[AuthStateManager] Verify session error:', error);
    
    // On network error, check if we have cached state
    const cached = getCachedUser();
    if (cached) {
      logInfo('[AuthStateManager] Network error but cached session exists, using cache');
      updateState({ state: 'authenticated', user: cached });
      return getAuthState();
    }
    
    updateState({ state: 'error', user: null, error: error.message });
    return getAuthState();
  }
}

/**
 * Build user info from Supabase session
 */
async function buildUserFromSession(supabase: any, session: any): Promise<AuthStateInfo> {
  const user = session.user;
  const email = user.email?.toLowerCase() || '';
  
  // Start with basic user info from auth
  let authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.full_name || user.user_metadata?.name || email.split('@')[0],
    avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    provider: user.app_metadata?.provider || 'google',
  };
  
  // Fetch additional info from people table (role, department, etc.)
  try {
    const { data: peopleData, error: peopleError } = await supabase
      .from('people')
      .select('name, role, department, designation, team, team_supervisor, avatar_url')
      .eq('email', email)
      .maybeSingle();
    
    if (!peopleError && peopleData) {
      authUser = {
        ...authUser,
        name: peopleData.name || authUser.name,
        avatar: peopleData.avatar_url || authUser.avatar,
        role: peopleData.role || 'Employee',
        department: peopleData.department,
        designation: peopleData.designation,
        team: peopleData.team,
        team_supervisor: peopleData.team_supervisor,
      };
    }
  } catch (err) {
    // Non-critical, continue with basic user info
    logWarn('[AuthStateManager] Failed to fetch people data:', err);
  }
  
  // Check impersonation state
  const isImpersonating = sessionStorage.getItem('isImpersonating') === 'true';
  const impersonatorEmail = sessionStorage.getItem('impersonatorEmail') || undefined;
  
  updateState({
    state: 'authenticated',
    user: authUser,
    isImpersonating,
    impersonatorEmail,
    error: undefined,
  });
  
  return getAuthState();
}

/**
 * Get cached user from localStorage (fast, may be stale)
 */
function getCachedUser(): AuthUser | null {
  try {
    const cached = localStorage.getItem('userInfo');
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (parsed && parsed.id && parsed.email) {
      return parsed as AuthUser;
    }
  } catch (e) {
    // Invalid cache
  }
  return null;
}

// ============================================================================
// Setup Listeners
// ============================================================================

/**
 * Setup Supabase auth state listener
 * Called once on app initialization
 */
export function setupAuthListeners(): void {
  if (typeof window === 'undefined') return;
  
  // Setup Supabase listener (once)
  if (!supabaseListenerSetup) {
    supabaseListenerSetup = true;
    
    const setupSupabaseListener = () => {
      const supabase = getSupabase();
      if (!supabase) {
        // Retry after Supabase initializes
        setTimeout(setupSupabaseListener, 500);
        return;
      }
      
      supabase.auth.onAuthStateChange((event: string, session: any) => {
        logInfo('[AuthStateManager] Supabase event:', event);
        
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session?.user) {
              // Re-verify to get full user info
              verifySession();
            }
            break;
            
          case 'SIGNED_OUT':
            updateState({
              state: 'unauthenticated',
              user: null,
              isImpersonating: false,
              impersonatorEmail: undefined,
            });
            // Clean up localStorage
            try {
              localStorage.removeItem('userInfo');
            } catch (e) {}
            break;
            
          case 'USER_UPDATED':
            if (session?.user) {
              verifySession();
            }
            break;
        }
      });
    };
    
    setupSupabaseListener();
  }
  
  // Setup cross-tab listener (once)
  if (!crossTabListenerSetup) {
    crossTabListenerSetup = true;
    
    window.addEventListener('storage', (evt: StorageEvent) => {
      // userInfo changed in another tab
      if (evt.key === 'userInfo') {
        if (!evt.newValue) {
          // User logged out in another tab
          updateState({ state: 'unauthenticated', user: null });
        } else {
          try {
            const newUser = JSON.parse(evt.newValue);
            if (newUser && newUser.id && newUser.email) {
              // User changed in another tab - verify with server
              verifySession();
            }
          } catch (e) {
            // Invalid JSON, ignore
          }
        }
        return;
      }
      
      // Supabase token changed in another tab
      if (evt.key === 'supabase.auth.token') {
        // Re-verify session
        verifySession();
        return;
      }
      
      // Impersonation state changed
      if (evt.key === 'impersonationEnded' && evt.newValue === 'true') {
        // Another tab ended impersonation - reload this tab
        try {
          localStorage.removeItem('impersonationEnded');
        } catch (e) {}
        window.location.reload();
      }
    });
  }
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Clean up all auth state (for logout)
 */
export async function cleanupAuthState(): Promise<void> {
  // Clear localStorage
  const keysToRemove = [
    'userInfo',
    'supabase.auth.token',
    'authSessionVerified',
  ];
  
  // Also clear device fingerprints
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('device_fingerprint_')) {
      keysToRemove.push(key);
    }
  });
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  });
  
  // Clear sessionStorage auth items
  const sessionKeysToRemove = [
    'authSessionVerified',
    'loginJustCompleted',
    'oauthCallbackInProgress',
    'isNewDeviceLogin',
    'authDegradedMode',
    'redirectAfterLogin',
  ];
  
  sessionKeysToRemove.forEach(key => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
  });
  
  // Update state
  updateState({
    state: 'unauthenticated',
    user: null,
    isImpersonating: false,
    impersonatorEmail: undefined,
  });
}

/**
 * Clean up real-time subscriptions
 * Call this on logout to prevent stale subscriptions
 */
export function cleanupRealtimeSubscriptions(): void {
  const supabase = getSupabase();
  if (!supabase) return;
  
  try {
    // Remove all channels
    supabase.removeAllChannels();
    logInfo('[AuthStateManager] Cleaned up realtime subscriptions');
  } catch (err) {
    logWarn('[AuthStateManager] Failed to cleanup subscriptions:', err);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if user is authenticated (synchronous, from cache)
 */
export function isAuthenticated(): boolean {
  return currentState.state === 'authenticated' && currentState.user !== null;
}

/**
 * Get current user (synchronous, from cache)
 */
export function getCurrentUser(): AuthUser | null {
  return currentState.user;
}

/**
 * Check if current session is impersonated
 */
export function isImpersonating(): boolean {
  return currentState.isImpersonating;
}

/**
 * Require authentication - redirects to login if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const state = await verifySession();
  
  if (state.state !== 'authenticated' || !state.user) {
    // Store current path for redirect after login
    try {
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath && !currentPath.includes('auth-page')) {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
    } catch (e) {}
    
    // Redirect to login
    window.location.href = '/src/auth/presentation/auth-page.html';
    throw new Error('Authentication required');
  }
  
  return state.user;
}

// ============================================================================
// API Error Handling
// ============================================================================

/**
 * Handle 401 errors from API calls
 * Call this when an API returns 401 to trigger re-auth
 */
export async function handle401Error(): Promise<void> {
  logWarn('[AuthStateManager] Handling 401 error - verifying session');
  
  const state = await verifySession();
  
  if (state.state !== 'authenticated') {
    // Session is actually invalid - redirect to login
    try {
      const currentPath = window.location.pathname + window.location.search;
      if (currentPath && !currentPath.includes('auth-page')) {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
      }
    } catch (e) {}
    
    window.location.href = '/src/auth/presentation/auth-page.html';
  } else {
    // Session is valid, token might just have refreshed
    // The caller should retry their request
    logInfo('[AuthStateManager] Session is valid after 401, caller should retry');
  }
}

// ============================================================================
// Initialize
// ============================================================================

/**
 * Initialize auth state manager
 * Should be called early in app lifecycle
 */
export async function initAuthStateManager(): Promise<AuthStateInfo> {
  // Load cached user immediately for fast UI
  const cached = getCachedUser();
  if (cached) {
    updateState({ state: 'authenticated', user: cached });
  }
  
  // Setup listeners
  setupAuthListeners();
  
  // Verify with server
  return await verifySession();
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  // Make available globally for debugging
  (window as any).authStateManager = {
    getAuthState,
    verifySession,
    isAuthenticated,
    getCurrentUser,
    handle401Error,
  };
}
