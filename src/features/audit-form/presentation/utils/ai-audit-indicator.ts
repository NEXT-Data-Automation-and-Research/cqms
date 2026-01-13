/**
 * AI Audit Indicator
 * Shows/hides AI audit data indicator
 * Migrated from audit-form.html showAIAuditIndicator()
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';

export class AIAuditIndicator {
  /**
   * Show or hide AI audit indicator
   */
  showAIAuditIndicator(state: 'loading' | 'loaded' | 'hidden', confidenceScore: number | null = null): void {
    const indicator = document.getElementById('aiAuditIndicator');
    const loadingSpinner = document.getElementById('aiAuditLoadingSpinner');
    const loadingText = document.getElementById('aiAuditLoadingText');
    const successIcon = document.getElementById('aiAuditSuccessIcon');
    const successText = document.getElementById('aiAuditSuccessText');
    const clearButton = document.getElementById('clearAIAuditButton');
    const confidenceSpan = document.getElementById('aiAuditConfidence');
    
    if (!indicator) {
      logWarn('AI audit indicator element not found');
      return;
    }
    
    if (state === 'loading') {
      indicator.style.display = 'block';
      if (loadingSpinner) loadingSpinner.style.display = 'block';
      if (loadingText) loadingText.style.display = 'block';
      if (successIcon) successIcon.style.display = 'none';
      if (successText) successText.style.display = 'none';
      if (clearButton) clearButton.style.display = 'none';
      logInfo('AI audit indicator: loading');
    } else if (state === 'loaded') {
      indicator.style.display = 'block';
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      if (loadingText) loadingText.style.display = 'none';
      if (successIcon) successIcon.style.display = 'flex';
      if (successText) successText.style.display = 'block';
      if (clearButton) clearButton.style.display = 'block';
      
      if (confidenceSpan && confidenceScore !== null && confidenceScore !== undefined) {
        confidenceSpan.textContent = `(Confidence: ${confidenceScore}%)`;
      } else if (confidenceSpan) {
        confidenceSpan.textContent = '';
      }
      
      logInfo('AI audit indicator: loaded');
    } else if (state === 'hidden') {
      indicator.style.display = 'none';
      logInfo('AI audit indicator: hidden');
    }
  }
}

// Singleton instance
let aiAuditIndicatorInstance: AIAuditIndicator | null = null;

/**
 * Get AI audit indicator instance
 */
export function getAIAuditIndicator(): AIAuditIndicator {
  if (!aiAuditIndicatorInstance) {
    aiAuditIndicatorInstance = new AIAuditIndicator();
  }
  return aiAuditIndicatorInstance;
}

/**
 * Show AI audit indicator (global function for backward compatibility)
 */
export function showAIAuditIndicator(state: 'loading' | 'loaded' | 'hidden', confidenceScore: number | null = null): void {
  getAIAuditIndicator().showAIAuditIndicator(state, confidenceScore);
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).showAIAuditIndicator = showAIAuditIndicator;
}

