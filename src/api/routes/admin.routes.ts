/**
 * Admin Routes
 * Provides admin-only endpoints including user impersonation
 * 
 * SECURITY: All endpoints require Admin or Super Admin role
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../utils/admin-check.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('AdminRoutes');

/**
 * POST /api/admin/impersonate
 * Generate a magic link to impersonate another user
 * 
 * SECURITY:
 * - Requires Admin or Super Admin role
 * - Logs all impersonation attempts
 * - Cannot impersonate users with higher role level
 */
router.post('/impersonate', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

    // Normalize email
    const normalizedTargetEmail = targetEmail.toLowerCase().trim();
    const adminEmail = adminUser.email.toLowerCase().trim();

    // Prevent self-impersonation
    if (normalizedTargetEmail === adminEmail) {
      res.status(400).json({ error: 'Cannot impersonate yourself' });
      return;
    }

    const supabase = getServerSupabase();

    // Get admin's role
    const { data: adminData, error: adminError } = await supabase
      .from('people')
      .select('role')
      .eq('email', adminEmail)
      .maybeSingle();

    if (adminError || !adminData?.role) {
      logger.error('Failed to get admin role:', adminError?.message);
      res.status(403).json({ error: 'Unable to verify admin privileges' });
      return;
    }

    const adminRole = adminData.role;
    
    // Only Super Admin and Admin can impersonate
    if (!['Super Admin', 'Admin'].includes(adminRole)) {
      logger.warn(`User ${adminEmail} attempted impersonation without admin privileges`);
      res.status(403).json({ error: 'Admin privileges required for impersonation' });
      return;
    }

    // Get target user's role
    const { data: targetPeopleData } = await supabase
      .from('people')
      .select('role')
      .eq('email', normalizedTargetEmail)
      .maybeSingle();

    const targetRole = targetPeopleData?.role || 'Employee';

    // Role hierarchy check - Admins cannot impersonate Super Admins
    const ROLE_LEVELS: Record<string, number> = {
      'Super Admin': 5,
      'Admin': 4,
      'Manager': 3,
      'Quality Supervisor': 2,
      'Quality Analyst': 2,
      'Employee': 1,
      'General User': 0
    };

    const adminLevel = ROLE_LEVELS[adminRole] || 0;
    const targetLevel = ROLE_LEVELS[targetRole] || 0;

    // Super Admin can impersonate anyone
    // Admin can only impersonate users with lower role level
    if (adminRole !== 'Super Admin' && targetLevel >= adminLevel) {
      logger.warn(`Admin ${adminEmail} attempted to impersonate higher/equal role user ${normalizedTargetEmail}`);
      res.status(403).json({ 
        error: 'Cannot impersonate users with equal or higher role level',
        details: `Your role: ${adminRole}, Target role: ${targetRole}`
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
 * Get impersonation logs (Super Admin only)
 */
router.get('/impersonation-logs', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const adminUser = req.user;
    const supabase = getServerSupabase();

    // Check if user is Super Admin
    const { data: adminData } = await supabase
      .from('people')
      .select('role')
      .eq('email', adminUser?.email?.toLowerCase())
      .maybeSingle();

    if (adminData?.role !== 'Super Admin') {
      res.status(403).json({ error: 'Super Admin access required' });
      return;
    }

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
