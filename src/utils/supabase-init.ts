/**
 * Supabase Initialization Utility
 * Initializes Supabase client from environment variables exposed by server
 * 
 * RELIABILITY IMPROVEMENTS:
 * - Retry mechanism with exponential backoff for /api/env fetch
 * - Longer timeouts to handle slow networks
 * - Graceful handling of temporary failures
 */

import { supabaseLogger } from './logger.js';

let supabaseInstance: any = null;
let initializationPromise: Promise<any> | null = null;

// Configuration for retry behavior
const INIT_CONFIG = {
  maxRetries: 3,
  initialRetryDelayMs: 500,
  maxRetryDelayMs: 3000,
  fetchTimeoutMs: 10000, // 10 seconds per fetch attempt
};

/**
 * Fetch with timeout to prevent hanging requests
 */
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Fetch environment with retry and exponential backoff
 */
async function fetchEnvWithRetry(): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < INIT_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential backoff with jitter
        const delay = Math.min(
          INIT_CONFIG.initialRetryDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200,
          INIT_CONFIG.maxRetryDelayMs
        );
        supabaseLogger.info(`Retry attempt ${attempt + 1}/${INIT_CONFIG.maxRetries} after ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      const response = await fetchWithTimeout('/api/env', INIT_CONFIG.fetchTimeoutMs);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch environment variables: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      lastError = error;
      supabaseLogger.warn(`Fetch attempt ${attempt + 1} failed:`, error.message);
      
      // Don't retry on 4xx errors (client errors)
      if (error.message?.includes('4')) {
        break;
      }
    }
  }
  
  throw lastError || new Error('Failed to fetch environment after retries');
}

/**
 * Initialize Supabase client from server environment
 * This fetches the config from /api/env endpoint
 * Prevents multiple simultaneous initializations
 * Includes retry mechanism for reliability
 */
export async function initSupabase(): Promise<any> {
  // If already initialized, return immediately
  if (supabaseInstance) {
    supabaseLogger.debug('Client already initialized, returning existing instance');
    return supabaseInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    supabaseLogger.debug('Initialization in progress, waiting for existing promise...');
    try {
      return await initializationPromise;
    } catch (error) {
      // If previous initialization failed, allow retry
      supabaseLogger.debug('Previous initialization failed, retrying...');
      initializationPromise = null;
    }
  }

  supabaseLogger.info('Starting initialization...');
  
  // Create initialization promise (atomic assignment to prevent race conditions)
  initializationPromise = (async () => {

  try {
    // Fetch environment variables from server with retry
    const env = await fetchEnvWithRetry();
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
    
    // Store URL and public app URL globally so other components (auth OAuth, modals) can access them
    if (typeof window !== 'undefined') {
      (window as any).SUPABASE_URL = env.SUPABASE_URL;
      (window as any).envConfig = (window as any).envConfig || {};
      (window as any).envConfig.SUPABASE_URL = env.SUPABASE_URL;
      if (env.PUBLIC_APP_URL) {
        (window as any).envConfig.PUBLIC_APP_URL = env.PUBLIC_APP_URL;
      }
      // Also cache in localStorage for reliability
      try {
        localStorage.setItem('supabase_url', env.SUPABASE_URL);
      } catch (e) {
        // localStorage might not be available
      }
    }

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
    
    // Signal that Supabase is ready
    if (typeof window !== 'undefined') {
      (window as any).supabaseReady = true;
      window.dispatchEvent(new CustomEvent('supabaseReady'));
    }
    
    return supabaseInstance;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    supabaseLogger.error('Initialization failed:', errorMessage);
    if (error instanceof Error && error.stack) {
      supabaseLogger.debug('Stack trace:', error.stack);
    }
    // Clear promise on error so retry is possible
    initializationPromise = null;
    return null;
  }
  })();
  
  return initializationPromise;
}

/**
 * Get Supabase client instance
 * @returns Supabase client or null if not initialized
 */
export function getSupabase(): any {
  if (!supabaseInstance) {
    // Only warn if initialization is not in progress
    // This prevents spam warnings during async initialization
    if (!initializationPromise) {
      supabaseLogger.warn('Client not initialized. Call initSupabase() first.');
    }
  }
  return supabaseInstance;
}

/**
 * Get Supabase client instance, waiting for initialization if in progress
 * @param maxWaitMs Maximum time to wait for initialization (default: 15000ms - increased for reliability)
 * @returns Supabase client or null if initialization fails or times out
 */
export async function getSupabaseAsync(maxWaitMs: number = 15000): Promise<any> {
  // If already initialized, return immediately
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // If initialization is in progress, wait for it
  if (initializationPromise) {
    const startTime = Date.now();
    try {
      const result = await Promise.race([
        initializationPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout waiting for Supabase initialization')), maxWaitMs)
        )
      ]);
      return result;
    } catch (error) {
      if (Date.now() - startTime >= maxWaitMs) {
        supabaseLogger.warn('Timeout waiting for Supabase initialization after', maxWaitMs, 'ms');
        
        // If we have a cached session, don't give up completely
        // This prevents locking out users who have valid sessions
        if (typeof window !== 'undefined') {
          const cachedSession = localStorage.getItem('supabase.auth.token');
          if (cachedSession) {
            supabaseLogger.info('Found cached session, retrying initialization...');
            initializationPromise = null; // Reset for retry
            try {
              return await initSupabase();
            } catch (retryError) {
              supabaseLogger.warn('Retry also failed:', retryError);
            }
          }
        }
      }
      return null;
    }
  }

  // Not initialized and not in progress - try to initialize
  try {
    return await initSupabase();
  } catch (error) {
    supabaseLogger.warn('Failed to initialize Supabase:', error);
    return null;
  }
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

