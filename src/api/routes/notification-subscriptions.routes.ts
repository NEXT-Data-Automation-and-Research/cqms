/**
 * Notification Subscriptions API Routes
 * Server-side API for notification subscription operations
 */

import { Router, Response } from 'express';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createLogger } from '../../utils/logger.js';

const router = Router();
const logger = createLogger('NotificationSubscriptionsAPI');

/**
 * GET /api/notification-subscriptions
 * Get user's notification subscriptions
 */
router.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    const { is_active } = req.query;

    let query = supabase
      .from('notification_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (is_active !== undefined) {
      query = query.eq('is_active', is_active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching subscriptions:', error);
      res.status(500).json({ error: 'Failed to fetch subscriptions' });
      return;
    }

    res.json({ data: data || [] });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notification-subscriptions
 * Create a notification subscription
 */
router.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    const {
      endpoint,
      p256dh,
      auth: authSecret,
      user_agent,
      platform,
      browser,
      browser_version,
      os,
      os_version,
      device_type,
      screen_resolution,
      language,
      timezone,
    } = req.body;

    // Validate required fields
    if (!endpoint || !p256dh || !authSecret) {
      res.status(400).json({ error: 'endpoint, p256dh, and auth are required' });
      return;
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from('notification_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('notification_subscriptions')
        .update({
          user_id: userId,
          p256dh,
          auth: authSecret,
          user_agent,
          platform,
          browser,
          browser_version,
          os,
          os_version,
          device_type,
          screen_resolution,
          language,
          timezone,
          is_active: true,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating subscription:', error);
        res.status(500).json({ error: 'Failed to update subscription' });
        return;
      }

      res.json({ data });
      return;
    }

    // Create new subscription
    const { data, error } = await supabase
      .from('notification_subscriptions')
      .insert({
        user_id: userId,
        endpoint,
        p256dh,
        auth: authSecret,
        user_agent: user_agent || null,
        platform: platform || null,
        browser: browser || null,
        browser_version: browser_version || null,
        os: os || null,
        os_version: os_version || null,
        device_type: device_type || null,
        screen_resolution: screen_resolution || null,
        language: language || null,
        timezone: timezone || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating subscription:', error);
      res.status(500).json({ error: 'Failed to create subscription' });
      return;
    }

    logger.info(`Notification subscription created for user ${userId}`);
    res.status(201).json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notification-subscriptions/:id
 * Delete a notification subscription
 */
router.delete('/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;
    const subscriptionId = req.params.id;

    // Ensure user can only delete their own subscriptions
    const { error } = await supabase
      .from('notification_subscriptions')
      .delete()
      .eq('id', subscriptionId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deleting subscription:', error);
      res.status(500).json({ error: 'Failed to delete subscription' });
      return;
    }

    logger.info(`Subscription ${subscriptionId} deleted by user ${userId}`);
    res.status(204).send();
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

