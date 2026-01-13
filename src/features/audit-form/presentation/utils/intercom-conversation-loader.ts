/**
 * Intercom Conversation Loader
 * Handles loading conversation data from Intercom API
 * Migrated from audit-form.html loadConversationFromIntercom()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { getHttpClient } from './http-client.js';

export class IntercomConversationLoader {
  private httpClient = getHttpClient();

  /**
   * Load conversation from Intercom API
   */
  async loadConversationFromIntercom(conversationId: string): Promise<void> {
    const viewChatBtn = document.getElementById('viewChatBtn') as HTMLButtonElement;
    const chatMessagesContainer = document.getElementById('chatMessagesContainer');
    
    if (!chatMessagesContainer) {
      logWarn('chatMessagesContainer not found');
      return;
    }
    
    // Show loading state
    if (viewChatBtn) {
      viewChatBtn.disabled = true;
      viewChatBtn.style.backgroundColor = '#9ca3af';
      viewChatBtn.style.cursor = 'not-allowed';
      viewChatBtn.style.opacity = '0.6';
      viewChatBtn.textContent = 'Loading...';
      viewChatBtn.title = 'Loading conversation...';
    }
    
    safeSetHTML(chatMessagesContainer, `
      <div style="text-align: center; padding: 1.2937rem; color: #000000;">
        <div style="display: inline-block; width: 1.2937rem; height: 1.2937rem; border: 0.091rem solid #e5e7eb; border-top-color: #1A733E; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="margin-top: 0.6469rem; font-size: 0.5659rem;">Loading conversation from Intercom...</p>
      </div>
    `);

    try {
      const supabaseUrl = (window as any).SupabaseConfig?.url || '';
      const supabaseAnonKey = (window as any).SupabaseConfig?.anonKey || '';
      
      // Fetch conversation data from Intercom API via Supabase Edge Function
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?conversation_id=${encodeURIComponent(conversationId)}&display_as=html`;
      
      logInfo(`Loading conversation from Intercom: ${conversationId}`);
      
      const response = await this.httpClient.fetchWithRetry(
        edgeFunctionUrl,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
            'Accept': 'application/json'
          }
        },
        3,
        1000,
        30000
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      const data = await response.json();
      
      // Parse and display conversation
      await this.displayConversation(data, chatMessagesContainer);
      
      // Re-enable button
      if (viewChatBtn) {
        viewChatBtn.disabled = false;
        viewChatBtn.style.backgroundColor = '';
        viewChatBtn.style.cursor = '';
        viewChatBtn.style.opacity = '';
        viewChatBtn.textContent = 'View Chat';
        viewChatBtn.title = '';
      }
      
    } catch (error) {
      logError('Error loading conversation from Intercom:', error);
      
      safeSetHTML(chatMessagesContainer, `
        <div style="text-align: center; padding: 1.2937rem; color: #dc2626;">
          <p style="font-size: 0.5659rem; font-weight: 500;">Failed to load conversation</p>
          <p style="font-size: 0.485rem; margin-top: 0.3234rem; color: #6b7280;">${escapeHtml((error as Error).message)}</p>
        </div>
      `);
      
      // Re-enable button
      if (viewChatBtn) {
        viewChatBtn.disabled = false;
        viewChatBtn.style.backgroundColor = '';
        viewChatBtn.style.cursor = '';
        viewChatBtn.style.opacity = '';
        viewChatBtn.textContent = 'View Chat';
        viewChatBtn.title = '';
      }
    }
  }

  /**
   * Display conversation messages
   */
  private async displayConversation(data: any, container: HTMLElement): Promise<void> {
    // Extract conversation parts
    const conversationParts = data.conversation_parts || data.parts || [];
    
    if (conversationParts.length === 0) {
      safeSetHTML(container, `
        <div style="text-align: center; padding: 1.2937rem; color: #6b7280;">
          <p style="font-size: 0.5659rem;">No messages found in this conversation.</p>
        </div>
      `);
      return;
    }
    
    // Build HTML for conversation messages
    const messagesHtml = conversationParts.map((part: any, index: number) => {
      const author = part.author || {};
      const authorName = author.name || author.email || 'Unknown';
      const authorType = author.type || 'unknown';
      const body = part.body || '';
      const createdAt = part.created_at ? new Date(part.created_at * 1000).toLocaleString() : '';
      
      const isAdmin = authorType === 'admin' || authorType === 'team';
      const bgColor = isAdmin ? '#f3f4f6' : '#dbeafe';
      const textAlign = isAdmin ? 'right' : 'left';
      
      return `
        <div style="margin-bottom: 0.6469rem; text-align: ${textAlign};">
          <div style="display: inline-block; max-width: 70%; padding: 0.485rem 0.6469rem; background: ${bgColor}; border-radius: 0.3234rem;">
            <div style="font-size: 0.485rem; font-weight: 600; color: #374151; margin-bottom: 0.1617rem;">${escapeHtml(authorName)}</div>
            <div style="font-size: 0.5659rem; color: #111827; line-height: 1.5;">${this.sanitizeMessageBody(body)}</div>
            ${createdAt ? `<div style="font-size: 0.4043rem; color: #6b7280; margin-top: 0.1617rem;">${escapeHtml(createdAt)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
    safeSetHTML(container, messagesHtml);
  }

  /**
   * Sanitize message body (handles HTML content)
   */
  private sanitizeMessageBody(body: string): string {
    if (!body) return '';
    
    // If body contains HTML, sanitize it
    // For now, we'll use escapeHtml - in production, use DOMPurify for better HTML handling
    return escapeHtml(body);
  }
}

// Singleton instance
let intercomConversationLoaderInstance: IntercomConversationLoader | null = null;

/**
 * Get Intercom conversation loader instance
 */
export function getIntercomConversationLoader(): IntercomConversationLoader {
  if (!intercomConversationLoaderInstance) {
    intercomConversationLoaderInstance = new IntercomConversationLoader();
  }
  return intercomConversationLoaderInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).loadConversationFromIntercom = async (conversationId: string) => {
    await getIntercomConversationLoader().loadConversationFromIntercom(conversationId);
  };
}

