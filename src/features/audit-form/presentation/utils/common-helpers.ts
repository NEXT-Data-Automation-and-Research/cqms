/**
 * Common Helper Functions
 * Shared utility functions used across audit form components
 * Migrated from audit-form.html helper functions
 */

/**
 * Get initials from a name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().substring(0, 2);
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Format date as relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format date for display (simple format)
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Unknown';
  
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';
  
  return date.toLocaleDateString();
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).getInitials = getInitials;
  (window as any).formatDate = formatDate;
}

