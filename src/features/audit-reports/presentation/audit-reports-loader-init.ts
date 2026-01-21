/**
 * Audit Reports Loader Initialization
 * Entry point for initializing the audit reports feature
 */

import { AuditReportsLoader } from './audit-reports-loader.js';

/**
 * Initialize audit reports when DOM is ready
 */
async function initializeAuditReports(): Promise<void> {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const loader = new AuditReportsLoader();
      loader.initialize();
    });
  } else {
    // DOM already ready
    const loader = new AuditReportsLoader();
    loader.initialize();
  }
}

// Start initialization
initializeAuditReports();
