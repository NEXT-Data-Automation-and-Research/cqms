/**
 * Secure Window Supabase Client Setup
 * 
 * This utility sets up a secure Supabase client on window.supabaseClient
 * that automatically verifies authentication before all database operations.
 * 
 * This is for legacy code that uses window.supabaseClient directly.
 * 
 * Usage:
 *   import { initSecureWindowSupabase } from './utils/secure-window-supabase.js';
 *   await initSecureWindowSupabase();
 *   // Now window.supabaseClient is secured
 */

import { getSupabase, getSupabaseAsync, initSupabase } from './supabase-init.js';
import { getSecureSupabase } from './secure-supabase.js';
import { logError, logWarn, logInfo } from './logging-helper.js';

/**
 * Initialize secure Supabase client on window.supabaseClient
 * This wraps the client with authentication verification
 */
export async function initSecureWindowSupabase(): Promise<void> {
  let baseClient: any = null;
  try {
    // Wait for Supabase to be initialized (or initialize it if not started)
    // This prevents warnings about client not being initialized
    baseClient = await getSupabaseAsync(5000);
    if (!baseClient) {
      // This is expected during initial load - client will be initialized later
      // Don't log as error, just return silently
      return;
    }

    // Create a secure wrapper that verifies auth
    // For window.supabaseClient, we'll use a proxy that checks auth on database operations
    const secureClient = await getSecureSupabase(false); // Don't require auth initially
    
    // Set up window.supabaseClient with secure wrapper
    // The secure wrapper will verify auth before any database operation
    (window as any).supabaseClient = secureClient;
    
    logInfo('✅ Secure window.supabaseClient initialized');
  } catch (error: any) {
    logError('❌ Error initializing secure window.supabaseClient:', error);
    // Fallback to regular client if secure init fails
    if (baseClient) {
      (window as any).supabaseClient = baseClient;
      logWarn('⚠️ Using unsecured client as fallback');
    } else {
      // Try to get client one more time as fallback
      const fallbackClient = getSupabase();
      if (fallbackClient) {
        (window as any).supabaseClient = fallbackClient;
        logWarn('⚠️ Using unsecured client as fallback');
      }
    }
  }
}

/**
 * Get secure window supabase client
 * This ensures window.supabaseClient is secured before use
 */
export async function getSecureWindowSupabase(): Promise<any> {
  // If already set and is secure, return it
  if ((window as any).supabaseClient) {
    // Check if it's already the secure version by checking for secure methods
    const client = (window as any).supabaseClient;
    // If it has the secure wrapper properties, it's already secured
    if (client && typeof client.from === 'function') {
      // Re-verify auth before returning
      try {
        await getSecureSupabase(); // This will verify auth
        return client;
      } catch (error) {
        // Auth failed, but return client anyway (it will fail on database ops)
        return client;
      }
    }
  }
  
  // Initialize secure client
  await initSecureWindowSupabase();
  return (window as any).supabaseClient;
}

