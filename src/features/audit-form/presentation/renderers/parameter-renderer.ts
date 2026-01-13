/**
 * Parameter Renderer
 * Renders scorecard parameters dynamically
 * Migrated from audit-form.html renderErrorParameters()
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import type { Scorecard, ScorecardParameter } from '../../domain/entities.js';

export class ParameterRenderer {
  /**
   * Render all parameters
   */
  async renderParameters(
    parameters: any[],
    scorecard: any | null
  ): Promise<void> {
    const container = document.getElementById('errorParametersContainer');
    if (!container) {
      logError('errorParametersContainer not found');
      return;
    }

    // Clear container
    safeSetHTML(container, '');

    // Hide no scorecard message
    this.hideNoScorecardMessage();

    if (!parameters || parameters.length === 0) {
      safeSetHTML(container, '<div style="padding: 1.2937rem; text-align: center; color: #000000; font-size: 0.5659rem;"><p>No parameters defined for this scorecard.</p></div>');
      this.updateStatusHeader('Status');
      return;
    }

    // Determine column header based on field types
    const statusHeader = this.determineStatusHeader(parameters);
    this.updateStatusHeader(statusHeader);

    // Update scorecard display in header
    if (scorecard) {
      await this.updateScorecardDisplay(scorecard);
    }

    try {
      // Render each parameter
      for (const param of parameters) {
        await this.renderParameter(param, container);
      }

      // Update summary badges
      this.calculateAverageScore();
    } catch (error) {
      logError('Error rendering parameters:', error);
      const escapedMessage = await escapeHtml((error as Error).message);
      safeSetHTML(container, `<div style="padding: 1.2937rem; text-align: center; color: #dc2626; font-size: 0.5659rem;"><p>Error rendering parameters: ${escapedMessage}</p></div>`);
    }
  }

  /**
   * Determine status column header
   */
  private determineStatusHeader(parameters: any[]): string {
    const allCounters = parameters.every((param: any) => (param.field_type || param.fieldType) === 'counter');
    const allRadio = parameters.every((param: any) => (param.field_type || param.fieldType) === 'radio');

    if (allCounters) return 'Counts';
    if (allRadio) return 'Achieved?';
    return 'Status';
  }

  /**
   * Update status header
   */
  private updateStatusHeader(headerText: string): void {
    const headerStatusCol = document.querySelector('#errorParametersSection .error-details-header-status');
    if (headerStatusCol) {
      headerStatusCol.textContent = headerText;
    }
  }

  /**
   * Update scorecard display in header
   */
  private async updateScorecardDisplay(scorecard: any): Promise<void> {
    const scorecardDisplay = document.getElementById('formScorecardDisplay');
    if (!scorecardDisplay) return;

    const scoringType = scorecard.scoring_type || scorecard.scoringType;
    let scoringTypeIcon = '';
    let scoringTypeText = '';
    
    if (scoringType === 'deductive') {
      scoringTypeIcon = '<svg style="width: 0.4043rem; height: 0.4043rem; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>';
      scoringTypeText = 'DEDUCTIVE';
    } else if (scoringType === 'additive') {
      scoringTypeIcon = '<svg style="width: 0.4043rem; height: 0.4043rem; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14l5-5 5 5z"/></svg>';
      scoringTypeText = 'ADDITIVE';
    } else if (scoringType === 'hybrid') {
      scoringTypeIcon = '<svg style="width: 0.4043rem; height: 0.4043rem; display: inline-block; vertical-align: middle;" viewBox="0 0 24 24" fill="currentColor"><path d="M2 12h20M12 2v20"/></svg>';
      scoringTypeText = 'HYBRID';
    }

    const scorecardName = scorecard.name || '';
    const escapedName = await escapeHtml(scorecardName);
    const scorecardHTML = `<svg style="width: 0.5659rem; height: 0.5659rem; display: inline-block; vertical-align: middle; margin-right: 0.2425rem;" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg> ${escapedName}${scoringTypeText ? ' <span style="background: rgba(255,255,255,0.25); padding: 0.0971rem 0.3234rem; border-radius: 0.1617rem; font-size: 0.4043rem; font-weight: 600; text-transform: uppercase; border: 0.0304rem solid rgba(255,255,255,0.4); margin-left: 0.3234rem; display: inline-flex; align-items: center; gap: 0.1617rem;">' + scoringTypeIcon + ' ' + scoringTypeText + '</span>' : ''}`;
    safeSetHTML(scorecardDisplay, scorecardHTML);
  }

  /**
   * Render a single parameter
   */
  private async renderParameter(
    param: any,
    container: HTMLElement
  ): Promise<void> {
    const paramType = param.parameter_type || param.parameterType || 'error';
    const paramIcon = paramType === 'error' ? '-' : (paramType === 'achievement' || paramType === 'bonus' ? '+' : '');
    const fieldId = param.field_id || param.fieldId;
    const fieldType = param.field_type || param.fieldType || 'counter';
    const errorName = param.error_name || param.errorName || '';
    const errorCategory = param.error_category || param.errorCategory || '';
    const penaltyPoints = param.penalty_points || param.penaltyPoints || 0;
    
    // Map error category to severity
    const severity = this.mapSeverity(errorCategory);
    
    // Get severity colors
    const { color, bg } = this.getSeverityColors(paramType, severity);
    const severityLabel = (paramType === 'achievement' || paramType === 'bonus') && fieldType !== 'radio' 
      ? 'ACHIEVEMENT' 
      : severity;

    // Create input HTML
    const inputHtml = this.createInputHtml(fieldId, fieldType, paramType, penaltyPoints, errorCategory);

    // Create row
    const rowDiv = document.createElement('div');
    rowDiv.style.cssText = 'display: grid; grid-template-columns: 1.5fr 0.8fr 0.8fr 0.8fr 4fr; gap: 0.6469rem; align-items: start; padding: 0.3234rem 0; border-bottom: 0.0405rem solid #f3f4f6; width: 100%; min-width: 0;';

    const escapedErrorName = await escapeHtml(errorName);
    const escapedSeverityLabel = await escapeHtml(severityLabel);
    const rowHTML = `
      <div>
        <span>${paramIcon}</span> ${escapedErrorName}
      </div>
      <div>
        ${penaltyPoints}
      </div>
      <div>
        <span>${escapedSeverityLabel}</span>
      </div>
      <div>
        ${inputHtml}
      </div>
      <div id="feedback_container_${fieldId}">
        <!-- Feedback boxes will be dynamically added here -->
      </div>
    `;
    safeSetHTML(rowDiv, rowHTML);

    // Apply styles
    this.applyRowStyles(rowDiv, fieldId, fieldType, paramType, color, bg);
    
    container.appendChild(rowDiv);

    // Reapply styles after DOM insertion using requestAnimationFrame
    requestAnimationFrame(() => {
      this.applyRowStyles(rowDiv, fieldId, fieldType, paramType, color, bg);
    });

    // Initialize feedback boxes
    this.updateFeedbackBoxes(fieldId, fieldType, paramType);

    // Setup auto-expand functionality
    this.setupFeedbackAutoExpand(fieldId);
  }

  /**
   * Map error category to severity
   */
  private mapSeverity(category: string): string {
    if (category.includes('Fail')) return 'Critical Fail';
    if (category.includes('Critical')) return 'Critical';
    if (category.includes('Significant')) return 'Significant';
    if (category.includes('Major')) return 'Major';
    if (category.includes('Minor')) return 'Minor';
    return 'Significant';
  }

  /**
   * Get severity colors
   */
  private getSeverityColors(paramType: string, severity: string): { color: string; bg: string } {
    if (paramType === 'achievement' || paramType === 'bonus') {
      return { color: '#10b981', bg: '#d1fae5' };
    }

    // Error severities use red shades
    const colors: Record<string, { color: string; bg: string }> = {
      'Critical Fail': { color: '#ffffff', bg: '#7f1d1d' },
      'Critical': { color: '#ffffff', bg: '#991b1b' },
      'Significant': { color: '#ffffff', bg: '#b91c1c' },
      'Major': { color: '#ffffff', bg: '#dc2626' },
      'Minor': { color: '#ffffff', bg: '#ef4444' }
    };

    return colors[severity] || colors['Significant'];
  }

  /**
   * Create input HTML
   */
  private createInputHtml(fieldId: string, fieldType: string, paramType: string, penaltyPoints: number, errorCategory: string): string {
    if (fieldType === 'radio') {
      return `
        <div>
          <label>
            <input type="radio" name="${fieldId}" id="${fieldId}_yes" value="1" required data-penalty="${penaltyPoints}" data-category="${errorCategory}" data-param-type="${paramType}" onchange="calculateAverageScore()">
            <span>✓ YES</span>
          </label>
          <label>
            <input type="radio" name="${fieldId}" id="${fieldId}_no" value="0" required data-penalty="${penaltyPoints}" data-category="${errorCategory}" data-param-type="${paramType}" onchange="calculateAverageScore()">
            <span>✗ NO</span>
          </label>
        </div>
      `;
    } else {
      return `
        <div>
          <button type="button" class="counter-btn" data-action="decrement" data-target="${fieldId}">-</button>
          <span id="${fieldId}_display">0</span>
          <button type="button" class="counter-btn" data-action="increment" data-target="${fieldId}">+</button>
          <input type="number" id="${fieldId}" name="${fieldId}" min="0" max="10" value="0" readonly data-penalty="${penaltyPoints}" data-category="${errorCategory}" data-param-type="${paramType}">
        </div>
      `;
    }
  }

  /**
   * Apply row styles
   */
  private applyRowStyles(
    rowDiv: HTMLElement,
    fieldId: string,
    fieldType: string,
    paramType: string,
    severityColor: string,
    severityBg: string
  ): void {
    const children = rowDiv.children;
    if (children.length < 5) return;

    // First column: Error name
    (children[0] as HTMLElement).style.cssText = 'font-size: 0.5659rem; color: #1f2937; font-weight: 600; font-family: "Poppins", sans-serif; min-width: 0; overflow: hidden;';
    const iconSpan = children[0].querySelector('span');
    if (iconSpan) {
      (iconSpan as HTMLElement).style.cssText = `font-weight: 700; color: ${paramType === 'error' ? '#dc2626' : '#10b981'};`;
    }

    // Second column: Penalty points
    (children[1] as HTMLElement).style.cssText = 'display: flex; justify-content: center; font-size: 0.5659rem; color: #1f2937; font-weight: 600; font-family: "Poppins", sans-serif; min-width: 0;';

    // Third column: Severity badge
    (children[2] as HTMLElement).style.cssText = 'display: flex; justify-content: center; min-width: 0;';
    const severitySpan = children[2].querySelector('span');
    if (severitySpan) {
      (severitySpan as HTMLElement).style.cssText = `background: ${severityBg}; color: ${severityColor}; padding: 0.1617rem 0.4852rem; border-radius: 0.2425rem; font-size: 0.4852rem; font-weight: 600; font-family: "Poppins", sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; white-space: nowrap;`;
    }

    // Fourth column: Input
    (children[3] as HTMLElement).style.cssText = 'display: flex; justify-content: center; min-width: 0;';
    this.applyInputStyles(children[3], fieldId, fieldType);

    // Fifth column: Feedback container
    (children[4] as HTMLElement).style.cssText = 'display: flex; flex-direction: column; gap: 0.3234rem; min-width: 0; width: 100%; word-wrap: break-word; overflow-wrap: break-word;';
  }

  /**
   * Apply input styles
   */
  private applyInputStyles(container: Element, fieldId: string, fieldType: string): void {
    const inputContainer = container.querySelector('div');
    if (!inputContainer) return;

    if (fieldType === 'radio') {
      inputContainer.style.cssText = 'display: flex; align-items: center; gap: 0.3234rem;';
      const labels = inputContainer.querySelectorAll('label');
      labels.forEach((label, index) => {
        (label as HTMLElement).style.cssText = 'display: flex; align-items: center; gap: 0.1617rem; cursor: pointer;';
        const input = label.querySelector('input[type="radio"]');
        if (input) {
          (input as HTMLElement).style.cssText = `width: 0.6469rem; height: 0.6469rem; cursor: pointer; accent-color: ${index === 0 ? '#10b981' : '#ef4444'};`;
        }
        const span = label.querySelector('span');
        if (span) {
          (span as HTMLElement).style.cssText = `font-size: 0.4852rem; font-weight: 600; color: ${index === 0 ? '#10b981' : '#ef4444'};`;
        }
      });
    } else {
      inputContainer.style.cssText = 'display: flex; align-items: center; gap: 0.2425rem;';
      const buttons = inputContainer.querySelectorAll('button.counter-btn');
      buttons.forEach(button => {
        (button as HTMLElement).style.cssText = 'width: 1.1321rem; height: 1.1321rem; display: flex; align-items: center; justify-content: center; border: 0.0304rem solid #d1d5db; background-color: #ffffff; color: #000000; border-radius: 0.1617rem; font-size: 0.6469rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: "Poppins", sans-serif; padding: 0; line-height: 1;';
      });
      const displaySpan = inputContainer.querySelector(`#${fieldId}_display`);
      if (displaySpan) {
        (displaySpan as HTMLElement).style.cssText = 'font-size: 0.5659rem; font-weight: 700; font-family: "Poppins", sans-serif; color: #1f2937; min-width: 0.8086rem; text-align: center;';
      }
      const hiddenInput = inputContainer.querySelector(`input[type="number"]#${fieldId}`);
      if (hiddenInput) {
        (hiddenInput as HTMLElement).style.cssText = 'display: none;';
      }
    }
  }

  /**
   * Update feedback boxes for parameter
   */
  private updateFeedbackBoxes(fieldId: string, fieldType: string, paramType: string): void {
    if (typeof (window as any).updateFeedbackBoxesForParameter === 'function') {
      (window as any).updateFeedbackBoxesForParameter(fieldId, fieldType, paramType);
    }
  }

  /**
   * Setup feedback auto-expand
   */
  private setupFeedbackAutoExpand(fieldId: string): void {
    if (typeof (window as any).setupFeedbackTextareaAutoExpand === 'function') {
      (window as any).setupFeedbackTextareaAutoExpand(fieldId);
    }
  }

  /**
   * Hide no scorecard message
   */
  private hideNoScorecardMessage(): void {
    if (typeof (window as any).hideNoScorecardMessage === 'function') {
      (window as any).hideNoScorecardMessage();
    }
  }

  /**
   * Calculate average score
   */
  private calculateAverageScore(): void {
    // This would call the score calculation logic
    // Implementation would be in a separate score calculator
    if (typeof (window as any).calculateAverageScore === 'function') {
      (window as any).calculateAverageScore();
    }
  }
}

// Singleton instance
let parameterRendererInstance: ParameterRenderer | null = null;

/**
 * Get parameter renderer instance
 */
export function getParameterRenderer(): ParameterRenderer {
  if (!parameterRendererInstance) {
    parameterRendererInstance = new ParameterRenderer();
  }
  return parameterRendererInstance;
}

/**
 * Render error parameters (global function for backward compatibility)
 */
export async function renderErrorParameters(): Promise<void> {
  const renderer = getParameterRenderer();
  const currentParameters = (window as any).currentParameters || [];
  const currentScorecard = (window as any).currentScorecard || null;
  await renderer.renderParameters(currentParameters, currentScorecard);
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).renderErrorParameters = renderErrorParameters;
}

