/**
 * Pending Audits Renderer
 * Renders pending audit cards in the UI
 * Extracted from pending-audits-controller.ts
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { logError } from '../../../../utils/logging-helper.js';
import { AuditCardBuilder } from '../utils/audit-card-builder.js';
import { getInitials, formatRelativeDate } from '../utils/common-helpers.js';

interface PendingAudit {
  id: string;
  audit_id?: string;
  scorecard_id: string;
  employee_email: string;
  employee_name?: string;
  auditor_email: string;
  status: string;
  completed_at?: string;
  scorecards?: {
    id: string;
    name: string;
    table_name: string;
  };
}

export class PendingAuditsRenderer {
  private cardBuilder: AuditCardBuilder;

  constructor() {
    this.cardBuilder = new AuditCardBuilder();
  }
  /**
   * Display pending audits in UI
   */
  displayPendingAudits(
    audits: PendingAudit[],
    showAllAudits: boolean,
    currentPage: number,
    itemsPerPage: number
  ): void {
    const section = document.getElementById('pendingAuditsSection');
    const list = document.getElementById('pendingAuditsList');
    const countBadge = document.getElementById('pendingCount');
    const paginationContainer = document.getElementById('pendingAuditsPagination');
    
    if (!section || !list || !countBadge) {
      return;
    }
    
    const isEditingPendingAudit = (window as any).isEditingPendingAudit || false;
    if (!isEditingPendingAudit) {
      section.style.display = 'block';
    }
    
    countBadge.textContent = audits.length.toString();
    
    // Show empty state
    if (audits.length === 0) {
      this.renderEmptyState(list, showAllAudits, paginationContainer);
      return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(audits.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAudits = audits.slice(startIndex, endIndex);
    
    // Clear list
    list.innerHTML = '';
    
    // Get user info
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const userRole = userInfo.role || '';
    const isAgent = userRole === 'Employee';
    
    // Render audit cards
    paginatedAudits.forEach(audit => {
      const auditCard = this.createAuditCard(audit, isAgent);
      list.appendChild(auditCard);
    });
  }

  /**
   * Render empty state
   */
  private renderEmptyState(list: HTMLElement, showAllAudits: boolean, paginationContainer: HTMLElement | null): void {
    const emptyStateMessage = showAllAudits 
      ? 'No completed audits found.'
      : 'No audits have been assigned to you yet.';
    
    safeSetHTML(list, `
      <div style="text-align: center; padding: 1.9406rem 0.9704rem; color: #000000;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 0.6469rem; opacity: 0.4;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <p style="font-size: 0.5659rem; font-weight: 500; color: #374151; margin: 0 0 0.3234rem;">${escapeHtml(emptyStateMessage)}</p>
        <p style="font-size: 0.4852rem; color: #000000; margin: 0;">Audits will appear here once they are assigned to you.</p>
      </div>
    `);
    if (paginationContainer) paginationContainer.style.display = 'none';
  }

  /**
   * Create audit card element
   */
  createAuditCard(audit: PendingAudit, isAgent: boolean): HTMLElement {
    const auditCard = document.createElement('div');
    auditCard.style.cssText = `
      background: #f9fafb;
      border: 0.0405rem solid #e5e7eb;
      border-radius: 0.1617rem;
      padding: 0.4852rem;
      transition: all 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.4852rem;
    `;
    
    const displayName = isAgent 
      ? (audit.auditor_email || 'Unknown Auditor') 
      : (audit.employee_name || 'Unknown Employee');
    const displayEmail = isAgent 
      ? (audit.auditor_email || 'No email') 
      : (audit.employee_email || 'No email');
    
    const { statusBadge, actionButton } = this.cardBuilder.getStatusBadgeAndButton(audit, isAgent);
    const clickHandler = this.cardBuilder.getClickHandler(audit, isAgent);
    
    safeSetHTML(auditCard, `
      <div style="flex: 1; display: flex; align-items: center; gap: 0.4852rem; ${clickHandler ? 'cursor: pointer;' : ''}" ${clickHandler}>
        <div style="width: 1.6171rem; height: 1.6171rem; border-radius: 0.1617rem; background: #1A733E; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.5659rem; flex-shrink: 0;">
          ${getInitials(displayName)}
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; align-items: center; gap: 0.3234rem; margin-bottom: 0.1617rem;">
            <h4 style="margin: 0; font-size: 0.5659rem; font-weight: 600; color: #1f2937;">
              ${escapeHtml(displayName)}
            </h4>
          </div>
          <p style="margin: 0; font-size: 0.4852rem; color: #000000; display: flex; align-items: center; gap: 0.2425rem; flex-wrap: wrap;">
            <span>${escapeHtml(displayEmail)}</span>
            <span style="color: #d1d5db;">•</span>
            <span style="font-weight: 500; color: #374151;">${escapeHtml(audit.scorecards?.name || 'Unknown Scorecard')}</span>
            ${audit.completed_at ? `<span style="color: #d1d5db;">•</span><span style="font-size: 0.4447rem; color: #000000;">Completed ${formatRelativeDate(audit.completed_at)}</span>` : ''}
          </p>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.3234rem; flex-shrink: 0;">
        ${statusBadge}
        ${actionButton}
        ${displayEmail && displayEmail !== 'No email' ? this.cardBuilder.createPullConversationsButton(displayEmail, displayName) : ''}
      </div>
    `);
    
    // Add event listeners
    this.attachCardEventListeners(auditCard, audit, displayEmail, displayName);
    
    return auditCard;
  }


  /**
   * Attach event listeners to audit card
   */
  private attachCardEventListeners(card: HTMLElement, audit: PendingAudit, email: string, name: string): void {
    // Pull conversations button
    if (email && email !== 'No email') {
      const pullBtn = card.querySelector('.pull-conversations-btn');
      if (pullBtn) {
        pullBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          if ((window as any).pullConversationsForEmployee && typeof (window as any).pullConversationsForEmployee === 'function') {
            (window as any).pullConversationsForEmployee(email, name);
          } else {
            logError('pullConversationsForEmployee function not found');
            alert('Function not loaded. Please refresh the page.');
          }
        });
      }
    }
    
    // Hover effects
    card.onmouseenter = () => {
      card.style.borderColor = '#1A733E';
      card.style.backgroundColor = '#ffffff';
    };
    card.onmouseleave = () => {
      card.style.borderColor = '#e5e7eb';
      card.style.backgroundColor = '#f9fafb';
    };
  }

}

