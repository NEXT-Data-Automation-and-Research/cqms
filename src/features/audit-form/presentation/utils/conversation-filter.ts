/**
 * Conversation Filter
 * Handles filtering conversations based on various criteria
 * Migrated from audit-form.html filterPullConversations() and applyClientSideFilters()
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';
import { getConversationDisplay } from './conversation-display.js';
import { getConversationFilterHelpers } from './conversation-filter-helpers.js';
import type { Conversation } from './conversation-formatter.js';

export interface ConversationFilters {
  state?: string | null;
  priority?: string | null;
  rating?: string | null;
  sourceType?: string | null;
  productType?: string | null;
  language?: string | null;
  slaStatus?: string | null;
  minParts?: number | null;
  minReopens?: number | null;
  maxTimeToReply?: number | null;
  clientSearch?: string | null;
  conversationId?: string | null;
  open?: boolean | null;
  unread?: boolean | null;
  sort?: string;
  order?: string;
  dateStart?: string | null;
  dateEnd?: string | null;
}

export class ConversationFilter {
  private display = getConversationDisplay();
  private helpers = getConversationFilterHelpers();

  /**
   * Filter conversations based on filters
   */
  filterPullConversations(
    conversations: Conversation[],
    filters: ConversationFilters
  ): Conversation[] {
    logInfo('Filtering conversations...');
    logInfo(`Original list length: ${conversations?.length || 0}`);
    
    if (!conversations || conversations.length === 0) {
      logWarn('No conversations to filter');
      return [];
    }
    
    let filtered = [...conversations]; // Create a copy
    const initialCount = filtered.length;
    
    // Filter by state
    if (filters.state) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(conv => conv.state === filters.state);
      logInfo(`State filter (${filters.state}): ${beforeCount} → ${filtered.length}`);
    }
    
    // Filter by priority
    if (filters.priority) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(conv => conv.priority === filters.priority);
      logInfo(`Priority filter (${filters.priority}): ${beforeCount} → ${filtered.length}`);
    }
    
    // Filter by rating
    if (filters.rating) {
      const beforeCount = filtered.length;
      if (filters.rating === 'unrated') {
        filtered = filtered.filter(conv => !conv.conversation_rating || !conv.conversation_rating.rating);
      } else {
        const ratingNum = parseInt(filters.rating);
        filtered = filtered.filter(conv => conv.conversation_rating?.rating === ratingNum);
      }
      logInfo(`Rating filter (${filters.rating}): ${beforeCount} → ${filtered.length}`);
    }
    
    // Filter by source type
    if (filters.sourceType) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(conv => conv.source?.type === filters.sourceType);
      logInfo(`Source type filter (${filters.sourceType}): ${beforeCount} → ${filtered.length}`);
    }
    
    // Filter by product type
    if (filters.productType) {
      const beforeCount = filtered.length;
      filtered = this.helpers.filterByProductType(filtered, filters.productType);
      logInfo(`Product type filter (${filters.productType}): ${beforeCount} → ${filtered.length}`);
    }
    
    // Filter by language
    if (filters.language) {
      const languageLower = filters.language.toLowerCase();
      filtered = filtered.filter(conv => {
        const lang = conv.custom_attributes?.['Language'] || '';
        return lang.toLowerCase().includes(languageLower);
      });
    }
    
    // Filter by SLA status
    if (filters.slaStatus) {
      if (filters.slaStatus === 'none') {
        filtered = filtered.filter(conv => !conv.sla_applied || !conv.sla_applied.sla_status);
      } else {
        filtered = filtered.filter(conv => conv.sla_applied?.sla_status === filters.slaStatus);
      }
    }
    
    // Filter by minimum parts count
    if (filters.minParts !== null && filters.minParts !== undefined) {
      filtered = filtered.filter(conv => {
        const partsCount = conv.participation_part_count || 0;
        return partsCount >= filters.minParts!;
      });
    }
    
    // Filter by minimum reopens
    if (filters.minReopens !== null && filters.minReopens !== undefined) {
      filtered = filtered.filter(conv => {
        const reopens = conv.statistics?.count_reopens || 0;
        return reopens >= filters.minReopens!;
      });
    }
    
    // Filter by maximum time to reply
    if (filters.maxTimeToReply !== null && filters.maxTimeToReply !== undefined) {
      filtered = filtered.filter(conv => {
        const timeToReply = conv.statistics?.time_to_admin_reply;
        if (timeToReply === null || timeToReply === undefined) return false;
        const minutes = Math.round(timeToReply / 60);
        return minutes <= filters.maxTimeToReply!;
      });
    }
    
    // Filter by client search
    if (filters.clientSearch) {
      const searchLower = filters.clientSearch.toLowerCase();
      filtered = filtered.filter(conv => {
        const clientName = this.display.extractClientName(conv).toLowerCase();
        const clientEmail = this.display.extractClientEmail(conv)?.toLowerCase() || '';
        return clientName.includes(searchLower) || clientEmail.includes(searchLower);
      });
    }
    
    // Filter by conversation ID
    if (filters.conversationId) {
      const idSearch = filters.conversationId.toLowerCase();
      filtered = filtered.filter(conv => {
        const convId = (conv.id || '').toString().toLowerCase();
        return convId.includes(idSearch);
      });
    }
    
    // Filter by open/closed status
    if (filters.open !== null && filters.open !== undefined) {
      filtered = filtered.filter(conv => {
        const isOpen = (conv as any).open === true || conv.state === 'open';
        return filters.open ? isOpen : !isOpen;
      });
    }
    
    // Filter by read/unread status
    if (filters.unread !== null && filters.unread !== undefined) {
      filtered = filtered.filter(conv => {
        const isUnread = (conv as any).read === false;
        return filters.unread ? isUnread : !isUnread;
      });
    }
    
    // Filter by date range
    if (filters.dateStart || filters.dateEnd) {
      filtered = filtered.filter(conv => {
        const convDate = conv.updated_at || conv.created_at;
        if (!convDate) return false;
        
        let timestamp = typeof convDate === 'number' ? convDate : new Date(convDate).getTime();
        if (timestamp < 10000000000) timestamp = timestamp * 1000;
        
        const convDateObj = new Date(timestamp);
        const convDateStr = convDateObj.toISOString().split('T')[0];
        
        if (filters.dateStart && convDateStr < filters.dateStart) {
          return false;
        }
        if (filters.dateEnd && convDateStr > filters.dateEnd) {
          return false;
        }
        
        return true;
      });
    }
    
    // Sort conversations
    if (filters.sort || filters.order) {
      filtered = this.helpers.sortConversations(filtered, filters.sort || 'updated_at', filters.order || 'desc');
    }
    
    logInfo(`Filtered from ${initialCount} to ${filtered.length} conversations`);
    
    return filtered;
  }

}

// Singleton instance
let conversationFilterInstance: ConversationFilter | null = null;

/**
 * Get conversation filter instance
 */
export function getConversationFilter(): ConversationFilter {
  if (!conversationFilterInstance) {
    conversationFilterInstance = new ConversationFilter();
  }
  return conversationFilterInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).filterPullConversations = function() {
    const filter = getConversationFilter();
    const conversations = (window as any).pullConversationsList || [];
    const filters = (window as any).pullConversationsFilters || {};
    
    const filtered = filter.filterPullConversations(conversations, filters);
    (window as any).pullConversationsFilteredList = filtered;
    
    const display = getConversationDisplay();
    display.displayPullConversationsList(filtered);
    
    // Update count
    const countElement = document.getElementById('pullConversationsCount');
    if (countElement) {
      countElement.textContent = filtered.length.toString();
    }
  };
  
  (window as any).applyClientSideFilters = (conversations: Conversation[], filters: ConversationFilters) => {
    return getConversationFilter().filterPullConversations(conversations, filters);
  };
}

