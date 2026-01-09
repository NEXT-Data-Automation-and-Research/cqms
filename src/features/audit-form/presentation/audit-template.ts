/**
 * Audit Template Module
 * Main entry point for audit form templates
 * Replaces audit-template.js with TypeScript implementation
 */

import { setupTemplateGlobals } from './templates/compatibility.js';
import { formatDate, getCountryFlag, escapeHtml } from '../utils/template-helpers.js';

// Setup window globals for backward compatibility
setupTemplateGlobals();

// Export for ES modules
export {
  formatDate,
  getCountryFlag,
  escapeHtml
};

// Also export template generators
export {
  generateAuditHeader,
  generateTranscriptSection,
  generateSplitter,
  generateAuditFormHTML
} from './templates/index.js';

