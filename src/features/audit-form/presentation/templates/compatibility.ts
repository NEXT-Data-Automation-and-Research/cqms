/**
 * Template Compatibility Layer
 * Exposes template functions to window object for backward compatibility
 */

import { generateAuditHeader, generateTranscriptSection, generateSplitter, generateAuditFormHTML } from './index.js';
import { formatDate, getCountryFlag, escapeHtml } from '../../utils/template-helpers.js';

/**
 * Setup window globals for backward compatibility with existing HTML
 */
export function setupTemplateGlobals(): void {
  if (typeof window !== 'undefined') {
    (window as any).generateAuditHeader = generateAuditHeader;
    (window as any).generateTranscriptSection = generateTranscriptSection;
    (window as any).generateSplitter = generateSplitter;
    (window as any).generateAuditFormHTML = generateAuditFormHTML;
    (window as any).formatDate = formatDate;
    (window as any).getCountryFlag = getCountryFlag;
    (window as any).escapeHtml = escapeHtml;
  }
}

