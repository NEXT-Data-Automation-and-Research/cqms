/**
 * Admin Check for Permission Management Page
 * Access is determined by permission (settings/permissions): role-based + individual overrides.
 *
 * UX: Uses skipRedirectOn401 and retry so that a transient 401 (e.g. token not ready yet)
 * does not redirect the user to login when they actually have permission.
 */

import { apiClient } from '../../../../utils/api-client.js';
import { createLogger } from '../../../../utils/logger.js';

const logger = createLogger('PermissionManagementAdminCheck');

const PERMISSION_PAGE_RESOURCE = 'settings/permissions';
const RETRY_DELAY_MS = 1500;

/**
 * Check if current user can access permission management (permission API: role + individual overrides).
 * On 401, does not redirect immediately; returns false so caller can retry after delay.
 */
async function checkAdminAccess(options: { skipRedirectOn401?: boolean } = {}): Promise<boolean> {
  const result = await apiClient.postWithResult<{ hasAccess?: boolean }>(
    '/api/permissions/check',
    {
      resourceName: PERMISSION_PAGE_RESOURCE,
      ruleType: 'page',
    },
    { skipRedirectOn401: options.skipRedirectOn401 ?? false }
  );

  if (result.error) {
    if (result.error.status === 401) {
      logger.warn('Permission check returned 401 (token may not be ready yet)');
    } else {
      logger.error('Error checking permission access:', result.error);
    }
    return false;
  }
  return result.data?.hasAccess === true;
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

  // Give auth-checker and token time to be ready (reduces spurious 401 on first check)
  await new Promise((resolve) => setTimeout(resolve, 500));

  // First attempt: do not redirect on 401 so we can retry once (avoids "logged out" when token is slow)
  let hasAccess = await checkAdminAccess({ skipRedirectOn401: true });

  if (!hasAccess) {
    // Retry once after delay (allows token refresh or late auth-checker to complete)
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    hasAccess = await checkAdminAccess({ skipRedirectOn401: false });
  }

  if (hasAccess) {
    return;
  }

  // No access after retry: retry used skipRedirectOn401: false so a 401 would have triggered
  // redirect to login. So we're here only on 403 (no permission) or other error → show access denied.
  redirectUnauthorized();
}

// Run admin check when page loads
initAdminCheck().catch((error) => {
  logger.error('Error in admin check initialization:', error);
  redirectUnauthorized();
});
