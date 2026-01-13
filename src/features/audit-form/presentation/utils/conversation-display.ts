/**
 * Conversation Display Utility
 * Displays conversations in table format
 * Migrated from audit-form.html displayPullConversationsList()
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { logWarn } from '../../../../utils/logging-helper.js';
import { getConversationFormatter, type Conversation } from './conversation-formatter.js';

export class ConversationDisplay {
  private formatter = getConversationFormatter();

  /**
   * Display conversations list in table
   */
  displayPullConversationsList(conversations: Conversation[]): void {
    const tableBody = document.getElementById('pullConversationsTableBody');
    if (!tableBody) {
      logWarn('pullConversationsTableBody not found');
      return;
    }
    
    // Clear table
    tableBody.innerHTML = '';
    
    if (conversations.length === 0) {
      safeSetHTML(tableBody, '<tr><td colspan="17" style="text-align: center; padding: 1.9406rem; color: #000000;">No conversations found for the selected date.</td></tr>');
      return;
    }
    
    conversations.forEach(conversation => {
      const row = this.createConversationRow(conversation);
      tableBody.appendChild(row);
    });
  }

  /**
   * Create conversation table row
   */
  private createConversationRow(conversation: Conversation): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.style.cursor = 'pointer';
    row.onclick = () => {
      if (typeof (window as any).startAuditFromConversation === 'function') {
        (window as any).startAuditFromConversation(conversation);
      }
    };
    
    // Extract data
    const clientName = this.formatter.extractClientName(conversation) || 'Unknown';
    const clientEmail = this.formatter.extractClientEmail(conversation) || '';
    const conversationId = (conversation.id || 'N/A').toString();
    const subject = conversation.source?.subject || 
                   (conversation.source?.body ? conversation.source.body.substring(0, 50) : '') || 
                   'No subject';
    const productType = subject || '-';
    const rating = conversation.conversation_rating?.rating || '-';
    const state = conversation.state || 'unknown';
    const partsCount = conversation.participation_part_count || 0;
    const createdDate = conversation.created_at_iso || 
                       (conversation.created_at ? new Date(conversation.created_at * 1000).toLocaleDateString() : '-');
    const updatedDate = conversation.updated_at_iso || 
                       (conversation.updated_at ? new Date(conversation.updated_at * 1000).toLocaleDateString() : '-');
    
    // Extract additional attributes
    const sourceType = conversation.source?.type || '-';
    const language = (conversation.custom_attributes?.['Language'] || '-').toString();
    const priority = conversation.priority || 'not_priority';
    const totalParts = conversation.statistics?.count_conversation_parts || 0;
    const timeToReply = conversation.statistics?.time_to_admin_reply;
    const reopens = conversation.statistics?.count_reopens || 0;
    const slaStatus = conversation.sla_applied?.sla_status || '-';
    const slaName = conversation.sla_applied?.sla_name || '';
    const tags = conversation.tags?.tags || [];
    
    // Format values
    const ratingHtml = this.formatter.formatRating(rating);
    const stateBadge = this.formatter.formatState(state);
    const sourceDisplay = this.formatter.formatSource(sourceType);
    const priorityBadge = this.formatter.formatPriority(priority);
    const timeToReplyHtml = this.formatter.formatTimeToReply(timeToReply);
    const reopensBadge = this.formatter.formatReopens(reopens);
    const slaStatusHtml = this.formatter.formatSlaStatus(slaStatus, slaName);
    const tagsHtml = this.formatter.formatTags(tags);
    const createdDateShort = this.formatter.formatDateShort(createdDate);
    const updatedDateShort = this.formatter.formatDateShort(updatedDate);
    
    // Create row HTML
    safeSetHTML(row, `
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle;">
        <div style="font-weight: 500; color: #111827; font-size: 0.75rem; line-height: 1.2;">${escapeHtml(clientName)}</div>
        <div style="font-size: 0.625rem; color: #000000; line-height: 1.2;">${clientEmail ? escapeHtml(clientEmail.substring(0, 20)) + (clientEmail.length > 20 ? '...' : '') : '-'}</div>
      </td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle;">
        <div style="display: flex; align-items: center; gap: 0.25rem;">
          <span style="font-family: monospace; font-size: 0.625rem; color: #000000;">${conversationId && conversationId !== 'N/A' ? conversationId.substring(0, 8) + '...' : 'N/A'}</span>
          <button onclick="event.stopPropagation(); copyToClipboard('${conversationId}', this);" style="padding: 0.125rem; background: transparent; border: none; cursor: pointer; color: #000000; transition: all 0.2s;" onmouseover="this.style.color='#1A733E';" onmouseout="this.style.color='#000000';" title="Copy ID">
            <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
        </div>
      </td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle;">
        <div style="max-width: 10rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: #374151;" title="${escapeHtml(subject)}">${escapeHtml(subject)}</div>
      </td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center; font-size: 0.875rem;" title="${sourceType}">${sourceDisplay}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center; font-size: 0.6875rem; color: #374151; max-width: 5rem; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(productType)}">${escapeHtml(productType)}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center; font-size: 0.6875rem; color: #000000;">${language && language !== '-' ? escapeHtml(language.substring(0, 3)) : '-'}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center;">${ratingHtml}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center;">${stateBadge}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center;">${priorityBadge}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center;">
        ${partsCount > 0 ? `<span style="background: #dbeafe; color: #1e40af; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.6875rem; font-weight: 600; display: inline-block;">${partsCount}</span>` : '<span style="color: #000000; font-size: 0.6875rem;">-</span>'}
      </td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center; font-size: 0.6875rem; color: #374151; font-weight: 500;">${totalParts > 0 ? totalParts : '-'}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center; white-space: nowrap;">${timeToReplyHtml}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center;">${reopensBadge}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center;">${slaStatusHtml}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; max-width: 8rem;">${tagsHtml}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; font-size: 0.6875rem; color: #000000; white-space: nowrap; text-align: center;" title="${createdDate}">${createdDateShort}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; font-size: 0.6875rem; color: #000000; white-space: nowrap; text-align: center;" title="${updatedDate}">${updatedDateShort}</td>
      <td style="padding: 0.375rem 0.5rem; vertical-align: middle; text-align: center;">
        <button 
          class="start-audit-from-conversation-btn"
          data-conversation-id="${conversation.id}"
          style="padding: 0.25rem 0.5rem; font-size: 0.6875rem; font-weight: 500; color: #1A733E; background: #d1fae5; border: none; border-radius: 0.25rem; cursor: pointer; transition: all 0.2s; white-space: nowrap;"
          onmouseover="this.style.background='#a7f3d0'"
          onmouseout="this.style.background='#d1fae5'"
        >
          Audit
        </button>
      </td>
    `);
    
    // Attach click handler to button
    const auditButton = row.querySelector('.start-audit-from-conversation-btn');
    if (auditButton) {
      auditButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof (window as any).startAuditFromConversation === 'function') {
          (window as any).startAuditFromConversation(conversation);
        }
      });
    }
    
    return row;
  }

  /**
   * Extract client name from conversation
   */
  extractClientName(conversation: Conversation): string {
    return this.formatter.extractClientName(conversation);
  }

  /**
   * Extract client email from conversation
   */
  extractClientEmail(conversation: Conversation): string {
    return this.formatter.extractClientEmail(conversation);
  }

  /**
   * Show error message
   */
  showPullConversationsError(message: string): void {
    const errorDiv = document.getElementById('pullConversationsError');
    const errorMessage = document.getElementById('pullConversationsErrorMessage');
    const loadingDiv = document.getElementById('pullConversationsLoading');
    const listDiv = document.getElementById('pullConversationsList');
    
    if (errorDiv && errorMessage) {
      errorMessage.textContent = message;
      errorDiv.style.display = 'block';
    }
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (listDiv) listDiv.style.display = 'none';
  }
}

// Singleton instance
let conversationDisplayInstance: ConversationDisplay | null = null;

/**
 * Get conversation display instance
 */
export function getConversationDisplay(): ConversationDisplay {
  if (!conversationDisplayInstance) {
    conversationDisplayInstance = new ConversationDisplay();
  }
  return conversationDisplayInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).displayPullConversationsList = (conversations: Conversation[]) => {
    getConversationDisplay().displayPullConversationsList(conversations);
  };
  
  (window as any).showPullConversationsError = (message: string) => {
    getConversationDisplay().showPullConversationsError(message);
  };
  
  (window as any).extractClientName = (conversation: Conversation) => {
    return getConversationDisplay().extractClientName(conversation);
  };
  
  (window as any).extractClientEmail = (conversation: Conversation) => {
    return getConversationDisplay().extractClientEmail(conversation);
  };
}

export type { Conversation };

