/**
 * Permission Management API Routes
 * CRUD operations for permissions (admin only)
 */

import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../utils/admin-check.js';
import { permissionService } from '../../core/permissions/permission.service.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const logger = createLogger('PermissionsAPI');
const router = Router();

/**
 * GET /api/permissions/check
 * Check current user's permissions for a resource
 */
router.post('/check', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { resourceName, ruleType = 'feature' } = req.body;

    if (!resourceName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'resourceName is required',
      });
    }

    const userEmail = req.user?.email?.toLowerCase().trim();
    if (!userEmail) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User email not found',
      });
    }

    // Get user role
    const supabase = getServerSupabase();
    const { data: peopleData } = await supabase
      .from('people')
      .select('role')
      .eq('email', userEmail)
      .maybeSingle();

    const userRole = peopleData?.role || null;

    // Check permission
    const check = await permissionService.checkPermission(
      userEmail,
      userRole,
      resourceName,
      ruleType
    );

    res.json({
      hasAccess: check.hasAccess,
      reason: check.reason,
      resourceName,
      ruleType,
      userRole,
      checkedRules: check.checkedRules,
    });
  } catch (error: any) {
    logger.error('Error checking permission:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/permissions/user
 * Get current user's permissions summary
 */
router.get('/user', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userEmail = req.user?.email?.toLowerCase().trim();
    if (!userEmail) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User email not found',
      });
    }

    // Get user role
    const supabase = getServerSupabase();
    const { data: peopleData } = await supabase
      .from('people')
      .select('role')
      .eq('email', userEmail)
      .maybeSingle();

    const userRole = peopleData?.role || null;

    // Get permissions summary
    const permissions = await permissionService.getUserPermissions(userEmail, userRole);

    res.json(permissions);
  } catch (error: any) {
    logger.error('Error getting user permissions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/permissions/rules
 * List all permission rules (admin only)
 */
router.get('/rules', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { ruleType, resourceName, isActive } = req.query;

    const supabase = getServerSupabase();
    let query = supabase.from('access_control_rules').select('*');

    if (ruleType) {
      query = query.eq('rule_type', ruleType);
    }
    if (resourceName) {
      query = query.eq('resource_name', resourceName);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ rules: data || [] });
  } catch (error: any) {
    logger.error('Error listing rules:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/permissions/rules
 * Create a new permission rule (admin only)
 */
router.post('/rules', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      ruleType,
      resourceName,
      allowedRoles,
      minRoleLevel,
      customCheckFunction,
      isActive = true,
    } = req.body;

    if (!ruleType || !resourceName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'ruleType and resourceName are required',
      });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('access_control_rules')
      .insert({
        rule_type: ruleType,
        resource_name: resourceName,
        allowed_roles: allowedRoles || null,
        min_role_level: minRoleLevel || null,
        custom_check_function: customCheckFunction || null,
        is_active: isActive,
        created_by: req.user?.email || null,
        updated_by: req.user?.email || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Clear cache
    permissionService.clearCache();

    logger.info(`Permission rule created: ${resourceName} by ${req.user?.email}`);
    res.status(201).json({ rule: data });
  } catch (error: any) {
    logger.error('Error creating rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * PUT /api/permissions/rules/:id
 * Update a permission rule (admin only)
 */
router.put('/rules/:id', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const {
      ruleType,
      resourceName,
      allowedRoles,
      minRoleLevel,
      customCheckFunction,
      isActive,
    } = req.body;

    const supabase = getServerSupabase();
    const updateData: any = {
      updated_by: req.user?.email || null,
      updated_at: new Date().toISOString(),
    };

    if (ruleType !== undefined) updateData.rule_type = ruleType;
    if (resourceName !== undefined) updateData.resource_name = resourceName;
    if (allowedRoles !== undefined) updateData.allowed_roles = allowedRoles;
    if (minRoleLevel !== undefined) updateData.min_role_level = minRoleLevel;
    if (customCheckFunction !== undefined) updateData.custom_check_function = customCheckFunction;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from('access_control_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Clear cache
    permissionService.clearCache();

    logger.info(`Permission rule updated: ${id} by ${req.user?.email}`);
    res.json({ rule: data });
  } catch (error: any) {
    logger.error('Error updating rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/permissions/rules/:id
 * Delete a permission rule (admin only)
 */
router.delete('/rules/:id', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const supabase = getServerSupabase();
    const { error } = await supabase
      .from('access_control_rules')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Clear cache
    permissionService.clearCache();

    logger.info(`Permission rule deleted: ${id} by ${req.user?.email}`);
    res.json({ message: 'Rule deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/permissions/user-rules
 * Get all individual user permissions (admin only)
 * Optional query params: email, ruleType, accessType
 */
router.get('/user-rules', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { email, ruleType, accessType } = req.query;

    const supabase = getServerSupabase();
    let query = supabase.from('user_access_rule').select('*');

    if (email) {
      query = query.eq('user_email', (email as string).toLowerCase().trim());
    }
    if (ruleType) {
      query = query.eq('rule_type', ruleType);
    }
    if (accessType) {
      query = query.eq('access_type', accessType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ rules: data || [] });
  } catch (error: any) {
    logger.error('Error getting user rules:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/permissions/user-rules/:email
 * Get individual user permissions by email (admin only)
 */
router.get('/user-rules/:email', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = req.params;

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('user_access_rule')
      .select('*')
      .eq('user_email', email.toLowerCase().trim())
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json({ rules: data || [] });
  } catch (error: any) {
    logger.error('Error getting user rules:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/permissions/user-rules
 * Create individual user permission (admin only)
 */
router.post('/user-rules', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      userEmail,
      ruleType,
      resourceName,
      accessType = 'allow',
      isActive = true,
    } = req.body;

    if (!userEmail || !ruleType || !resourceName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userEmail, ruleType, and resourceName are required',
      });
    }

    if (!['allow', 'deny'].includes(accessType)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'accessType must be "allow" or "deny"',
      });
    }

    const supabase = getServerSupabase();
    const { data, error } = await supabase
      .from('user_access_rule')
      .insert({
        user_email: userEmail.toLowerCase().trim(),
        rule_type: ruleType,
        resource_name: resourceName,
        access_type: accessType,
        is_active: isActive,
        created_by: req.user?.email || null,
        updated_by: req.user?.email || null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Clear cache for this user
    permissionService.clearCache(userEmail);

    logger.info(`User permission created: ${userEmail} -> ${resourceName} by ${req.user?.email}`);
    res.status(201).json({ rule: data });
  } catch (error: any) {
    logger.error('Error creating user rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * PUT /api/permissions/user-rules/:id
 * Update individual user permission (admin only)
 */
router.put('/user-rules/:id', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const {
      userEmail,
      ruleType,
      resourceName,
      accessType,
      isActive,
    } = req.body;

    const supabase = getServerSupabase();
    const updateData: any = {
      updated_by: req.user?.email || null,
      updated_at: new Date().toISOString(),
    };

    if (userEmail !== undefined) updateData.user_email = userEmail.toLowerCase().trim();
    if (ruleType !== undefined) updateData.rule_type = ruleType;
    if (resourceName !== undefined) updateData.resource_name = resourceName;
    if (accessType !== undefined) updateData.access_type = accessType;
    if (isActive !== undefined) updateData.is_active = isActive;

    const { data, error } = await supabase
      .from('user_access_rule')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Clear cache for this user
    if (data?.user_email) {
      permissionService.clearCache(data.user_email);
    }

    logger.info(`User permission updated: ${id} by ${req.user?.email}`);
    res.json({ rule: data });
  } catch (error: any) {
    logger.error('Error updating user rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/permissions/user-rules/:id
 * Delete individual user permission (admin only)
 */
router.delete('/user-rules/:id', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;

    const supabase = getServerSupabase();
    
    // Get the rule first to get user email for cache clearing
    const { data: rule } = await supabase
      .from('user_access_rule')
      .select('user_email')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('user_access_rule')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Clear cache for this user
    if (rule?.user_email) {
      permissionService.clearCache(rule.user_email);
    }

    logger.info(`User permission deleted: ${id} by ${req.user?.email}`);
    res.json({ message: 'User permission deleted successfully' });
  } catch (error: any) {
    logger.error('Error deleting user rule:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
