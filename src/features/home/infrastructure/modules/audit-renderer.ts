/**
 * Audit Renderer Module
 * Handles rendering audit lists to the UI
 */

import type { Audit, User } from '../types.js';
import { homeState } from '../state.js';
import { 
  formatTimestamp, 
  getInitials, 
  escapeHtml, 
  getAcknowledgmentStatusChip, 
  getReversalStatusChip 
} from '../utils.js';
import { viewAuditDetails } from '../utils.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logError } from '../../../../utils/logging-helper.js';

export class AuditRenderer {
  render(assignedAudits: Audit[], allUsers: User[]): void {
    const list = document.getElementById('assignedAuditsList');
    const countEl = document.getElementById('pendingCount');

    if (!list) return;

    if (countEl) countEl.textContent = String(assignedAudits.length);

    if (assignedAudits.length === 0) {
      const emptyMessage = homeState.isAgent 
        ? 'Your completed audits will appear here'
        : 'No pending audits assigned';
      safeSetHTML(list, `
        <div class="px-4 py-8 text-center text-gray-500 text-xs">
          <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p class="font-medium text-gray-700 mb-1">No audits found</p>
          <p class="text-gray-500">${escapeHtml(emptyMessage)}</p>
        </div>
      `);
      return;
    }

    const sorted = [...assignedAudits];
    this.sortAudits(sorted);

    const htmlContent = sorted.map(audit => {
      const isAssignment = audit._isAssignment === true;
      
      if (isAssignment) {
        return this.renderAssignment(audit, allUsers);
      } else {
        return this.renderCompletedAudit(audit, allUsers);
      }
    }).join('');

    safeSetHTML(list, htmlContent);
    
    this.setupEventListeners();
  }

  private renderAssignment(audit: Audit, allUsers: User[]): string {
    const { currentUserEmail } = homeState;
    const employeeEmail = (audit.employee_email || '').toLowerCase().trim();
    const displayUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
    const displayName = audit.employee_name || displayUser?.name || audit.employee_email?.split('@')[0] || 'Unknown';
    const displayEmail = audit.employee_email || '';
    const scorecardName = audit._scorecard_name || 'Unknown Scorecard';
    const initials = getInitials(displayName);
    
    const statusBadge = audit.status === 'in_progress'
      ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-800">In Progress</span>'
      : '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">Pending</span>';
    
    const requestDate = formatTimestamp(audit.created_at);

    return `
      <div class="px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0" onclick="window.location.href='create-audit.html'">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            <div class="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
              ${initials}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5 mb-0.5">
                <h4 class="text-xs font-semibold text-gray-900 truncate">
                  ${escapeHtml(displayName)}
                </h4>
              </div>
              <p class="text-[10px] text-gray-600 flex items-center gap-1 flex-wrap">
                <span class="truncate">${escapeHtml(displayEmail)}</span>
                <span class="text-gray-300">•</span>
                <span class="font-medium text-gray-700">${escapeHtml(scorecardName)}</span>
                <span class="text-gray-300">•</span>
                <span>${requestDate}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${statusBadge}
            <button onclick="event.stopPropagation(); window.location.href='create-audit.html'" class="px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded hover:bg-primary-dark transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderCompletedAudit(audit: Audit, allUsers: User[]): string {
    const { currentUserEmail, isAgent } = homeState;
    
    if (isAgent) {
      const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim();
      if (auditEmployeeEmail !== currentUserEmail) {
        logError('CRITICAL: Audit does not belong to current user!', {
          auditId: audit.id,
          auditEmployeeEmail,
          currentUserEmail,
          audit
        });
      }
    }
    
    let displayUser: User | undefined, displayName: string | null, displayEmail: string | null;
    if (isAgent) {
      displayName = null;
      displayEmail = null;
    } else {
      const employeeEmail = (audit.employee_email || '').toLowerCase().trim();
      displayUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
      displayName = audit.employee_name || displayUser?.name || audit.employee_email?.split('@')[0] || 'Unknown';
      displayEmail = audit.employee_email || '';
    }
    
    const scorecardName = audit._scorecard_name || 'Unknown Scorecard';
    const initials = isAgent ? null : getInitials(displayName);
    
    const passingStatus = audit.passing_status || audit.passingStatus || 'Unknown';
    const normalizedStatus = passingStatus === 'Passing' ? 'Passed' : (passingStatus === 'Not Passing' ? 'Not Passed' : passingStatus);
    const statusColor = normalizedStatus === 'Passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
    const statusIcon = normalizedStatus === 'Passed' ? '✓' : '✗';
    
    const submittedDate = formatTimestamp(audit.submitted_at);
    const averageScore = audit.average_score || audit.averageScore || '0';
    const totalErrors = audit.total_errors_count || audit.totalErrorsCount || '0';
    const interactionId = audit.interaction_id || 'N/A';
    const channel = audit.channel || 'N/A';
    
    const reversalStatusChip = getReversalStatusChip(audit);
    const acknowledgmentStatusChip = getAcknowledgmentStatusChip(audit);

    return `
      <div class="px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0" data-action="view-audit-details" data-audit-id="${escapeHtml(audit.id)}" data-scorecard-id="${escapeHtml(audit._scorecard_id || '')}" data-scorecard-table="${escapeHtml(audit._scorecard_table || '')}">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 flex-1 min-w-0">
            ${isAgent ? `
              <div class="w-8 h-8 rounded bg-success/10 flex items-center justify-center flex-shrink-0">
                <svg class="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            ` : `
              <div class="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                ${initials}
              </div>
            `}
            <div class="flex-1 min-w-0">
              ${isAgent ? `
                <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <h4 class="text-xs font-semibold text-gray-900 truncate">
                    ${escapeHtml(interactionId)}
                  </h4>
                  ${audit._scorecard_name ? `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                      ${escapeHtml(audit._scorecard_name)}
                    </span>
                  ` : ''}
                  <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold ${statusColor}">
                    ${statusIcon} ${normalizedStatus}
                  </span>
                </div>
                <p class="text-[10px] text-gray-600 flex items-center gap-1 flex-wrap">
                  <span>${escapeHtml(channel)}</span>
                  <span class="text-gray-300">•</span>
                  <span class="font-medium text-gray-700">${averageScore}%</span>
                  <span class="text-gray-300">•</span>
                  <span>${totalErrors} errors</span>
                  <span class="text-gray-300">•</span>
                  <span>${submittedDate}</span>
                </p>
              ` : `
                <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <h4 class="text-xs font-semibold text-gray-900 truncate">
                    ${escapeHtml(displayName || '')}
                  </h4>
                  ${audit._scorecard_name ? `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                      ${escapeHtml(audit._scorecard_name)}
                    </span>
                  ` : ''}
                </div>
                <p class="text-[10px] text-gray-600 flex items-center gap-1 flex-wrap">
                  <span>${escapeHtml(interactionId)}</span>
                  <span class="text-gray-300">•</span>
                  <span>${escapeHtml(channel)}</span>
                  <span class="text-gray-300">•</span>
                  <span class="flex flex-col items-start">
                    <span class="font-medium text-gray-700">${averageScore}%</span>
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold ${statusColor} mt-0.5">
                      ${statusIcon} ${normalizedStatus}
                    </span>
                  </span>
                  <span class="text-gray-300">•</span>
                  <span>${totalErrors} errors</span>
                  <span class="text-gray-300">•</span>
                  <span>${submittedDate}</span>
                </p>
              `}
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${acknowledgmentStatusChip}
            ${reversalStatusChip}
            <button data-action="view-audit-details" data-audit-id="${escapeHtml(audit.id)}" data-scorecard-id="${escapeHtml(audit._scorecard_id || '')}" data-scorecard-table="${escapeHtml(audit._scorecard_table || '')}" class="view-audit-btn px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded hover:bg-primary-dark transition-colors">
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
  }

