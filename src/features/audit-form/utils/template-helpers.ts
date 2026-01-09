/**
 * Template Helpers Utility
 * Helper functions for template generation
 */

import { escapeHtml } from '../../../utils/html-sanitizer.js';
import { formatDate } from './date-formatter.js';
import { getCountryFlag } from './country-flags.js';

/**
 * Re-export commonly used utilities
 */
export { escapeHtml, formatDate, getCountryFlag };

/**
 * Generate status icon based on passing status
 */
export function getStatusIcon(passingStatus: string | null | undefined): string {
  if (!passingStatus) return '';
  
  const statusLower = passingStatus.toLowerCase();
  const isPassing = statusLower.includes('pass') && !statusLower.includes('not');
  return isPassing ? '✓ ' : '✗ ';
}

/**
 * Format quarter display (ensure Q prefix)
 */
export function formatQuarter(quarter: string | number | null | undefined): string {
  if (!quarter) return 'N/A';
  
  const quarterStr = quarter.toString();
  return quarterStr.startsWith('Q') ? quarterStr : `Q${quarterStr}`;
}

/**
 * Calculate score text color based on passing status
 */
export function getScoreTextColor(passingStatus: string | null | undefined): string {
  if (!passingStatus) return 'rgba(10, 50, 30, 0.4)';
  
  const statusLower = passingStatus.toLowerCase();
  const isPassing = statusLower.includes('pass') && !statusLower.includes('not');
  
  return isPassing 
    ? 'rgba(10, 50, 30, 0.4)' // Darker green for passing
    : 'rgba(100, 10, 10, 0.4)'; // Darker red for not passing
}

