/**
 * Error Details Section Component
 * Handles the right column with error counts, parameters table, score, and recommendations
 */

export interface ErrorDetailsSectionConfig {
  onChannelChange?: (channel: string) => void;
  onScorecardChange?: (scorecardId: string) => void;
  onValidationStatusChange?: (status: string) => void;
}

export class ErrorDetailsSection {
  private container: HTMLElement | null = null;
  private config: ErrorDetailsSectionConfig;

  constructor(config: ErrorDetailsSectionConfig = {}) {
    this.config = config;
  }

  /**
   * Render the error details section component
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  /**
   * Initialize with existing DOM (doesn't replace HTML, just attaches listeners)
   */
  initializeWithExistingDOM(): void {
    this.attachEventListeners();
  }

  /**
   * Get HTML template
   */
  private getHTML(): string {
    return `
      <div id="rightColumn" style="flex: 1; min-width: 9.0967rem; padding-left: 0.3234rem; padding-right: 0.9704rem; display: flex; flex-direction: column; min-height: 0; overflow-y: auto;">
        <!-- Error Counts: Total Errors, Critical Fail, Critical, Significant, Major, Minor -->
        <div id="errorCountsSection" style="background: #d1fae5; border-radius: 0.3234rem; padding: 0.6469rem; margin-bottom: 0.6469rem; border: 0.0304rem solid #a7f3d0;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr)); gap: 0.6469rem;">
            <div>
              <p style="font-size: 0.4447rem; color: #065f46; margin: 0 0 0.3234rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Total Errors</p>
              <div id="totalErrorsCountDisplay" style="font-size: 0.6469rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; color: #374151; width: 100%; padding: 0.2425rem 0.3234rem; text-align: center;">0</div>
            </div>
            <div>
              <p style="font-size: 0.4447rem; color: #065f46; margin: 0 0 0.3234rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Critical Fail</p>
              <div id="criticalFailErrorDisplay" style="font-size: 0.6469rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; color: #374151; width: 100%; padding: 0.2425rem 0.3234rem; text-align: center;">0</div>
            </div>
            <div>
              <p style="font-size: 0.4447rem; color: #065f46; margin: 0 0 0.3234rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Critical</p>
              <div id="criticalErrorsDisplay" style="font-size: 0.6469rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; color: #374151; width: 100%; padding: 0.2425rem 0.3234rem; text-align: center;">0</div>
            </div>
            <div>
              <p style="font-size: 0.4447rem; color: #065f46; margin: 0 0 0.3234rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Significant Error</p>
              <div id="significantErrorDisplay" style="font-size: 0.6469rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; color: #374151; width: 100%; padding: 0.2425rem 0.3234rem; text-align: center;">0</div>
            </div>
            <div>
              <p style="font-size: 0.4447rem; color: #065f46; margin: 0 0 0.3234rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Major</p>
              <div id="majorErrorDisplay" style="font-size: 0.6469rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; color: #374151; width: 100%; padding: 0.2425rem 0.3234rem; text-align: center;">0</div>
            </div>
            <div>
              <p style="font-size: 0.4447rem; color: #065f46; margin: 0 0 0.3234rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Minor</p>
              <div id="minorErrorDisplay" style="font-size: 0.6469rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; color: #374151; width: 100%; padding: 0.2425rem 0.3234rem; text-align: center;">0</div>
            </div>
          </div>
        </div>
        
        <!-- Error Details (Report-Style Table) -->
        <div id="errorParametersSection" style="background: #f9fafb; border-radius: 0.3234rem; padding: 0.6469rem; border: 0.0304rem solid #e5e7eb; margin-bottom: 0.6469rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4852rem; flex-wrap: wrap; gap: 0.4852rem;">
            <div style="display: flex; align-items: center; gap: 0.4852rem; flex-wrap: wrap;">
              <h3 style="font-size: 0.6064rem; font-weight: 600; color: #1A733E; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">
                <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                Error Details
              </h3>
              <div style="display: flex; align-items: center; gap: 0.3234rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.1617rem;">
                  <span style="font-size: 0.4852rem; font-weight: 500; color: #000000; font-family: 'Poppins', sans-serif; white-space: nowrap;">Channel:</span>
                  <select id="channel" name="channel" required style="padding: 0.2425rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; background-color: #ffffff; color: #374151; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 500; cursor: pointer; min-width: 3.6387rem; appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23374151\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.3234rem center; background-size: 0.5659rem; padding-right: 1.2937rem;">
                  <option value="">Select...</option>
                </select>
              </div>
              <div style="width: 0.0304rem; height: 0.6469rem; background: #d1d5db;"></div>
              <div style="display: flex; align-items: center; gap: 0.3234rem;">
                <label for="scorecardSelect" style="font-size: 0.4852rem; font-weight: 500; color: #000000; font-family: 'Poppins', sans-serif; white-space: nowrap;">Scorecard:</label>
                <select id="scorecardSelect" required style="padding: 0.2425rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; background-color: #ffffff; color: #374151; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 500; min-width: 4.5482rem; cursor: pointer; appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23374151\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.3234rem center; background-size: 0.5659rem; padding-right: 1.2937rem;">
                  <option value="">Loading scorecards...</option>
                </select>
              </div>
            </div>
          </div>
          
          <div style="background: var(--background-white); border-radius: 0.4852rem; box-shadow: 0 0.0405rem 0.1213rem 0 rgba(0, 0, 0, 0.1); overflow: hidden;">
            <!-- Table Header -->
            <div style="background-color: var(--background-white); padding: 0.4852rem 0.6469rem; border-bottom: 0.0405rem solid var(--border-light);">
              <div style="display: grid; grid-template-columns: 1.5fr 0.8fr 0.8fr 0.8fr 4fr; gap: 0.6469rem; align-items: center; font-weight: 700; font-size: 0.5659rem; color: var(--text-color); text-transform: uppercase; letter-spacing: 0.05em; width: 100%; min-width: 0;">
                <div style="min-width: 0;">Error Type</div>
                <div style="text-align: center; min-width: 0;">Points</div>
                <div style="text-align: center; min-width: 0;">Severity</div>
                <div class="error-details-header-status" style="text-align: center; min-width: 0;">Status</div>
                <div style="min-width: 0;">Feedback</div>
              </div>
            </div>
            
            <!-- Table Body -->
            <div id="errorParametersContainer" style="padding: 0 0.6469rem 0.6469rem 0.6469rem; box-shadow: 0 -0.0606rem 0.1213rem rgba(0, 0, 0, 0.05);">
              <!-- Error parameters will be dynamically loaded based on selected scorecard -->
              <div id="noScorecardMessage" style="padding: 1.2937rem; text-align: center; color: #000000; font-size: 0.5659rem;">
                <p style="margin: 0 0 0.3234rem 0; font-weight: 500;">No scorecard selected. Please select a scorecard first to load error parameters.</p>
                <p style="margin: 0; color: #6b7280; font-size: 0.4852rem;">💡 Tip: Select an employee first to filter scorecards by channel, or choose any scorecard from the list.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Avg Score & Passing Status -->
        <div style="background: #f9fafb; border-radius: 0.3234rem; padding: 0.6469rem; margin-bottom: 0.6469rem; border: 0.0304rem solid #e5e7eb;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr)); gap: 0.6469rem;">
            <div>
              <p style="font-size: 0.4447rem; color: #000000; margin: 0 0 0.3234rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Avg Score</p>
              <input type="number" id="averageScore" name="averageScore" min="0" max="100" step="0.01" required readonly style="font-size: 0.6469rem; font-weight: 700; margin: 0; font-family: 'Poppins', sans-serif; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; color: #374151; width: 100%; padding: 0.2425rem 0.3234rem; cursor: not-allowed; text-align: center;">
            </div>
            <div>
              <p style="font-size: 0.4447rem; color: #000000; margin: 0 0 0.3234rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Status</p>
              <input type="text" id="passingStatus" name="passingStatus" readonly style="font-size: 0.5659rem; font-weight: 600; margin: 0; font-family: 'Poppins', sans-serif; background: white; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; color: #374151; width: 100%; padding: 0.2425rem 0.3234rem; cursor: not-allowed; text-align: center;">
            </div>
          </div>
        </div>

        <!-- Recommendations & Next Steps -->
        <div style="background: #f9fafb; border-radius: 0.3234rem; padding: 0.6469rem; border: 0.0304rem solid #e5e7eb; margin-bottom: 0.6469rem;">
          <h3 style="font-size: 0.6064rem; font-weight: 600; color: #1A733E; margin: 0 0 0.4852rem 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.3234rem;">
            <svg style="width: 0.7278rem; height: 0.7278rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z"/></svg>
            Recommendations / Next Steps
          </h3>
          <div class="quill-editor-container" style="margin-top: 0.3234rem;">
            <div id="quill_recommendations"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners (can be called separately for existing DOM)
   */
  attachEventListeners(): void {
    const channelSelect = document.getElementById('channel') as HTMLSelectElement;
    const scorecardSelect = document.getElementById('scorecardSelect') as HTMLSelectElement;

    if (channelSelect) {
      // Only add our listener if not already attached (avoid duplicates)
      if (!channelSelect.hasAttribute('data-modular-listener-attached')) {
        channelSelect.setAttribute('data-modular-listener-attached', 'true');
        
        if (this.config.onChannelChange) {
          channelSelect.addEventListener('change', (e) => {
            this.config.onChannelChange?.((e.target as HTMLSelectElement).value);
          });
        }
      }
    }

    if (scorecardSelect) {
      // Only add our listener if not already attached (avoid duplicates)
      if (!scorecardSelect.hasAttribute('data-modular-listener-attached')) {
        scorecardSelect.setAttribute('data-modular-listener-attached', 'true');
        
        if (this.config.onScorecardChange) {
          scorecardSelect.addEventListener('change', (e) => {
            this.config.onScorecardChange?.((e.target as HTMLSelectElement).value);
          });
        }
      }
    }
  }

  /**
   * Get error parameters container
   */
  getErrorParametersContainer(): HTMLElement | null {
    return document.getElementById('errorParametersContainer');
  }

  /**
   * Get scorecard select element
   */
  getScorecardSelect(): HTMLSelectElement | null {
    return document.getElementById('scorecardSelect') as HTMLSelectElement;
  }

  /**
   * Get channel select element
   */
  getChannelSelect(): HTMLSelectElement | null {
    return document.getElementById('channel') as HTMLSelectElement;
  }

  /**
   * Update error count display
   */
  updateErrorCount(type: 'total' | 'criticalFail' | 'critical' | 'significant' | 'major' | 'minor', count: number): void {
    const elementIdMap: Record<string, string> = {
      total: 'totalErrorsCountDisplay',
      criticalFail: 'criticalFailErrorDisplay',
      critical: 'criticalErrorsDisplay',
      significant: 'significantErrorDisplay',
      major: 'majorErrorDisplay',
      minor: 'minorErrorDisplay'
    };

    const element = document.getElementById(elementIdMap[type]);
    if (element) {
      element.textContent = count.toString();
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
