/**
 * Users API Routes
 * Server-side API for user operations
 * 
 * Uses per-request Supabase clients for proper user isolation:
 * - req.supabase!: User-scoped client (respects RLS)
 * - req.supabaseAdmin!: Admin client (bypasses RLS, use sparingly)
 */

import { Router, Response } from 'express';
import { verifyAuth, SupabaseRequest } from '../middleware/auth.middleware.js';
import { createLogger } from '../../utils/logger.js';
import { USER_PRIVATE_FIELDS } from '../../core/constants/field-whitelists.js';
import { sanitizeString, isValidEmail, INPUT_LIMITS } from '../utils/validation.js';

const router = Router();
const logger = createLogger('UsersAPI');

/**
 * GET /api/users/me
 * Get current user's profile
 */
router.get('/me', verifyAuth, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    // Use per-request client - respects RLS
    const supabase = req.supabase!;
    const user = req.user!;
    const userId = user.id;

    const { data, error } = await supabase
      .from('users')
      .select(USER_PRIVATE_FIELDS)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      logger.error('Error fetching user:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
      return;
    }

    // If the user doesn't have a row in our `users` table yet, auto-provision it.
    // This prevents the profile page from failing for users who authenticated successfully
    // but never triggered the "create user profile" flow.
    if (!data) {
      if (!user.email) {
        res.status(404).json({ error: 'User profile not found' });
        return;
      }

      const metadata = (user as any).user_metadata || {};
      const appMetadata = (user as any).app_metadata || {};

      const provider =
        appMetadata.provider ||
        (Array.isArray(appMetadata.providers) ? appMetadata.providers[0] : undefined) ||
        metadata.provider ||
        'unknown';

      const full_name = metadata.full_name || metadata.name || null;
      const avatar_url = metadata.avatar_url || metadata.picture || null;
      const now = new Date().toISOString();

      const { data: created, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email: user.email,
          full_name,
          avatar_url,
          provider,
          device_info: {},
          first_sign_in_at: now,
          last_sign_in_at: now,
          sign_in_count: '1',
        })
        .select(USER_PRIVATE_FIELDS)
        .single();

      if (createError) {
        logger.error('Error creating user profile:', createError);
        res.status(500).json({ error: 'Failed to create user profile' });
        return;
      }

      res.json({ data: created });
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
router.put('/me', verifyAuth, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    // Use per-request client - respects RLS
    const supabase = req.supabase!;
    const userId = req.user!.id;

    // Validate input (length limits to prevent DoS and overflow)
    const { full_name, avatar_url, notification_preferences, device_info } = req.body;

    // Build update object (only allow specific fields, sanitized with length limits)
    const updates: any = {};
    if (full_name !== undefined) updates.full_name = sanitizeString(String(full_name).trim(), INPUT_LIMITS.NAME);
    if (avatar_url !== undefined) updates.avatar_url = sanitizeString(String(avatar_url).trim(), INPUT_LIMITS.AVATAR_URL);
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

    // Sync avatar_url to people table so home/audit views can show agent avatars by email
    if (data?.email && updates.avatar_url !== undefined) {
      const { error: peopleError } = await supabase
        .from('people')
        .update({ avatar_url: updates.avatar_url || null })
        .eq('email', data.email);
      if (peopleError) {
        logger.warn('Could not sync avatar_url to people table:', peopleError);
        // Non-fatal: profile update succeeded
      }
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
router.post('/', verifyAuth, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    // Use admin client for user creation (may need to bypass RLS)
    const supabase = req.supabaseAdmin!;
    const userId = req.user!.id;

    const rawEmail = req.body.email;
    const email = rawEmail ? sanitizeString(String(rawEmail).toLowerCase().trim(), INPUT_LIMITS.EMAIL) : '';
    const full_name = req.body.full_name !== undefined ? sanitizeString(String(req.body.full_name).trim(), INPUT_LIMITS.NAME) : undefined;
    const avatar_url = req.body.avatar_url !== undefined ? sanitizeString(String(req.body.avatar_url).trim(), INPUT_LIMITS.AVATAR_URL) : undefined;
    const provider = req.body.provider !== undefined ? sanitizeString(String(req.body.provider).trim(), INPUT_LIMITS.TYPE) : undefined;
    const device_info = req.body.device_info;

    // Validate required fields
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
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

