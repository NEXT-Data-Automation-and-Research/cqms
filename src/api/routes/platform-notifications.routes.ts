/**
 * Platform Notifications Routes
 * API endpoints for managing platform-wide notifications
 * 
 * Uses per-request Supabase clients:
 * - req.supabase: User-scoped client for reading notifications
 * - req.supabaseAdmin!: Admin client for creating/managing notifications
 */

import { Router, Response } from 'express';
import { SupabaseRequest, verifyAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/permission.middleware.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('PlatformNotificationsRoutes');

// Explicit column lists to reduce accidental data exposure.
// Keep these in sync with `src/features/platform-notifications/domain/types.ts` as needed.
const PUBLIC_NOTIFICATION_SELECT =
  'id,title,message,type,priority,is_dismissible,is_pinned,target_roles,action_url,action_label,is_active,starts_at,expires_at,created_at,updated_at';
const ADMIN_NOTIFICATION_SELECT =
  `${PUBLIC_NOTIFICATION_SELECT},created_by,created_by_email`;

const ALLOWED_NOTIFICATION_TYPES = new Set(['info', 'warning', 'alert', 'success', 'maintenance']);

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

function coerceString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  return value.trim();
}

function validateLength(name: string, value: string, max: number): string | null {
  if (value.length > max) return `${name} must be at most ${max} characters`;
  return null;
}

function parseTargetRoles(value: unknown): string[] | null {
  if (value === null) return null; // preserve "all roles" semantics
  if (value === undefined) return undefined as any;
  if (!Array.isArray(value)) return null;
  const roles = value
    .filter((v) => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);
  return roles;
}

/**
 * GET /api/platform-notifications
 * Get active platform notifications for the current user
 * Available to all authenticated users
 */
