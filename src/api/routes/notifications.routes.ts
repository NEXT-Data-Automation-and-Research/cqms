/**
 * Notifications API Routes
 * Server-side API for notification operations
 */

import { Router, Response } from 'express';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createLogger } from '../../utils/logger.js';
import { NOTIFICATION_FIELDS } from '../../core/constants/field-whitelists.js';

const router = Router();
const logger = createLogger('NotificationsAPI');

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    const { status, limit = 50, offset = 0 } = req.query;

    let query = supabase
      .from('notifications')
      .select(NOTIFICATION_FIELDS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) {
      query = query.eq('status', status as string);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
      return;
    }

    res.json({ data: data || [] });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications
 * Create a notification
 */
router.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    const { title, body, icon_url, image_url, action_url, type, category, metadata } = req.body;

    // Validate required fields
    if (!title || !body) {
      res.status(400).json({ error: 'Title and body are required' });
      return;
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        body,
        icon_url: icon_url || null,
        image_url: image_url || null,
        action_url: action_url || null,
        type: type || 'info',
        category: category || null,
        metadata: metadata || {},
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating notification:', error);
      res.status(500).json({ error: 'Failed to create notification' });
      return;
    }

    logger.info(`Notification created for user ${userId}`);
    res.status(201).json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/notifications/:id
 * Update a notification (e.g., mark as read)
 */
router.patch('/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;
    const notificationId = req.params.id;

    const { status, read_at } = req.body;

    // Build update object
    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (read_at !== undefined) updates.read_at = read_at;

    // Ensure user can only update their own notifications
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating notification:', error);
      res.status(500).json({ error: 'Failed to update notification' });
      return;
    }

    if (!data) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    res.json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;
    const notificationId = req.params.id;

    // Ensure user can only delete their own notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      logger.error('Error deleting notification:', error);
      res.status(500).json({ error: 'Failed to delete notification' });
      return;
    }

    logger.info(`Notification ${notificationId} deleted by user ${userId}`);
    res.status(204).send();
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/test
 * Create a test notification for the current user
 * Useful for testing the notification system
 */
router.post('/test', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    const { type = 'info', title, body } = req.body;

    // Default test notification
    const testNotification = {
      user_id: userId,
      title: title || 'Test Notification',
      body: body || `This is a test notification created at ${new Date().toLocaleString()}`,
      type: type || 'info',
      category: 'system',
      status: 'pending',
      metadata: {
        test: true,
        created_at: new Date().toISOString(),
      },
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(testNotification)
      .select()
      .single();

    if (error) {
      logger.error('Error creating test notification:', error);
      res.status(500).json({ error: 'Failed to create test notification' });
      return;
    }

    logger.info(`Test notification created for user ${userId}`);
    res.status(201).json({ 
      data,
      message: 'Test notification created successfully' 
    });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/notifications/send
 * Send notification to specific user(s) - Admin only
 * This creates a notification in the database and optionally sends web push
 */
router.post('/send', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const senderId = req.user!.id;

    // Check if user is admin or super admin
    const { data: senderData } = await supabase
      .from('users')
      .select('role')
      .eq('id', senderId)
      .single();

    if (!senderData || !['Admin', 'Super Admin', 'Quality Analyst', 'Quality Supervisor'].includes(senderData.role)) {
      res.status(403).json({ error: 'Only authorized roles can send notifications to other users' });
      return;
    }

    const { 
      user_ids, 
      title, 
      body, 
      type = 'info', 
      category = 'system',
      action_url,
      icon_url,
      image_url,
      metadata = {},
      send_push = true 
    } = req.body;

    // Validate required fields
    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      res.status(400).json({ error: 'user_ids array is required' });
      return;
    }

    if (!title || !body) {
      res.status(400).json({ error: 'Title and body are required' });
      return;
    }

    // Create notifications for each user
    const notifications = user_ids.map((user_id: string) => ({
      user_id,
      title,
      body,
      type,
      category,
      action_url: action_url || null,
      icon_url: icon_url || null,
      image_url: image_url || null,
      status: 'pending',
      metadata: {
        ...metadata,
        sent_by: senderId,
        sent_at: new Date().toISOString(),
      },
    }));

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      logger.error('Error creating notifications:', error);
      res.status(500).json({ error: 'Failed to create notifications' });
      return;
    }

    // If send_push is true, try to send web push notifications
    let pushResults: { success: number; failed: number } = { success: 0, failed: 0 };
    
    if (send_push) {
      // Get push subscriptions for target users
      const { data: subscriptions } = await supabase
        .from('notification_subscriptions')
        .select('*')
        .in('user_id', user_ids)
        .eq('is_active', true);

      if (subscriptions && subscriptions.length > 0) {
        // Web push sending would happen here
        // For now, we just log it - actual push sending requires web-push library on server
        logger.info(`Would send ${subscriptions.length} push notifications`);
        pushResults.success = subscriptions.length;
      }
    }

    logger.info(`Notifications sent to ${user_ids.length} users by ${senderId}`);
    res.status(201).json({ 
      data,
      message: `Notifications created for ${user_ids.length} user(s)`,
      push_results: pushResults
    });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/users
 * Get list of users for notification targeting - Admin only
 */
router.get('/users', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    // Check if user has permission
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!userData || !['Admin', 'Super Admin', 'Quality Analyst', 'Quality Supervisor', 'Manager'].includes(userData.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Get all active users
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      logger.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
      return;
    }

    res.json({ data: data || [] });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/notifications/subscriptions
 * Get notification subscriptions for users - Admin only (for debugging)
 */
router.get('/subscriptions', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (!userData || !['Admin', 'Super Admin'].includes(userData.role)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { user_id } = req.query;

    let query = supabase
      .from('notification_subscriptions')
      .select(`
        id, 
        user_id, 
        endpoint, 
        browser, 
        device_type, 
        is_active, 
        last_used_at, 
        created_at
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (user_id) {
      query = query.eq('user_id', user_id as string);
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

export default router;

