/**
 * Clipboard Helper
 * Utility functions for clipboard operations
 * Migrated from audit-form.html copyToClipboard()
 */

import { logError } from '../../../../utils/logging-helper.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export class ClipboardHelper {
  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string, buttonElement: HTMLElement): Promise<void> {
    if (!text || text === 'N/A') {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      
      // Visual feedback
      const originalHTML = buttonElement.innerHTML;
      buttonElement.classList.add('copy-success');
      safeSetHTML(buttonElement, '<svg style="width: 0.875rem; height: 0.875rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>');
      buttonElement.style.color = '#10b981';
      
      setTimeout(() => {
        safeSetHTML(buttonElement, originalHTML);
        buttonElement.style.color = '';
        buttonElement.classList.remove('copy-success');
      }, 2000);
    } catch (err) {
      logError('Failed to copy:', err);
    }
  }
}

// Singleton instance
let clipboardHelperInstance: ClipboardHelper | null = null;

/**
 * Get clipboard helper instance
 */
export function getClipboardHelper(): ClipboardHelper {
  if (!clipboardHelperInstance) {
    clipboardHelperInstance = new ClipboardHelper();
  }
  return clipboardHelperInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).copyToClipboard = (text: string, buttonElement: HTMLElement) => {
    getClipboardHelper().copyToClipboard(text, buttonElement);
  };
  
  (window as any).copyConversationId = (conversationId: string, buttonElement: HTMLElement) => {
    getClipboardHelper().copyToClipboard(conversationId, buttonElement);
  };
}

