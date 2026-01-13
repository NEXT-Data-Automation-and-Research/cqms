/**
 * Employee Conversations Display
 * Handles displaying employee conversations in table format
 * Extracted from employee-conversations-controller.ts to comply with 250-line limit
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { getDateHelpers } from './date-helpers.js';
import { getConversationExtractors } from './conversation-extractors.js';
import { getConversationFormatter } from './conversation-formatter.js';
import { getClipboardHelper } from './clipboard-helper.js';
import type { Conversation } from './conversation-formatter.js';

export class EmployeeConversationsDisplay {
  private dateHelpers = getDateHelpers();
  private extractors = getConversationExtractors();
  private formatter = getConversationFormatter();
  private clipboardHelper = getClipboardHelper();

  /**
   * Display employee conversations
   */
  displayEmployeeConversations(
    conversations: Conversation[],
    currentPage: number,
    itemsPerPage: number,
    isLoading: boolean = false
  ): void {
    const tableBody = document.getElementById('conversationsTableBody');
    if (!tableBody) return;
    
    safeSetHTML(tableBody, '');

    if (conversations.length === 0) {
      const listDiv = document.getElementById('conversationsList');
      if (listDiv) listDiv.style.display = 'block';
      const paginationDiv = document.getElementById('conversationsPagination');
      if (paginationDiv) paginationDiv.style.display = 'none';
      safeSetHTML(tableBody, '<tr><td colspan="8" style="text-align: center; padding: 1.9406rem; color: #000000;">No conversations found for this date range.</td></tr>');
      return;
    }

    const totalPages = Math.ceil(conversations.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, conversations.length);
    const pageConversations = conversations.slice(startIndex, endIndex);

    const paginationStart = document.getElementById('conversationsPaginationStart');
    const paginationEnd = document.getElementById('conversationsPaginationEnd');
    const paginationTotal = document.getElementById('conversationsPaginationTotal');
    
    if (paginationStart) paginationStart.textContent = conversations.length > 0 ? String(startIndex + 1) : '0';
    if (paginationEnd) paginationEnd.textContent = String(endIndex);
    if (paginationTotal) {
      paginationTotal.textContent = isLoading ? `${conversations.length}+` : String(conversations.length);
    }

    pageConversations.forEach(conversation => {
      const row = this.createConversationRow(conversation);
      tableBody.appendChild(row);
    });

    this.updatePaginationControls(totalPages, currentPage);
    const paginationDiv = document.getElementById('conversationsPagination');
    if (paginationDiv) paginationDiv.style.display = totalPages > 1 ? 'block' : 'none';
  }

  /**
   * Create conversation table row
   */
  private createConversationRow(conversation: Conversation): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.style.borderBottom = '0.0625rem solid #e5e7eb';
    row.style.cursor = 'pointer';
    row.onmouseenter = () => {
      row.style.backgroundColor = '#f9fafb';
    };
    row.onmouseleave = () => {
      row.style.backgroundColor = 'transparent';
    };
    
    const clientName = this.formatter.extractClientName(conversation);
    const clientEmail = this.formatter.extractClientEmail(conversation);
    const createdDate = this.dateHelpers.formatConversationDateForDisplay(
      conversation.created_at || (conversation as any).created_at_time
    );
    const subject = conversation.source?.subject || 
                   (conversation as any).conversation_parts?.[0]?.body?.substring(0, 100) || 
                   'No subject';
    const subjectDisplay = subject.length > 50 ? subject.substring(0, 50) + '...' : subject;
    const state = conversation.state || 'unknown';
    const stateBadge = this.getStateBadge(state);
    const rating = this.extractors.getConversationRating(conversation);
    const ratingHtml = this.extractors.generateStarRating(rating);
    const conversationId = conversation.id || 'N/A';
    const productType = this.extractors.extractProductType(conversation);
    const productTypeBadge = this.getProductTypeBadge(productType);
    
    const rowHtml = `
      <td style="padding: 0.625rem 0.75rem; vertical-align: middle;">
        <div style="font-weight: 500; color: #111827; font-size: 0.875rem; line-height: 1.4;">${escapeHtml(clientName)}</div>
        ${clientEmail ? `<div style="font-size: 0.75rem; color: #000000; margin-top: 0.125rem;">${escapeHtml(clientEmail)}</div>` : ''}
      </td>
      <td style="padding: 0.625rem 0.75rem; vertical-align: middle;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <div style="font-family: 'Courier New', monospace; font-size: 0.8125rem; color: #000000; font-weight: 500;">${conversationId}</div>
          <button 
            class="copy-button"
            onclick="event.stopPropagation(); copyConversationId('${conversationId}', this);"
            title="Copy conversation ID"
            style="display: inline-flex; align-items: center; justify-content: center; padding: 0.25rem; background: transparent; border: none; border-radius: 0.25rem; cursor: pointer; color: #000000; transition: all 0.2s;"
            onmouseover="this.style.backgroundColor='#f3f4f6'; this.style.color='#374151'"
            onmouseout="this.style.backgroundColor='transparent'; this.style.color='#000000'"
          >
            <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 1rem; height: 1rem;">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            </svg>
          </button>
        </div>
      </td>
      <td style="padding: 0.625rem 0.75rem; vertical-align: middle;">
        <div style="max-width: 16rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.875rem; color: #374151; line-height: 1.4;" title="${escapeHtml(subject)}">${escapeHtml(subjectDisplay)}</div>
      </td>
      <td style="padding: 0.625rem 0.75rem; vertical-align: middle;">${productTypeBadge}</td>
      <td style="padding: 0.625rem 0.75rem; vertical-align: middle;">${ratingHtml}</td>
      <td style="padding: 0.625rem 0.75rem; vertical-align: middle;">${stateBadge}</td>
      <td style="padding: 0.625rem 0.75rem; vertical-align: middle; font-size: 0.875rem; color: #000000; white-space: nowrap;">${createdDate}</td>
      <td style="padding: 0.625rem 0.75rem; vertical-align: middle;">
        <button 
          onclick="event.stopPropagation(); window.open('audit-view.html?conversation_id=${conversation.id}', '_blank');"
          style="padding: 0.375rem 0.75rem; font-size: 0.8125rem; font-weight: 500; color: #1A733E; background: #d1fae5; border: none; border-radius: 0.375rem; cursor: pointer; transition: all 0.2s; white-space: nowrap;"
          onmouseover="this.style.background='#a7f3d0'"
          onmouseout="this.style.background='#d1fae5'"
        >
          Audit
        </button>
      </td>
    `;
    
    safeSetHTML(row, rowHtml);
    return row;
  }

  /**
   * Get state badge HTML
   */
  private getStateBadge(state: string): string {
    if (state === 'open') {
      return '<span style="background-color: #fef3c7; color: #92400e; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">Open</span>';
    } else if (state === 'closed') {
      return '<span style="background-color: #dcfce7; color: #166534; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">Closed</span>';
    } else {
      return `<span style="background-color: #fee2e2; color: #991b1b; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">${escapeHtml(state)}</span>`;
    }
  }

  /**
   * Get product type badge HTML
   */
  private getProductTypeBadge(productType: string | null): string {
    if (!productType) {
      return '<span style="color: #000000; font-size: 0.75rem;">—</span>';
    }
    
    const isCFD = productType.toLowerCase().includes('cfd') || productType === 'CFD / Forex';
    const isFutures = productType.toLowerCase().includes('futures');
    const bgColor = isCFD ? '#dbeafe' : isFutures ? '#fef3c7' : '#f3f4f6';
    const textColor = isCFD ? '#1e40af' : isFutures ? '#92400e' : '#374151';
    
    return `<span style="background-color: ${bgColor}; color: ${textColor}; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; white-space: nowrap;">${escapeHtml(productType)}</span>`;
  }

  /**
   * Update pagination controls
   */
  private updatePaginationControls(totalPages: number, currentPage: number): void {
    const paginationPages = document.getElementById('conversationsPaginationPages');
    const paginationPrev = document.getElementById('conversationsPaginationPrev');
    const paginationNext = document.getElementById('conversationsPaginationNext');
    
    if (!paginationPages || !paginationPrev || !paginationNext) return;
    
    safeSetHTML(paginationPages, '');
    
    const prevButton = paginationPrev as HTMLButtonElement;
    const nextButton = paginationNext as HTMLButtonElement;
    
    if (totalPages <= 1) {
      prevButton.disabled = true;
      nextButton.disabled = true;
      return;
    }
    
    prevButton.disabled = currentPage === 1;
    nextButton.disabled = currentPage === totalPages;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.type = 'button';
      pageBtn.style.cssText = 'padding: 0.1617rem 0.3234rem; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.4043rem; cursor: pointer; color: #000000; transition: all 0.2s;';
      if (i === currentPage) {
        pageBtn.style.background = '#1A733E';
        pageBtn.style.color = 'white';
        pageBtn.style.borderColor = '#1A733E';
      }
      pageBtn.textContent = String(i);
      pageBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof window !== 'undefined' && (window as any).conversationsGoToPage) {
          (window as any).conversationsGoToPage(i);
        }
      };
      paginationPages.appendChild(pageBtn);
    }
  }
}

// Singleton instance
let employeeConversationsDisplayInstance: EmployeeConversationsDisplay | null = null;

/**
 * Get employee conversations display instance
 */
export function getEmployeeConversationsDisplay(): EmployeeConversationsDisplay {
  if (!employeeConversationsDisplayInstance) {
    employeeConversationsDisplayInstance = new EmployeeConversationsDisplay();
  }
  return employeeConversationsDisplayInstance;
}

