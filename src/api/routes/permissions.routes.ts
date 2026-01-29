/**
 * Permission Management API Routes
 * CRUD uses requirePermission('settings/permissions', 'page') so anyone who can access the page can manage rules.
 */

import { randomUUID } from 'crypto';
import { Router } from 'express';
import { verifyAuth } from '../middleware/auth.middleware.js';
import { requirePermission } from '../middleware/permission.middleware.js';
import { permissionService } from '../../core/permissions/permission.service.js';
import { ALL_RESOURCES_FOR_UI } from '../../core/permissions/permission-resources.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

const logger = createLogger('PermissionsAPI');
const router = Router();

/**
 * POST /api/permissions/check
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
    logger.info(`Permission check: user=${userEmail}, resource=${resourceName}, type=${ruleType}`);
    
    if (!userEmail) {
      logger.warn('Permission check failed: no user email in request');
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
    logger.info(`Permission check: found role=${userRole} for ${userEmail}`);

    // Check permission
    const check = await permissionService.checkPermission(
      userEmail,
      userRole,
      resourceName,
      ruleType
    );

    logger.info(`Permission check result: ${userEmail} -> ${resourceName}/${ruleType} = ${check.hasAccess} (${check.reason})`);

    res.json({
      hasAccess: check.hasAccess,
      reason: check.reason,
      resourceName,
      ruleType,
      userRole,
      userEmail, // Include email so frontend can verify
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
 * GET /api/permissions/resources
 * Returns canonical resource list for UI (dropdowns, labels).
 * No auth required for registry; used by permission management page.
 */
