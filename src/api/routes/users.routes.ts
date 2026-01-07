/**
 * Users API Routes
 * Server-side API for user operations
 */

import { Router, Response } from 'express';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createLogger } from '../../utils/logger.js';
import { USER_PRIVATE_FIELDS } from '../../core/constants/field-whitelists.js';

const router = Router();
const logger = createLogger('UsersAPI');

/**
 * GET /api/users/me
 * Get current user's profile
 */
router.get('/me', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('users')
      .select(USER_PRIVATE_FIELDS)
      .eq('id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
      return;
    }

    res.json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/me
 * Update current user's profile
 */
router.put('/me', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    // Validate input
    const { full_name, avatar_url, notification_preferences, device_info } = req.body;

    // Build update object (only allow specific fields)
    const updates: any = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (notification_preferences !== undefined) {
      updates.notification_preferences = notification_preferences;
    }
    if (device_info !== undefined) updates.device_info = device_info;

    // Ensure user can only update their own data
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user data' });
      return;
    }

    logger.info(`User ${userId} updated their profile`);
    res.json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/users
 * Create user profile (called after signup)
 */
router.post('/', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userId = req.user!.id;

    const { email, full_name, avatar_url, provider, device_info } = req.body;

    // Validate required fields
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (existing) {
      res.status(409).json({ error: 'User already exists' });
      return;
    }

    // Create user profile
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: full_name || null,
        avatar_url: avatar_url || null,
        provider: provider || 'google',
        device_info: device_info || {},
        first_sign_in_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        sign_in_count: '1',
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user profile' });
      return;
    }

    logger.info(`User profile created for ${userId}`);
    res.status(201).json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

