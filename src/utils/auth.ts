/**
 * Authentication Utility - Main Export
 * Modular authentication system with separate concerns
 * 
 * This file re-exports all authentication functions from their respective modules:
 * - auth-core.ts: Core authentication functions
 * - auth-oauth.ts: OAuth sign-in and callback handling
 * - auth-device.ts: Device fingerprinting and validation
 * - auth-user-profile.ts: User profile management
 * - auth-dev-bypass.ts: Development bypass functionality
 * - auth-state-manager.ts: Unified auth state management
 */

// Core authentication functions
export {
  signOut,
  getCurrentSupabaseUser,
  checkSupabaseAuthentication,
  getUserInfo,
} from './auth-core.js';

// OAuth functions
export {
  signInWithGoogle,
  handleGoogleOAuthCallback,
} from './auth-oauth.js';

// Device fingerprinting
export {
  generateDeviceFingerprint,
  validateDeviceFingerprint,
  storeDeviceFingerprint,
  clearDeviceFingerprints,
  isNewDeviceLogin,
} from './auth-device.js';

// User profile management
export {
  saveUserProfileToDatabase,
} from './auth-user-profile.js';

// Dev bypass (development only)
export {
  enableDevBypassAuthentication,
  isDevBypassActive,
} from './auth-dev-bypass.js';

// Auth state manager (unified state management)
export {
  getAuthState,
  onAuthStateChange,
  verifySession,
  isAuthenticated as isAuthenticatedSync,
  getCurrentUser,
  isImpersonating,
  requireAuth,
  handle401Error,
  initAuthStateManager,
  cleanupAuthState,
  cleanupRealtimeSubscriptions,
} from './auth-state-manager.js';

export type { AuthUser, AuthState, AuthStateInfo } from './auth-state-manager.js';
