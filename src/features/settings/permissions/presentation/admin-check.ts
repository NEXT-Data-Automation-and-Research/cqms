/**
 * Admin Check for Permission Management Page
 * Access is determined by permission (settings/permissions): role-based + individual overrides.
 */

import { apiClient } from '../../../../utils/api-client.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('PermissionManagementAdminCheck');

const PERMISSION_PAGE_RESOURCE = 'settings/permissions';

/**
 * Check if current user can access permission management (permission API: role + individual overrides)
 */
async function checkAdminAccess(): Promise<boolean> {
  try {
    const response = await apiClient.post('/api/permissions/check', {
      resourceName: PERMISSION_PAGE_RESOURCE,
      ruleType: 'page',
    });
    return response?.hasAccess === true;
  } catch (error: any) {
    logger.error('Error checking permission access:', error);
    return false;
  }
}

/**
 * Redirect to unauthorized page or home
 */
function redirectUnauthorized(): void {
  logger.warn('Unauthorized access attempt to permission management');
  alert('Access Denied: You do not have permission to access this page.');
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
