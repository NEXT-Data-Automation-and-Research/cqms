/**
 * Supabase Client Configuration
 * Serverless configuration for client-side Supabase usage
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseLogger } from '../utils/logger.js';

// Get Supabase configuration from environment variables
// In serverless/client-side, these should be public (safe to expose)
// Configuration comes from window.env (set by /api/env endpoint) or process.env (server-side)
const getSupabaseUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).env?.SUPABASE_URL) {
    return (window as any).env.SUPABASE_URL;
  }
  if (typeof process !== 'undefined' && process.env?.SUPABASE_URL) {
    return process.env.SUPABASE_URL;
  }
  return '';
};

const getSupabaseAnonKey = (): string => {
  if (typeof window !== 'undefined' && (window as any).env?.SUPABASE_ANON_KEY) {
    return (window as any).env.SUPABASE_ANON_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) {
    return process.env.SUPABASE_ANON_KEY;
  }
  return '';
};

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

// Validate configuration
let supabaseInitialized = false;
let initializationError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  initializationError = 'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file';
  supabaseLogger.warn(initializationError);
} else {
  // Validate URL format
  try {
    new URL(supabaseUrl);
    supabaseInitialized = true;
    supabaseLogger.info('Configuration loaded successfully');
    supabaseLogger.debug(`URL: ${supabaseUrl.substring(0, 30)}...`);
    supabaseLogger.debug(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  } catch (error) {
    initializationError = `Invalid Supabase URL format: ${supabaseUrl}`;
    supabaseLogger.error(initializationError);
  }
}

/**
 * Create and export Supabase client instance
 * This is safe to use on the client-side (serverless)
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'supabase.auth.token',
    },
  }
);

/**
 * Check if Supabase is properly initialized
 * @returns Object with initialization status and error message if any
 */
export function checkSupabaseInit(): { initialized: boolean; error: string | null } {
  return {
    initialized: supabaseInitialized,
    error: initializationError
  };
}

/**
 * Log Supabase initialization status
 */
export function logSupabaseStatus(): void {
  if (supabaseInitialized) {
    supabaseLogger.info('Status: Initialized - YES');
    supabaseLogger.info('Client ready for use');
  } else {
    supabaseLogger.error('Status: Initialized - NO');
    if (initializationError) {
      supabaseLogger.error(`Error: ${initializationError}`);
    }
  }
}

/**
 * Get Supabase client (helper function)
 * @returns Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

// Export types for convenience
export type { SupabaseClient } from '@supabase/supabase-js';

