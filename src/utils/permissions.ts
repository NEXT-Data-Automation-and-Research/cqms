/**
 * Frontend Permission Utilities
 * Client-side permission checking for UI rendering
 */

import { apiClient } from './api-client.js';
import { logError, logInfo } from './logging-helper.js';

/**
 * Check if current user has permission for a resource
 */
export async function hasPermission(
  resourceName: string,
  ruleType: 'page' | 'feature' | 'api_endpoint' | 'action' = 'feature'
): Promise<boolean> {
  try {
    const response = await apiClient.post('/api/permissions/check', {
      resourceName,
      ruleType,
    });

    return response.hasAccess === true;
  } catch (error: any) {
    // Keep this silent in production; log helper handles env-based verbosity.
    logError('[Permission] Error checking permission', {
      resource: resourceName,
      ruleType,
      error: error?.message,
      details: error?.details,
      code: error?.code,
      status: error?.status,
    });
    // Fail closed - deny access on error
    return false;
  }
}

/**
 * Check permission with full details returned (for debugging)
 */
export async function hasPermissionWithDetails(
  resourceName: string,
  ruleType: 'page' | 'feature' | 'api_endpoint' | 'action' = 'feature'
): Promise<{ hasAccess: boolean; reason: string; userRole: string | null; userEmail?: string; error?: string }> {
  try {
    const response = await apiClient.post('/api/permissions/check', {
      resourceName,
      ruleType,
    });

    return {
      hasAccess: response.hasAccess === true,
      reason: response.reason || 'Unknown',
      userRole: response.userRole || null,
      userEmail: response.userEmail || undefined,
    };
  } catch (error: any) {
    logError('[Permission] API Error', error);
    return {
      hasAccess: false,
      reason: 'API call failed',
      userRole: null,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Check if current user can access a page
 */
export async function canAccessPage(pagePath: string): Promise<boolean> {
  // Remove leading slash and .html extension for consistency
  const resourceName = pagePath.replace(/^\//, '').replace(/\.html$/, '');
  return hasPermission(resourceName, 'page');
}

/**
 * Get current user's permissions summary
 */
export async function getUserPermissions(): Promise<{
  role: string | null;
  level: number;
  permissions: Array<{
    resource: string;
    type: string;
    hasAccess: boolean;
  }>;
}> {
  try {
    const response = await apiClient.get('/api/permissions/user');
    return response;
  } catch (error: any) {
    logError('Error getting user permissions', error);
    return {
      role: null,
      level: 0,
      permissions: [],
    };
  }
}

/**
 * Check multiple permissions at once
 */
export async function checkMultiplePermissions(
  resources: Array<{ name: string; type: 'page' | 'feature' | 'action' }>
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  await Promise.all(
    resources.map(async (resource) => {
      results[resource.name] = await hasPermission(resource.name, resource.type);
    })
  );

  return results;
}

/**
 * Check if user has any of the specified permissions (OR logic)
 */
export async function hasAnyPermission(
  resources: Array<{ name: string; type: 'page' | 'feature' | 'action' }>
): Promise<boolean> {
  const results = await checkMultiplePermissions(resources);
  return Object.values(results).some((hasAccess) => hasAccess === true);
}

/**
 * Check if user has all of the specified permissions (AND logic)
 */
export async function hasAllPermissions(
  resources: Array<{ name: string; type: 'page' | 'feature' | 'action' }>
): Promise<boolean> {
  const results = await checkMultiplePermissions(resources);
  return Object.values(results).every((hasAccess) => hasAccess === true);
}

/**
 * Permission check result cache (client-side)
 */
const permissionCache: Map<string, { result: boolean; expires: number }> = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Cached permission check
 */
export async function hasPermissionCached(
  resourceName: string,
  ruleType: 'page' | 'feature' | 'api_endpoint' | 'action' = 'feature'
): Promise<boolean> {
  const cacheKey = `${resourceName}:${ruleType}`;
  const cached = permissionCache.get(cacheKey);

  if (cached && cached.expires > Date.now()) {
    return cached.result;
  }

  const result = await hasPermission(resourceName, ruleType);
  permissionCache.set(cacheKey, {
    result,
    expires: Date.now() + CACHE_TTL,
  });

  return result;
}

/**
 * Clear permission cache
 */
export function clearPermissionCache(): void {
  permissionCache.clear();
}

/**
 * Check access by resource name (for pages that know their resource, e.g. settings/permissions).
 */
export async function canAccessPageByResource(resourceName: string): Promise<boolean> {
  return hasPermission(resourceName, 'page');
}

/**
 * Batch check page permissions for sidebar. Returns map resourceName -> boolean, or null on error.
 */
export async function getPagePermissionsForSidebar(
  resourceNames: string[]
): Promise<Record<string, { hasAccess: boolean; reason?: string }> | null> {
  if (resourceNames.length === 0) return {};
  try {
    const response = (await apiClient.post('/api/permissions/check-batch', {
      checks: resourceNames.map((name) => ({ resourceName: name, ruleType: 'page' })),
    })) as {
      results?: Record<string, boolean>;
      details?: Record<string, { hasAccess: boolean; reason?: string }>;
    };

    const results = response?.results ?? {};
    const details = response?.details ?? {};
    const byResource: Record<string, { hasAccess: boolean; reason?: string }> = {};

    resourceNames.forEach((name) => {
      const key = `${name}:page`;

      // Prefer details if backend provides them (lets UI respect explicit DENY).
      if (details[key]) {
        byResource[name] = {
          hasAccess: details[key].hasAccess === true,
          reason: details[key].reason,
        };
        return;
      }

      // Backward compatible fallback to boolean map.
      byResource[name] = { hasAccess: results[key] === true };
    });

    return byResource;
  } catch {
    logInfo('[Permission] Sidebar batch permission check skipped/failed (non-critical)');
    return null;
  }
}
