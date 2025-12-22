/**
 * Authentication Middleware
 * Verifies JWT tokens from Supabase auth
 */

import { Request, Response, NextFunction } from 'express';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('AuthMiddleware');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    [key: string]: any;
  };
}

/**
 * Middleware to verify Supabase JWT token
 */
export async function verifyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const supabase = getServerSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(token);

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
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

/**
 * Optional auth - doesn't fail if no token, but attaches user if present
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const supabase = getServerSupabase();
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (!error && user) {
        req.user = {
          ...user,
          id: user.id,
          email: user.email,
        };
      }
    }

    next();
  } catch (error) {
    // Ignore errors in optional auth
    next();
  }
}

