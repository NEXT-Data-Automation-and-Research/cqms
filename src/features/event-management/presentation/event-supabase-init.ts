/**
 * Event Management - Supabase Initialization
 * Initializes Supabase client for event management page
 */

import { initSupabase } from '../../../utils/supabase-init.js';
import { getSecureSupabase } from '../../../utils/secure-supabase.js';

/**
 * Initialize Supabase immediately when page loads
 * Sets up both base client and secure client for DatabaseFactory
 */
export async function initializeEventSupabase(): Promise<void> {
  try {
    // Initialize base Supabase client
    await initSupabase();
    
    // Set up secure client on window.supabaseClient (required by DatabaseFactory)
    const secureClient = await getSecureSupabase(false); // Don't require auth initially (will check on each DB op)
    (window as any).supabaseClient = secureClient;
    
    // Signal that Supabase is ready
    (window as any).supabaseReady = true;
    window.dispatchEvent(new CustomEvent('supabaseReady'));
  } catch (error) {
    // Error logged by initSupabase/getSecureSupabase
    console.error('[EventSupabaseInit] Failed to initialize Supabase:', error);
  }
}

// Auto-initialize when module loads
initializeEventSupabase();
