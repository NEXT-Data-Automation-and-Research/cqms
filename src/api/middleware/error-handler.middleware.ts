/**
 * Error Handler Middleware
 * Centralized error handling for API routes
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('ErrorHandler');

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
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
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