  sortAudits(audits: Audit[]): void {
    const { sortBy, isAgent } = homeState;
    
    audits.sort((a, b) => {
      const isAssignmentA = a._isAssignment === true;
      const isAssignmentB = b._isAssignment === true;
      
      switch (sortBy) {
        case 'name_asc':
          const nameA = (isAgent ? (a.auditor_name || a.auditor_email || '') : (a.employee_name || a.employee_email || '')).toLowerCase();
          const nameB = (isAgent ? (b.auditor_name || b.auditor_email || '') : (b.employee_name || b.employee_email || '')).toLowerCase();
          return nameA.localeCompare(nameB);
        case 'name_desc':
          const nameA2 = (isAgent ? (a.auditor_name || a.auditor_email || '') : (a.employee_name || a.employee_email || '')).toLowerCase();
          const nameB2 = (isAgent ? (b.auditor_name || b.auditor_email || '') : (b.employee_name || b.employee_email || '')).toLowerCase();
          return nameB2.localeCompare(nameA2);
        case 'status_asc':
          if (isAssignmentA && isAssignmentB) {
            const statusOrder: { [key: string]: number } = { 'pending': 0, 'in_progress': 1 };
            return (statusOrder[a.status || ''] || 0) - (statusOrder[b.status || ''] || 0);
          }
          const statusA = (a.passing_status || a.passingStatus || '').toLowerCase();
          const statusB = (b.passing_status || b.passingStatus || '').toLowerCase();
          return statusA.localeCompare(statusB);
        case 'status_desc':
          if (isAssignmentA && isAssignmentB) {
            const statusOrder: { [key: string]: number } = { 'pending': 0, 'in_progress': 1 };
            return (statusOrder[b.status || ''] || 0) - (statusOrder[a.status || ''] || 0);
          }
          const statusA2 = (a.passing_status || a.passingStatus || '').toLowerCase();
          const statusB2 = (b.passing_status || b.passingStatus || '').toLowerCase();
          return statusB2.localeCompare(statusA2);
        case 'date_asc':
          const dateA = new Date(a.submitted_at || a.created_at || 0).getTime();
          const dateB = new Date(b.submitted_at || b.created_at || 0).getTime();
          return dateA - dateB;
        case 'date_desc':
        default:
          const dateA2 = new Date(a.submitted_at || a.created_at || 0).getTime();
          const dateB2 = new Date(b.submitted_at || b.created_at || 0).getTime();
          return dateB2 - dateA2;
      }
    });
  }

  private setupEventListeners(): void {
    document.querySelectorAll('[data-action="view-audit-details"]').forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const auditId = element.getAttribute('data-audit-id');
        const scorecardId = element.getAttribute('data-scorecard-id') || '';
        const scorecardTable = element.getAttribute('data-scorecard-table') || '';
        if (auditId) {
          viewAuditDetails(auditId, scorecardId, scorecardTable);
        }
      });
    });
    
    document.querySelectorAll('.view-audit-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const auditId = button.getAttribute('data-audit-id');
        const scorecardId = button.getAttribute('data-scorecard-id') || '';
        const scorecardTable = button.getAttribute('data-scorecard-table') || '';
        if (auditId) {
          viewAuditDetails(auditId, scorecardId, scorecardTable);
        }
      });
    });
  }
}

