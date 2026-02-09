/**
 * Auth API Routes
 * Endpoints for auth-related operations (e.g. recording login for security audit)
 */

import { Router, Response } from 'express';
import { verifyAuth, SupabaseRequest } from '../middleware/auth.middleware.js';
import { logSecurityEvent } from '../utils/audit-logger.js';

const router = Router();

/**
 * POST /api/auth/login-event
 * Record a successful login for security audit trail. Called by client after OAuth callback.
 * Non-blocking; responds immediately; logging is best-effort.
 */
router.post('/login-event', verifyAuth, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    logSecurityEvent('login_success', req, { source: 'oauth' });
    res.status(204).end();
  } catch {
    res.status(204).end();
  }
});

export default router;
