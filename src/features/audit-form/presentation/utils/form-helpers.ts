/**
 * Form Helpers
 * Utility functions for form data manipulation
 * Migrated from audit-form.html
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';
import { getQuillManager } from './quill-manager.js';
import type { ScorecardParameter } from '../../domain/entities.js';

export class FormHelpers {
  /**
   * Update week and quarter based on current date
   */
  updateWeekAndQuarter(): void {
    const weekField = document.getElementById('week') as HTMLInputElement;
    const quarterField = document.getElementById('quarter') as HTMLInputElement;
    const now = new Date();
    
    if (weekField) {
      weekField.value = this.getWeekNumber(now).toString();
    }
    if (quarterField) {
      quarterField.value = this.getQuarter(now);
    }
    
    // Update header metadata when quarter/week changes
    if (typeof (window as any).updateHeaderMetadata === 'function') {
      (window as any).updateHeaderMetadata();
    }
  }

  /**
   * Get week number for a date
   */
  private getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfWeek = startOfYear.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayOfWeek1 = new Date(startOfYear);
    mondayOfWeek1.setDate(startOfYear.getDate() + daysToMonday);
    mondayOfWeek1.setHours(0, 0, 0, 0);
    
    const dateDay = date.getDay();
    const dateDaysToMonday = dateDay === 0 ? -6 : 1 - dateDay;
    const mondayOfDateWeek = new Date(date);
    mondayOfDateWeek.setDate(date.getDate() + dateDaysToMonday);
    mondayOfDateWeek.setHours(0, 0, 0, 0);
    
    const daysSinceWeek1 = Math.floor((mondayOfDateWeek.getTime() - mondayOfWeek1.getTime()) / (24 * 60 * 60 * 1000));
    return Math.floor(daysSinceWeek1 / 7) + 1;
  }

  /**
   * Get quarter for a date
   */
  private getQuarter(date: Date): string {
    const month = date.getMonth() + 1;
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  }

  /**
   * Populate error description from feedback fields
   */
  populateErrorDescription(currentParameters?: any[]): void {
    const allFeedback: string[] = [];
    const quillManager = getQuillManager();
    
    // Use window.currentParameters if not provided
    const parameters = currentParameters || (window as any).currentParameters || [];
    
    parameters.forEach((param: any) => {
      const fieldId = param.field_id || param.fieldId;
      const errorName = param.error_name || param.errorName;
      
      if (!fieldId || !errorName) return;
      
      // Check for Quill editor feedback first
      let feedbackText = '';
      
      // Try to get feedback from Quill editors (multiple feedback boxes per parameter)
      const feedbackContainer = document.getElementById(`feedback_container_${fieldId}`);
      if (feedbackContainer) {
        const feedbackBoxes = feedbackContainer.querySelectorAll('[id^="quill_feedback_"]');
        const feedbacks: string[] = [];
        
        feedbackBoxes.forEach((box) => {
          const editorId = box.id.replace('quill_', '');
          const content = quillManager.getContent(editorId);
          if (content) {
            // Strip HTML tags for text description
            const textContent = content.replace(/<[^>]*>/g, '').trim();
            if (textContent && textContent !== '') {
              feedbacks.push(textContent);
            }
          }
        });
        
        if (feedbacks.length > 0) {
          feedbackText = feedbacks.join(' | ');
        }
      }
      
      // Fallback to textarea if no Quill content
      if (!feedbackText) {
        const feedbackElement = document.getElementById(`feedback_${fieldId}`) as HTMLTextAreaElement;
        if (feedbackElement && feedbackElement.value.trim()) {
          feedbackText = feedbackElement.value.trim();
        }
      }
      
      if (feedbackText) {
        allFeedback.push(`${errorName}: ${feedbackText}`);
      }
    });
    
    const errorDescription = document.getElementById('errorDescription') as HTMLTextAreaElement;
    if (errorDescription) {
      errorDescription.value = allFeedback.join('\n\n');
    }
  }

  /**
   * Sync chat messages to textarea
   */
  syncChatMessagesToTextarea(): void {
    const chatMessagesContainer = document.getElementById('chatMessagesContainer');
    const transcriptTextarea = document.getElementById('transcript') as HTMLTextAreaElement;
    
    if (!chatMessagesContainer || !transcriptTextarea) {
      logWarn('Chat messages container or transcript textarea not found');
      return;
    }
    
    const messages: string[] = [];
    const messageElements = chatMessagesContainer.querySelectorAll('.message');
    
    messageElements.forEach((messageEl) => {
      const authorEl = messageEl.querySelector('.message-author');
      const bodyEl = messageEl.querySelector('.message-body');
      
      if (authorEl && bodyEl) {
        const author = authorEl.textContent?.trim() || 'Unknown';
        const body = bodyEl.textContent?.trim() || '';
        if (body) {
          messages.push(`${author}: ${body}`);
        }
      }
    });
    
    transcriptTextarea.value = messages.join('\n\n');
    logInfo(`Synced ${messages.length} chat messages to textarea`);
  }
}

// Singleton instance
let formHelpersInstance: FormHelpers | null = null;

/**
 * Get form helpers instance
 */
export function getFormHelpers(): FormHelpers {
  if (!formHelpersInstance) {
    formHelpersInstance = new FormHelpers();
  }
  return formHelpersInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).updateWeekAndQuarter = () => {
    getFormHelpers().updateWeekAndQuarter();
  };
  
  (window as any).populateErrorDescription = () => {
    const currentParameters = (window as any).currentParameters || [];
    getFormHelpers().populateErrorDescription(currentParameters);
  };
  
  (window as any).syncChatMessagesToTextarea = () => {
    getFormHelpers().syncChatMessagesToTextarea();
  };
}

