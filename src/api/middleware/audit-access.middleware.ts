/**
 * API access audit middleware
 * Logs authenticated API requests to api_access_logs when response finishes (non-blocking).
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { logApiAccess } from '../utils/audit-logger.js';

const SKIP_PATHS = ['/api/csrf', '/api/env'];

/**
 * Registers a response 'finish' listener to log API access for authenticated requests.
 * Does not block the response; logging is best-effort.
 */
export function apiAccessAudit(req: Request, res: Response, next: NextFunction): void {
  const path = (req.originalUrl || req.path || '').split('?')[0];
  if (SKIP_PATHS.some((p) => path === p || path.startsWith(p + '?'))) {
    next();
    return;
  }

  res.once('finish', () => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) return;
    const success = res.statusCode < 400;
    logApiAccess(authReq, req.originalUrl || req.path || path, success, undefined, undefined).catch(() => {});
  });

  next();
}
