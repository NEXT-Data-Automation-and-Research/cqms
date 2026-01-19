/**
 * Conversation Error Handler
 * Handles error display for conversation-related operations
 * Migrated from audit-form.html showConversationsError()
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { logError } from '../../../../utils/logging-helper.js';

export class ConversationErrorHandler {
  /**
   * Show conversations error message
   */
  showConversationsError(message: string): void {
    const errorDiv = document.getElementById('conversationsError');
    const loadingDiv = document.getElementById('conversationsLoading');
    const listDiv = document.getElementById('conversationsList');
    
    if (errorDiv) {
      safeSetHTML(errorDiv, `<div style="color: #dc2626; padding: 1rem; background: #fee2e2; border-radius: 0.375rem; white-space: pre-wrap;">${escapeHtml(message)}</div>`);
      errorDiv.style.display = 'block';
    }
    
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (listDiv) listDiv.style.display = 'none';
    
    logError('Conversations error:', message);
  }

  /**
   * Show pull conversations error message
   */
  showPullConversationsError(message: string): void {
    const errorDiv = document.getElementById('pullConversationsError');
    const loadingDiv = document.getElementById('pullConversationsLoading');
    const listDiv = document.getElementById('pullConversationsList');
    
    if (errorDiv) {
      safeSetHTML(errorDiv, `<div style="color: #dc2626; padding: 1rem; background: #fee2e2; border-radius: 0.375rem; white-space: pre-wrap;">${escapeHtml(message)}</div>`);
      errorDiv.style.display = 'block';
    }
    
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (listDiv) listDiv.style.display = 'none';
    
    logError('Pull conversations error:', message);
  }

  /**
   * Clear error messages
   */
  clearErrors(): void {
    const conversationsError = document.getElementById('conversationsError');
    const pullConversationsError = document.getElementById('pullConversationsError');
    
    if (conversationsError) {
      conversationsError.style.display = 'none';
      safeSetHTML(conversationsError, '');
    }
    
    if (pullConversationsError) {
      pullConversationsError.style.display = 'none';
      safeSetHTML(pullConversationsError, '');
    }
  }
}

// Singleton instance
let conversationErrorHandlerInstance: ConversationErrorHandler | null = null;

/**
 * Get conversation error handler instance
 */
export function getConversationErrorHandler(): ConversationErrorHandler {
  if (!conversationErrorHandlerInstance) {
    conversationErrorHandlerInstance = new ConversationErrorHandler();
  }
  return conversationErrorHandlerInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).showConversationsError = (message: string) => {
    getConversationErrorHandler().showConversationsError(message);
  };
  
  (window as any).showPullConversationsError = (message: string) => {
    getConversationErrorHandler().showPullConversationsError(message);
  };
}


