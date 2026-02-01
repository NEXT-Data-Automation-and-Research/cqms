/**
 * Authentication Middleware
 * Verifies JWT tokens from Supabase auth and provides per-request Supabase clients
 * 
 * MULTI-USER SUPPORT:
 * This middleware ensures each request is properly isolated:
 * - JWT token is verified for each request
 * - Per-request Supabase client respects RLS (Row Level Security)
 * - No shared state between users
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';
import * as dotenv from 'dotenv';

dotenv.config();

const logger = createLogger('AuthMiddleware');

/**
 * Base authenticated request interface
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
}

/**
 * Extended request interface with per-request Supabase clients
 * Use this type when you need database access in routes
 * 
 * Note: Properties are marked optional for Express type compatibility,
 * but they are guaranteed to exist after verifyAuth middleware runs.
 */
export interface SupabaseRequest extends Request {
  /**
   * Authenticated user information (set by verifyAuth middleware)
   */
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
  
  /**
   * User-scoped Supabase client that respects RLS policies.
   * Use this for all normal database operations.
   * Guaranteed to exist after verifyAuth middleware.
   */
  supabase?: SupabaseClient;
  
  /**
   * Admin Supabase client that bypasses RLS.
   * Use ONLY when you explicitly need admin access.
   * Guaranteed to exist after verifyAuth middleware.
   */
  supabaseAdmin?: SupabaseClient;
}

/**
 * Type helper for route handlers that use SupabaseRequest
 * This ensures compatibility with Express's type system
 */
export type SupabaseRequestHandler = (
  req: SupabaseRequest,
  res: Response,
  next: NextFunction
) => Promise<void> | void;

/**
 * Type-safe middleware wrapper that allows SupabaseRequest handlers
 * Use this to wrap middleware for routes that expect SupabaseRequest
 */
export function asSupabaseHandler(handler: SupabaseRequestHandler): RequestHandler {
  return handler as unknown as RequestHandler;
}

/**
 * Create a per-request Supabase client with the user's JWT token
 * This client respects RLS policies based on auth.uid()
 */
function createUserSupabaseClient(token: string | null): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

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
 * Middleware to verify Supabase JWT token
 * Also attaches per-request Supabase clients to the request
 * 
 * After this middleware runs, req.supabase, req.supabaseAdmin, and req.user are guaranteed to exist.
 */
export const verifyAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Cast to SupabaseRequest for type-safe property assignment
    const supabaseReq = req as SupabaseRequest;
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase (use admin client for reliable verification)
    const supabaseAdmin = getServerSupabase();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn('Invalid token:', error?.message);
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Attach user to request
    supabaseReq.user = {
      ...user,
      id: user.id,
      email: user.email,
    };

    // Attach per-request Supabase clients
    // This client respects RLS and is scoped to this user's permissions
    supabaseReq.supabase = createUserSupabaseClient(token);
    supabaseReq.supabaseAdmin = supabaseAdmin;

    next();
  } catch (error: any) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Optional auth - doesn't fail if no token, but attaches user and clients if present
 */
export const optionalAuth: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const authHeader = req.headers.authorization;
    const supabaseAdmin = getServerSupabase();
    
    // Always attach admin client
    supabaseReq.supabaseAdmin = supabaseAdmin;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (!error && user) {
        supabaseReq.user = {
          ...user,
          id: user.id,
          email: user.email,
        };
        // Attach user-scoped client
        supabaseReq.supabase = createUserSupabaseClient(token);
      } else {
        // No valid user, attach anonymous client
        supabaseReq.supabase = createUserSupabaseClient(null);
      }
    } else {
      // No token, attach anonymous client
      supabaseReq.supabase = createUserSupabaseClient(null);
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth, but still attach clients
    try {
      const supabaseReq = req as SupabaseRequest;
      supabaseReq.supabaseAdmin = getServerSupabase();
      supabaseReq.supabase = createUserSupabaseClient(null);
    } catch (e) {
      // Ignore
    }
    next();
  }
};

/**
 * Legacy function for backward compatibility
 * @deprecated Use req.supabaseAdmin or import from server-supabase.ts
 */
export function getLegacyServerSupabase(): SupabaseClient {
  return getServerSupabase();
}

