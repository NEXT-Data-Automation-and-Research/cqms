/**
 * AI Audit Cleaner
 * Clears AI audit data from the form
 * Migrated from audit-form.html clearAIAuditData()
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';
import { getQuillManager } from './quill-manager.js';

export class AIAuditCleaner {
  /**
   * Clear all AI audit data from the form
   */
  async clearAIAuditData(): Promise<void> {
    if (!confirm('Are you sure you want to clear all AI audit data from this form? This will reset all error counts, feedback, and recommendations.')) {
      return;
    }
    
    const currentParameters = (window as any).currentParameters || [];
    
    // Clear all error parameter fields
    if (currentParameters && currentParameters.length > 0) {
      for (const param of currentParameters) {
        const fieldId = param.field_id || param.fieldId;
        const fieldType = param.field_type || param.fieldType || 'counter';
        const field = document.getElementById(fieldId);
        
        if (field) {
          if (fieldType === 'radio') {
            // Uncheck all radio buttons for this parameter
            const radioInputs = document.querySelectorAll(`input[name="${fieldId}"]`);
            radioInputs.forEach(radio => {
              (radio as HTMLInputElement).checked = false;
            });
          } else {
            // Reset counter fields
            (field as HTMLInputElement).value = '0';
            const displaySpan = document.getElementById(`${fieldId}_display`);
            if (displaySpan) {
              displaySpan.textContent = '0';
            }
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        
        // Clear feedback fields (Quill editors)
        await this.clearFeedbackForParameter(fieldId);
      }
    }
    
    // Clear error description and recommendations
    const errorDescriptionField = document.getElementById('errorDescription') as HTMLTextAreaElement;
    if (errorDescriptionField) {
      errorDescriptionField.value = '';
    }
    
    // Clear recommendations Quill editor
    const quillManager = getQuillManager();
    if (quillManager.hasEditor('recommendations')) {
      const quill = quillManager.getEditor('recommendations');
      quill.root.innerHTML = '';
    } else {
      // Fallback to textarea
      const recommendationsField = document.getElementById('recommendations') as HTMLTextAreaElement;
      if (recommendationsField) {
        recommendationsField.value = '';
      }
    }
    
    // Recalculate average score
    if (typeof (window as any).calculateAverageScore === 'function') {
      (window as any).calculateAverageScore();
    }
    
    // Hide the indicator
    if (typeof (window as any).showAIAuditIndicator === 'function') {
      (window as any).showAIAuditIndicator('hidden');
    }
    
    // Show notification
    if (typeof (window as any).showToastNotification === 'function') {
      (window as any).showToastNotification('AI Audit data cleared from form', 'info');
    } else {
      logInfo('AI Audit data cleared from form');
    }
  }

  /**
   * Clear feedback for a parameter
   */
  private async clearFeedbackForParameter(fieldId: string): Promise<void> {
    const quillManager = getQuillManager();
    let feedbackIndex = 0;
    
    while (true) {
      const feedbackId = `feedback_${fieldId}_${feedbackIndex}`;
      const quillId = `quill_feedback_${fieldId}_${feedbackIndex}`;
      
      // Try Quill editor first
      if (quillManager.hasEditor(quillId)) {
        const quill = quillManager.getEditor(quillId);
        quill.root.innerHTML = '';
        feedbackIndex++;
        continue;
      }
      
      // Fallback to textarea
      const feedbackTextarea = document.getElementById(feedbackId) as HTMLTextAreaElement;
      if (feedbackTextarea) {
        feedbackTextarea.value = '';
        feedbackTextarea.dispatchEvent(new Event('input', { bubbles: true }));
        feedbackIndex++;
      } else {
        break;
      }
    }
  }
}

// Singleton instance
let aiAuditCleanerInstance: AIAuditCleaner | null = null;

/**
 * Get AI audit cleaner instance
 */
export function getAIAuditCleaner(): AIAuditCleaner {
  if (!aiAuditCleanerInstance) {
    aiAuditCleanerInstance = new AIAuditCleaner();
  }
  return aiAuditCleanerInstance;
}

/**
 * Clear AI audit data (global function for backward compatibility)
 */
export async function clearAIAuditData(): Promise<void> {
  await getAIAuditCleaner().clearAIAuditData();
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).clearAIAuditData = clearAIAuditData;
}

