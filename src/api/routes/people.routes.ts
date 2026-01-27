/**
 * People API Routes
 * Server-side API for people/user management operations
 * Uses service role key to bypass RLS for authorized operations
 */

import { Router, Response } from 'express';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../utils/admin-check.js';
import { createLogger } from '../../utils/logger.js';
import { PEOPLE_USER_MANAGEMENT_FIELDS } from '../../core/constants/field-whitelists.js';
import { sanitizeString, isValidEmail } from '../utils/validation.js';
import { generateDefaultPasswordHash } from '../../utils/password-utils.js';
import { validateRequestBody, VALIDATION_RULES, validateRequestSize } from '../middleware/validation.middleware.js';

const router = Router();
const logger = createLogger('PeopleAPI');

/**
 * GET /api/people
 * Get all people/users (for user management)
 * Requires Admin access (uses service role key, bypasses RLS)
 */
router.get('/', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    
    const { data, error } = await supabase
      .from('people')
      .select(PEOPLE_USER_MANAGEMENT_FIELDS)
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching people:', error);
      res.status(500).json({ error: 'Failed to fetch people data' });
      return;
    }

    res.json({ data: data || [] });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/people/:email
 * Get a specific person by email
 * Requires Admin access (uses service role key, bypasses RLS)
 */
