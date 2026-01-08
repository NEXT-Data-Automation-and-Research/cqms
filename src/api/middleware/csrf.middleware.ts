/**
 * CSRF Protection Middleware
 * Implements CSRF token validation for state-changing operations
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../utils/logger.js';
import crypto from 'crypto';

const logger = createLogger('CSRFMiddleware');

// Store CSRF tokens in memory (in production, use Redis or session store)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// Clean up expired tokens every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expiresAt < now) {
      csrfTokens.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(sessionId, {
    token,
    expiresAt: Date.now() + 60 * 60 * 1000 // 1 hour expiration
  });
  return token;
}

/**
 * Verify CSRF token
 */
function verifyCSRFToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  if (!stored) {
    return false;
  }
  
  if (stored.expiresAt < Date.now()) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  return stored.token === token;
}

/**
 * Get session ID from request
 */
function getSessionId(req: Request): string {
  // Try to get from Authorization header (user ID)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Use a hash of the token as session ID
    return crypto.createHash('sha256').update(authHeader).digest('hex').substring(0, 16);
  }
  
  // Fallback to IP address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * CSRF protection middleware
 * Only applies to state-changing methods (POST, PUT, DELETE, PATCH)
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only protect state-changing methods
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!protectedMethods.includes(req.method)) {
    return next();
  }

  const sessionId = getSessionId(req);
  const token = req.headers['x-csrf-token'] as string || req.body?._csrf;

  if (!token) {
    logger.warn('CSRF token missing', { path: req.path, method: req.method });
    res.status(403).json({ error: 'CSRF token missing' });
    return;
  }

  if (!verifyCSRFToken(sessionId, token)) {
    logger.warn('CSRF token invalid', { path: req.path, method: req.method });
    res.status(403).json({ error: 'Invalid CSRF token' });
    return;
  }

  next();
}

/**
 * Middleware to add CSRF token to response
 * Only generates tokens for GET requests (not state-changing methods)
 * This prevents overwriting tokens that are being validated in the same request
 */
export function csrfToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only generate tokens for GET requests
  // POST/PUT/DELETE/PATCH requests should use existing tokens, not generate new ones
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (protectedMethods.includes(req.method)) {
    // Don't generate new token for state-changing requests
    // The token should already exist from a previous GET request
    return next();
  }

  const sessionId = getSessionId(req);
  const token = generateCSRFToken(sessionId);
  
  // Add token to response header
  res.setHeader('X-CSRF-Token', token);
  
  // Also add to response body for forms
  (res as any).csrfToken = token;
  
  next();
}

