/**
 * Auth Coordinator
 * 
 * Centralized coordination for authentication transitions.
 * Prevents race conditions by allowing components to:
 * 1. Check if auth is in a transitional state (login, logout, refresh)
 * 2. Pause background operations during auth transitions
 * 3. Queue operations to run after auth stabilizes
 * 
 * This addresses scenarios:
 * - Background refresh during auth check (Scenario 28-32)
 * - Realtime subscription auth failures (Scenario 22-27)
 * - Multi-tab auth synchronization (Scenario 15-21)
 */

import { logInfo, logWarn } from './logging-helper.js';

// ============================================================================
// Types
// ============================================================================

export type AuthTransitionState = 
  | 'stable'           // Normal authenticated or unauthenticated state
  | 'oauth_callback'   // Processing OAuth callback
  | 'login_completing' // Login just completed, finalizing
  | 'logging_out'      // Logout in progress
  | 'refreshing_token' // Token refresh in progress
  | 'impersonating'    // Impersonation in progress
  | 'cache_clearing';  // Cache clear in progress

export interface AuthCoordinatorState {
  transition: AuthTransitionState;
  since: number;
  reason?: string;
}

type TransitionListener = (state: AuthCoordinatorState) => void;

// ============================================================================
// State
// ============================================================================

let currentState: AuthCoordinatorState = {
  transition: 'stable',
  since: Date.now(),
};

const listeners: Set<TransitionListener> = new Set();
const pendingOperations: Array<() => void> = [];

// Transition timeout - if stuck in transitional state for too long, auto-recover
const TRANSITION_TIMEOUT_MS = 30000; // 30 seconds
let transitionTimeoutId: number | null = null;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get current auth transition state
 */
export function getAuthTransitionState(): AuthCoordinatorState {
  return { ...currentState };
}

/**
 * Check if auth is currently in a transitional state
 * Use this before making API calls or auth decisions
 */
export function isAuthTransitioning(): boolean {
  return currentState.transition !== 'stable';
}

/**
 * Check if it's safe to make API calls
 * Returns false during login/logout transitions
 */
export function isSafeForApiCalls(): boolean {
  const unsafeStates: AuthTransitionState[] = [
    'oauth_callback',
    'login_completing', 
    'logging_out',
    'impersonating',
    'cache_clearing',
  ];
  return !unsafeStates.includes(currentState.transition);
}

/**
 * Check if it's safe to redirect
 * Returns false during active transitions
 */
export function isSafeToRedirect(): boolean {
  const blockRedirectStates: AuthTransitionState[] = [
    'oauth_callback',
    'login_completing',
    'impersonating',
  ];
  return !blockRedirectStates.includes(currentState.transition);
}

/**
 * Start an auth transition
 * @param transition The transition type
 * @param reason Optional reason for logging
 */
export function startAuthTransition(
  transition: AuthTransitionState,
  reason?: string
): void {
  if (transition === 'stable') {
    endAuthTransition();
    return;
  }
  
  const previousState = currentState.transition;
  currentState = {
    transition,
    since: Date.now(),
    reason,
  };
  
  logInfo(`[AuthCoordinator] Transition: ${previousState} -> ${transition}${reason ? ` (${reason})` : ''}`);
  
  // Set up auto-recovery timeout
  if (transitionTimeoutId) {
    clearTimeout(transitionTimeoutId);
  }
  transitionTimeoutId = window.setTimeout(() => {
    if (currentState.transition !== 'stable') {
      logWarn(`[AuthCoordinator] Transition timeout - auto-recovering from ${currentState.transition}`);
      endAuthTransition();
    }
  }, TRANSITION_TIMEOUT_MS);
  
  // Notify listeners
  notifyListeners();
  
  // Also set legacy flags for backward compatibility
  setLegacyFlags(transition, true);
}

/**
 * End the current auth transition
 */
export function endAuthTransition(): void {
  const previousState = currentState.transition;
  
  if (previousState === 'stable') {
    return; // Already stable
  }
  
  // Clear legacy flags
  setLegacyFlags(previousState, false);
  
  currentState = {
    transition: 'stable',
    since: Date.now(),
  };
  
  logInfo(`[AuthCoordinator] Transition ended: ${previousState} -> stable`);
  
  // Clear timeout
  if (transitionTimeoutId) {
    clearTimeout(transitionTimeoutId);
    transitionTimeoutId = null;
  }
  
  // Notify listeners
  notifyListeners();
  
  // Execute pending operations
  executePendingOperations();
}

