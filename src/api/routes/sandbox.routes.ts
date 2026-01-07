/**
 * Sandbox API Routes
 * Server-side API for sandbox/testing operations
 * Uses authenticated Supabase client with RLS policies (not service role key)
 */

import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getAuthenticatedServerSupabase } from '../utils/authenticated-server-supabase.js';
import { logApiAccess } from '../utils/audit-logger.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('SandboxAPI');

/**
 * Rate limiter for sandbox endpoints
 * Limits to 20 requests per minute per IP
 */
const sandboxLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many requests to sandbox endpoint, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Fields to return from users table (excludes sensitive data)
 */
const SAFE_USER_FIELDS = 'id, email, full_name, avatar_url, provider, created_at, last_sign_in_at, sign_in_count';

/**
 * GET /api/people
 * Get all people from the database
 * Uses authenticated Supabase client with RLS policies
 * Requires authentication (any authenticated user can access)
 * 
 * Security features:
 * - Rate limiting (20 requests/minute)
 * - Audit logging
 * - RLS policy enforcement
 * - Field filtering (excludes sensitive data)
 */
router.get('/people', verifyAuth, sandboxLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;

  try {
    // Get authenticated Supabase client (respects RLS)
    const supabase = await getAuthenticatedServerSupabase(req);
    
    // Try 'people' table first, then fallback to 'users'
    logger.debug('Querying people table...', { userId: req.user?.id });
    let result = await supabase
      .from('people')
      .select(SAFE_USER_FIELDS)
      .order('created_at', { ascending: false });
    
    // If 'people' table doesn't exist, try 'users'
    if (result.error && (result.error.code === 'PGRST116' || result.error.message?.includes('does not exist'))) {
      logger.info('People table not found, trying users table');
      result = await supabase
        .from('users')
        .select(SAFE_USER_FIELDS)
        .order('created_at', { ascending: false });
    }
    
    // Log RLS debugging info
    if (result.error) {
      logger.warn('Query error (possible RLS issue):', {
        error: result.error.message,
        code: result.error.code,
        details: result.error.details,
        hint: result.error.hint,
        userId: req.user?.id,
      });
    } else {
      logger.debug('Query successful', {
        recordCount: result.data?.length || 0,
        userId: req.user?.id,
      });
    }
    
    if (result.error) {
      errorMessage = result.error.message;
      logger.error('Error fetching people:', result.error);
      
      // Log failed access
      await logApiAccess(req, '/api/people', false, errorMessage);
      
      res.status(500).json({ error: 'Failed to fetch people', details: result.error.message });
      return;
    }
    
    const responseTime = Date.now() - startTime;
    success = true;
    
    logger.info(`Fetched ${result.data?.length || 0} people from database (${responseTime}ms)`, {
      userId: req.user?.id,
      userEmail: req.user?.email,
    });
    
    // Log successful access
    await logApiAccess(req, '/api/people', true, undefined, {
      recordCount: result.data?.length || 0,
      responseTime,
    });
    
    res.json({ data: result.data || [] });
  } catch (error: any) {
    errorMessage = error?.message || 'Unknown error';
    logger.error('Unexpected error:', error);
    
    // Log failed access
    await logApiAccess(req, '/api/people', false, errorMessage);
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

