/**
 * Server-Side Supabase Client
 * 
 * This creates a Supabase client using the SERVICE ROLE KEY.
 * This key has elevated privileges and should NEVER be exposed to the client.
 * 
 * Usage:
 *   import { getServerSupabase } from './core/config/server-supabase.js';
 *   const supabase = getServerSupabase();
 *   const { data } = await supabase.from('users').select('*');
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('ServerSupabase');

let serverSupabaseClient: SupabaseClient | null = null;

/**
 * Get or create server-side Supabase client with service role key
 * This client bypasses RLS and should only be used server-side
 */
export function getServerSupabase(): SupabaseClient {
  if (serverSupabaseClient) {
    return serverSupabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  if (!serviceRoleKey) {
    logger.warn('SUPABASE_SERVICE_ROLE_KEY not set - server-side operations may be limited');
    logger.warn('For production, set SUPABASE_SERVICE_ROLE_KEY in your .env file');
    // Fallback to anon key (not recommended for production)
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      throw new Error('Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set');
    }
    logger.warn('Using anon key as fallback - RLS will be enforced');
    serverSupabaseClient = createClient(supabaseUrl, anonKey);
    return serverSupabaseClient;
  }

  // Create client with service role key (bypasses RLS)
  serverSupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  logger.info('Server-side Supabase client initialized with service role key');
  return serverSupabaseClient;
}

/**
 * Reset the server Supabase client (useful for testing)
 */
export function resetServerSupabase(): void {
  serverSupabaseClient = null;
}

