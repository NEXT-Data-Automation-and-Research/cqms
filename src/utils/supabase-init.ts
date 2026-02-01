/**
 * Supabase Initialization Utility
 * Initializes Supabase client from environment variables exposed by server
 * 
 * RELIABILITY IMPROVEMENTS:
 * - Retry mechanism with exponential backoff for /api/env fetch
 * - Longer timeouts to handle slow networks
 * - Graceful handling of temporary failures
 * - Thread-safe initialization with proper race condition handling
 * - Designed for multi-user environments (each browser tab = one user)
 * 
 * NOTE: This is CLIENT-SIDE code. Each user has their own browser tab,
 * so the singleton pattern is appropriate here. The Supabase client
 * automatically handles session management per-tab.
 */

import { supabaseLogger } from './logger.js';

// Client instance - singleton per browser tab (safe for client-side)
let supabaseInstance: any = null;

// Initialization state tracking
let initializationPromise: Promise<any> | null = null;
let initializationAttempts = 0;
const MAX_INIT_ATTEMPTS = 5;

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
 * 
 * THREAD-SAFETY:
 * - Uses promise-based locking to prevent race conditions
 * - Only one initialization can run at a time
 * - Failed initializations can be retried
 * - Tracks attempts to prevent infinite retry loops
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
    return initializationPromise;
  }

  // Check if we've exceeded max attempts
  if (initializationAttempts >= MAX_INIT_ATTEMPTS) {
    supabaseLogger.error(`Initialization failed after ${MAX_INIT_ATTEMPTS} attempts`);
    return null;
  }

  initializationAttempts++;
  supabaseLogger.info(`Starting initialization (attempt ${initializationAttempts}/${MAX_INIT_ATTEMPTS})...`);
  
  // Create initialization promise
  initializationPromise = performInitialization();
  
  try {
    const result = await initializationPromise;
    return result;
  } finally {
    // Always clear the promise when done (success or failure)
    // This allows retries on failure while preventing concurrent runs
    initializationPromise = null;
  }
}

/**
 * Internal initialization logic - separated for cleaner error handling
 */
async function performInitialization(): Promise<any> {
  try {
    // Fetch environment variables from server with retry
    const env = await fetchEnvWithRetry();
    supabaseLogger.debug('Environment variables fetched from server');

    // Support legacy/alternative key names in the server response.
    const supabaseUrl =
      env.SUPABASE_URL ||
      env.NEXT_PUBLIC_SUPABASE_URL ||
      env.VITE_SUPABASE_URL ||
      env.PUBLIC_SUPABASE_URL ||
      (typeof window !== 'undefined' ? localStorage.getItem('supabase_url') : null);
    const supabaseAnonKey =
      env.SUPABASE_ANON_KEY ||
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      env.VITE_SUPABASE_ANON_KEY ||
      env.PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      const error = 'Supabase configuration not found. Please configure SUPABASE_URL and SUPABASE_ANON_KEY in your .env file';
      supabaseLogger.error('Initialization failed:', error);
      supabaseLogger.debug('Available env keys:', Object.keys(env));
      return null;
    }

    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch (urlError) {
      const error = `Invalid Supabase URL format: ${supabaseUrl}`;
      supabaseLogger.error('Initialization failed:', error);
      return null;
    }

    supabaseLogger.debug(`URL: ${supabaseUrl.substring(0, 30)}...`);
    supabaseLogger.debug(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
    
    // Store URL and public app URL globally so other components can access them
    if (typeof window !== 'undefined') {
      (window as any).SUPABASE_URL = supabaseUrl;
      (window as any).envConfig = (window as any).envConfig || {};
      (window as any).envConfig.SUPABASE_URL = supabaseUrl;
      if (env.PUBLIC_APP_URL) {
        (window as any).envConfig.PUBLIC_APP_URL = env.PUBLIC_APP_URL;
      }
      // Cache in localStorage for reliability
      try {
        localStorage.setItem('supabase_url', supabaseUrl);
      } catch (e) {
        // localStorage might not be available
      }
    }

    // Dynamic import of Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    supabaseLogger.debug('Supabase client library loaded');

    // Create the client with proper configuration
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'supabase.auth.token',
        // Prevent multiple tabs from racing on token refresh
        flowType: 'pkce',
      },
      // Connection settings for reliability
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    supabaseLogger.info('Client created successfully');
    
    // Test connection by checking auth state
    try {
      const { data: { session } } = await client.auth.getSession();
      supabaseLogger.info('Connection test successful');
      supabaseLogger.debug(`Session status: ${session ? 'Active session found' : 'No active session'}`);
    } catch (testError) {
      supabaseLogger.warn('Connection test failed, but client may still work', testError);
    }

    // Store the instance AFTER successful initialization
    supabaseInstance = client;
    
    // Reset attempt counter on success
    initializationAttempts = 0;

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
    return null;
  }
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
export function getSupabaseStatus(): { 
  initialized: boolean; 
  hasClient: boolean;
  attempts: number;
  maxAttempts: number;
} {
  return {
    initialized: supabaseInstance !== null,
    hasClient: supabaseInstance !== null,
    attempts: initializationAttempts,
    maxAttempts: MAX_INIT_ATTEMPTS,
  };
}

/**
 * Reset initialization state (for testing or recovery)
 * This allows re-initialization if something went wrong
 */
export function resetSupabase(): void {
  supabaseInstance = null;
  initializationPromise = null;
  initializationAttempts = 0;
  supabaseLogger.info('Supabase initialization state reset');
}

/**
 * Force re-initialization of Supabase client
 * Use this if the client is in a bad state
 */
export async function reinitializeSupabase(): Promise<any> {
  resetSupabase();
  return initSupabase();
}

// Make available globally
if (typeof window !== 'undefined') {
  (window as any).initSupabase = initSupabase;
  (window as any).getSupabase = getSupabase;
  (window as any).resetSupabase = resetSupabase;
  (window as any).reinitializeSupabase = reinitializeSupabase;
  (window as any).getSupabaseStatus = getSupabaseStatus;
}

