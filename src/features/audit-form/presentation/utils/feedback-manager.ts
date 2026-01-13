/**
 * Feedback Manager
 * Manages feedback boxes for parameters
 * Migrated from audit-form.html updateFeedbackBoxesForParameter()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { escapeHtml } from '../../../../utils/html-sanitizer.js';
import { getQuillManager } from './quill-manager.js';

export class FeedbackManager {
  /**
   * Update feedback boxes for a parameter based on error count
   */
  updateFeedbackBoxesForParameter(
    fieldId: string,
    fieldType: string,
    paramType: string,
    initialCount: number = 0,
    existingFeedbacks: string[] = []
  ): void {
    const feedbackContainer = document.getElementById(`feedback_container_${fieldId}`);
    if (!feedbackContainer) {
      logWarn(`Feedback container not found for field: ${fieldId}`);
      return;
    }
    
    // Get current error count
    let errorCount = initialCount;
    if (fieldType === 'radio') {
      const selectedRadio = document.querySelector(`input[name="${fieldId}"]:checked`) as HTMLInputElement;
      if (selectedRadio) {
        const value = parseInt(selectedRadio.value) || 0;
        if (paramType === 'achievement' || paramType === 'bonus') {
          errorCount = value === 0 ? 1 : 0;
        } else {
          errorCount = value;
        }
      }
    } else {
      const field = document.getElementById(fieldId) as HTMLInputElement;
      errorCount = field ? (parseInt(field.value) || 0) : 0;
    }
    
    // Determine feedback count and requirement
    const feedbackCount = errorCount === 0 ? 1 : Math.min(errorCount, 10);
    const isRequired = errorCount > 0;
    
    // Get existing feedback values
    const existingValues = this.getExistingFeedbacks(feedbackContainer, fieldId, existingFeedbacks);
    
    // Clear container and destroy existing Quill instances
    this.clearFeedbackContainer(feedbackContainer, fieldId);
    
    // Create feedback boxes
    this.createFeedbackBoxes(feedbackContainer, fieldId, feedbackCount, isRequired, existingValues);
  }

  /**
   * Get existing feedback values from container
   */
  private getExistingFeedbacks(container: HTMLElement, fieldId: string, existingFeedbacks: string[]): string[] {
    const existingValues: string[] = [];
    
    // Check for Quill editors first
    const existingQuillEditors = container.querySelectorAll('.quill-editor-container');
    existingQuillEditors.forEach((editorContainer) => {
      const quillDiv = editorContainer.querySelector('[id^="quill_"]');
      if (quillDiv) {
        const editorId = quillDiv.id.replace('quill_', '');
        const quillManager = getQuillManager();
        const quillInstance = quillManager.getInstance(editorId);
        if (quillInstance) {
          const content = quillInstance.root.innerHTML;
          if (content && content.trim() && content !== '<p><br></p>') {
            const index = parseInt(editorId.split('_').pop() || '0') || 0;
            existingValues[index] = content;
          }
        }
      }
    });
    
    // Fallback to textareas
    const existingTextareas = container.querySelectorAll(`textarea[id^="feedback_${fieldId}_"]`);
    existingTextareas.forEach(textarea => {
      const index = parseInt((textarea as HTMLTextAreaElement).id.split('_').pop() || '0') || 0;
      if (!existingValues[index] && (textarea as HTMLTextAreaElement).value) {
        const plainText = (textarea as HTMLTextAreaElement).value;
        const htmlText = plainText.split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('');
        existingValues[index] = htmlText || '';
      }
    });
    
    // Use provided existingFeedbacks if available
    if (existingFeedbacks.length > 0) {
      existingFeedbacks.forEach((feedback, index) => {
        if (feedback && !existingValues[index]) {
          existingValues[index] = feedback;
        }
      });
    }
    
    return existingValues;
  }

  /**
   * Clear feedback container and destroy Quill instances
   */
  private clearFeedbackContainer(container: HTMLElement, fieldId: string): void {
    const quillManager = getQuillManager();
    
    container.querySelectorAll('.quill-editor-container').forEach(containerEl => {
      const quillDiv = containerEl.querySelector('[id^="quill_"]');
      if (quillDiv) {
        const editorId = quillDiv.id.replace('quill_', '');
        quillManager.destroyInstance(editorId);
      }
    });
    
    container.innerHTML = '';
  }

  /**
   * Create feedback boxes with Quill editors
   */
  private createFeedbackBoxes(
    container: HTMLElement,
    fieldId: string,
    feedbackCount: number,
    isRequired: boolean,
    existingValues: string[]
  ): void {
    const quillManager = getQuillManager();
    
    for (let i = 0; i < feedbackCount; i++) {
      const feedbackDiv = document.createElement('div');
      feedbackDiv.className = 'quill-editor-container';
      feedbackDiv.style.cssText = 'width: 100%; min-width: 0;';
      
      const feedbackId = `feedback_${fieldId}_${i}`;
      const quillContainerId = `quill_${feedbackId}`;
      
      const placeholder = isRequired
        ? (feedbackCount === 1 
          ? 'Enter feedback (required)...' 
          : `Feedback ${i + 1} of ${feedbackCount} (required)...`)
        : 'Enter feedback (optional)...';
      
      // Create container for Quill
      const quillContainer = document.createElement('div');
      quillContainer.id = quillContainerId;
      feedbackDiv.appendChild(quillContainer);
      container.appendChild(feedbackDiv);
      
      // Initialize Quill editor
      const existingContent = existingValues[i];
      quillManager.initializeEditor(
        quillContainerId,
        feedbackId,
        placeholder,
        existingContent || undefined,
        isRequired
      );
    }
  }

  /**
   * Setup auto-expand for feedback textarea
   */
  setupFeedbackTextareaAutoExpand(fieldId: string, textareaElement?: HTMLTextAreaElement): void {
    const textarea = textareaElement || document.getElementById(fieldId) as HTMLTextAreaElement;
    if (!textarea) return;
    
    const autoExpand = () => {
      textarea.style.height = 'auto';
      const scrollHeightRem = textarea.scrollHeight / 16;
      textarea.style.height = Math.min(scrollHeightRem, 50.0) + 'rem';
    };
    
    textarea.addEventListener('focus', () => {
      textarea.style.borderColor = '#10b981';
    });
    
    textarea.addEventListener('input', () => {
      if (textarea.value && textarea.value.trim()) {
        textarea.style.borderColor = '#10b981';
      }
      autoExpand();
    });
    
    textarea.addEventListener('blur', () => {
      if (textarea.value && textarea.value.trim()) {
        textarea.style.borderColor = '#10b981';
      } else {
        textarea.style.borderColor = '#d1d5db';
      }
    });
    
    // Initial expand
    autoExpand();
  }
}

// Singleton instance
let feedbackManagerInstance: FeedbackManager | null = null;

/**
 * Get feedback manager instance
 */
export function getFeedbackManager(): FeedbackManager {
  if (!feedbackManagerInstance) {
    feedbackManagerInstance = new FeedbackManager();
  }
  return feedbackManagerInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).updateFeedbackBoxesForParameter = (
    fieldId: string,
    fieldType: string,
    paramType: string
  ) => {
    const manager = getFeedbackManager();
    manager.updateFeedbackBoxesForParameter(fieldId, fieldType, paramType);
  };
}

