/**
 * Permission Service
 * Centralized permission checking logic for role-based and individual permissions
 */

import { createLogger } from '../../utils/logger.js';
import { getServerSupabase } from '../config/server-supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

const logger = createLogger('PermissionService');

/**
 * Role hierarchy levels (higher number = more permissions)
 * 
 * Note: Quality Analyst should be at level 2 to access auditor features like:
 * - view_all_audits
 * - create_audit
 * - edit_audit
 * - approve_reversals
 * 
 * This matches the access_control_rules where min_role_level: 2 is required for these features.
 */
const ROLE_HIERARCHY: Record<string, number> = {
  'General User': 0,
  'Employee': 1,
  'Quality Analyst': 2,  // Elevated to level 2 to match auditor access
  'Auditor': 2,
  'Quality Supervisor': 2,
  'Manager': 3,
  'Admin': 4,
  'Super Admin': 5,
};

interface PermissionCheckResult {
  hasAccess: boolean;
  reason: string;
  checkedRules?: {
    individual?: any;
    role?: any;
  };
}

interface RoleRuleResult {
  hasAccess: boolean;
  reason: string;
  rule: any;
}

interface CacheEntry {
  result: PermissionCheckResult;
  expires: number;
}

interface UserPermission {
  resource: string;
  type: string;
  hasAccess: boolean;
}

interface UserPermissionsSummary {
  role: string | null;
  level: number;
  permissions: UserPermission[];
}

/**
 * Permission Service Class
 */
export class PermissionService {
  private supabase: SupabaseClient;
  private cache: Map<string, CacheEntry>;
  private cacheTTL: number;

