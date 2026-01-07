/**
 * Error Parameters Section Component
 */

import type { ScorecardParameter, ParameterValue } from '../../../domain/entities.js';
import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';

export class ErrorParametersSection {
  private container: HTMLElement;
  private parameters: ScorecardParameter[] = [];
  private parameterValues: Map<string, ParameterValue> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="accordion-section" data-section="error-parameters">
        <div class="accordion-header" data-toggle="error-parameters">
          <h3>
            <span>4</span>
            Error Parameters
          </h3>
          <svg class="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="accordion-content">
          <div id="parametersContainer" class="space-y-4">
            <p class="text-sm text-white/60">Select a scorecard to load parameters</p>
          </div>
        </div>
      </div>
    `);
  }

  loadParameters(parameters: ScorecardParameter[]): void {
    this.parameters = parameters;
    this.renderParameters();
  }

  private renderParameters(): void {
    const container = this.container.querySelector('#parametersContainer') as HTMLElement;
    if (!container) return;

    if (this.parameters.length === 0) {
      safeSetHTML(container, '<p class="text-sm text-white/60">No parameters available</p>');
      return;
    }

    const htmlContent = this.parameters.map(param => {
      if (param.type === 'counter') {
        return this.renderCounterParameter(param);
      } else if (param.type === 'radio') {
        return this.renderRadioParameter(param);
      } else {
        return this.renderFeedbackParameter(param);
      }
    }).join('');

    safeSetHTML(container, htmlContent);

    this.attachParameterListeners();
  }

  private renderCounterParameter(param: ScorecardParameter): string {
    return `
      <div class="parameter-item p-4 bg-white/5 rounded-lg border border-white/10">
        <label class="block text-sm font-medium text-white/80 mb-2">${this.escapeHtml(param.name)}</label>
        <input type="number" 
               id="param-${param.id}" 
               name="param-${param.id}" 
               min="0" 
               value="0" 
               class="form-input w-32" 
               data-param-id="${param.id}"
               data-param-type="counter" />
      </div>
    `;
  }

  private renderRadioParameter(param: ScorecardParameter): string {
    const options = param.options || [];
    return `
      <div class="parameter-item p-4 bg-white/5 rounded-lg border border-white/10">
        <label class="block text-sm font-medium text-white/80 mb-2">${this.escapeHtml(param.name)}</label>
        <div class="flex gap-4">
          ${options.map(option => `
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" 
                     name="param-${param.id}" 
                     value="${this.escapeHtml(option)}" 
                     data-param-id="${param.id}"
                     data-param-type="radio"
                     class="form-radio" />
              <span class="text-sm text-white/80">${this.escapeHtml(option)}</span>
            </label>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderFeedbackParameter(param: ScorecardParameter): string {
    return `
      <div class="parameter-item p-4 bg-white/5 rounded-lg border border-white/10">
        <label class="block text-sm font-medium text-white/80 mb-2">${this.escapeHtml(param.name)}</label>
        <textarea id="param-${param.id}" 
                  name="param-${param.id}" 
                  rows="3" 
                  class="form-input w-full" 
                  data-param-id="${param.id}"
                  data-param-type="feedback"
                  placeholder="Enter feedback..."></textarea>
      </div>
    `;
  }

  private attachParameterListeners(): void {
    this.parameters.forEach(param => {
      const inputs = this.container.querySelectorAll(`[data-param-id="${param.id}"]`);
      inputs.forEach(input => {
        input.addEventListener('change', () => {
          this.onParameterChange(param.id, input as HTMLElement);
        });
      });
    });
  }

  private onParameterChange(parameterId: string, input: HTMLElement): void {
    let value: number | string;
    
    if (input instanceof HTMLInputElement) {
      if (input.type === 'number') {
        value = parseInt(input.value) || 0;
      } else if (input.type === 'radio') {
        value = input.value;
      } else {
        value = input.value;
      }
    } else if (input instanceof HTMLTextAreaElement) {
      value = input.value;
    } else {
      return;
    }

    this.parameterValues.set(parameterId, { parameterId, value });
    
    this.container.dispatchEvent(new CustomEvent('parameter-changed', {
      detail: { parameterId, value }
    }));
  }

  toggle(): void {
    const section = this.container.querySelector('.accordion-section') as HTMLElement;
    if (section) {
      section.classList.toggle('expanded');
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

