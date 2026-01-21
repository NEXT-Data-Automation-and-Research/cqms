/**
 * Audit Reports - Tailwind Configuration
 * Configures Tailwind CSS for the audit reports page
 * Note: This file is optional if using compiled CSS instead of CDN
 */

// Tailwind configuration is handled via CDN script tag in HTML
// This file exists to prevent 404 errors
// If using compiled CSS, this file can be removed and the script tag removed from HTML

// No-op: Configuration is done via CDN script tag
if (typeof window !== 'undefined' && (window as any).tailwind) {
  // Tailwind is already loaded via CDN
  console.debug('[AuditReports] Tailwind CSS loaded via CDN');
}
