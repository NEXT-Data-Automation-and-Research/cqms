/**
 * Conversation Formatter
 * Formats conversation data for display
 * Extracted from conversation-display.ts to comply with 250-line limit
 */

import { escapeHtml } from '../../../../utils/html-sanitizer.js';

export interface Conversation {
  id?: string;
  source?: {
    subject?: string;
    body?: string;
    type?: string;
  };
  conversation_rating?: {
    rating?: number;
  };
  state?: string;
  participation_part_count?: number;
  created_at?: number;
  created_at_iso?: string;
  updated_at?: number;
  updated_at_iso?: string;
  custom_attributes?: Record<string, any>;
  priority?: string;
  statistics?: {
    count_conversation_parts?: number;
    time_to_admin_reply?: number;
    count_reopens?: number;
  };
  sla_applied?: {
    sla_status?: string;
    sla_name?: string;
  };
  tags?: {
    tags?: Array<{ name?: string } | string>;
  };
}

export class ConversationFormatter {
  /**
   * Extract client name from conversation
   */
  extractClientName(conversation: Conversation): string {
    if (conversation.source?.subject) {
      const match = conversation.source.subject.match(/^(.+?)\s*</);
      if (match) return match[1].trim();
    }
    return '';
  }

  /**
   * Extract client email from conversation
   */
  extractClientEmail(conversation: Conversation): string {
    if (conversation.source?.subject) {
      const match = conversation.source.subject.match(/<(.+?)>/);
      if (match) return match[1].trim();
    }
    return '';
  }

  /**
   * Format rating
   */
  formatRating(rating: number | string): string {
    if (rating === '-' || !rating) return '-';
    const ratingNum = typeof rating === 'string' ? parseFloat(rating) : rating;
    if (isNaN(ratingNum)) return '-';
    const ratingColor = ratingNum >= 4 ? '#10b981' : ratingNum >= 3 ? '#f59e0b' : '#ef4444';
    return `<span style="color: ${ratingColor}; font-weight: 600; font-size: 0.6875rem;">${ratingNum}/5</span>`;
  }

  /**
   * Format state badge
   */
  formatState(state: string): string {
    const stateColor = state === 'closed' ? '#10b981' : state === 'open' ? '#f59e0b' : '#6b7280';
    const bgColor = state === 'closed' ? '#d1fae5' : state === 'open' ? '#fef3c7' : '#f3f4f6';
    return `<span style="background: ${bgColor}; color: ${stateColor}; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.625rem; font-weight: 500;">${escapeHtml(state)}</span>`;
  }

  /**
   * Format source icon
   */
  formatSource(sourceType: string): string {
    const sourceIcons: Record<string, string> = {
      'email': '📧',
      'conversation': '💬',
      'chat': '💬',
      'facebook': '📘',
      'twitter': '🐦',
      'whatsapp': '💬'
    };
    const sourceIcon = sourceIcons[sourceType.toLowerCase()] || '📄';
    return sourceType !== '-' ? sourceIcon : '-';
  }

  /**
   * Format priority badge
   */
  formatPriority(priority: string): string {
    return priority === 'priority' 
      ? `<span style="color: #dc2626; font-size: 0.875rem;" title="Priority">🔴</span>`
      : `<span style="color: #000000; font-size: 0.6875rem;">-</span>`;
  }

  /**
   * Format time to reply
   */
  formatTimeToReply(timeToReply: number | null | undefined): string {
    if (timeToReply === null || timeToReply === undefined) return '-';
    const minutes = Math.round(timeToReply / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    let timeDisplay = '';
    if (hours > 0) {
      timeDisplay = `${hours}h${mins > 0 ? mins + 'm' : ''}`;
    } else {
      timeDisplay = `${mins}m`;
    }
    const timeColor = minutes <= 5 ? '#10b981' : minutes <= 30 ? '#f59e0b' : '#ef4444';
    return `<span style="color: ${timeColor}; font-weight: 600; font-size: 0.6875rem;" title="${timeDisplay}">${timeDisplay}</span>`;
  }

  /**
   * Format reopens badge
   */
  formatReopens(reopens: number): string {
    return reopens > 0
      ? `<span style="color: ${reopens >= 3 ? '#dc2626' : '#d97706'}; font-weight: 600; font-size: 0.6875rem;" title="${reopens} reopen${reopens > 1 ? 's' : ''}">${reopens}</span>`
      : '<span style="color: #000000; font-size: 0.6875rem;">-</span>';
  }

  /**
   * Format SLA status
   */
  formatSlaStatus(slaStatus: string, slaName: string): string {
    if (slaStatus === '-') return '-';
    const slaIcon = slaStatus === 'active' ? '✓' : slaStatus === 'missed' ? '✗' : '⚠';
    const slaColor = slaStatus === 'active' ? '#10b981' : slaStatus === 'missed' ? '#ef4444' : '#6b7280';
    return `<span style="color: ${slaColor}; font-size: 0.75rem;" title="${escapeHtml(slaName)} - ${escapeHtml(slaStatus)}">${slaIcon}</span>`;
  }

  /**
   * Format tags
   */
  formatTags(tags: Array<{ name?: string } | string>): string {
    if (!tags || tags.length === 0) return '-';
    const displayTags = tags.slice(0, 2).map(tag => {
      const tagName = typeof tag === 'object' 
        ? (tag?.name || '').toString()
        : (tag || '').toString();
      return tagName;
    }).filter((tag): tag is string => Boolean(tag));
    
    if (displayTags.length === 0) return '-';
    
    const tagsHtml = displayTags.map(tag => 
      `<span style="background: #e0e7ff; color: #4338ca; padding: 0.0625rem 0.25rem; border-radius: 0.125rem; font-size: 0.5625rem; font-weight: 500;">${escapeHtml(tag.substring(0, 8))}</span>`
    ).join('');
    
    const moreTags = tags.length > 2 
      ? `<span style="color: #000000; font-size: 0.5625rem;" title="${tags.slice(2).map(t => {
          const tagName = typeof t === 'object' ? t.name : t;
          return tagName ? tagName.toString() : '';
        }).filter(t => t).join(', ')}">+${tags.length - 2}</span>`
      : '';
    
    return `<div style="display: flex; flex-wrap: wrap; gap: 0.125rem; max-width: 8rem;">${tagsHtml}${moreTags}</div>`;
  }

  /**
   * Format date short
   */
  formatDateShort(dateString: string): string {
    if (dateString === '-') return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  }
}

// Singleton instance
let conversationFormatterInstance: ConversationFormatter | null = null;

/**
 * Get conversation formatter instance
 */
export function getConversationFormatter(): ConversationFormatter {
  if (!conversationFormatterInstance) {
    conversationFormatterInstance = new ConversationFormatter();
  }
  return conversationFormatterInstance;
}

