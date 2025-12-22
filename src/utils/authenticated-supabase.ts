/**
 * Authenticated Supabase Helper
 * 
 * CRITICAL: This is the ONLY way to access Supabase in the application.
 * ALL Supabase calls MUST go through this helper to ensure authentication.
 * 
 * This helper enforces authentication on every database operation,
 * preventing any unauthenticated calls from being made.
 * 
 * Usage:
 *   import { getAuthenticatedSupabase } from './utils/authenticated-supabase.js';
 *   const supabase = await getAuthenticatedSupabase();
 *   const { data, error } = await supabase.from('users').select('*');
 */

import { getSupabase, initSupabase } from './supabase-init.js';
import { createLogger } from './logger.js';
import { verifyAuth, clearAuthCache as clearCache, initializeAuthStateListener } from './authenticated-supabase-auth.js';
import { createAuthenticatedClient } from './authenticated-supabase-wrappers.js';

const logger = createLogger('AuthenticatedSupabase');

// Re-export for convenience
export { clearAuthCache } from './authenticated-supabase-auth.js';

// Initialize auth state listener on module load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initializeAuthStateListener();
    });
  } else {
    initializeAuthStateListener();
  }
}

/**
 * Get authenticated Supabase client
 * 
 * This is the ONLY way to access Supabase in the application.
 * It automatically verifies authentication before returning the client.
 * 
 * @throws Error if user is not authenticated
 * @returns Authenticated Supabase client wrapper
 */
export async function getAuthenticatedSupabase(): Promise<any> {
  // Ensure Supabase is initialized
  const supabase = getSupabase();
  if (!supabase) {
    await initSupabase();
    const retrySupabase = getSupabase();
    if (!retrySupabase) {
      throw new Error('Failed to initialize Supabase client');
    }
  }

  // Verify authentication
  const auth = await verifyAuth();
  
  if (!auth.isAuthenticated) {
    const error = new Error(`Authentication required: ${auth.error || 'User not authenticated'}`);
    (error as any).code = 'AUTH_REQUIRED';
    (error as any).authError = auth.error;
    logger.warn('Authentication required but user not authenticated:', auth.error);
    throw error;
  }

  logger.debug(`Authenticated Supabase access (user: ${auth.userId})`);
  
  // Return wrapped client that enforces authentication
  return createAuthenticatedClient(getSupabase()!, auth);
}

/**
 * Check if user is authenticated
 */
export async function isUserAuthenticated(): Promise<boolean> {
  const auth = await verifyAuth();
  return auth.isAuthenticated;
}

/**
 * Get current authenticated user ID
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const auth = await verifyAuth();
  return auth.userId;
}

