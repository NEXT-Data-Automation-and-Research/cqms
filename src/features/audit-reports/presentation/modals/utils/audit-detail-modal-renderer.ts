/**
 * Audit Detail Modal Renderer
 * Helper functions for rendering audit detail modal HTML
 */

import { escapeHtml } from '../../../../../utils/html-sanitizer.js';
import type { AuditReport } from '../../../domain/entities.js';
import { formatDate, normalizePassingStatus } from './modal-helpers.js';
import { generateErrorDetails } from './error-details-renderer.js';

export interface ScorecardParameter {
  field_id: string;
  error_name: string;
  error_category: string;
  field_type?: string;
  parameter_type?: string;
  penalty_points?: number;
  display_order?: number;
}

/**
 * Render audit detail modal HTML
 */
export function renderAuditDetailModalHTML(audit: AuditReport, parameters: ScorecardParameter[] = []): string {
  const submittedDateTime = formatDate(audit.submittedAt, true);
  const normalizedStatus = normalizePassingStatus(audit.passingStatus);
  const statusColor = normalizedStatus === 'Passed' ? '#10b981' : '#ef4444';
  const statusIcon = normalizedStatus === 'Passed' ? '✓' : '✗';
  
  const errorDetailsHtml = generateErrorDetails(audit, parameters);
  
  // Get interaction ID for loading conversation from Intercom
  const interactionId = audit.interactionId || audit.interaction_id || '';
  
  // Transcript container with chat view support (like audit form)
  const transcriptHtml = `
    <div style="background: #f9fafb; border-radius: 0.375rem; padding: 0; border: 0.0352rem solid #e5e7eb; display: flex; flex-direction: column; height: 80vh; transition: height 0.3s ease;">
      <div style="background: #f9fafb; padding: 0.75rem; border-bottom: 0.0352rem solid #e5e7eb; flex-shrink: 0; display: flex; align-items: center; justify-content: space-between;">
        <h3 style="font-size: 0.7031rem; font-weight: 600; color: #1A733E; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.375rem;">
          <svg style="width: 0.8438rem; height: 0.8438rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
          Conversation
        </h3>
        ${interactionId ? `<span style="font-size: 0.5625rem; color: #6b7280; font-family: 'Poppins', sans-serif;">ID: ${escapeHtml(String(interactionId))}</span>` : ''}
      </div>
      <!-- Chat View Container -->
      <div id="modalChatView" data-interaction-id="${escapeHtml(String(interactionId))}" data-transcript="${audit.transcript ? 'true' : 'false'}" style="display: flex; padding: 0.75rem; background: #f0f2f5; overflow-y: auto; flex: 1; flex-direction: column; scrollbar-width: thin;">
        <div id="modalChatMessagesContainer" style="display: flex; flex-direction: column; min-height: 0; width: 100%; gap: 0.3234rem; padding: 0.2426rem 0;">
          ${interactionId ? `
            <div style="text-align: center; padding: 1.2937rem; color: #6b7280;">
              <div style="display: inline-block; width: 1.2937rem; height: 1.2937rem; border: 0.091rem solid #e5e7eb; border-top-color: #1A733E; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <p style="margin-top: 0.6469rem; font-size: 0.5659rem;">Loading conversation from Intercom...</p>
            </div>
          ` : audit.transcript ? `
            <div style="padding: 0.5rem; background: white; border-radius: 0.375rem; margin: 0.25rem;">
              <div style="white-space: pre-wrap; font-size: 0.6094rem; line-height: 1.6; color: #374151; font-family: 'Poppins', sans-serif;">${escapeHtml(audit.transcript)}</div>
            </div>
          ` : `
            <div style="text-align: center; padding: 1.2937rem; color: #9ca3af; font-style: italic;">
              <p>No conversation available</p>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
  
  const headerGradient = normalizedStatus === 'Not Passed' 
    ? 'linear-gradient(135deg, #d41212 0%, #b91c1c 100%)' 
    : 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)';
  
  const scorecardName = audit._scorecard_name || 'Default Scorecard';
  const scoringType = audit._scoring_type || '';
  
  return `
    <div style="background: white; width: 100%; min-height: 100vh;">
      <div style="background: ${headerGradient}; padding: 0.75rem 1.125rem; color: white; box-shadow: 0 0.1406rem 0.2109rem rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5625rem;">
          <div style="flex: 1;">
            <h2 style="font-size: 0.8438rem; font-weight: 700; margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif;">Audit Details</h2>
            <div style="display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem;">
              <p style="font-size: 0.5625rem; color: rgba(255,255,255,0.85); margin: 0; font-family: 'Poppins', sans-serif;">${escapeHtml(scorecardName)}</p>
              ${scoringType ? `
                <span style="background: rgba(255,255,255,0.25); padding: 0.1125rem 0.375rem; border-radius: 0.1875rem; font-size: 0.4688rem; font-weight: 600; text-transform: uppercase; border: 0.0352rem solid rgba(255,255,255,0.4);">
                  ${escapeHtml(scoringType === 'deductive' ? 'Deductive' : scoringType === 'additive' ? 'Additive' : scoringType === 'hybrid' ? 'Hybrid' : scoringType)}
                </span>
              ` : ''}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(7.0312rem, 1fr)); gap: 0.375rem; margin-bottom: 0.5625rem;">
              <div>
                <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.7); margin: 0; font-family: 'Poppins', sans-serif; text-transform: uppercase;">Employee</p>
                <p style="font-size: 0.6562rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif;">${escapeHtml(audit.employeeName || 'N/A')}</p>
              </div>
              <div>
                <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.7); margin: 0; font-family: 'Poppins', sans-serif; text-transform: uppercase;">Email</p>
                <p style="font-size: 0.6562rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; word-break: break-all;">${escapeHtml(audit.employeeEmail || 'N/A')}</p>
              </div>
              <div>
                <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.7); margin: 0; font-family: 'Poppins', sans-serif; text-transform: uppercase;">Type</p>
                <p style="font-size: 0.6562rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif;">${escapeHtml(audit.employeeType || 'N/A')}</p>
              </div>
              <div>
                <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.7); margin: 0; font-family: 'Poppins', sans-serif; text-transform: uppercase;">Country</p>
                <p style="font-size: 0.6562rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif;">${escapeHtml(audit.countryOfEmployee || 'N/A')}</p>
              </div>
            </div>
          </div>
          <button id="auditDetailModalClose" style="background: rgba(255,255,255,0.2); border: 0.0703rem solid white; border-radius: 0.2812rem; width: 1.5rem; height: 1.5rem; font-size: 0.9375rem; cursor: pointer; color: white; font-weight: bold; transition: all 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-left: 0.75rem;">×</button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(4.9219rem, 1fr)); gap: 0.375rem;">
          <div style="background: rgba(255,255,255,0.15); border-radius: 0.2812rem; padding: 0.375rem 0.5625rem; backdrop-filter: blur(0.3516rem);">
            <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.8); margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem;">Status</p>
            <p style="font-size: 0.75rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif;">${statusIcon} ${escapeHtml(normalizedStatus || 'N/A')}</p>
          </div>
          <div style="background: rgba(255,255,255,0.15); border-radius: 0.2812rem; padding: 0.375rem 0.5625rem; backdrop-filter: blur(0.3516rem);">
            <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.8); margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem;">Score</p>
            <p style="font-size: 0.75rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif;">${escapeHtml(String(audit.averageScore || '0'))}%</p>
          </div>
          <div style="background: rgba(255,255,255,0.15); border-radius: 0.2812rem; padding: 0.375rem 0.5625rem; backdrop-filter: blur(0.3516rem);">
            <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.8); margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem;">Total Errors</p>
            <p style="font-size: 0.75rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif;">${escapeHtml(String(audit.totalErrorsCount || '0'))}</p>
          </div>
          <div style="background: rgba(255,255,255,0.15); border-radius: 0.2812rem; padding: 0.375rem 0.5625rem; backdrop-filter: blur(0.3516rem);">
            <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.8); margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem;">Audit Type</p>
            <p style="font-size: 0.6562rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif;">${escapeHtml(audit.auditType || 'N/A')}</p>
          </div>
          <div style="background: rgba(255,255,255,0.15); border-radius: 0.2812rem; padding: 0.375rem 0.5625rem; backdrop-filter: blur(0.3516rem);">
            <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.8); margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem;">Audit Date</p>
            <p style="font-size: 0.5625rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif;">${formatDate(audit.auditTimestamp, true)}</p>
          </div>
          <div style="background: rgba(255,255,255,0.15); border-radius: 0.2812rem; padding: 0.375rem 0.5625rem; backdrop-filter: blur(0.3516rem);">
            <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.8); margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem;">Quarter</p>
            <p style="font-size: 0.6562rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif;">${audit.quarter ? (String(audit.quarter).startsWith('Q') ? escapeHtml(String(audit.quarter)) : 'Q' + escapeHtml(String(audit.quarter))) : 'N/A'}</p>
          </div>
          <div style="background: rgba(255,255,255,0.15); border-radius: 0.2812rem; padding: 0.375rem 0.5625rem; backdrop-filter: blur(0.3516rem);">
            <p style="font-size: 0.4688rem; color: rgba(255,255,255,0.8); margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem;">Week</p>
            <p style="font-size: 0.6562rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif;">${audit.week ? escapeHtml(String(audit.week)) : 'N/A'}</p>
          </div>
        </div>
      </div>
      
      <!-- Two Column Layout -->
      <div id="auditContent" style="display: flex; padding: 1.125rem; max-width: 100%; gap: 0; flex-wrap: nowrap;">
        
        <!-- LEFT COLUMN: Interaction Details + Transcript -->
        <div id="leftColumn" style="display: flex; flex-direction: column; gap: 0.75rem; width: 45%; min-width: 10.5469rem; padding-right: 0.375rem;">
          
          <!-- Interaction Details -->
          <div style="background: #f9fafb; border-radius: 0.2812rem; padding: 0.375rem 0.5625rem; border: 0.0352rem solid #e5e7eb;">
            <div style="display: flex; align-items: center; gap: 0.5625rem; flex-wrap: nowrap;">
              <div style="display: flex; align-items: center; gap: 0.1875rem;">
                <svg style="width: 0.5625rem; height: 0.5625rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/></svg>
                <span style="font-size: 0.5156rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0106rem; white-space: nowrap;">ID:</span>
                <span id="interactionIdValue" style="font-size: 0.5625rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600;">${escapeHtml(audit.interactionId || 'N/A')}</span>
                <button id="copyInteractionId" style="background: transparent; border: none; cursor: pointer; padding: 0.0938rem; display: inline-flex; align-items: center;" title="Copy Interaction ID"><svg style="width: 0.6562rem; height: 0.6562rem;" viewBox="0 0 24 24" fill="#6b7280"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
              </div>
              <div style="width: 0.0352rem; height: 0.75rem; background: #d1d5db;"></div>
              <div style="display: flex; align-items: center; gap: 0.1875rem;">
                <span style="font-size: 0.5156rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0106rem; white-space: nowrap;">Date:</span>
                <span style="font-size: 0.5625rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600;">${formatDate(audit.interactionDate, false)}</span>
              </div>
              <div style="width: 0.0352rem; height: 0.75rem; background: #d1d5db;"></div>
              <div style="display: flex; align-items: center; gap: 0.1875rem;">
                <span style="font-size: 0.5156rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0106rem; white-space: nowrap;">Channel:</span>
                <span style="font-size: 0.5625rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600;">${escapeHtml(audit.channelName || audit.channel || (audit as any).channel_name || 'N/A')}</span>
              </div>
              <div style="width: 0.0352rem; height: 0.75rem; background: #d1d5db;"></div>
              <div style="display: flex; align-items: center; gap: 0.1875rem; min-width: 0; flex: 1;">
                <span style="font-size: 0.5156rem; color: #6b7280; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0106rem; white-space: nowrap;">Email:</span>
                <span id="clientEmailValue" style="font-size: 0.5625rem; color: #1f2937; font-family: 'Poppins', sans-serif; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(audit.clientEmail || 'N/A')}">${escapeHtml(audit.clientEmail || 'N/A')}</span>
                <button id="copyClientEmail" style="background: transparent; border: none; cursor: pointer; padding: 0.0938rem; display: inline-flex; align-items: center; flex-shrink: 0;" title="Copy Client Email"><svg style="width: 0.6562rem; height: 0.6562rem;" viewBox="0 0 24 24" fill="#6b7280"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg></button>
              </div>
            </div>
          </div>
          
          <!-- Transcript -->
          ${transcriptHtml}
        </div>
        
        <!-- RESIZABLE SPLITTER -->
        <div id="splitter" style="width: 0.2812rem; background: #e5e7eb; cursor: col-resize; position: relative; flex-shrink: 0; transition: background 0.2s;">
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 0.1406rem; height: 1.4062rem; background: #9ca3af; border-radius: 0.0703rem;"></div>
        </div>
        
        <!-- RIGHT COLUMN: Error Details & Recommendations -->
        <div id="rightColumn" style="flex: 1; min-width: 10.5469rem; padding-left: 0.375rem;">
          
          <!-- Error Details -->
          ${errorDetailsHtml}
          
          <!-- Recommendations -->
          ${audit.recommendations ? `<div style="background: #f9fafb; border-radius: 0.375rem; padding: 0.75rem; margin-bottom: 0.75rem; border: 0.0352rem solid #e5e7eb;"><h3 style="font-size: 0.7031rem; font-weight: 600; color: #1A733E; margin: 0 0 0.5625rem 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.375rem;"><svg style="width: 0.8438rem; height: 0.8438rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/></svg>Recommendations / Next Steps</h3><div style="background: white; padding: 0.6562rem; border-radius: 0.2812rem; border: 0.0352rem solid #e5e7eb; white-space: pre-wrap; font-size: 0.6094rem; line-height: 1.6; color: #374151; font-family: 'Poppins', sans-serif;">${escapeHtml(audit.recommendations)}</div></div>` : ''}
          
          <!-- Action Buttons -->
          <div style="display: flex; justify-content: center; gap: 0.75rem; margin-top: 0.75rem; padding-bottom: 0.75rem;">
            <button id="auditDetailModalViewFull" style="background: #1A733E; color: white; border: none; border-radius: 0.375rem; padding: 0.5625rem 1.5rem; font-size: 0.75rem; font-weight: 600; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s; box-shadow: 0 0.1406rem 0.2109rem rgba(0,0,0,0.1); display: flex; align-items: center; gap: 0.375rem;">
              <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              View Full Audit
            </button>
            <button id="auditDetailModalBottomClose" style="background: #6b7280; color: white; border: none; border-radius: 0.375rem; padding: 0.5625rem 1.5rem; font-size: 0.75rem; font-weight: 600; font-family: 'Poppins', sans-serif; cursor: pointer; transition: all 0.2s; box-shadow: 0 0.1406rem 0.2109rem rgba(0,0,0,0.1);">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

