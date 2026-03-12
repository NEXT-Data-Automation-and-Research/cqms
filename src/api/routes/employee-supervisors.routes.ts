/**
 * Employee-Supervisors API Routes
 * Manages many-to-many employee↔supervisor mappings.
 * Admins can CRUD all mappings; supervisors/employees can read their own.
 *
 * Uses per-request Supabase clients:
 * - req.supabaseAdmin!: Admin client (bypasses RLS)
 */

import { Router, Response } from 'express';
import { verifyAuth, SupabaseRequest } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../utils/admin-check.js';
import { createLogger } from '../../utils/logger.js';
import { sanitizeString, isValidEmail } from '../utils/validation.js';

const router = Router();
const logger = createLogger('EmployeeSupervisorsAPI');

/**
 * GET /api/employee-supervisors
 * Admin: returns all mappings (optionally filtered by ?employee_email= or ?supervisor_email=)
 * Requires Admin access
 */
router.get('/', verifyAuth, requireAdmin, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    const supabase = req.supabaseAdmin!;
    let query = supabase.from('employee_supervisors').select('*').order('created_at', { ascending: false });

    const { employee_email, supervisor_email } = req.query;
    if (employee_email && typeof employee_email === 'string') {
      query = query.eq('employee_email', employee_email.toLowerCase().trim());
    }
    if (supervisor_email && typeof supervisor_email === 'string') {
      query = query.eq('supervisor_email', supervisor_email.toLowerCase().trim());
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching employee_supervisors:', error);
      res.status(500).json({ error: 'Failed to fetch mappings' });
      return;
    }
    res.json({ data: data || [] });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/employee-supervisors
 * Assign an employee to a supervisor.
 * Body: { employee_email, supervisor_email }
 * Requires Admin access
 */
router.post('/', verifyAuth, requireAdmin, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    const supabase = req.supabaseAdmin!;
    const { employee_email, supervisor_email } = req.body;

    if (!employee_email || !supervisor_email) {
      res.status(400).json({ error: 'employee_email and supervisor_email are required' });
      return;
    }

    const empEmail = sanitizeString(employee_email.toLowerCase().trim(), 255);
    const supEmail = sanitizeString(supervisor_email.toLowerCase().trim(), 255);

    if (!empEmail || !isValidEmail(empEmail)) {
      res.status(400).json({ error: 'Invalid employee_email format' });
      return;
    }
    if (!supEmail || !isValidEmail(supEmail)) {
      res.status(400).json({ error: 'Invalid supervisor_email format' });
      return;
    }
    if (empEmail === supEmail) {
      res.status(400).json({ error: 'Employee and supervisor cannot be the same person' });
      return;
    }

    const createdBy = req.user?.email || null;

    const { data, error } = await supabase
      .from('employee_supervisors')
      .insert([{ employee_email: empEmail, supervisor_email: supEmail, created_by: createdBy }])
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'This employee-supervisor mapping already exists' });
        return;
      }
      logger.error('Error creating mapping:', error);
      res.status(500).json({ error: 'Failed to create mapping' });
      return;
    }

    logger.info(`Mapping created: ${empEmail} → ${supEmail} by ${createdBy}`);
    res.status(201).json({ data });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/employee-supervisors/bulk
 * Assign one employee to multiple supervisors at once.
 * Body: { employee_email, supervisor_emails: string[] }
 * Requires Admin access
 */
router.post('/bulk', verifyAuth, requireAdmin, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    const supabase = req.supabaseAdmin!;
    const { employee_email, supervisor_emails } = req.body;

    if (!employee_email || !Array.isArray(supervisor_emails) || supervisor_emails.length === 0) {
      res.status(400).json({ error: 'employee_email and supervisor_emails[] are required' });
      return;
    }

    const empEmail = sanitizeString(employee_email.toLowerCase().trim(), 255);
    if (!empEmail || !isValidEmail(empEmail)) {
      res.status(400).json({ error: 'Invalid employee_email format' });
      return;
    }

    const createdBy = req.user?.email || null;
    const rows = [];

    for (const sup of supervisor_emails) {
      const supEmail = sanitizeString(String(sup).toLowerCase().trim(), 255);
      if (!supEmail || !isValidEmail(supEmail)) {
        res.status(400).json({ error: `Invalid supervisor email: ${sup}` });
        return;
      }
      if (supEmail === empEmail) continue; // skip self-assignment
      rows.push({ employee_email: empEmail, supervisor_email: supEmail, created_by: createdBy });
    }

    if (rows.length === 0) {
      res.status(400).json({ error: 'No valid supervisor emails after validation' });
      return;
    }

    const { data, error } = await supabase
      .from('employee_supervisors')
      .upsert(rows, { onConflict: 'employee_email,supervisor_email', ignoreDuplicates: true })
      .select('*');

    if (error) {
      logger.error('Error creating bulk mappings:', error);
      res.status(500).json({ error: 'Failed to create mappings' });
      return;
    }

    logger.info(`Bulk mapping: ${empEmail} → ${rows.length} supervisors by ${createdBy}`);
    res.status(201).json({ data: data || [], created: rows.length });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/employee-supervisors/:id
 * Remove a specific mapping by ID.
 * Requires Admin access
 */
router.delete('/:id', verifyAuth, requireAdmin, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    const supabase = req.supabaseAdmin!;
    const { id } = req.params;

    const { error } = await supabase
      .from('employee_supervisors')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting mapping:', error);
      res.status(500).json({ error: 'Failed to delete mapping' });
      return;
    }

    logger.info(`Mapping deleted: ${id}`);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/employee-supervisors/by-email
 * Remove mapping by employee_email + supervisor_email.
 * Body: { employee_email, supervisor_email }
 * Requires Admin access
 */
router.post('/remove', verifyAuth, requireAdmin, async (req: SupabaseRequest, res: Response): Promise<void> => {
  try {
    const supabase = req.supabaseAdmin!;
    const { employee_email, supervisor_email } = req.body;

    if (!employee_email || !supervisor_email) {
      res.status(400).json({ error: 'employee_email and supervisor_email are required' });
      return;
    }

    const { error } = await supabase
      .from('employee_supervisors')
      .delete()
      .eq('employee_email', employee_email.toLowerCase().trim())
      .eq('supervisor_email', supervisor_email.toLowerCase().trim());

    if (error) {
      logger.error('Error deleting mapping:', error);
      res.status(500).json({ error: 'Failed to delete mapping' });
      return;
    }

    logger.info(`Mapping removed: ${employee_email} → ${supervisor_email}`);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
