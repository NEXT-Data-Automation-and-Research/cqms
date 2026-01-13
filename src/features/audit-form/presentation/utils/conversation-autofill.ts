/**
 * Conversation Autofill Utility
 * Handles autofilling form fields from conversation data
 * Migrated from audit-form.html autofillConversationFields()
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';

export class ConversationAutofill {
  /**
   * Autofill email and date from conversation data
   */
  autofillConversationFields(conversation: any, isCalibrationMode: boolean = false): void {
    if (isCalibrationMode) {
      return; // Skip autofill in calibration mode
    }
    
    // Extract email from conversation
    const email = this.extractEmailFromConversation(conversation);
    
    // Extract date from conversation
    const conversationDate = this.extractDateFromConversation(conversation);
    
    // Autofill email field if email was found and field is empty
    const emailInput = document.getElementById('clientEmail') as HTMLInputElement;
    if (email && emailInput && (!emailInput.value || emailInput.value.trim() === '')) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // Autofill date field if date was found and field is empty
    const dateInput = document.getElementById('interactionDate') as HTMLInputElement;
    if (conversationDate && dateInput && (!dateInput.value || dateInput.value.trim() === '')) {
      if (!isNaN(conversationDate.getTime())) {
        const year = conversationDate.getFullYear();
        const month = String(conversationDate.getMonth() + 1).padStart(2, '0');
        const day = String(conversationDate.getDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
        dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    
    logInfo('Autofilled from Intercom:', {
      email: email || 'not found',
      date: conversationDate ? conversationDate.toISOString() : 'not found'
    });
  }

  /**
   * Extract email from conversation
   */
  private extractEmailFromConversation(conversation: any): string | null {
    // Check source.author.email (user/contact who initiated conversation)
    if (conversation.source?.author?.email) {
      return conversation.source.author.email;
    }
    
    // Check source.owner.email (assigned agent/team)
    if (conversation.source?.owner?.email) {
      return conversation.source.owner.email;
    }
    
    // Check contacts associated with conversation
    if (conversation.contacts?.contacts && conversation.contacts.contacts.length > 0) {
      const contact = conversation.contacts.contacts[0];
      if (contact.email) {
        return contact.email;
      }
    }
    
    // Check source.contacts
    if (conversation.source?.contacts?.contacts && conversation.source.contacts.contacts.length > 0) {
      const contact = conversation.source.contacts.contacts[0];
      if (contact.email) {
        return contact.email;
      }
    }
    
    // Check source.author.contacts
    if (conversation.source?.author?.contacts && conversation.source.author.contacts.length > 0) {
      const contact = conversation.source.author.contacts[0];
      if (contact.email) {
        return contact.email;
      }
    }
    
    // Check conversation_parts for user email (from first user message)
    if (conversation.conversation_parts?.conversation_parts) {
      for (const part of conversation.conversation_parts.conversation_parts) {
        if (part.author?.type === 'user' || part.author?.type === 'contact') {
          if (part.author.email) {
            return part.author.email;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extract date from conversation
   */
  private extractDateFromConversation(conversation: any): Date | null {
    // Helper function to convert Unix timestamp (seconds) to Date object
    const unixTimestampToDate = (timestamp: any): Date | null => {
      if (!timestamp) return null;
      if (timestamp instanceof Date) return timestamp;
      if (typeof timestamp === 'number') {
        const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        return new Date(timestampMs);
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp);
      }
      return null;
    };
    
    // Get the earliest message timestamp from conversation_parts
    if (conversation.conversation_parts?.conversation_parts && conversation.conversation_parts.conversation_parts.length > 0) {
      let earliestTimestamp: Date | null = null;
      for (const part of conversation.conversation_parts.conversation_parts) {
        if (part.created_at) {
          const partDate = unixTimestampToDate(part.created_at);
          if (partDate && !isNaN(partDate.getTime())) {
            if (!earliestTimestamp || partDate < earliestTimestamp) {
              earliestTimestamp = partDate;
            }
          }
        }
      }
      if (earliestTimestamp) {
        return earliestTimestamp;
      }
    }
    
    // Fallback to conversation-level dates
    if (conversation.created_at) {
      return unixTimestampToDate(conversation.created_at);
    } else if (conversation.updated_at) {
      return unixTimestampToDate(conversation.updated_at);
    } else if (conversation.source?.created_at) {
      return unixTimestampToDate(conversation.source.created_at);
    }
    
    return null;
  }
}

// Singleton instance
let conversationAutofillInstance: ConversationAutofill | null = null;

/**
 * Get conversation autofill instance
 */
export function getConversationAutofill(): ConversationAutofill {
  if (!conversationAutofillInstance) {
    conversationAutofillInstance = new ConversationAutofill();
  }
  return conversationAutofillInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).autofillConversationFields = (conversation: any) => {
    const isCalibrationMode = (window as any).isCalibrationMode || false;
    getConversationAutofill().autofillConversationFields(conversation, isCalibrationMode);
  };
}