/**
 * Subscribe to transition state changes
 */
export function onAuthTransitionChange(listener: TransitionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Queue an operation to run when auth becomes stable
 * If already stable, runs immediately
 */
export function whenAuthStable(operation: () => void): void {
  if (!isAuthTransitioning()) {
    operation();
  } else {
    pendingOperations.push(operation);
  }
}

/**
 * Wait for auth to become stable (promise-based)
 * @param timeoutMs Maximum time to wait
 */
export function waitForAuthStable(timeoutMs: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isAuthTransitioning()) {
      resolve();
      return;
    }
    
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (!isAuthTransitioning()) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        reject(new Error('Auth transition timeout'));
      }
    }, 100);
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function notifyListeners(): void {
  const state = getAuthTransitionState();
  listeners.forEach(listener => {
    try {
      listener(state);
    } catch (err) {
      logWarn('[AuthCoordinator] Listener error:', err);
    }
  });
}

function executePendingOperations(): void {
  const operations = [...pendingOperations];
  pendingOperations.length = 0;
  
  operations.forEach(op => {
    try {
      op();
    } catch (err) {
      logWarn('[AuthCoordinator] Pending operation error:', err);
    }
  });
}

/**
 * Set legacy session storage flags for backward compatibility
 */
function setLegacyFlags(transition: AuthTransitionState, active: boolean): void {
  try {
    if (transition === 'oauth_callback') {
      if (active) {
        sessionStorage.setItem('oauthCallbackInProgress', 'true');
        (window as any).__oauthCallbackInProgress = true;
      } else {
        sessionStorage.removeItem('oauthCallbackInProgress');
        delete (window as any).__oauthCallbackInProgress;
      }
    } else if (transition === 'login_completing') {
      if (active) {
        sessionStorage.setItem('loginJustCompleted', 'true');
      } else {
        sessionStorage.removeItem('loginJustCompleted');
      }
    } else if (transition === 'cache_clearing') {
      if (active) {
        sessionStorage.setItem('cacheReloadInProgress', 'true');
        (window as any).__cacheReloadInProgress = true;
      } else {
        sessionStorage.removeItem('cacheReloadInProgress');
        delete (window as any).__cacheReloadInProgress;
      }
    }
  } catch (e) {
    // sessionStorage may not be available
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize coordinator by checking for existing transition flags
 */
export function initAuthCoordinator(): void {
  try {
    // Check for existing transition flags from page reload
    if (sessionStorage.getItem('oauthCallbackInProgress') === 'true' ||
        (window as any).__oauthCallbackInProgress) {
      // Check URL for OAuth params - if present, we're still in OAuth flow
      const urlHash = window.location.hash || '';
      const urlSearch = window.location.search || '';
      const hasOAuthParams = urlHash.includes('access_token') || 
                             urlHash.includes('code') ||
                             urlSearch.includes('code') ||
                             urlSearch.includes('access_token');
      if (hasOAuthParams) {
        currentState = {
          transition: 'oauth_callback',
          since: Date.now(),
          reason: 'Restored from page load',
        };
      } else {
        // Clear stale flag
        sessionStorage.removeItem('oauthCallbackInProgress');
        delete (window as any).__oauthCallbackInProgress;
      }
    }
    
    if (sessionStorage.getItem('loginJustCompleted') === 'true') {
      currentState = {
        transition: 'login_completing',
        since: Date.now(),
        reason: 'Restored from page load',
      };
      // Auto-clear after 5 seconds
      setTimeout(() => {
        if (currentState.transition === 'login_completing') {
          endAuthTransition();
        }
      }, 5000);
    }
    
    if (sessionStorage.getItem('cacheReloadInProgress') === 'true' ||
        (window as any).__cacheReloadInProgress) {
      currentState = {
        transition: 'cache_clearing',
        since: Date.now(),
        reason: 'Restored from page load',
      };
    }
  } catch (e) {
    // Ignore initialization errors
  }
}

// Auto-initialize
if (typeof window !== 'undefined') {
  initAuthCoordinator();
  
  // Make available globally for debugging
  (window as any).authCoordinator = {
    getState: getAuthTransitionState,
    isTransitioning: isAuthTransitioning,
    isSafeForApiCalls,
    isSafeToRedirect,
    startTransition: startAuthTransition,
    endTransition: endAuthTransition,
  };
}
