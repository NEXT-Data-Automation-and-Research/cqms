/**
 * Updates Renderer Module
 * Handles rendering recent updates/notifications to the UI
 */

import type { Update } from '../types.js';
import { homeState } from '../state.js';
import { formatTimestamp, getInitials, escapeHtml, getStatusText } from '../utils.js';
import { viewAuditDetails, viewAudit } from '../utils.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export class UpdatesRenderer {
  render(allUpdates: Update[]): void {
    const updatesFeed = document.getElementById('updatesFeed');
    if (!updatesFeed) return;
    
    const { isAgent } = homeState;
    
    if (isAgent) {
      const reversalStatusUpdates = allUpdates.filter((u: Update) => u.type === 'reversal_status_update');
      const reversalCountEl = document.getElementById('reversalUpdatesCount');
      if (reversalCountEl) {
        if (reversalStatusUpdates.length > 0) {
          reversalCountEl.textContent = String(reversalStatusUpdates.length);
          reversalCountEl.style.display = 'inline-flex';
        } else {
          reversalCountEl.style.display = 'none';
        }
      }
    }

    if (allUpdates.length === 0) {
      safeSetHTML(updatesFeed, `
        <div class="px-4 py-6 text-center text-gray-500 text-xs">
          <p>No recent updates</p>
        </div>
      `);
      return;
    }

    const htmlContent = allUpdates.map(update => this.renderUpdate(update, isAgent)).join('');
    safeSetHTML(updatesFeed, htmlContent);
    this.setupEventListeners();
  }

  private renderUpdate(update: Update, isAgent: boolean): string {
    const timestamp = formatTimestamp(update.timestamp);
    const initials = getInitials(update.displayName);
    
    let statusText = '';
    if (update.type === 'audit_completed') {
      const interactionId = update.interactionId || 'N/A';
      statusText = isAgent ? `#${interactionId} was audited` : `completed your audit`;
    } else if (update.type === 'reversal_requested') {
      statusText = isAgent 
        ? `You requested reversal for audit ${update.interactionId || ''}`
        : `requested reversal for audit ${update.interactionId || ''}`;
    } else if (update.type === 'reversal_status_update') {
      const statusDisplay = update.status === 'Approved' ? 'approved' : update.status === 'Rejected' ? 'rejected' : update.status === 'Acknowledged' ? 'acknowledged' : 'updated';
      statusText = isAgent
        ? `Your reversal request has been ${statusDisplay}`
        : `Reversal request for audit ${update.interactionId || ''} has been ${statusDisplay}`;
    } else if (update.type === 'reversal_responded') {
      statusText = 'responded to your reversal request';
    } else {
      statusText = getStatusText(update.status || '', isAgent);
    }
    
    let dataAttributes = '';
    let clickableClass = '';
    if (update.type === 'audit_completed' || update.type === 'reversal_requested' || update.type === 'reversal_responded' || update.type === 'reversal_status_update') {
      dataAttributes = `data-action="view-audit-details" data-audit-id="${escapeHtml(update.auditId || '')}" data-scorecard-id="${escapeHtml(update.scorecardId || '')}" data-scorecard-table="${escapeHtml(update.scorecardTable || '')}"`;
      clickableClass = 'cursor-pointer';
    } else if (update.assignmentId) {
      dataAttributes = `data-action="view-audit" data-assignment-id="${escapeHtml(update.assignmentId)}"`;
      clickableClass = 'cursor-pointer';
    }

    let bgColor = 'bg-primary/10';
    let textColor = 'text-primary';
    if (update.type === 'reversal_status_update') {
      if (update.status === 'Approved') {
        bgColor = 'bg-success/10';
        textColor = 'text-success';
      } else if (update.status === 'Rejected') {
        bgColor = 'bg-error/10';
        textColor = 'text-error';
      } else if (update.status === 'Acknowledged') {
        bgColor = 'bg-primary/10';
        textColor = 'text-primary';
      } else {
        bgColor = 'bg-warning/10';
        textColor = 'text-warning';
      }
    } else if (update.type === 'reversal_requested') {
      bgColor = 'bg-warning/10';
      textColor = 'text-warning';
    } else if (update.type === 'audit_completed' && isAgent) {
      bgColor = 'bg-success/10';
      textColor = 'text-success';
    }

    const useGenericIcon = isAgent && (update.type === 'audit_completed' || update.type === 'reversal_requested' || update.type === 'reversal_status_update');
    const iconContent = useGenericIcon 
      ? `<svg class="w-4 h-4 ${textColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>`
      : `<span class="text-xs font-semibold ${textColor}">${initials}</span>`;

    const showViewButton = isAgent && update.type === 'audit_completed';
    const viewButton = showViewButton 
      ? `<button data-action="view-audit-details" data-audit-id="${escapeHtml(update.auditId || '')}" data-scorecard-id="${escapeHtml(update.scorecardId || '')}" data-scorecard-table="${escapeHtml(update.scorecardTable || '')}" class="view-audit-btn px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded hover:bg-primary-dark transition-colors flex-shrink-0">
          View
        </button>`
      : '';

    return `
      <div class="px-4 py-2.5 hover:bg-gray-50 transition-colors ${clickableClass}" ${dataAttributes}>
        <div class="flex items-start gap-2.5">
          <div class="w-7 h-7 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
            ${iconContent}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-gray-900 leading-snug">
              ${isAgent && (update.type === 'reversal_requested' || update.type === 'reversal_status_update' || update.type === 'audit_completed')
                ? statusText
                : update.displayName 
                  ? `<span class="font-medium">${escapeHtml(update.displayName)}</span> ${statusText}`
                  : statusText
              }
            </p>
            <p class="text-[10px] text-gray-500 mt-0.5">${timestamp}</p>
          </div>
          ${viewButton}
        </div>
      </div>
    `;
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
    
    document.querySelectorAll('[data-action="view-audit"]').forEach(element => {
      element.addEventListener('click', (e) => {
        e.stopPropagation();
        const assignmentId = element.getAttribute('data-assignment-id');
        if (assignmentId) {
          viewAudit(assignmentId);
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