router.get('/', verifyAuth, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const supabase = req.supabaseAdmin!;
    const now = new Date().toISOString();

    // Get user's role
    const { data: person } = await supabase
      .from('people')
      .select('role')
      .eq('email', user.email.toLowerCase())
      .single();

    const userRole = person?.role || 'Employee';

    // Enforce active window + role targeting at query-time.
    // We do 2 queries for robustness (role names include spaces, etc.), then merge/dedupe.
    const baseQuery = supabase
      .from('platform_notifications')
      .select(ADMIN_NOTIFICATION_SELECT) // keep backward compatibility if any client expects these fields
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('is_pinned', { ascending: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    const [{ data: globalNotifications, error: globalError }, { data: roleNotifications, error: roleError }] =
      await Promise.all([
        // Global = target_roles is NULL or empty array
        baseQuery.or('target_roles.is.null,target_roles.eq.{}'),
        // Targeted = target_roles contains the user's role
        baseQuery.contains('target_roles', [userRole]),
      ]);

    if (globalError || roleError) {
      logger.error('Error fetching notifications:', {
        global: globalError?.message,
        role: roleError?.message,
      });
      res.status(500).json({ error: 'Failed to fetch notifications' });
      return;
    }

    const merged = [...(globalNotifications || []), ...(roleNotifications || [])];
    const dedupedById = new Map<string, any>();
    merged.forEach((n: any) => {
      if (n?.id && !dedupedById.has(n.id)) dedupedById.set(n.id, n);
    });
    const filteredNotifications = Array.from(dedupedById.values());

    if (filteredNotifications.length === 0) {
      res.json({ notifications: [], dismissals: [] });
      return;
    }

    // Get dismissals for this user
    const notificationIds = filteredNotifications.map((n: any) => n.id);
    const { data: dismissals } = await supabase
      .from('platform_notification_dismissals')
      .select('notification_id, dismissed_at')
      .eq('user_id', user.id)
      .in('notification_id', notificationIds);

    res.json({
      notifications: filteredNotifications,
      dismissals: dismissals || []
    });

  } catch (error: any) {
    logger.error('Error in GET /platform-notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/platform-notifications/count
 * Get count of undismissed notifications for the current user
 */
router.get('/count', verifyAuth, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    if (!user?.email) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const supabase = req.supabaseAdmin!;
    const now = new Date().toISOString();

    // Get user's role
    const { data: person } = await supabase
      .from('people')
      .select('role')
      .eq('email', user.email.toLowerCase())
      .single();

    const userRole = person?.role || 'Employee';

    // Enforce targeting at query-time and only select required fields.
    const baseQuery = supabase
      .from('platform_notifications')
      .select('id,target_roles')
      .eq('is_active', true)
      .lte('starts_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    const [{ data: globalNotifications }, { data: roleNotifications }] = await Promise.all([
      baseQuery.or('target_roles.is.null,target_roles.eq.{}'),
      baseQuery.contains('target_roles', [userRole]),
    ]);

    const merged = [...(globalNotifications || []), ...(roleNotifications || [])];
    const ids = Array.from(new Set(merged.map((n: any) => n?.id).filter(Boolean)));

    if (ids.length === 0) {
      res.json({ count: 0 });
      return;
    }

    // Get dismissals count
    const { count: dismissedCount } = await supabase
      .from('platform_notification_dismissals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('notification_id', ids);

    const undismissedCount = ids.length - (dismissedCount || 0);
    res.json({ count: Math.max(0, undismissedCount) });

  } catch (error: any) {
    logger.error('Error in GET /platform-notifications/count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/platform-notifications/dismiss/:id
 * Dismiss a notification for the current user
 */
router.post('/dismiss/:id', verifyAuth, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    const user = req.user;
    const notificationId = req.params.id;

    if (!user?.id) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const supabase = req.supabaseAdmin!;

    // Verify notification exists and is dismissible
    const { data: notification } = await supabase
      .from('platform_notifications')
      .select('is_dismissible')
      .eq('id', notificationId)
      .single();

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    if (!notification.is_dismissible) {
      res.status(400).json({ error: 'This notification cannot be dismissed' });
      return;
    }

    // Create dismissal record
    const { error } = await supabase
      .from('platform_notification_dismissals')
      .upsert({
        notification_id: notificationId,
        user_id: user.id,
        dismissed_at: new Date().toISOString()
      }, {
        onConflict: 'notification_id,user_id'
      });

    if (error) {
      logger.error('Error dismissing notification:', error.message);
      res.status(500).json({ error: 'Failed to dismiss notification' });
      return;
    }

    res.json({ success: true });

  } catch (error: any) {
    logger.error('Error in POST /platform-notifications/dismiss:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============== Admin Endpoints ==============

/**
 * GET /api/platform-notifications/admin/all
 * Get all platform notifications (for admin management)
 * Admin only
 */
router.get(
  '/admin/all',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: SupabaseRequest, res: Response): Promise<void> => {
    try {
      const supabase = req.supabaseAdmin!;

      const { data, error } = await supabase
        .from('platform_notifications')
        .select(ADMIN_NOTIFICATION_SELECT)
        .order('created_at', { ascending: false });

      if (error) {
        logger.error('Error fetching all notifications:', error.message);
        res.status(500).json({ error: 'Failed to fetch notifications' });
        return;
      }

      res.json({ notifications: data || [] });

    } catch (error: any) {
      logger.error('Error in GET /platform-notifications/admin/all:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/platform-notifications/admin
 * Create a new platform notification
 * Admin only
 */
router.post(
  '/admin',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: SupabaseRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const raw = req.body ?? {};

      const title = coerceString(raw.title);
      const message = coerceString(raw.message);
      const type = coerceString(raw.type) || 'info';
      const priority = raw.priority ?? 0;
      const is_dismissible = raw.is_dismissible ?? true;
      const is_pinned = raw.is_pinned ?? false;
      const target_roles = parseTargetRoles(raw.target_roles);
      const action_url = coerceString(raw.action_url);
      const action_label = coerceString(raw.action_label);
      const starts_at = coerceString(raw.starts_at);
      const expires_at = raw.expires_at === null ? null : coerceString(raw.expires_at);

      if (!title || !message) {
        res.status(400).json({ error: 'Title and message are required' });
        return;
      }

      if (!ALLOWED_NOTIFICATION_TYPES.has(type)) {
        res.status(400).json({ error: 'Invalid notification type' });
        return;
      }

      const titleErr = validateLength('title', title, 200);
      const msgErr = validateLength('message', message, 5000);
      const actionUrlErr = action_url ? validateLength('action_url', action_url, 2000) : null;
      const actionLabelErr = action_label ? validateLength('action_label', action_label, 100) : null;
      const firstErr = titleErr || msgErr || actionUrlErr || actionLabelErr;
      if (firstErr) {
        res.status(400).json({ error: firstErr });
        return;
      }

      if (starts_at && !isIsoDateString(starts_at)) {
        res.status(400).json({ error: 'starts_at must be an ISO date string' });
        return;
      }
      if (expires_at && !isIsoDateString(expires_at)) {
        res.status(400).json({ error: 'expires_at must be an ISO date string or null' });
        return;
      }

      const parsedPriority = typeof priority === 'string' ? parseInt(priority, 10) : priority;
      if (!Number.isFinite(parsedPriority)) {
        res.status(400).json({ error: 'priority must be a number' });
        return;
      }

      if (typeof is_dismissible !== 'boolean' || typeof is_pinned !== 'boolean') {
        res.status(400).json({ error: 'is_dismissible and is_pinned must be booleans' });
        return;
      }

      const supabase = req.supabaseAdmin!;

      const { data, error } = await supabase
        .from('platform_notifications')
        .insert({
          title,
          message,
          type,
          priority: parsedPriority,
          is_dismissible,
          is_pinned,
          // Preserve existing semantics: null/empty => "all roles"
          target_roles: target_roles === undefined ? [] : target_roles,
          action_url: action_url || null,
          action_label: action_label || null,
          starts_at: starts_at || new Date().toISOString(),
          expires_at: expires_at || null,
          created_by: user?.id,
          created_by_email: user?.email
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating notification:', error.message);
        res.status(500).json({ error: 'Failed to create notification' });
        return;
      }

      logger.info(`Admin ${user?.email} created platform notification: ${title}`);
      res.status(201).json({ notification: data });

    } catch (error: any) {
      logger.error('Error in POST /platform-notifications/admin:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/platform-notifications/admin/:id
 * Update a platform notification
 * Admin only
 */
router.put(
  '/admin/:id',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: SupabaseRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const notificationId = req.params.id;
      const raw = req.body ?? {};

      // Whitelist allowed fields. Unknown fields are ignored (non-breaking).
      const updates: Record<string, any> = {};

      if (raw.title !== undefined) {
        const v = coerceString(raw.title);
        if (!v) {
          res.status(400).json({ error: 'title must be a non-empty string' });
          return;
        }
        const err = validateLength('title', v, 200);
        if (err) {
          res.status(400).json({ error: err });
          return;
        }
        updates.title = v;
      }

      if (raw.message !== undefined) {
        const v = coerceString(raw.message);
        if (!v) {
          res.status(400).json({ error: 'message must be a non-empty string' });
          return;
        }
        const err = validateLength('message', v, 5000);
        if (err) {
          res.status(400).json({ error: err });
          return;
        }
        updates.message = v;
      }

      if (raw.type !== undefined) {
        const v = coerceString(raw.type);
        if (!v || !ALLOWED_NOTIFICATION_TYPES.has(v)) {
          res.status(400).json({ error: 'type must be one of: info, warning, alert, success, maintenance' });
          return;
        }
        updates.type = v;
      }

      if (raw.priority !== undefined) {
        const v = typeof raw.priority === 'string' ? parseInt(raw.priority, 10) : raw.priority;
        if (!Number.isFinite(v)) {
          res.status(400).json({ error: 'priority must be a number' });
          return;
        }
        updates.priority = v;
      }

      if (raw.is_dismissible !== undefined) {
        if (typeof raw.is_dismissible !== 'boolean') {
          res.status(400).json({ error: 'is_dismissible must be a boolean' });
          return;
        }
        updates.is_dismissible = raw.is_dismissible;
      }

      if (raw.is_pinned !== undefined) {
        if (typeof raw.is_pinned !== 'boolean') {
          res.status(400).json({ error: 'is_pinned must be a boolean' });
          return;
        }
        updates.is_pinned = raw.is_pinned;
      }

      if (raw.is_active !== undefined) {
        if (typeof raw.is_active !== 'boolean') {
          res.status(400).json({ error: 'is_active must be a boolean' });
          return;
        }
        updates.is_active = raw.is_active;
      }

      if (raw.target_roles !== undefined) {
        const roles = parseTargetRoles(raw.target_roles);
        if (roles === null) {
          // null means "all roles"; keep as null
          updates.target_roles = null;
        } else if (Array.isArray(roles)) {
          updates.target_roles = roles;
        } else {
          res.status(400).json({ error: 'target_roles must be an array of strings or null' });
          return;
        }
      }

      if (raw.action_url !== undefined) {
        const v = coerceString(raw.action_url);
        if (v) {
          const err = validateLength('action_url', v, 2000);
          if (err) {
            res.status(400).json({ error: err });
            return;
          }
        }
        updates.action_url = v || null;
      }

      if (raw.action_label !== undefined) {
        const v = coerceString(raw.action_label);
        if (v) {
          const err = validateLength('action_label', v, 100);
          if (err) {
            res.status(400).json({ error: err });
            return;
          }
        }
        updates.action_label = v || null;
      }

      if (raw.starts_at !== undefined) {
        const v = coerceString(raw.starts_at);
        if (!v || !isIsoDateString(v)) {
          res.status(400).json({ error: 'starts_at must be an ISO date string' });
          return;
        }
        updates.starts_at = v;
      }

      if (raw.expires_at !== undefined) {
        if (raw.expires_at === null) {
          updates.expires_at = null;
        } else {
          const v = coerceString(raw.expires_at);
          if (!v || !isIsoDateString(v)) {
            res.status(400).json({ error: 'expires_at must be an ISO date string or null' });
            return;
          }
          updates.expires_at = v;
        }
      }

      const supabase = req.supabaseAdmin!;

      const { data, error } = await supabase
        .from('platform_notifications')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating notification:', error.message);
        res.status(500).json({ error: 'Failed to update notification' });
        return;
      }

      logger.info(`Admin ${user?.email} updated platform notification: ${notificationId}`);
      res.json({ notification: data });

    } catch (error: any) {
      logger.error('Error in PUT /platform-notifications/admin/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/platform-notifications/admin/:id
 * Delete a platform notification
 * Admin only
 */
router.delete(
  '/admin/:id',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: SupabaseRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const notificationId = req.params.id;

      const supabase = req.supabaseAdmin!;

      const { error } = await supabase
        .from('platform_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        logger.error('Error deleting notification:', error.message);
        res.status(500).json({ error: 'Failed to delete notification' });
        return;
      }

      logger.info(`Admin ${user?.email} deleted platform notification: ${notificationId}`);
      res.json({ success: true });

    } catch (error: any) {
      logger.error('Error in DELETE /platform-notifications/admin/:id:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
