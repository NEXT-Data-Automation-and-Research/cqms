/**
 * Conversation Progress Indicator
 * Manages progress indicators for conversation fetching
 * Migrated from audit-form.html updateProgressIndicator(), hideElementsDuringLoading(), showElementsAfterLoading()
 */

import { logInfo } from '../../../../utils/logging-helper.js';

export class ConversationProgress {
  /**
   * Update progress indicator
   */
  updateProgressIndicator(percentage: number, message: string, conversationCount?: number): void {
    const statusElement = document.getElementById('pullConversationsStatus');
    const progressBar = document.getElementById('pullConversationsProgressBar');
    const progressText = document.getElementById('pullConversationsProgress');
    
    if (statusElement) {
      statusElement.textContent = message || 'Pulling from Intercom...';
    }
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText && percentage === 100) {
      const count = conversationCount || 0;
      progressText.textContent = `✓ Loaded ${count} conversations`;
      setTimeout(() => {
        if (progressText) {
          progressText.textContent = '';
        }
      }, 3000);
    }
  }

  /**
   * Hide elements during loading
   */
  hideElementsDuringLoading(): void {
    const dateSelector = document.getElementById('pullConversationsDate') as HTMLInputElement;
    const countDisplay = document.querySelector('#pullConversationsSection > div:nth-child(2)') as HTMLElement;
    
    if (dateSelector) {
      dateSelector.style.opacity = '0.5';
      dateSelector.disabled = true;
    }
    if (countDisplay) {
      countDisplay.style.opacity = '0.5';
    }
  }

  /**
   * Show elements after loading
   */
  showElementsAfterLoading(): void {
    const dateSelector = document.getElementById('pullConversationsDate') as HTMLInputElement;
    const countDisplay = document.querySelector('#pullConversationsSection > div:nth-child(2)') as HTMLElement;
    
    if (dateSelector) {
      dateSelector.style.opacity = '1';
      dateSelector.disabled = false;
    }
    if (countDisplay) {
      countDisplay.style.opacity = '1';
    }
  }
}

// Singleton instance
let conversationProgressInstance: ConversationProgress | null = null;

/**
 * Get conversation progress instance
 */
export function getConversationProgress(): ConversationProgress {
  if (!conversationProgressInstance) {
    conversationProgressInstance = new ConversationProgress();
  }
  return conversationProgressInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).updateProgressIndicator = (percentage: number, message: string) => {
    const conversations = (window as any).pullConversationsList || [];
    getConversationProgress().updateProgressIndicator(percentage, message, conversations.length);
  };
  
  (window as any).hideElementsDuringLoading = () => {
    getConversationProgress().hideElementsDuringLoading();
  };
  
  (window as any).showElementsAfterLoading = () => {
    getConversationProgress().showElementsAfterLoading();
  };
}

