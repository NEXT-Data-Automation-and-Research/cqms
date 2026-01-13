/**
 * Modal Helper Functions
 * Utility functions for audit detail modal
 */

/**
 * Format date for display
 */
export function formatDate(dateString: string | undefined, includeTime = false): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const day = date.getDate();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  if (includeTime) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  }
  return `${day} ${month} ${year}`;
}

/**
 * Normalize passing status
 */
export function normalizePassingStatus(status: string | undefined): string {
  if (!status) return 'Unknown';
  const normalized = status.toLowerCase();
  if (normalized.includes('pass')) return 'Passed';
  if (normalized.includes('fail') || normalized.includes('not pass')) return 'Not Passed';
  return status;
}