router.get('/resources', (_req, res) => {
  try {
    res.json({ resources: ALL_RESOURCES_FOR_UI });
  } catch (error: any) {
    logger.error('Error returning resources:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

/**
 * POST /api/permissions/check-batch
 * Check multiple permissions for current user in one call (e.g. for sidebar).
 * Body: { checks: Array<{ resourceName: string, ruleType: string }> }
 * Returns:
 * - results: Record<string, boolean> keyed by "resourceName:ruleType" (backward compatible)
 * - details: Record<string, { hasAccess: boolean, reason: string }> (new, for UI edge cases like explicit DENY)
 */
router.post('/check-batch', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { checks } = req.body as { checks?: Array<{ resourceName: string; ruleType: string }> };
    if (!Array.isArray(checks) || checks.length === 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'checks array is required' });
    }
    const userEmail = req.user?.email?.toLowerCase().trim();
    if (!userEmail) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User email not found' });
    }
    const supabase = getServerSupabase();
    const { data: peopleData } = await supabase
      .from('people')
      .select('role')
      .eq('email', userEmail)
      .maybeSingle();
    const userRole = peopleData?.role || null;
    const results: Record<string, boolean> = {};
    const details: Record<string, { hasAccess: boolean; reason: string }> = {};
    for (const { resourceName, ruleType } of checks) {
      const key = `${resourceName}:${ruleType}`;
      const check = await permissionService.checkPermission(
        userEmail,
        userRole,
        resourceName,
        ruleType as 'page' | 'feature' | 'api_endpoint' | 'action'
      );
      results[key] = check.hasAccess;
      details[key] = { hasAccess: check.hasAccess, reason: check.reason || 'Unknown' };
    }
    res.json({ results, details, userRole, userEmail });
  } catch (error: any) {
    logger.error('Error in check-batch:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
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
router.get('/rules', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
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
router.post('/rules', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
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
router.put('/rules/:id', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
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
router.delete('/rules/:id', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
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
router.get('/user-rules', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
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
router.get('/user-rules/:email', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
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
router.post('/user-rules', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
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

    const normalizedEmail = String(userEmail).toLowerCase().trim();
    const normalizedRuleType = String(ruleType).toLowerCase().trim();
    const normalizedResourceName = String(resourceName).trim();
    
    const supabase = getServerSupabase();
    
    // Check for existing duplicate rule
    const { data: existingRule } = await supabase
      .from('user_access_rule')
      .select('id, access_type')
      .eq('user_email', normalizedEmail)
      .eq('rule_type', normalizedRuleType)
      .eq('resource_name', normalizedResourceName)
      .eq('is_active', true)
      .maybeSingle();

    if (existingRule) {
      // If same access type, it's a true duplicate
      if (existingRule.access_type === accessType) {
        return res.status(409).json({
          error: 'Duplicate rule',
          message: `A rule for this user and resource already exists with the same access type`,
          existingRuleId: existingRule.id,
        });
      }
      // If different access type, update the existing rule instead
      const { data: updatedRule, error: updateError } = await supabase
        .from('user_access_rule')
        .update({ access_type: accessType, updated_at: new Date().toISOString() })
        .eq('id', existingRule.id)
        .select()
        .single();

      if (updateError) {
        logger.error('User rule update during conflict resolution failed:', updateError);
        return res.status(400).json({
          error: 'Failed to update existing rule',
          message: updateError.message,
        });
      }

      permissionService.clearCache();
      logger.info(`User permission updated (conflict resolution): ${normalizedEmail} -> ${normalizedResourceName} by ${req.user?.email}`);
      return res.json({ rule: updatedRule, updated: true });
    }

    const insertPayload: Record<string, unknown> = {
      id: randomUUID(),
      user_email: normalizedEmail,
      rule_type: normalizedRuleType,
      resource_name: normalizedResourceName,
      access_type: accessType,
      is_active: Boolean(isActive),
    };

    const { data, error } = await supabase
      .from('user_access_rule')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      const errMsg = error.message || String(error.details) || 'Database error';
      logger.error('User rule insert failed:', { message: error.message, details: error.details, code: error.code });
      return res.status(400).json({
        error: 'Failed to create permission',
        message: errMsg,
      });
    }

    // Clear ALL cache to ensure permission changes take effect immediately
    permissionService.clearCache();
    logger.info(`User permission created: ${normalizedEmail} -> ${resourceName} by ${req.user?.email}`);
    res.status(201).json({ rule: data });
  } catch (error: any) {
    const msg = error?.message || 'An unexpected error occurred';
    logger.error('Error creating user rule:', { message: msg, stack: error?.stack });
    res.status(500).json({
      error: msg,
      message: msg,
    });
  }
});

/**
 * PUT /api/permissions/user-rules/:id
 * Update individual user permission (admin only)
 */
router.put('/user-rules/:id', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const idTrimmed = typeof id === 'string' ? id.trim() : '';
    if (!idTrimmed) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Rule id is required for update',
      });
    }

    const {
      userEmail,
      ruleType,
      resourceName,
      accessType,
      isActive,
    } = req.body;

    const supabase = getServerSupabase();
    // Build update payload from whitelist only – never include id (would violate not-null on update)
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (userEmail !== undefined) updateData.user_email = String(userEmail).toLowerCase().trim();
    if (ruleType !== undefined) updateData.rule_type = String(ruleType).toLowerCase().trim();
    if (resourceName !== undefined) updateData.resource_name = String(resourceName).trim();
    if (accessType !== undefined) updateData.access_type = accessType;
    if (isActive !== undefined) updateData.is_active = Boolean(isActive);
    delete (updateData as Record<string, unknown>).id;

    const { data, error } = await supabase
      .from('user_access_rule')
      .update(updateData)
      .eq('id', idTrimmed)
      .select()
      .single();

    if (error) {
      logger.error('User rule update failed:', error.message, error.details);
      return res.status(400).json({
        error: 'Failed to update permission',
        message: error.message || 'Database error',
      });
    }

    // Clear ALL cache to ensure permission changes take effect immediately
    permissionService.clearCache();

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
router.delete('/user-rules/:id', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
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

    // Clear ALL cache to ensure permission changes take effect immediately
    permissionService.clearCache();

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

/**
 * GET /api/permissions/debug
 * Debug endpoint to see current user's auth info and permissions
 */
router.get('/debug', verifyAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const userEmail = req.user?.email?.toLowerCase().trim();
    const userId = req.user?.id;

    // Get user from people table
    const supabase = getServerSupabase();
    const { data: peopleData } = await supabase
      .from('people')
      .select('*')
      .eq('email', userEmail || '')
      .maybeSingle();

    // Get individual rules for this user
    const { data: userRules } = await supabase
      .from('user_access_rule')
      .select('*')
      .eq('user_email', userEmail || '')
      .eq('is_active', true);

    // Test impersonation permission
    permissionService.clearCache(userEmail || '');
    const impersonationCheck = await permissionService.checkPermission(
      userEmail || '',
      peopleData?.role || null,
      'settings/impersonation',
      'page'
    );

    res.json({
      auth: {
        userId,
        userEmailFromToken: req.user?.email,
        normalizedEmail: userEmail,
      },
      peopleRecord: peopleData,
      individualRules: userRules,
      impersonationPermission: impersonationCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Debug endpoint error:', error);
    res.status(500).json({
      error: 'Error',
      message: error.message,
    });
  }
});

/**
 * POST /api/permissions/test
 * Test permission for a specific user (admin can test any user)
 * Returns detailed breakdown of why access is granted/denied
 */
router.post('/test', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
  try {
    const { userEmail, resourceName, ruleType = 'page' } = req.body;

    if (!userEmail || !resourceName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'userEmail and resourceName are required',
      });
    }

    const normalizedEmail = String(userEmail).toLowerCase().trim();

    // Get user role from people table
    const supabase = getServerSupabase();
    const { data: peopleData } = await supabase
      .from('people')
      .select('role, name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    const userRole = peopleData?.role || null;
    const userName = peopleData?.name || normalizedEmail;

    // Clear cache for this user before testing to get fresh result
    permissionService.clearCache(normalizedEmail);

    // Check permission
    const check = await permissionService.checkPermission(
      normalizedEmail,
      userRole,
      resourceName,
      ruleType as 'page' | 'feature' | 'api_endpoint' | 'action'
    );

    res.json({
      userEmail: normalizedEmail,
      userName,
      userRole,
      resourceName,
      ruleType,
      hasAccess: check.hasAccess,
      reason: check.reason,
      checkedRules: check.checkedRules,
      testedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error testing permission:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * POST /api/permissions/clear-cache
 * Clear all permission cache (admin only)
 */
router.post('/clear-cache', verifyAuth, requirePermission('settings/permissions', 'page'), async (_req: AuthenticatedRequest, res) => {
  try {
    permissionService.clearCache();
    res.json({ message: 'Permission cache cleared successfully', clearedAt: new Date().toISOString() });
  } catch (error: any) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

/**
 * GET /api/permissions/user-access/:email
 * Get complete access summary for a user (role + individual overrides)
 * Shows all features and whether user has access to each
 */
router.get('/user-access/:email', verifyAuth, requirePermission('settings/permissions', 'page'), async (req: AuthenticatedRequest, res) => {
  try {
    const { email } = req.params;
    const normalizedEmail = String(email).toLowerCase().trim();

    const supabase = getServerSupabase();

    // Get user info
    const { data: userData } = await supabase
      .from('people')
      .select('email, name, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!userData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Get all individual rules for this user
    const { data: individualRules } = await supabase
      .from('user_access_rule')
      .select('*')
      .eq('user_email', normalizedEmail)
      .eq('is_active', true);

    // Get all role-based rules
    const { data: roleRules } = await supabase
      .from('access_control_rules')
      .select('*')
      .eq('is_active', true);

    // Build feature access summary
    const featureAccess: Array<{
      resource: string;
      label: string;
      type: string;
      hasAccess: boolean;
      source: 'role' | 'individual_allow' | 'individual_deny' | 'default_deny';
      canOverride: boolean;
    }> = [];

    for (const resource of ALL_RESOURCES_FOR_UI) {
      // Check for individual deny (highest priority)
      const denyRule = individualRules?.find(
        r => r.resource_name === resource.value && r.rule_type === resource.type && r.access_type === 'deny'
      );
      if (denyRule) {
        featureAccess.push({
          resource: resource.value,
          label: resource.label,
          type: resource.type,
          hasAccess: false,
          source: 'individual_deny',
          canOverride: true,
        });
        continue;
      }

      // Check for individual allow
      const allowRule = individualRules?.find(
        r => r.resource_name === resource.value && r.rule_type === resource.type && r.access_type === 'allow'
      );
      if (allowRule) {
        featureAccess.push({
          resource: resource.value,
          label: resource.label,
          type: resource.type,
          hasAccess: true,
          source: 'individual_allow',
          canOverride: true,
        });
        continue;
      }

      // Check role-based rules
      const roleRule = roleRules?.find(
        r => r.resource_name === resource.value && r.rule_type === resource.type
      );
      if (roleRule) {
        let hasRoleAccess = false;
        // Check wildcard
        if (roleRule.allowed_roles?.includes('*')) {
          hasRoleAccess = true;
        }
        // Check specific role
        else if (userData.role && roleRule.allowed_roles?.includes(userData.role)) {
          hasRoleAccess = true;
        }
        // Check min level
        else if (roleRule.min_role_level !== null) {
          const userLevel = permissionService.getRoleLevel(userData.role);
          hasRoleAccess = userLevel >= roleRule.min_role_level;
        }

        featureAccess.push({
          resource: resource.value,
          label: resource.label,
          type: resource.type,
          hasAccess: hasRoleAccess,
          source: 'role',
          canOverride: true,
        });
        continue;
      }

      // Default deny
      featureAccess.push({
        resource: resource.value,
        label: resource.label,
        type: resource.type,
        hasAccess: false,
        source: 'default_deny',
        canOverride: true,
      });
    }

    res.json({
      user: {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        roleLevel: permissionService.getRoleLevel(userData.role),
      },
      individualRules: individualRules || [],
      featureAccess,
    });
  } catch (error: any) {
    logger.error('Error getting user access:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
});

export default router;
