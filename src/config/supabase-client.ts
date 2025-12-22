/**
 * Supabase Client for Browser Usage
 * This version works directly in the browser without build step
 */

import { supabaseLogger } from '../utils/logger.js';

// This will be compiled to JavaScript and can be used directly in HTML
let supabaseClient: any = null;

/**
 * Initialize Supabase client
 * Call this function after the page loads
 */
export async function initSupabaseClient(): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Try to get config from window.env (set by server)
    const env = (window as any).env || {};
    const supabaseUrl = env.SUPABASE_URL || '';
    const supabaseAnonKey = env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      supabaseLogger.warn('Configuration missing. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your .env file');
      supabaseLogger.debug('Available env keys:', Object.keys(env));
      return;
    }

    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch (urlError) {
      supabaseLogger.error(`Invalid Supabase URL format: ${supabaseUrl}`);
      return;
    }

    supabaseLogger.info('Starting initialization...');
    supabaseLogger.debug(`URL: ${supabaseUrl.substring(0, 30)}...`);
    supabaseLogger.debug(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);

    // Dynamic import for Supabase (works in browser)
    const { createClient } = await import('@supabase/supabase-js');
    supabaseLogger.debug('Supabase library loaded');
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'supabase.auth.token',
      },
    });

    supabaseLogger.info('Client created successfully');
    
    // Test connection
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      supabaseLogger.info('Connection test successful');
      supabaseLogger.debug(`Session status: ${session ? 'Active session found' : 'No active session'}`);
    } catch (testError) {
      supabaseLogger.warn('Connection test failed, but client may still work');
    }

    supabaseLogger.info('Initialization completed successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    supabaseLogger.error('Failed to initialize:', errorMessage);
    if (error instanceof Error && error.stack) {
      supabaseLogger.debug('Stack trace:', error.stack);
    }
  }
}

/**
 * Get Supabase client instance
 * @returns Supabase client or null if not initialized
 */
export function getSupabaseClient(): any {
  return supabaseClient;
}

// Auto-initialize when module loads (if in browser)
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupabaseClient);
  } else {
    initSupabaseClient();
  }
}