  constructor() {
    this.supabase = getServerSupabase();
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get role level from hierarchy
   */
  getRoleLevel(role: string | null): number {
    if (!role) return 0;
    return ROLE_HIERARCHY[role] ?? 0;
  }

  /**
   * Check if user has access to a resource
   *
   * Priority:
   * 1. Individual DENY rules (highest priority - blocks access)
   * 2. Individual ALLOW rules (grants access)
   * 3. Role-based rules (allowed_roles or min_role_level)
   * 4. Default: Deny
   */
  async checkPermission(
    userEmail: string,
    userRole: string | null,
    resourceName: string,
    ruleType: 'page' | 'feature' | 'api_endpoint' | 'action' = 'feature'
  ): Promise<PermissionCheckResult> {
    // =========================
    // Hard gates (non-overridable)
    // =========================
    // BAU Metrics must be Super Admin only (even if someone creates an individual allow rule).
    // This keeps the feature "Super Admin only" across:
    // - Sidebar visibility (batch checks)
    // - API permission checks
    // - Any future UI permission toggles
    const normalizedResource = String(resourceName || '').trim().toLowerCase();
    const normalizedType = String(ruleType || '').trim().toLowerCase();
    if (normalizedResource === 'bau-metrics' && normalizedType === 'page') {
      const isSuperAdmin = (userRole || '').trim().toLowerCase() === 'super admin';
      return {
        hasAccess: isSuperAdmin,
        reason: isSuperAdmin ? 'Super Admin only page' : 'BAU Metrics is restricted to Super Admin',
      };
    }

    // Check cache first
    const cacheKey = `${userEmail}:${resourceName}:${ruleType}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      logger.debug(`Cache hit for ${cacheKey}`);
      return cached.result;
    }

    try {
      // Step 1: Check individual DENY rules (highest priority)
      const denyRule = await this.checkIndividualRule(
        userEmail,
        resourceName,
        ruleType,
        'deny'
      );
      if (denyRule) {
        const result: PermissionCheckResult = {
          hasAccess: false,
          reason: 'Individual deny rule found',
          checkedRules: { individual: denyRule },
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Step 2: Check individual ALLOW rules
      const allowRule = await this.checkIndividualRule(
        userEmail,
        resourceName,
        ruleType,
        'allow'
      );
      if (allowRule) {
        const result: PermissionCheckResult = {
          hasAccess: true,
          reason: 'Individual allow rule found',
          checkedRules: { individual: allowRule },
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Step 3: Check role-based rules
      const roleRule = await this.checkRoleRule(userRole, resourceName, ruleType);
      if (roleRule) {
        const result: PermissionCheckResult = {
          hasAccess: roleRule.hasAccess,
          reason: roleRule.reason,
          checkedRules: { role: roleRule.rule },
        };
        this.cacheResult(cacheKey, result);
        return result;
      }

      // Step 4: Default deny
      const result: PermissionCheckResult = {
        hasAccess: false,
        reason: 'No matching permission rule found',
      };
      this.cacheResult(cacheKey, result);
      return result;
    } catch (error: any) {
      logger.error(`Error checking permission for ${userEmail}:`, error);
      // Fail closed - deny access on error
      return {
        hasAccess: false,
        reason: `Error checking permission: ${error.message}`,
      };
    }
  }

  /**
   * Check individual user permission rule
   */
  private async checkIndividualRule(
    userEmail: string,
    resourceName: string,
    ruleType: string,
    accessType: 'allow' | 'deny'
  ): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('user_access_rule')
      .select('*')
      .eq('user_email', userEmail.toLowerCase().trim())
      .eq('resource_name', resourceName)
      .eq('rule_type', ruleType)
      .eq('access_type', accessType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logger.warn(`Error checking individual rule: ${error.message}`);
      return null;
    }

    return data;
  }

  /**
   * Check role-based permission rule
   */
  private async checkRoleRule(
    userRole: string | null,
    resourceName: string,
    ruleType: string
  ): Promise<RoleRuleResult | null> {
    const { data, error } = await this.supabase
      .from('access_control_rules')
      .select('*')
      .eq('resource_name', resourceName)
      .eq('rule_type', ruleType)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logger.warn(`Error checking role rule: ${error.message}`);
      return null;
    }

    if (!data) {
      return null;
    }

    const rule = data;

    // Check allowed_roles array
    if (rule.allowed_roles && Array.isArray(rule.allowed_roles)) {
      // Wildcard check - all authenticated users
      if (rule.allowed_roles.includes('*')) {
        return {
          hasAccess: true,
          reason: 'Wildcard rule allows all users',
          rule,
        };
      }

      // Specific role check
      if (userRole && rule.allowed_roles.includes(userRole)) {
        return {
          hasAccess: true,
          reason: `Role ${userRole} is in allowed_roles`,
          rule,
        };
      }
    }

    // Check min_role_level
    if (rule.min_role_level !== null && rule.min_role_level !== undefined) {
      const minLevel = parseInt(rule.min_role_level.toString(), 10);
      const userLevel = this.getRoleLevel(userRole);
      if (userLevel >= minLevel) {
        return {
          hasAccess: true,
          reason: `User role level ${userLevel} meets minimum ${minLevel}`,
          rule,
        };
      }
    }

    // Rule exists but user doesn't match
    return {
      hasAccess: false,
      reason: 'Role-based rule exists but user does not match',
      rule,
    };
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    userEmail: string,
    userRole: string | null,
    resources: Array<{ name: string; type: 'page' | 'feature' | 'api_endpoint' | 'action' }>
  ): Promise<Record<string, PermissionCheckResult>> {
    const results: Record<string, PermissionCheckResult> = {};
    await Promise.all(
      resources.map(async (resource) => {
        results[resource.name] = await this.checkPermission(
          userEmail,
          userRole,
          resource.name,
          resource.type
        );
      })
    );
    return results;
  }

  /**
   * Check if user has any of the specified permissions (OR logic)
   */
  async hasAnyPermission(
    userEmail: string,
    userRole: string | null,
    resources: Array<{ name: string; type: 'page' | 'feature' | 'api_endpoint' | 'action' }>
  ): Promise<boolean> {
    const results = await this.checkMultiplePermissions(userEmail, userRole, resources);
    return Object.values(results).some((check) => check.hasAccess);
  }

  /**
   * Check if user has all of the specified permissions (AND logic)
   */
  async hasAllPermissions(
    userEmail: string,
    userRole: string | null,
    resources: Array<{ name: string; type: 'page' | 'feature' | 'api_endpoint' | 'action' }>
  ): Promise<boolean> {
    const results = await this.checkMultiplePermissions(userEmail, userRole, resources);
    return Object.values(results).every((check) => check.hasAccess);
  }

  /**
   * Clear permission cache for a user
   */
  clearCache(userEmail?: string): void {
    if (userEmail) {
      // Clear specific user's cache
      const keysToDelete: string[] = [];
      this.cache.forEach((_, key) => {
        if (key.startsWith(`${userEmail}:`)) {
          keysToDelete.push(key);
        }
      });
      keysToDelete.forEach((key) => this.cache.delete(key));
      logger.info(`Cleared cache for user: ${userEmail}`);
    } else {
      // Clear all cache
      this.cache.clear();
      logger.info('Cleared all permission cache');
    }
  }

  /**
   * Cache permission check result
   */
  private cacheResult(key: string, result: PermissionCheckResult): void {
    this.cache.set(key, {
      result,
      expires: Date.now() + this.cacheTTL,
    });
  }

  /**
   * Get user's effective permissions summary
   */
  async getUserPermissions(
    userEmail: string,
    userRole: string | null
  ): Promise<UserPermissionsSummary> {
    // Get all active rules
    const { data: roleRules } = await this.supabase
      .from('access_control_rules')
      .select('resource_name, rule_type')
      .eq('is_active', true);

    const { data: userRules } = await this.supabase
      .from('user_access_rule')
      .select('resource_name, rule_type, access_type')
      .eq('user_email', userEmail.toLowerCase().trim())
      .eq('is_active', true);

    const allResources = new Set<string>();
    roleRules?.forEach((rule) =>
      allResources.add(`${rule.rule_type}:${rule.resource_name}`)
    );
    userRules?.forEach((rule) =>
      allResources.add(`${rule.rule_type}:${rule.resource_name}`)
    );

    const permissions = await Promise.all(
      Array.from(allResources).map(async (resourceKey) => {
        const [type, name] = resourceKey.split(':');
        const check = await this.checkPermission(
          userEmail,
          userRole,
          name,
          type as 'page' | 'feature' | 'api_endpoint' | 'action'
        );
        return {
          resource: name,
          type,
          hasAccess: check.hasAccess,
        };
      })
    );

    return {
      role: userRole,
      level: this.getRoleLevel(userRole),
      permissions: permissions.filter((p) => p.hasAccess),
    };
  }
}

// Export singleton instance
export const permissionService = new PermissionService();
