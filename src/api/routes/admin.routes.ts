/**
 * Admin Routes
 * Provides endpoints including user impersonation.
 * SECURITY: Impersonation is gated by permission (settings/impersonation), not role alone.
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('AdminRoutes');

/**
 * POST /api/admin/impersonate
 * Generate a magic link to impersonate another user.
 * SECURITY: requirePermission('settings/impersonation') — role + individual overrides from DB.
 */
router.post(
  '/impersonate',
  verifyAuth,
  requirePermission('settings/impersonation', 'api_endpoint'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetEmail, reason } = req.body;
    const adminUser = req.user;

    if (!adminUser?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!targetEmail) {
      res.status(400).json({ error: 'Target email is required' });
      return;
    }

    const normalizedTargetEmail = targetEmail.toLowerCase().trim();
    const adminEmail = adminUser.email.toLowerCase().trim();

    if (normalizedTargetEmail === adminEmail) {
      res.status(400).json({ error: 'Cannot impersonate yourself' });
      return;
    }

    const supabase = getServerSupabase();

    // Get target user's role for hierarchy check (who can be impersonated)
    const { data: targetPeopleData } = await supabase
      .from('people')
      .select('role')
      .eq('email', normalizedTargetEmail)
      .maybeSingle();

    const targetRole = targetPeopleData?.role || 'Employee';
    const ROLE_LEVELS: Record<string, number> = {
      'Super Admin': 5,
      'Admin': 4,
      'Manager': 3,
      'Quality Supervisor': 2,
      'Quality Analyst': 2,
      'Employee': 1,
      'General User': 0
    };
    const targetLevel = ROLE_LEVELS[targetRole] || 0;
    const { data: adminData } = await supabase
      .from('people')
      .select('role')
      .eq('email', adminEmail)
      .maybeSingle();
    const adminRole = adminData?.role || '';
    const adminLevel = ROLE_LEVELS[adminRole] || 0;
    if (adminRole !== 'Super Admin' && targetLevel >= adminLevel) {
      logger.warn(`User ${adminEmail} attempted to impersonate higher/equal role ${normalizedTargetEmail}`);
      res.status(403).json({
        error: 'Cannot impersonate users with equal or higher role level',
        details: `Target role: ${targetRole}`
      });
      return;
    }

    // Find target user in auth.users
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      logger.error('Failed to list users:', listError.message);
      res.status(500).json({ error: 'Failed to find target user' });
      return;
    }

    const targetUser = users.find(u => u.email?.toLowerCase() === normalizedTargetEmail);
    
    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found in authentication system' });
      return;
    }

    // Generate magic link for target user
    const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
    const redirectTo = `${appUrl}/home?impersonated=true`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedTargetEmail,
      options: {
        redirectTo
      }
    });

    if (linkError || !linkData) {
      logger.error('Failed to generate magic link:', linkError?.message);
      res.status(500).json({ error: 'Failed to generate impersonation link' });
      return;
    }

    // Log impersonation attempt
    const { error: logError } = await supabase.from('impersonation_log').insert({
      admin_id: adminUser.id,
      admin_email: adminEmail,
      target_id: targetUser.id,
      target_email: normalizedTargetEmail,
      reason: reason || null,
      ip_address: req.ip || req.socket.remoteAddress || null,
      user_agent: req.get('user-agent') || null,
      started_at: new Date().toISOString()
    });

    if (logError) {
      logger.warn('Failed to log impersonation (continuing anyway):', logError.message);
    }

    logger.info(`Admin ${adminEmail} impersonating user ${normalizedTargetEmail}${reason ? ` (reason: ${reason})` : ''}`);

    // Get the token_hash for client-side verification
    // This allows direct session creation without redirect
    const tokenHash = linkData.properties?.hashed_token;
    const actionLink = linkData.properties?.action_link;

    if (!tokenHash) {
      logger.error('No token hash in response');
      res.status(500).json({ error: 'Failed to generate impersonation token' });
      return;
    }

    // Return both the token_hash (for direct verification) and actionLink (as fallback)
    res.json({
      success: true,
      tokenHash,
      actionLink,
      targetEmail: normalizedTargetEmail,
      targetRole,
      message: `Impersonation token generated for ${normalizedTargetEmail}`
    });

  } catch (error: any) {
    logger.error('Impersonation error:', error);
    res.status(500).json({ error: 'Internal server error during impersonation' });
  }
});

/**
 * GET /api/admin/impersonation-logs
 * Get impersonation logs. SECURITY: requirePermission('settings/impersonation').
 */
router.get(
  '/impersonation-logs',
  verifyAuth,
  requirePermission('settings/impersonation', 'api_endpoint'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();

    // Get logs
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const { data: logs, error, count } = await supabase
      .from('impersonation_log')
      .select('*', { count: 'exact' })
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Failed to fetch impersonation logs:', error.message);
      res.status(500).json({ error: 'Failed to fetch logs' });
      return;
    }

    res.json({
      logs,
      total: count,
      limit,
      offset
    });

  } catch (error: any) {
    logger.error('Error fetching impersonation logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/end-impersonation
 * Log the end of an impersonation session
 */
router.post('/end-impersonation', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { adminEmail, targetEmail } = req.body;
    
    if (!adminEmail || !targetEmail) {
      res.status(400).json({ error: 'Admin email and target email required' });
      return;
    }

    const supabase = getServerSupabase();

    // Update the most recent impersonation log entry
    const { error } = await supabase
      .from('impersonation_log')
      .update({ ended_at: new Date().toISOString() })
      .eq('admin_email', adminEmail.toLowerCase())
      .eq('target_email', targetEmail.toLowerCase())
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.warn('Failed to update impersonation log end time:', error.message);
    }

    logger.info(`Impersonation session ended: ${adminEmail} -> ${targetEmail}`);

    res.json({ success: true });

  } catch (error: any) {
    logger.error('Error ending impersonation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
