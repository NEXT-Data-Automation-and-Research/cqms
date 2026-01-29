/**
 * Cache Management Routes
 * API endpoints for platform-wide cache clearing by admins
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/permission.middleware.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('CacheManagementRoutes');

/**
 * POST /api/cache/clear
 * Trigger a platform-wide cache clear for all users
 * Admin/Super Admin only
 * 
 * When this endpoint is called:
 * 1. A new row is inserted into cache_versions table
 * 2. Supabase Realtime broadcasts the INSERT to all connected clients
 * 3. Clients receive the event and clear their caches
 */
router.post(
  '/clear',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { reason, clearType = 'full' } = req.body;

      if (!user?.email || !user?.id) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate clearType
      const validClearTypes = ['full', 'service_worker', 'storage'];
      if (!validClearTypes.includes(clearType)) {
        res.status(400).json({ 
          error: 'Invalid clear type',
          validTypes: validClearTypes
        });
        return;
      }

      const supabase = getServerSupabase();

      // Generate a unique version identifier
      const now = new Date();
      const version = `${now.toISOString().split('T')[0]}-${now.getTime()}`;

      // Insert the cache clear event
      // This will trigger Supabase Realtime to broadcast to all subscribed clients
      const { data, error } = await supabase
        .from('cache_versions')
        .insert({
          version,
          triggered_by: user.id,
          triggered_by_email: user.email,
          reason: reason || null,
          clear_type: clearType
        })
        .select()
        .single();

      if (error) {
        logger.error('Error inserting cache version:', error.message);
        res.status(500).json({ error: 'Failed to trigger cache clear' });
        return;
      }

      logger.info(`Admin ${user.email} triggered cache clear: ${version} (type: ${clearType}, reason: ${reason || 'none'})`);

      res.status(201).json({
        success: true,
        message: 'Cache clear broadcast sent to all users',
        cacheVersion: data
      });

    } catch (error: any) {
      logger.error('Error in POST /cache/clear:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/cache/history
 * Get cache clear history
 * Admin/Super Admin only
 */
router.get(
  '/history',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const supabase = getServerSupabase();

      const { data, error } = await supabase
        .from('cache_versions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Error fetching cache history:', error.message);
        res.status(500).json({ error: 'Failed to fetch cache history' });
        return;
      }

      res.json({ history: data || [] });

    } catch (error: any) {
      logger.error('Error in GET /cache/history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/cache/latest
 * Get the latest cache version
 * Available to all authenticated users (for checking on page load)
 */
router.get(
  '/latest',
  verifyAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const supabase = getServerSupabase();

      const { data, error } = await supabase
        .from('cache_versions')
        .select('version, created_at, clear_type')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error fetching latest cache version:', error.message);
        res.status(500).json({ error: 'Failed to fetch latest version' });
        return;
      }

      res.json({ 
        latestVersion: data || null,
        serverTime: new Date().toISOString()
      });

    } catch (error: any) {
      logger.error('Error in GET /cache/latest:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
