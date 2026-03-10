/**
 * Role Helpers
 * Utility functions for role-based UI logic
 */

let _cachedRole: string | null = null;

/**
 * Get the current user's role from localStorage
 */
export function getCurrentUserRole(): string {
  if (_cachedRole) return _cachedRole;
  try {
    const stored = localStorage.getItem('userInfo');
    if (stored) {
      const parsed = JSON.parse(stored);
      _cachedRole = parsed?.role || '';
      return _cachedRole as string;
    }
  } catch { /* ignore */ }
  return '';
}

/**
 * Check if current user has the "Supervisor" role (other-team supervisors)
 */
export function isSupervisorRole(): boolean {
  return getCurrentUserRole() === 'Supervisor';
}

/**
 * Clear cached role (call on logout or role change)
 */
export function clearRoleCache(): void {
  _cachedRole = null;
}
