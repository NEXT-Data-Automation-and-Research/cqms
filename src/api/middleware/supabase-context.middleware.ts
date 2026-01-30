/**
 * Supabase Context Middleware
 * 
 * Creates a per-request Supabase client that respects RLS (Row Level Security).
 * This ensures each user's request is properly isolated and can only access
 * data they're authorized to see.
 * 
 * CRITICAL: This middleware solves the multi-user isolation problem by:
 * 1. Creating a fresh Supabase client for each request
 * 2. Attaching the user's JWT token to the client
 * 3. Allowing RLS policies to enforce data access automatically
 * 
 * Usage in routes:
 *   // Use req.supabase for user-scoped queries (respects RLS)
 *   const { data } = await req.supabase.from('audits').select('*');
 *   
 *   // Use req.supabaseAdmin ONLY when you need to bypass RLS
 *   // (e.g., admin operations, cross-user queries)
 *   const { data } = await req.supabaseAdmin.from('people').select('*');
 */

import { Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from './auth.middleware.js';
import { createLogger } from '../../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('SupabaseContext');

/**
 * Extended request interface with per-request Supabase clients
 */
export interface SupabaseRequest extends AuthenticatedRequest {
  /**
   * User-scoped Supabase client that respects RLS policies.
   * Use this for all normal database operations.
   * RLS will automatically filter data based on auth.uid()
   */
  supabase: SupabaseClient;
  
  /**
   * Admin Supabase client that bypasses RLS.
   * Use ONLY when you explicitly need to:
   * - Access data across users (admin dashboards)
   * - Perform system-level operations
   * - Query data that RLS would block
   * 
   * ALWAYS prefer req.supabase unless you have a specific reason.
   */
  supabaseAdmin: SupabaseClient;
}

// Cache for admin client (singleton - safe because it has no user context)
let adminClient: SupabaseClient | null = null;

/**
 * Get or create the admin Supabase client (singleton)
 * This client bypasses RLS and should only be used for admin operations
 */
function getAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('SUPABASE_URL environment variable is required');
  }

  // Prefer service role key, fallback to anon key with warning
  const key = serviceRoleKey || anonKey;
  if (!key) {
    throw new Error('Either SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set');
  }

  if (!serviceRoleKey) {
    logger.warn('SUPABASE_SERVICE_ROLE_KEY not set - admin client will respect RLS');
  }

  adminClient = createClient(supabaseUrl, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}

/**
 * Create a per-request Supabase client with the user's JWT token
 * This client respects RLS policies based on auth.uid()
 */
function createUserClient(token: string | null): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  // Create client with user's token in Authorization header
  // This is what PostgREST uses for RLS policy evaluation
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
  });
}

/**
 * Middleware that attaches per-request Supabase clients to the request object.
 * 
 * This should be used AFTER verifyAuth middleware so we have the JWT token.
 * 
 * @example
 * router.get('/data', verifyAuth, attachSupabase, async (req, res) => {
 *   const { data } = await req.supabase.from('table').select('*');
 * });
 */
export function attachSupabase(
  req: SupabaseRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    // Extract JWT token from Authorization header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    // Create per-request client with user's token (respects RLS)
    req.supabase = createUserClient(token);

    // Attach admin client (singleton, bypasses RLS)
    req.supabaseAdmin = getAdminClient();

    next();
  } catch (error: any) {
    logger.error('Failed to attach Supabase context:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Combined middleware that verifies auth AND attaches Supabase context.
 * Use this for routes that need both authentication and database access.
 * 
 * @example
 * router.get('/data', withSupabase, async (req, res) => {
 *   const userId = req.user!.id;
 *   const { data } = await req.supabase.from('table').select('*');
 * });
 */
export async function withSupabase(
  req: SupabaseRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);

    // Create per-request client first (so we can verify with it)
    req.supabase = createUserClient(token);
    req.supabaseAdmin = getAdminClient();

    // Verify token using the admin client (more reliable)
    const { data: { user }, error } = await req.supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid token:', error?.message);
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user to request
    req.user = {
      ...user,
      id: user.id,
      email: user.email,
    };

    next();
  } catch (error: any) {
    logger.error('Auth/Supabase context error:', error.message);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Get admin Supabase client for use outside of request context.
 * This is a convenience function for background jobs, migrations, etc.
 * 
 * WARNING: This bypasses RLS. Only use when necessary.
 */
export function getSupabaseAdmin(): SupabaseClient {
  return getAdminClient();
}

/**
 * Reset admin client (useful for testing)
 */
export function resetAdminClient(): void {
  adminClient = null;
}
