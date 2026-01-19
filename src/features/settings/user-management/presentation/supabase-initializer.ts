/**
 * Supabase Initializer
 * Initializes Supabase client for the user management page
 */

import { initSupabase } from '../../../../utils/supabase-init.js';
import { getSecureSupabase } from '../../../../utils/secure-supabase.js';

/**
 * Initialize Supabase immediately when page loads
 * Sets up secure client on window.supabaseClient (required by DatabaseFactory)
 */
export async function initializeSupabaseForPage(): Promise<void> {
  try {
    // Initialize base Supabase client
    await initSupabase();

    // Set up secure client on window.supabaseClient (required by DatabaseFactory)
    const secureClient = await getSecureSupabase(false); // Don't require auth initially (will check on each DB op)
    const win = window as any;
    win.supabaseClient = secureClient;

    // Signal that Supabase is ready
    win.supabaseReady = true;
    window.dispatchEvent(new CustomEvent('supabaseReady'));
  } catch (error) {
    // Error logged by initSupabase/getSecureSupabase
    console.error('[SupabaseInitializer] Failed to initialize Supabase:', error);
  }
}

// Auto-initialize when module loads
initializeSupabaseForPage();
