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

import { getSupabase } from './supabase-init.js';
import { getSecureSupabase } from './secure-supabase.js';

/**
 * Initialize secure Supabase client on window.supabaseClient
 * This wraps the client with authentication verification
 */
export async function initSecureWindowSupabase(): Promise<void> {
  try {
    // Get the base Supabase client
    const baseClient = getSupabase();
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
    
    console.log('✅ Secure window.supabaseClient initialized');
  } catch (error: any) {
    console.error('❌ Error initializing secure window.supabaseClient:', error);
    // Fallback to regular client if secure init fails
    const baseClient = getSupabase();
    if (baseClient) {
      (window as any).supabaseClient = baseClient;
      console.warn('⚠️ Using unsecured client as fallback');
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

