/**
 * Error Handler Middleware
 * Centralized error handling for API routes
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ErrorHandler');

/**
 * Sanitize error for client response
 * Prevents information leakage in production
 */
function sanitizeError(error: any, isDevelopment: boolean): any {
  // Never expose stack traces, SQL errors, or internal details in production
  if (!isDevelopment) {
    return {
      error: 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    };
  }

  // In development, provide more details but still sanitize
  const sanitized: any = {
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR'
  };

  // Only include stack in development
  if (isDevelopment && error.stack) {
    sanitized.stack = error.stack;
  }

  // Never expose SQL errors, database details, or file paths
  if (error.message) {
    const message = error.message.toLowerCase();
    if (message.includes('sql') || 
        message.includes('database') || 
        message.includes('connection') ||
        message.includes('password') ||
        message.includes('secret')) {
      sanitized.error = 'Database error occurred';
      delete sanitized.stack;
    }
  }

  return sanitized;
}

/**
 * Error handler middleware
 * Should be added last in the middleware chain
 */
export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log full error details server-side only
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    code: err.code,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  const sanitized = sanitizeError(err, isDevelopment);

  res.status(err.status || 500).json(sanitized);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Handle API error and send response
 * Helper function for route handlers
 */
export function handleApiError(res: Response, error: any, message: string = 'An error occurred'): Response {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const sanitized = sanitizeError(error, isDevelopment);
  
  logger.error('API Error:', {
    message: error.message,
    stack: error.stack,
    code: error.code,
  });
  
  return res.status(error.status || 500).json({
    error: sanitized.error || message,
    code: sanitized.code || 'INTERNAL_ERROR'
  });
}

