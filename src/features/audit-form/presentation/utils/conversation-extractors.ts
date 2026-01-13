/**
 * Conversation Extractors
 * Utility functions to extract data from conversation objects
 * Migrated from audit-form.html extractAdminFromConversation(), extractProductType(), getConversationRating(), generateStarRating()
 */

import { escapeHtml } from '../../../../utils/html-sanitizer.js';
import type { Conversation } from './conversation-formatter.js';

export class ConversationExtractors {
  /**
   * Extract admin information from conversation
   */
  extractAdminFromConversation(conversation: Conversation): { id?: string; email?: string; name?: string } | null {
    if (!conversation) return null;
    
    // Check teammates.admins array first
    const conv = conversation as any;
    if (conv.teammates?.admins && Array.isArray(conv.teammates.admins) && conv.teammates.admins.length > 0) {
      const admin = conv.teammates.admins[0];
      return {
        id: admin.id || conv.admin_assignee_id,
        name: admin.name || undefined,
        email: admin.email || undefined
      };
    }
    
    // Check admin_assignee_id
    if (conv.admin_assignee_id) {
      return {
        id: conv.admin_assignee_id,
        name: undefined,
        email: undefined
      };
    }
    
    return null;
  }

  /**
   * Extract product type from conversation
   */
  extractProductType(conversation: Conversation): string | null {
    if (!conversation) return null;
    
    const conv = conversation as any;
    
    // Priority 1: Check ticket custom_attributes for Product Type
    if (conv.ticket?.custom_attributes?.['Product Type']) {
      const productType = conv.ticket.custom_attributes['Product Type'];
      // Handle object with value property
      if (productType && typeof productType === 'object' && productType.value) {
        return productType.value;
      }
      // Sometimes it's a direct string value
      if (typeof productType === 'string' && productType.trim()) {
        return productType;
      }
    }
    
    // Priority 2: Check tags for product type indicators
    if (conv.tags?.tags && Array.isArray(conv.tags.tags)) {
      for (const tag of conv.tags.tags) {
        const tagName = tag.name || '';
        // Check for CFD indicators
        if (tagName.includes('CFD') || tagName === 'CFD Conversation' || tagName.includes('CFD FIN')) {
          return 'CFD';
        }
        // Check for Futures indicators
        if (tagName.includes('Futures') || tagName === 'Future Conversations' || tagName.includes('Futures FIN')) {
          return 'Futures';
        }
      }
    }
    
    // Priority 3: Check source body for user-selected product type
    if (conv.source?.body) {
      const body = conv.source.body.toLowerCase();
      // Check for CFD / Forex (handle HTML tags)
      if (body.includes('cfd / forex') || body.includes('cfd/forex') || body.includes('<p>cfd / forex</p>')) {
        return 'CFD / Forex';
      }
      // Check for Futures (handle HTML tags)
      if (body.includes('<p>futures</p>') || (body.includes('futures') && !body.includes('cfd'))) {
        return 'Futures';
      }
    }
    
    // Priority 4: Check topics for product type indicators
    if (conv.topics?.topics && Array.isArray(conv.topics.topics)) {
      for (const topic of conv.topics.topics) {
        const topicName = topic.name || '';
        if (topicName.includes('Futures')) {
          return 'Futures';
        }
        if (topicName.includes('CFD')) {
          return 'CFD';
        }
      }
    }
    
    // Priority 5: Check team names in statistics
    if (conv.statistics?.assigned_team_first_response_time && Array.isArray(conv.statistics.assigned_team_first_response_time)) {
      for (const team of conv.statistics.assigned_team_first_response_time) {
        const teamName = team.team_name || '';
        if (teamName.includes('(CFD)')) {
          return 'CFD';
        }
        if (teamName.includes('(FUT)')) {
          return 'Futures';
        }
      }
    }
    
    return null;
  }

  /**
   * Get conversation rating
   */
  getConversationRating(conversation: Conversation): number | null {
    if (!conversation) return null;
    
    if (conversation.conversation_rating?.rating) {
      const rating = parseInt(String(conversation.conversation_rating.rating), 10);
      if (!isNaN(rating) && rating >= 1 && rating <= 5) {
        return rating;
      }
    }
    
    return null;
  }

  /**
   * Generate star rating HTML
   */
  generateStarRating(rating: number | null): string {
    const maxStars = 5;
    const filledStars = rating || 0;
    const emptyStars = maxStars - filledStars;
    
    let starsHtml = '<div style="display: flex; align-items: center; gap: 0.125rem;">';
    
    for (let i = 0; i < filledStars; i++) {
      starsHtml += `
        <svg aria-hidden="true" style="width: 1rem; height: 1rem; color: #fbbf24;" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      `;
    }
    
    for (let i = 0; i < emptyStars; i++) {
      starsHtml += `
        <svg aria-hidden="true" style="width: 1rem; height: 1rem; color: #d1d5db;" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      `;
    }
    
    starsHtml += '</div>';
    return starsHtml;
  }
}

// Singleton instance
let conversationExtractorsInstance: ConversationExtractors | null = null;

/**
 * Get conversation extractors instance
 */
export function getConversationExtractors(): ConversationExtractors {
  if (!conversationExtractorsInstance) {
    conversationExtractorsInstance = new ConversationExtractors();
  }
  return conversationExtractorsInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).extractAdminFromConversation = (conversation: Conversation) => {
    return getConversationExtractors().extractAdminFromConversation(conversation);
  };
  
  (window as any).extractProductType = (conversation: Conversation) => {
    return getConversationExtractors().extractProductType(conversation);
  };
  
  (window as any).getConversationRating = (conversation: Conversation) => {
    return getConversationExtractors().getConversationRating(conversation);
  };
  
  (window as any).generateStarRating = (rating: number | null) => {
    return getConversationExtractors().generateStarRating(rating);
  };
}

