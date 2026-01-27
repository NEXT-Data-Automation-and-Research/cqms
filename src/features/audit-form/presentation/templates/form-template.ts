/**
 * Form Template Generator
 * Main orchestrator for generating complete audit form HTML structure
 */

import type { AuditFormOptions, AuditFormMode } from '../../domain/types.js';
import { getDefaultHeaderTitle } from '../../domain/types.js';
import { generateAuditHeader } from './header-template.js';
import { generateTranscriptSection } from './transcript-template.js';
import { generateSplitter } from './splitter-template.js';

/**
 * Generate complete audit form HTML structure
 */
export function generateAuditFormHTML(options: AuditFormOptions = {}): string {
  const {
    audit = {},
    mode = 'view',
    headerTitle = getDefaultHeaderTitle(mode as AuditFormMode),
    headerGradient = 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)',
    headerActions = '',
    interactionIdHtml = '',
    errorDetailsHtml = '',
    recommendationsHtml = '',
    ratingHtml = '',
    actionButtonsHtml = '',
    showAuditorName = false
  } = options;

  const headerHtml = generateAuditHeader({
    title: headerTitle,
    headerGradient: headerGradient,
    audit: audit,
    mode: mode,
    headerActions: headerActions,
    showAuditorName: showAuditorName
  });

  const transcriptHtml = generateTranscriptSection({
    audit: audit,
    mode: mode,
    interactionIdHtml: interactionIdHtml
  });

  const splitterHtml = generateSplitter();

  return `
    <div style="background: white; width: 100%; min-height: 100vh; display: flex; flex-direction: column;">
      ${headerHtml}
      
      <!-- Two Column Layout -->
      <div id="auditMainContent" style="display: flex; padding: 0.5rem 0.9704rem 0.9704rem 0.9704rem; max-width: 100%; gap: 0; flex-wrap: nowrap; overflow-x: visible; align-items: stretch; flex: 1; min-height: 0;">
        
        <!-- LEFT COLUMN: Interaction Details + Transcript -->
        <div id="leftColumn" style="display: flex; flex-direction: column; gap: 0.3234rem; flex: 0 0 33%; min-width: 13.6451rem; max-width: 75%; padding-right: 0.6469rem; overflow-x: visible; overflow-y: visible; box-sizing: border-box;">
          ${transcriptHtml}
        </div>
        
        ${splitterHtml}
        
        <!-- RIGHT COLUMN: Error Details & Recommendations -->
        <div id="rightColumn" style="flex: 1; min-width: 9.0967rem; padding-left: 0.3234rem; display: flex; flex-direction: column; min-height: 0; overflow-y: auto;">
          ${errorDetailsHtml}
          ${recommendationsHtml}
          ${ratingHtml}
        </div>
      </div>
      
      ${actionButtonsHtml}
    </div>
  `;
}