router.get('/:email', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const { email } = req.params;

    const { data, error } = await supabase
      .from('people')
      .select(PEOPLE_USER_MANAGEMENT_FIELDS)
      .eq('email', email)
      .single();

    if (error) {
      logger.error('Error fetching person:', error);
      res.status(500).json({ error: 'Failed to fetch person data' });
      return;
    }

    res.json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/people
 * Create a new person/user
 * Requires Admin access (uses service role key, bypasses RLS)
 */
router.post('/', 
  verifyAuth, 
  requireAdmin, 
  validateRequestSize(1024 * 1024), // 1MB limit
  validateRequestBody({
    email: VALIDATION_RULES.email,
    name: VALIDATION_RULES.name,
    role: VALIDATION_RULES.role,
    department: VALIDATION_RULES.department,
    employee_id: VALIDATION_RULES.employee_id
  }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const userData = req.body;

    // Validate and sanitize required fields
    if (!userData.email || typeof userData.email !== 'string') {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const sanitizedEmail = sanitizeString(userData.email.toLowerCase().trim(), 255);
    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Validate role
    const validRoles = ['Super Admin', 'Admin', 'Quality Analyst', 'Employee', 'General User'];
    if (!userData.role || !validRoles.includes(userData.role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    // Validate and sanitize name
    if (!userData.name || typeof userData.name !== 'string') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const sanitizedName = sanitizeString(userData.name.trim(), 100);
    if (!sanitizedName) {
      res.status(400).json({ error: 'Name contains invalid characters' });
      return;
    }

    // Sanitize all string fields
    const sanitizedData: any = {
      email: sanitizedEmail,
      name: sanitizedName,
      role: userData.role,
      department: userData.department ? sanitizeString(userData.department, 100) : null,
      channel: userData.channel ? sanitizeString(userData.channel, 100) : null,
      team: userData.team ? sanitizeString(userData.team, 100) : null,
      designation: userData.designation ? sanitizeString(userData.designation, 100) : null,
      country: userData.country ? sanitizeString(userData.country, 100) : null,
      team_supervisor: userData.team_supervisor ? sanitizeString(userData.team_supervisor, 255) : null,
      quality_mentor: userData.quality_mentor ? sanitizeString(userData.quality_mentor, 255) : null,
      intercom_admin_id: userData.intercom_admin_id ? sanitizeString(userData.intercom_admin_id, 50) : null,
      intercom_admin_alias: userData.intercom_admin_alias ? sanitizeString(userData.intercom_admin_alias, 100) : null,
      is_active: userData.is_active ?? true,
      password_hash: generateDefaultPasswordHash(sanitizedEmail),
      login_count: 0,
      last_login: null
    };

    // Convert employee_id to number if provided
    if (userData.employee_id) {
      if (typeof userData.employee_id === 'string') {
        const sanitized = sanitizeString(userData.employee_id, 50);
        const parsed = parseInt(sanitized, 10);
        sanitizedData.employee_id = !isNaN(parsed) ? parsed : null;
      } else if (typeof userData.employee_id === 'number') {
        sanitizedData.employee_id = userData.employee_id;
      }
    }

    // Convert login_count to string if provided (DB stores as text)
    if (userData.login_count !== undefined && typeof userData.login_count === 'number') {
      sanitizedData.login_count = String(userData.login_count);
    }

    const { data, error } = await supabase
      .from('people')
      .insert([sanitizedData])
      .select(PEOPLE_USER_MANAGEMENT_FIELDS)
      .single();

    if (error) {
      logger.error('Error creating person:', error);
      res.status(500).json({ error: 'Failed to create person' });
      return;
    }

    logger.info(`Person created: ${sanitizedEmail}`);
    
    res.status(201).json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/people/:email
 * Update a person by email
 * Requires Admin access (uses service role key, bypasses RLS)
 */
router.put('/:email', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const { email } = req.params;
    const updates = req.body;

    // Validate and sanitize email parameter
    const sanitizedEmail = sanitizeString(email.toLowerCase().trim(), 255);
    if (!sanitizedEmail || !isValidEmail(sanitizedEmail)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    // Validate role if provided
    const validRoles = ['Super Admin', 'Admin', 'Quality Analyst', 'Employee', 'General User'];
    if (updates.role && !validRoles.includes(updates.role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    // Sanitize all string fields in updates
    const sanitizedUpdates: any = {};
    if (updates.name !== undefined) {
      if (updates.name && typeof updates.name === 'string') {
        const sanitized = sanitizeString(updates.name.trim(), 100);
        sanitizedUpdates.name = sanitized || null;
      } else {
        sanitizedUpdates.name = null;
      }
    }
    if (updates.role !== undefined) sanitizedUpdates.role = updates.role;
    if (updates.department !== undefined) sanitizedUpdates.department = updates.department ? sanitizeString(updates.department, 100) : null;
    if (updates.channel !== undefined) sanitizedUpdates.channel = updates.channel ? sanitizeString(updates.channel, 100) : null;
    if (updates.team !== undefined) sanitizedUpdates.team = updates.team ? sanitizeString(updates.team, 100) : null;
    if (updates.designation !== undefined) sanitizedUpdates.designation = updates.designation ? sanitizeString(updates.designation, 100) : null;
    if (updates.country !== undefined) sanitizedUpdates.country = updates.country ? sanitizeString(updates.country, 100) : null;
    if (updates.team_supervisor !== undefined) sanitizedUpdates.team_supervisor = updates.team_supervisor ? sanitizeString(updates.team_supervisor, 255) : null;
    if (updates.quality_mentor !== undefined) sanitizedUpdates.quality_mentor = updates.quality_mentor ? sanitizeString(updates.quality_mentor, 255) : null;
    if (updates.intercom_admin_id !== undefined) sanitizedUpdates.intercom_admin_id = updates.intercom_admin_id ? sanitizeString(updates.intercom_admin_id, 50) : null;
    if (updates.intercom_admin_alias !== undefined) sanitizedUpdates.intercom_admin_alias = updates.intercom_admin_alias ? sanitizeString(updates.intercom_admin_alias, 100) : null;
    if (updates.is_active !== undefined) sanitizedUpdates.is_active = updates.is_active;

    // Convert employee_id to number if provided
    if (updates.employee_id !== undefined) {
      if (typeof updates.employee_id === 'string') {
        const sanitized = sanitizeString(updates.employee_id, 50);
        const parsed = parseInt(sanitized, 10);
        sanitizedUpdates.employee_id = !isNaN(parsed) ? parsed : null;
      } else if (typeof updates.employee_id === 'number') {
        sanitizedUpdates.employee_id = updates.employee_id;
      } else {
        sanitizedUpdates.employee_id = null;
      }
    }

    // Convert login_count to string if provided (DB stores as text)
    if (updates.login_count !== undefined && typeof updates.login_count === 'number') {
      sanitizedUpdates.login_count = String(updates.login_count);
    }

    const { data, error } = await supabase
      .from('people')
      .update(sanitizedUpdates)
      .eq('email', sanitizedEmail)
      .select(PEOPLE_USER_MANAGEMENT_FIELDS)
      .single();

    if (error) {
      logger.error('Error updating person:', error);
      res.status(500).json({ error: 'Failed to update person' });
      return;
    }

    logger.info(`Person updated: ${sanitizedEmail}`);
    
    res.json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/people/bulk-update
 * Bulk update multiple people
 * Requires Admin access (uses service role key, bypasses RLS)
 */
router.post('/bulk-update', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const supabase = getServerSupabase();
    const { emails, updates } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      res.status(400).json({ error: 'emails array is required' });
      return;
    }

    // Validate and sanitize email addresses
    const sanitizedEmails: string[] = [];
    for (const email of emails) {
      if (!email || typeof email !== 'string') {
        res.status(400).json({ error: 'Invalid email in emails array' });
        return;
      }
      const sanitized = sanitizeString(email.toLowerCase().trim(), 255);
      if (!sanitized || !isValidEmail(sanitized)) {
        res.status(400).json({ error: `Invalid email format: ${email}` });
        return;
      }
      sanitizedEmails.push(sanitized);
    }

    // Validate role if provided
    const validRoles = ['Super Admin', 'Admin', 'Quality Analyst', 'Employee', 'General User'];
    if (updates.role && !validRoles.includes(updates.role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    // Sanitize all string fields in updates
    const sanitizedUpdates: any = {};
    if (updates.role !== undefined) sanitizedUpdates.role = updates.role;
    if (updates.department !== undefined) sanitizedUpdates.department = updates.department ? sanitizeString(updates.department, 100) : null;
    if (updates.channel !== undefined) sanitizedUpdates.channel = updates.channel ? sanitizeString(updates.channel, 100) : null;
    if (updates.team !== undefined) sanitizedUpdates.team = updates.team ? sanitizeString(updates.team, 100) : null;
    if (updates.team_supervisor !== undefined) sanitizedUpdates.team_supervisor = updates.team_supervisor ? sanitizeString(updates.team_supervisor, 255) : null;
    if (updates.quality_mentor !== undefined) sanitizedUpdates.quality_mentor = updates.quality_mentor ? sanitizeString(updates.quality_mentor, 255) : null;
    if (updates.is_active !== undefined) sanitizedUpdates.is_active = updates.is_active;

    // Convert employee_id to number if provided
    if (updates.employee_id !== undefined) {
      if (typeof updates.employee_id === 'string') {
        const sanitized = sanitizeString(updates.employee_id, 50);
        const parsed = parseInt(sanitized, 10);
        sanitizedUpdates.employee_id = !isNaN(parsed) ? parsed : null;
      } else if (typeof updates.employee_id === 'number') {
        sanitizedUpdates.employee_id = updates.employee_id;
      } else {
        sanitizedUpdates.employee_id = null;
      }
    }

    // Convert login_count to string if provided
    if (updates.login_count !== undefined && typeof updates.login_count === 'number') {
      sanitizedUpdates.login_count = String(updates.login_count);
    }

    // Update each user individually (Supabase doesn't support bulk update with different conditions easily)
    const results = [];
    const errors = [];

    for (const email of sanitizedEmails) {
      const { data, error } = await supabase
        .from('people')
        .update(sanitizedUpdates)
        .eq('email', email)
        .select(PEOPLE_USER_MANAGEMENT_FIELDS)
        .single();

      if (error) {
        errors.push({ email, error: error.message });
      } else {
        results.push(data);
      }
    }

    logger.info(`Bulk updated ${results.length} people, ${errors.length} errors`);
    
    res.json({ data: results, errors: errors.length > 0 ? errors : undefined });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

