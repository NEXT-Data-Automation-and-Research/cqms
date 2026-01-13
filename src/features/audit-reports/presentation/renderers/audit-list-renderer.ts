/**
 * Audit List Renderer
 * Renders the list of audit cards
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import type { AuditReport, PaginationState } from '../../domain/entities.js';
import type { AuditReportsController } from '../audit-reports-controller.js';

/**
 * Format date for display
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const day = date.getDate();
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return 'N/A';
  }
}

/**
 * Normalize passing status
 */
function normalizePassingStatus(status: string | undefined): string {
  if (!status) return 'Not Passed';
  const normalized = status.toLowerCase().trim();
  if (normalized === 'passed' || normalized === 'pass') {
    return 'Passed';
  }
  return 'Not Passed';
}

/**
 * Render audit list
 */
export function renderAuditList(
  container: HTMLElement,
  audits: AuditReport[],
  controller: AuditReportsController
): void {
  const auditCards = audits.map(audit => renderAuditCard(audit, controller));
  safeSetHTML(container, auditCards.join(''));
}

/**
 * Render single audit card
 */
function renderAuditCard(audit: AuditReport, controller: AuditReportsController): string {
  const status = normalizePassingStatus(audit.passingStatus);
  const statusColor = status === 'Passed' ? '#10b981' : '#ef4444';
  const statusIcon = status === 'Passed' ? '✓' : '✗';
  
  const submittedDate = formatDate(
    typeof audit.submittedAt === 'string' ? audit.submittedAt :
    typeof audit.submitted_at === 'string' ? audit.submitted_at :
    typeof audit.auditTimestamp === 'string' ? audit.auditTimestamp :
    (audit as any).submitted_at || (audit as any).submittedAt || undefined
  );
  
  // Handle both camelCase and snake_case field names
  const employeeName = escapeHtml(
    audit.employeeName || 
    (audit as any).employee_name || 
    ''
  ) || 'N/A';
  const employeeEmail = escapeHtml(
    audit.employeeEmail || 
    (audit as any).employee_email || 
    ''
  ) || 'N/A';
  const interactionId = escapeHtml(
    audit.interactionId || 
    (audit as any).interaction_id || 
    ''
  ) || 'N/A';
  // Use channelName if available, otherwise fall back to channel
  const channelDisplay = escapeHtml(
    audit.channelName || 
    audit.channel || 
    (audit as any).channel_name ||
    (audit as any).channel || 
    ''
  ) || 'N/A';
  const scorecardName = escapeHtml(
    audit._scorecard_name || 
    (audit as any)._scorecard_name || 
    'Unknown Scorecard'
  );
  
  // Handle numeric values - convert to number if string
  const averageScore = typeof audit.averageScore === 'number' 
    ? audit.averageScore 
    : (typeof audit.averageScore === 'string' 
        ? parseFloat(audit.averageScore) || 0 
        : ((audit as any).average_score !== undefined && (audit as any).average_score !== null
            ? (typeof (audit as any).average_score === 'number' 
                ? (audit as any).average_score 
                : parseFloat(String((audit as any).average_score)) || 0)
            : 0));
  
  const totalErrors = typeof audit.totalErrorsCount === 'number'
    ? audit.totalErrorsCount
    : (typeof audit.totalErrorsCount === 'string'
        ? parseInt(audit.totalErrorsCount, 10) || 0
        : ((audit as any).total_errors_count !== undefined && (audit as any).total_errors_count !== null
            ? (typeof (audit as any).total_errors_count === 'number'
                ? (audit as any).total_errors_count
                : parseInt(String((audit as any).total_errors_count), 10) || 0)
            : 0));

  return `
    <div class="audit-card" data-audit-id="${escapeHtml(audit.id)}" style="background: var(--background-white); border: 0.0469rem solid var(--border-light); border-radius: 0.375rem; padding: 0.75rem; box-shadow: var(--shadow-sm);">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5625rem;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 0.375rem; margin-bottom: 0.375rem;">
            <span style="font-size: 0.6562rem; font-weight: 600; color: var(--text-color);">${employeeName}</span>
            <span style="background: ${statusColor}; color: white; padding: 0.1875rem 0.375rem; border-radius: 0.1875rem; font-size: 0.5156rem; font-weight: 600;">${statusIcon} ${status}</span>
          </div>
          <div style="font-size: 0.5625rem; color: var(--text-secondary); margin-bottom: 0.1875rem;">${employeeEmail}</div>
          <div style="font-size: 0.5625rem; color: var(--text-secondary);">${scorecardName}</div>
        </div>
        <div style="display: flex; gap: 0.375rem;">
          <button class="action-btn" onclick="window.auditReportsController?.showAuditModal('${escapeHtml(audit.id)}')" style="padding: 0.375rem 0.75rem; font-size: 0.5625rem;">View</button>
          ${controller.getCurrentUserEmail() === (typeof audit.auditorEmail === 'string' ? audit.auditorEmail : typeof audit.auditor_email === 'string' ? audit.auditor_email : '')?.toLowerCase() ? `
            <button class="action-btn" onclick="window.auditReportsController?.editAudit('${escapeHtml(audit.id)}')" style="padding: 0.375rem 0.75rem; font-size: 0.5625rem;">Edit</button>
            <button class="action-btn" onclick="window.auditReportsController?.deleteAudit('${escapeHtml(audit.id)}')" style="padding: 0.375rem 0.75rem; font-size: 0.5625rem; background-color: #ef4444; color: white;">Delete</button>
          ` : ''}
        </div>
      </div>
      <div class="audit-card-grid" style="display: grid !important; grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr)) !important; gap: 0.5625rem !important; margin-top: 0.5625rem !important; padding-top: 0.5625rem !important; border-top: 0.0469rem solid var(--border-light) !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 2 !important;">
        <div class="audit-card-field" style="display: block !important; visibility: visible !important; opacity: 1 !important; min-width: 0 !important;">
          <div class="audit-card-label" style="font-size: 0.5156rem !important; color: #6b7280 !important; margin-bottom: 0.1875rem !important; visibility: visible !important; opacity: 1 !important;">Interaction ID</div>
          <div class="audit-card-value" style="font-size: 0.5625rem !important; font-weight: 600 !important; color: #1f2937 !important; visibility: visible !important; opacity: 1 !important; word-break: break-word !important;">${interactionId}</div>
        </div>
        <div class="audit-card-field" style="display: block !important; visibility: visible !important; opacity: 1 !important; min-width: 0 !important;">
          <div class="audit-card-label" style="font-size: 0.5156rem !important; color: #6b7280 !important; margin-bottom: 0.1875rem !important; visibility: visible !important; opacity: 1 !important;">Channel</div>
          <div class="audit-card-value" style="font-size: 0.5625rem !important; font-weight: 600 !important; color: #1f2937 !important; visibility: visible !important; opacity: 1 !important; word-break: break-word !important;">${channelDisplay}</div>
        </div>
        <div class="audit-card-field" style="display: block !important; visibility: visible !important; opacity: 1 !important; min-width: 0 !important;">
          <div class="audit-card-label" style="font-size: 0.5156rem !important; color: #6b7280 !important; margin-bottom: 0.1875rem !important; visibility: visible !important; opacity: 1 !important;">Score</div>
          <div class="audit-card-value" style="font-size: 0.5625rem !important; font-weight: 600 !important; color: #1f2937 !important; visibility: visible !important; opacity: 1 !important;">${typeof averageScore === 'number' ? averageScore.toFixed(0) : averageScore}%</div>
        </div>
        <div class="audit-card-field" style="display: block !important; visibility: visible !important; opacity: 1 !important; min-width: 0 !important;">
          <div class="audit-card-label" style="font-size: 0.5156rem !important; color: #6b7280 !important; margin-bottom: 0.1875rem !important; visibility: visible !important; opacity: 1 !important;">Errors</div>
          <div class="audit-card-value" style="font-size: 0.5625rem !important; font-weight: 600 !important; color: #1f2937 !important; visibility: visible !important; opacity: 1 !important;">${typeof totalErrors === 'number' ? totalErrors : totalErrors}</div>
        </div>
        <div class="audit-card-field" style="display: block !important; visibility: visible !important; opacity: 1 !important; min-width: 0 !important;">
          <div class="audit-card-label" style="font-size: 0.5156rem !important; color: #6b7280 !important; margin-bottom: 0.1875rem !important; visibility: visible !important; opacity: 1 !important;">Date</div>
          <div class="audit-card-value" style="font-size: 0.5625rem !important; font-weight: 600 !important; color: #1f2937 !important; visibility: visible !important; opacity: 1 !important;">${submittedDate}</div>
        </div>
      </div>
    </div>
  `;
}

