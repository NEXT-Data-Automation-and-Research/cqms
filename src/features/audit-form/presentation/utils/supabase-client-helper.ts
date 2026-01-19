/**
 * Supabase Client Helper
 * Provides authenticated Supabase client access
 * Migrated from audit-form.html
 */

import { logError, logWarn } from '../../../../utils/logging-helper.js';

/**
 * Get authenticated Supabase client
 * Returns the raw Supabase client from window.supabaseClient
 * The client should already be authenticated via the page's auth flow
 */
export async function getSupabaseClient() {
  // Wait for window.supabaseClient to be available
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max

  while (attempts < maxAttempts) {
    const client = (window as any).supabaseClient;
    if (client) {
      // Verify we have a session
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session) {
          return client;
        }
      } catch (e) {
        logWarn('Error checking session:', e);
      }
    }
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Fallback to raw client even without verified session
  const fallbackClient = (window as any).supabaseClient;
  if (fallbackClient) {
    logWarn('Using Supabase client without verified session');
    return fallbackClient;
  }

  throw new Error('Supabase client not available');
}

/**
 * Wait for Supabase to be ready
 * Used for initialization timing
 */
export async function waitForSupabaseReady(maxWait = 10000): Promise<boolean> {
  // Check if already ready
  if (typeof window !== 'undefined' && 
      (window as any).supabaseClient && 
      (window as any).supabaseClientReady) {
    return true;
  }

  // Wait for ready event
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      logWarn('Timeout waiting for Supabase ready event');
      resolve(false);
    }, maxWait);

    const checkReady = () => {
      if (typeof window !== 'undefined' && 
          (window as any).supabaseClient && 
          (window as any).supabaseClientReady) {
        clearTimeout(timeout);
        window.removeEventListener('supabaseClientReady', checkReady);
        window.removeEventListener('supabaseReady', checkReady);
        resolve(true);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('supabaseClientReady', checkReady);
      window.addEventListener('supabaseReady', checkReady);

      // Also check immediately in case event already fired
      if ((window as any).supabaseClient && (window as any).supabaseClientReady) {
        clearTimeout(timeout);
        window.removeEventListener('supabaseClientReady', checkReady);
        window.removeEventListener('supabaseReady', checkReady);
        resolve(true);
      }
    }
  });
}

