/**
 * Navigation Utility
 * Standardized navigation functions to ensure consistent behavior
 */

/**
 * Redirect to a path
 * @param path - The path to redirect to
 * @param replace - If true, replaces current history entry (prevents back button issues). Default: true
 */
export function redirectTo(path: string, replace: boolean = true): void {
  if (replace) {
    window.location.replace(path);
  } else {
    window.location.href = path;
  }
}

/**
 * Navigate to a path (for user-initiated navigation)
 * Adds to history so back button works
 */
export function navigateTo(path: string): void {
  redirectTo(path, false);
}

/**
 * Redirect after form submission or action
 * Replaces history to prevent back button issues
 */
export function redirectAfterAction(path: string): void {
  redirectTo(path, true);
}
