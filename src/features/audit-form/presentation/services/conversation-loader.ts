/**
 * Conversation Loader Service
 * Handles loading conversations from Intercom API
 * Extracted from new-audit-form.html
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { getSupabaseClient } from '../utils/supabase-client-helper.js';

export interface ConversationPart {
  id: string;
  part_type: string;
  body?: string;
  author?: {
    type: string;
    name?: string;
    email?: string;
  };
  created_at: number | string;
  attachments?: Array<{
    name: string;
    url: string;
    content_type: string;
  }>;
  email_message_metadata?: any;
}

export interface Conversation {
  id: string;
  source?: {
    author?: {
      email?: string;
      name?: string;
    };
    owner?: {
      email?: string;
    };
    created_at?: number | string;
    contacts?: {
      contacts?: Array<{
        email?: string;
        name?: string;
      }>;
    };
  };
  contacts?: {
    contacts?: Array<{
      email?: string;
      name?: string;
    }>;
  };
  conversation_parts?: {
    conversation_parts?: ConversationPart[];
  };
  conversation_rating?: any;
  created_at?: number | string;
  updated_at?: number | string;
}

export interface ConversationLoaderConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  edgeFunctionUrl?: string;
}

/**
 * Conversation Loader Service
 */
export class ConversationLoader {
  private config: ConversationLoaderConfig | null = null;

  /**
   * Initialize configuration
   */
  initialize(config: ConversationLoaderConfig): void {
    this.config = config;
  }

  /**
   * Load conversation from Intercom via Edge Function
   */
  async loadConversation(conversationId: string): Promise<Conversation> {
    if (!this.config) {
      throw new Error('ConversationLoader not initialized. Call initialize() first.');
    }

    const edgeFunctionUrl = this.config.edgeFunctionUrl || 
      `${this.config.supabaseUrl}/functions/v1/intercom-proxy?conversation_id=${encodeURIComponent(conversationId)}&display_as=html`;

    logInfo(`Loading conversation ${conversationId} from Intercom`);

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.supabaseAnonKey}`,
          'apikey': this.config.supabaseAnonKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const conversation = await response.json() as Conversation;
      logInfo(`Conversation ${conversationId} loaded successfully`);
      return conversation;
    } catch (error) {
      logError(`Error loading conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Extract client email from conversation
   */
  extractClientEmail(conversation: Conversation): string | null {
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
    // Note: source.author doesn't have contacts property according to type definition
    // Contacts are available via source.contacts.contacts (checked above)
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
   * Extract client name from conversation
   */
  extractClientName(conversation: Conversation): string | null {
    // Try to get client name from source.author
    if (conversation.source?.author?.name) {
      return conversation.source.author.name;
    }
    // Try contacts
    if (conversation.contacts?.contacts && conversation.contacts.contacts.length > 0) {
      const contact = conversation.contacts.contacts[0];
      if (contact.name) {
        return contact.name;
      }
    }
    // Try to find first user/contact in conversation parts
    if (conversation.conversation_parts?.conversation_parts) {
      for (const part of conversation.conversation_parts.conversation_parts) {
        if (part.author && (part.author.type === 'user' || part.author.type === 'contact')) {
          if (part.author.name) {
            return part.author.name;
          }
        }
      }
    }
    return null;
  }

  /**
   * Extract conversation date from conversation
   */
  extractConversationDate(conversation: Conversation): Date | null {
    // Helper function to convert Unix timestamp (seconds) to Date object
    function unixTimestampToDate(timestamp: number | string | Date | undefined): Date | null {
      if (!timestamp) return null;
      // If it's already a Date object, return it
      if (timestamp instanceof Date) return timestamp;
      // If it's a number (Unix timestamp in seconds), convert it
      if (typeof timestamp === 'number') {
        // If timestamp is less than 10^10, it's in seconds (multiply by 1000)
        // If timestamp is 10^10 or more, it's in milliseconds
        const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
        return new Date(timestampMs);
      }
      // If it's a string, try to parse as ISO date
      if (typeof timestamp === 'string') {
        return new Date(timestamp);
      }
      return null;
    }

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

    // Fallback to conversation-level dates if no message timestamps found
    if (conversation.created_at) {
      return unixTimestampToDate(conversation.created_at);
    }
    if (conversation.updated_at) {
      return unixTimestampToDate(conversation.updated_at);
    }
    if (conversation.source?.created_at) {
      return unixTimestampToDate(conversation.source.created_at);
    }

    return null;
  }

  /**
   * Format conversation date for input field (YYYY-MM-DD)
   */
  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Auto-fill form fields from conversation data
   */
  autofillFormFields(conversation: Conversation): void {
    const email = this.extractClientEmail(conversation);
    const name = this.extractClientName(conversation);
    const date = this.extractConversationDate(conversation);

    // Autofill email field if email was found and field is empty
    const emailInput = document.getElementById('clientEmail') as HTMLInputElement;
    if (email && emailInput && (!emailInput.value || emailInput.value.trim() === '')) {
      emailInput.value = email;
      emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      logInfo(`Auto-filled client email: ${email}`);
    }

    // Autofill name field
    const nameInput = document.getElementById('clientName') as HTMLInputElement;
    if (name && nameInput && (!nameInput.value || nameInput.value.trim() === '')) {
      nameInput.value = name;
      logInfo(`Auto-filled client name: ${name}`);
    }

    // Autofill date field if date was found and field is empty
    const dateInput = document.getElementById('interactionDate') as HTMLInputElement;
    if (date && dateInput && (!dateInput.value || dateInput.value.trim() === '')) {
      dateInput.value = this.formatDateForInput(date);
      dateInput.dispatchEvent(new Event('change', { bubbles: true }));
      logInfo(`Auto-filled interaction date: ${this.formatDateForInput(date)}`);
    }
  }
}

/**
 * Get conversation loader instance
 */
let conversationLoaderInstance: ConversationLoader | null = null;

export function getConversationLoader(): ConversationLoader {
  if (!conversationLoaderInstance) {
    conversationLoaderInstance = new ConversationLoader();
    
    // Initialize with config from window
    const supabaseUrl = (window as any).SupabaseConfig?.url || (window as any).env?.SUPABASE_URL || '';
    const supabaseAnonKey = (window as any).SupabaseConfig?.anonKey || (window as any).env?.SUPABASE_ANON_KEY || '';
    
    if (supabaseUrl && supabaseAnonKey) {
      conversationLoaderInstance.initialize({
        supabaseUrl,
        supabaseAnonKey,
        edgeFunctionUrl: `${supabaseUrl}/functions/v1/intercom-proxy`
      });
    }
  }
  return conversationLoaderInstance;
}
