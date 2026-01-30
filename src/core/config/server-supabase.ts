/**
 * Server-Side Supabase Client (Admin/Service Role)
 * 
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ IMPORTANT: This client BYPASSES Row Level Security (RLS)                 ║
 * ║                                                                          ║
 * ║ Use this ONLY for:                                                       ║
 * ║   - Admin operations that need cross-user access                        ║
 * ║   - System-level operations (migrations, background jobs)               ║
 * ║   - Verifying JWT tokens (auth.getUser)                                 ║
 * ║                                                                          ║
 * ║ For USER-SCOPED operations, use req.supabase instead!                   ║
 * ║ The req.supabase client respects RLS and is safer.                      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 * 
 * Usage in routes:
 *   // PREFERRED: Use req.supabase (respects RLS, user-scoped)
 *   const { data } = await req.supabase.from('audits').select('*');
 * 
 *   // ADMIN ONLY: Use when you need to bypass RLS
 *   const { data } = await req.supabaseAdmin.from('people').select('*');
 * 
 * Usage outside routes (background jobs, etc.):
 *   import { getServerSupabase } from './core/config/server-supabase.js';
 *   const supabase = getServerSupabase();
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '../../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('ServerSupabase');

// Singleton admin client - safe because it has no user-specific state
let serverSupabaseClient: SupabaseClient | null = null;

/**
 * Get or create server-side Supabase client with service role key.
 * 
 * ⚠️  WARNING: This client BYPASSES RLS!
 * 
 * This is a singleton - safe to use because:
 * - It has no user-specific state
 * - Service role key is the same for all requests
 * - Supabase clients are thread-safe for reads
 * 
 * For user-scoped queries that should respect RLS,
 * use req.supabase instead (created per-request with user's JWT).
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
    serverSupabaseClient = createClient(supabaseUrl, anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return serverSupabaseClient;
  }

  // Create client with service role key (bypasses RLS)
  serverSupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // Optimize for server-side usage
    db: {
      schema: 'public',
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
  logger.debug('Server Supabase client reset');
}

/**
 * Alias for getServerSupabase - clearer naming
 * @deprecated Use getServerSupabase or req.supabaseAdmin
 */
export const getAdminSupabase = getServerSupabase;

