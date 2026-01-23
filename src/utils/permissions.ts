/**
 * Frontend Permission Utilities
 * Client-side permission checking for UI rendering
 */

import { apiClient } from './api-client.js';

/**
 * Check if current user has permission for a resource
 */
export async function hasPermission(
  resourceName: string,
  ruleType: 'page' | 'feature' | 'action' = 'feature'
): Promise<boolean> {
  try {
    const response = await apiClient.post('/api/permissions/check', {
      resourceName,
      ruleType,
    });

    return response.hasAccess === true;
  } catch (error: any) {
    console.error('Error checking permission:', error);
    // Fail closed - deny access on error
    return false;
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
    console.error('Error getting user permissions:', error);
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
  ruleType: 'page' | 'feature' | 'action' = 'feature'
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
