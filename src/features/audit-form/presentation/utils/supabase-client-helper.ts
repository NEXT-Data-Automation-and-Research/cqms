/**
 * Supabase Client Helper
 * Provides authenticated Supabase client access
 * Migrated from audit-form.html
 */

import { getAuthenticatedSupabase } from '../../../../utils/authenticated-supabase.js';
import { logError, logWarn } from '../../../../utils/logging-helper.js';

/**
 * Get authenticated Supabase client
 * Replaces window.supabaseClient usage
 */
export async function getSupabaseClient() {
  try {
    return await getAuthenticatedSupabase();
  } catch (error) {
    logError('Error getting authenticated Supabase client:', error);
    
    // Fallback: Check if window.supabaseClient exists (for debugging)
    if (typeof window !== 'undefined' && (window as any).supabaseClient) {
      logWarn('Using fallback Supabase client (auth may fail)');
      return (window as any).supabaseClient;
    }
    
    throw error;
  }
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

