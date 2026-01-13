/**
 * Audit Card Builder
 * Builds status badges and action buttons for audit cards
 * Extracted from pending-audits-renderer.ts
 */

import { escapeHtml } from '../../../../utils/html-sanitizer.js';

interface PendingAudit {
  id: string;
  audit_id?: string;
  scorecard_id: string;
  status: string;
  scorecards?: {
    table_name: string;
  };
}

export class AuditCardBuilder {
  /**
   * Get status badge and action button for audit
   */
  getStatusBadgeAndButton(audit: PendingAudit, isAgent: boolean): { statusBadge: string; actionButton: string } {
    const canEdit = !isAgent;
    let statusBadge = '';
    let actionButton = '';
    
    if (audit.status === 'completed') {
      statusBadge = '<span style="background-color: #dbeafe; color: #1e40af; padding: 0.0808rem 0.3234rem; border-radius: 0.1617rem; font-size: 0.4447rem; font-weight: 600;">Completed</span>';
      if (audit.audit_id && audit.scorecard_id && audit.scorecards?.table_name) {
        const auditId = String(audit.audit_id).replace(/'/g, "\\'");
        const scorecardId = String(audit.scorecard_id).replace(/'/g, "\\'");
        const tableName = String(audit.scorecards.table_name).replace(/'/g, "\\'");
        actionButton = `<button 
          onclick="event.stopPropagation(); viewCompletedAudit('${auditId}', '${scorecardId}', '${tableName}')" 
          style="padding: 0.3234rem 0.6469rem; background-color: #1A733E; color: white; border: none; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap;"
          onmouseover="this.style.backgroundColor='#15582E'"
          onmouseout="this.style.backgroundColor='#1A733E'"
        >
          View Details
        </button>`;
      }
    } else if (audit.status === 'in_progress') {
      statusBadge = '<span style="background-color: #fef3c7; color: #92400e; padding: 0.0808rem 0.3234rem; border-radius: 0.1617rem; font-size: 0.4447rem; font-weight: 600;">In Progress</span>';
      if (canEdit) {
        actionButton = `<button 
          onclick="event.stopPropagation(); navigateToAssignment('${audit.id}')" 
          style="padding: 0.3234rem 0.6469rem; background-color: #1A733E; color: white; border: none; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap;"
          onmouseover="this.style.backgroundColor='#15582E'"
          onmouseout="this.style.backgroundColor='#1A733E'"
        >
          Continue
        </button>`;
      }
    } else {
      statusBadge = '<span style="background-color: #dcfce7; color: #166534; padding: 0.0808rem 0.3234rem; border-radius: 0.1617rem; font-size: 0.4447rem; font-weight: 600;">Pending</span>';
      if (canEdit) {
        actionButton = `<button 
          onclick="event.stopPropagation(); navigateToAssignment('${audit.id}')" 
          style="padding: 0.3234rem 0.6469rem; background-color: #1A733E; color: white; border: none; border-radius: 0.1617rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap;"
          onmouseover="this.style.backgroundColor='#15582E'"
          onmouseout="this.style.backgroundColor='#1A733E'"
        >
          Start Audit
        </button>`;
      }
    }
    
    return { statusBadge, actionButton };
  }

  /**
   * Get click handler for audit card
   */
  getClickHandler(audit: PendingAudit, isAgent: boolean): string {
    const canEdit = !isAgent;
    if (audit.status === 'completed' && audit.audit_id) {
      return `onclick="event.stopPropagation(); viewCompletedAudit('${audit.audit_id}', '${audit.scorecard_id}', '${audit.scorecards?.table_name || ''}')"`;
    } else if (canEdit) {
      return `onclick="navigateToAssignment('${audit.id}')"`;
    }
    return '';
  }

  /**
   * Create pull conversations button HTML
   */
  createPullConversationsButton(email: string, name: string): string {
    return `
      <button 
        class="pull-conversations-btn"
        data-email="${escapeHtml(email)}"
        data-name="${escapeHtml(name)}"
        style="padding: 0.2425rem 0.4852rem; background-color: #f0fdf4; color: #1A733E; border: 0.0304rem solid #1A733E; border-radius: 0.1617rem; font-size: 0.4447rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; display: flex; align-items: center; gap: 0.2425rem;"
        onmouseover="this.style.backgroundColor='#dcfce7'; this.style.borderColor='#15582E'; this.style.color='#15582E';"
        onmouseout="this.style.backgroundColor='#f0fdf4'; this.style.borderColor='#1A733E'; this.style.color='#1A733E';"
        title="Pull conversations for ${escapeHtml(name)}"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        <span>Pull Conversations</span>
      </button>
    `;
  }
}

