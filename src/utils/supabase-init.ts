/**
 * Supabase Initialization Utility
 * Initializes Supabase client from environment variables exposed by server
 */

import { supabaseLogger } from './logger.js';

let supabaseInstance: any = null;

/**
 * Initialize Supabase client from server environment
 * This fetches the config from /api/env endpoint
 */
export async function initSupabase(): Promise<any> {
  if (supabaseInstance) {
    supabaseLogger.debug('Client already initialized, returning existing instance');
    return supabaseInstance;
  }

  supabaseLogger.info('Starting initialization...');

  try {
    // Fetch environment variables from server
    const response = await fetch('/api/env');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch environment variables: ${response.status} ${response.statusText}`);
    }
    
    const env = await response.json();
    supabaseLogger.debug('Environment variables fetched from server');

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      const error = 'Supabase configuration not found. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your .env file';
      supabaseLogger.error('Initialization failed:', error);
      supabaseLogger.debug('Available env keys:', Object.keys(env));
      return null;
    }

    // Validate URL format
    try {
      new URL(env.SUPABASE_URL);
    } catch (urlError) {
      const error = `Invalid Supabase URL format: ${env.SUPABASE_URL}`;
      supabaseLogger.error('Initialization failed:', error);
      return null;
    }

    supabaseLogger.debug(`URL: ${env.SUPABASE_URL.substring(0, 30)}...`);
    supabaseLogger.debug(`Anon Key: ${env.SUPABASE_ANON_KEY.substring(0, 20)}...`);

    // Dynamic import of Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    supabaseLogger.debug('Supabase client library loaded');

    supabaseInstance = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token',
      },
    });

    supabaseLogger.info('Client created successfully');
    
    // Test connection by checking auth state
    try {
      const { data: { session } } = await supabaseInstance.auth.getSession();
      supabaseLogger.info('Connection test successful');
      supabaseLogger.debug(`Session status: ${session ? 'Active session found' : 'No active session'}`);
    } catch (testError) {
      supabaseLogger.warn('Connection test failed, but client may still work', testError);
    }

    supabaseLogger.info('Initialization completed successfully');
    return supabaseInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    supabaseLogger.error('Initialization failed:', errorMessage);
    if (error instanceof Error && error.stack) {
      supabaseLogger.debug('Stack trace:', error.stack);
    }
    return null;
  }
}

/**
 * Get Supabase client instance
 * @returns Supabase client or null if not initialized
 */
export function getSupabase(): any {
  if (!supabaseInstance) {
    supabaseLogger.warn('Client not initialized. Call initSupabase() first.');
  }
  return supabaseInstance;
}

/**
 * Check if Supabase is initialized
 * @returns true if initialized, false otherwise
 */
export function isSupabaseInitialized(): boolean {
  return supabaseInstance !== null;
}

/**
 * Get initialization status with details
 * @returns Status object with initialization state and details
 */
export function getSupabaseStatus(): { initialized: boolean; hasClient: boolean } {
  return {
    initialized: supabaseInstance !== null,
    hasClient: supabaseInstance !== null
  };
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).initSupabase = initSupabase;
  (window as any).getSupabase = getSupabase;
}

