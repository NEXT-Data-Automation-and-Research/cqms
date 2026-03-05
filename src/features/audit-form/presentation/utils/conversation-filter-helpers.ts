/**
 * Conversation Filter Helpers
 * Helper functions for conversation filtering
 * Extracted from conversation-filter.ts to comply with 250-line limit
 */

import type { Conversation } from './conversation-formatter.js';

export class ConversationFilterHelpers {
  /**
   * Filter by product type
   */
  filterByProductType(conversations: Conversation[], productType: string): Conversation[] {
    return conversations.filter(conv => {
      let subject = conv.source?.subject || conv.source?.body?.substring(0, 50) || '';
      
      // Remove HTML tags if present
      if (subject.includes('<')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = subject;
        subject = tempDiv.textContent || tempDiv.innerText || subject;
      }
      
      const subjectLower = subject.toLowerCase().trim();
      const filterLower = productType.toLowerCase().trim();
      
      if (filterLower === 'cfd / forex' || filterLower === 'cfd/forex') {
        return subjectLower.includes('cfd') && (subjectLower.includes('forex') || subjectLower.includes('/'));
      } else if (filterLower === 'futures') {
        return subjectLower.includes('futures') && !subjectLower.includes('cfd');
      } else {
        return subjectLower.includes(filterLower);
      }
    });
  }

  /**
   * Sort conversations
   */
  sortConversations(
    conversations: Conversation[],
    sortField: string,
    sortOrder: string
  ): Conversation[] {
    const sorted = [...conversations];
    
    sorted.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortField) {
        case 'created_at':
          aValue = a.created_at || 0;
          bValue = b.created_at || 0;
          break;
        case 'waiting_since':
          aValue = (a as any).waiting_since || 0;
          bValue = (b as any).waiting_since || 0;
          break;
        case 'updated_at':
        default:
          aValue = a.updated_at || 0;
          bValue = b.updated_at || 0;
          break;
      }
      
      // Ensure we're comparing numbers
      aValue = typeof aValue === 'number' ? aValue : (aValue ? new Date(aValue).getTime() : 0);
      bValue = typeof bValue === 'number' ? bValue : (bValue ? new Date(bValue).getTime() : 0);
      
      // Handle Unix timestamps (seconds vs milliseconds)
      if (aValue < 10000000000) aValue = aValue * 1000;
      if (bValue < 10000000000) bValue = bValue * 1000;
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    return sorted;
  }
}

// Singleton instance
let conversationFilterHelpersInstance: ConversationFilterHelpers | null = null;

/**
 * Get conversation filter helpers instance
 */
export function getConversationFilterHelpers(): ConversationFilterHelpers {
  if (!conversationFilterHelpersInstance) {
    conversationFilterHelpersInstance = new ConversationFilterHelpers();
  }
  return conversationFilterHelpersInstance;
}


