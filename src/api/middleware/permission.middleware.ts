/**
 * Permission Middleware
 * Express middleware for route protection based on permissions
 */

import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware.js';
import { permissionService } from '../../core/permissions/permission.service.js';
import { createLogger } from '../../utils/logger.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';

const logger = createLogger('PermissionMiddleware');

/**
 * Require permission for a resource
 * Returns 403 if user doesn't have access
 */
export function requirePermission(
  resourceName: string,
  ruleType: 'page' | 'feature' | 'api_endpoint' | 'action' = 'api_endpoint'
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userEmail = req.user.email?.toLowerCase().trim();
      if (!userEmail) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User email not found',
        });
        return;
      }

      // Get user role from people table or users table
      const userRole = await getUserRole(userEmail);

      // Check permission
      const check = await permissionService.checkPermission(
        userEmail,
        userRole,
        resourceName,
        ruleType
      );

      if (!check.hasAccess) {
        logger.warn(
          `Permission denied for ${userEmail} (${userRole}) accessing ${resourceName} (${ruleType}): ${check.reason}`
        );
        res.status(403).json({
          error: 'Forbidden',
          message: `Access denied: ${check.reason || 'Insufficient permissions'}`,
          resource: resourceName,
          ruleType,
        });
        return;
      }

      // Attach permission check result to request for logging/debugging
      (req as any).permissionCheck = check;
      next();
    } catch (error: any) {
      logger.error('Error in requirePermission middleware:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check permissions',
      });
    }
  };
}

/**
 * Require any of the specified permissions (OR logic)
 */
export function requireAnyPermission(
  resources: Array<{ name: string; type: 'page' | 'feature' | 'api_endpoint' | 'action' }>
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userEmail = req.user.email?.toLowerCase().trim();
      if (!userEmail) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User email not found',
        });
        return;
      }

      const userRole = await getUserRole(userEmail);
      const hasAccess = await permissionService.hasAnyPermission(userEmail, userRole, resources);

      if (!hasAccess) {
        logger.warn(
          `Permission denied for ${userEmail} (${userRole}) - none of the required permissions granted`
        );
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: Insufficient permissions',
          requiredPermissions: resources,
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Error in requireAnyPermission middleware:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check permissions',
      });
    }
  };
}

/**
 * Require all of the specified permissions (AND logic)
 */
export function requireAllPermissions(
  resources: Array<{ name: string; type: 'page' | 'feature' | 'api_endpoint' | 'action' }>
) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userEmail = req.user.email?.toLowerCase().trim();
      if (!userEmail) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User email not found',
        });
        return;
      }

      const userRole = await getUserRole(userEmail);
      const hasAccess = await permissionService.hasAllPermissions(userEmail, userRole, resources);

      if (!hasAccess) {
        logger.warn(
          `Permission denied for ${userEmail} (${userRole}) - not all required permissions granted`
        );
        res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied: Not all required permissions granted',
          requiredPermissions: resources,
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Error in requireAllPermissions middleware:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check permissions',
      });
    }
  };
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: string[]) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userEmail = req.user.email?.toLowerCase().trim();
      if (!userEmail) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User email not found',
        });
        return;
      }

      const userRole = await getUserRole(userEmail);

      if (!userRole || !roles.includes(userRole)) {
        logger.warn(
          `Role check failed for ${userEmail}: has ${userRole}, required one of: ${roles.join(', ')}`
        );
        res.status(403).json({
          error: 'Forbidden',
          message: `Access denied: Required role(s): ${roles.join(', ')}`,
          userRole,
          requiredRoles: roles,
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Error in requireRole middleware:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check role',
      });
    }
  };
}

/**
 * Require minimum role level
 */
export function requireMinRoleLevel(minLevel: number) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
        return;
      }

      const userEmail = req.user.email?.toLowerCase().trim();
      if (!userEmail) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'User email not found',
        });
        return;
      }

      const userRole = await getUserRole(userEmail);
      const userLevel = permissionService.getRoleLevel(userRole);

      if (userLevel < minLevel) {
        logger.warn(
          `Role level check failed for ${userEmail}: level ${userLevel} < required ${minLevel}`
        );
        res.status(403).json({
          error: 'Forbidden',
          message: `Access denied: Minimum role level ${minLevel} required`,
          userLevel,
          requiredLevel: minLevel,
        });
        return;
      }

      next();
    } catch (error: any) {
      logger.error('Error in requireMinRoleLevel middleware:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to check role level',
      });
    }
  };
}

/**
 * Helper function to get user role from database
 */
async function getUserRole(userEmail: string): Promise<string | null> {
  try {
    const supabase = getServerSupabase();

    // Try people table first (more comprehensive)
    const { data: peopleData } = await supabase
      .from('people')
      .select('role')
      .eq('email', userEmail)
      .maybeSingle();

    if (peopleData?.role) {
      return peopleData.role;
    }

    // Fallback to users table
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('email', userEmail)
      .maybeSingle();

    return userData?.role || null;
  } catch (error: any) {
    logger.warn(`Error getting user role for ${userEmail}:`, error.message);
    return null;
  }
}
