/**
 * Admin Check for Permission Management Page
 * Ensures only Admin and Super Admin can access this page
 */

import { apiClient } from '../../../../utils/api-client.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('PermissionManagementAdminCheck');

/**
 * Check if current user is admin
 */
async function checkAdminAccess(): Promise<boolean> {
  try {
    // Check if user has permission to access permission management
    const response = await apiClient.post('/api/permissions/check', {
      resourceName: 'permission-management',
      ruleType: 'page',
    });

    if (response.hasAccess) {
      return true;
    }

    // Fallback: Check if user is admin via role
    const permissions = await apiClient.get('/api/permissions/user');
    const userRole = permissions.role;

    if (userRole === 'Super Admin' || userRole === 'Admin') {
      return true;
    }

    return false;
  } catch (error: any) {
    logger.error('Error checking admin access:', error);
    return false;
  }
}

/**
 * Redirect to unauthorized page or home
 */
function redirectUnauthorized(): void {
  logger.warn('Unauthorized access attempt to permission management');
  alert('Access Denied: Only Administrators can access this page.');
  window.location.href = '/';
}

/**
 * Initialize admin check
 */
async function initAdminCheck(): Promise<void> {
  // Wait for auth to be ready
  await new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve(undefined);
    } else {
      window.addEventListener('load', resolve);
    }
  });

  // Additional delay to ensure auth-checker has run
  await new Promise((resolve) => setTimeout(resolve, 500));

  const hasAccess = await checkAdminAccess();

  if (!hasAccess) {
    redirectUnauthorized();
  }
}

// Run admin check when page loads
initAdminCheck().catch((error) => {
  logger.error('Error in admin check initialization:', error);
  redirectUnauthorized();
});
