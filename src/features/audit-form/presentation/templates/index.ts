/**
 * Template Generators Index
 * Central export for all template generators
 */

export { generateAuditHeader } from './header-template.js';
export { generateTranscriptSection } from './transcript-template.js';
export { generateSplitter } from './splitter-template.js';
export { generateAuditFormHTML } from './form-template.js';

// Re-export utilities for convenience
export { formatDate, getCountryFlag, escapeHtml } from '../../utils/template-helpers.js';

