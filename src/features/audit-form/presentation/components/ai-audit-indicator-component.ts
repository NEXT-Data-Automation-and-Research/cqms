/**
 * AI Audit Indicator Component
 * Component wrapper for AI audit loading/success banner
 */

export interface AIAuditIndicatorConfig {
  onClear?: () => void;
}

export class AIAuditIndicatorComponent {
  private container: HTMLElement | null = null;
  private config: AIAuditIndicatorConfig;

  constructor(config: AIAuditIndicatorConfig = {}) {
    this.config = config;
  }

  /**
   * Render the AI audit indicator component
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
    this.hide();
  }

  /**
   * Get HTML template
   */
  private getHTML(): string {
    return `
      <div id="aiAuditIndicator" style="display: none; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 0.4852rem 0.9704rem; color: white; box-shadow: 0 0.1213rem 0.1819rem rgba(0,0,0,0.1); margin-bottom: 0.5rem; flex-shrink: 0; border-radius: 0.2425rem; margin-left: 0.9704rem; margin-right: 0.9704rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.6469rem;">
          <div style="display: flex; align-items: center; gap: 0.4852rem; flex: 1;">
            <div id="aiAuditLoadingSpinner" style="display: none; width: 0.8086rem; height: 0.8086rem; border: 0.1213rem solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <div id="aiAuditSuccessIcon" style="display: none; width: 0.8086rem; height: 0.8086rem; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.5659rem;">✓</div>
            <div style="flex: 1;">
              <div id="aiAuditLoadingText" style="display: none; font-size: 0.5659rem; font-weight: 600; font-family: 'Poppins', sans-serif;">Loading AI Audit data...</div>
              <div id="aiAuditSuccessText" style="display: none; font-size: 0.5659rem; font-weight: 600; font-family: 'Poppins', sans-serif;">
                <span>AI Audit data loaded</span>
                <span id="aiAuditConfidence" style="font-size: 0.4852rem; opacity: 0.9; margin-left: 0.3234rem;"></span>
              </div>
            </div>
          </div>
          <button type="button" id="clearAIAuditButton" style="display: none; background: rgba(255,255,255,0.2); border: 0.0606rem solid white; border-radius: 0.1617rem; padding: 0.2425rem 0.4852rem; font-size: 0.4852rem; font-weight: 600; cursor: pointer; color: white; font-family: 'Poppins', sans-serif; transition: all 0.2s; white-space: nowrap;">Clear AI Data</button>
        </div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const clearButton = document.getElementById('clearAIAuditButton');
    if (clearButton && this.config.onClear) {
      clearButton.addEventListener('click', () => {
        this.config.onClear?.();
      });
    }
  }

  /**
   * Show loading state
   */
  showLoading(): void {
    const indicator = document.getElementById('aiAuditIndicator');
    const loadingSpinner = document.getElementById('aiAuditLoadingSpinner');
    const loadingText = document.getElementById('aiAuditLoadingText');
    const successIcon = document.getElementById('aiAuditSuccessIcon');
    const successText = document.getElementById('aiAuditSuccessText');
    const clearButton = document.getElementById('clearAIAuditButton');

    if (indicator) indicator.style.display = 'block';
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    if (loadingText) loadingText.style.display = 'block';
    if (successIcon) successIcon.style.display = 'none';
    if (successText) successText.style.display = 'none';
    if (clearButton) clearButton.style.display = 'none';
  }

  /**
   * Show loaded state
   */
  showLoaded(confidenceScore?: number): void {
    const indicator = document.getElementById('aiAuditIndicator');
    const loadingSpinner = document.getElementById('aiAuditLoadingSpinner');
    const loadingText = document.getElementById('aiAuditLoadingText');
    const successIcon = document.getElementById('aiAuditSuccessIcon');
    const successText = document.getElementById('aiAuditSuccessText');
    const clearButton = document.getElementById('clearAIAuditButton');
    const confidenceSpan = document.getElementById('aiAuditConfidence');

    if (indicator) indicator.style.display = 'block';
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
  }

  /**
   * Hide indicator
   */
  hide(): void {
    const indicator = document.getElementById('aiAuditIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
