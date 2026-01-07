/**
 * Scorecard Section Component
 */

import type { Scorecard } from '../../../domain/entities.js';
import { safeSetHTML, escapeHtml } from '../../../../../utils/html-sanitizer.js';

export class ScorecardSection {
  private container: HTMLElement;
  private scorecards: Scorecard[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="accordion-section" data-section="scorecard">
        <div class="accordion-header" data-toggle="scorecard">
          <h3>
            <span>3</span>
            Scorecard Selection
          </h3>
          <svg class="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="accordion-content">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Scorecard</label>
              <select id="scorecardSelect" name="scorecardSelect" required class="form-input w-full">
                <option value="">Select scorecard...</option>
              </select>
            </div>
            <div id="scorecardInfo" class="text-sm text-white/60" style="display: none;">
              <p>Scoring Type: <span id="scorecardScoringType" class="font-semibold text-success">--</span></p>
              <p>Parameters: <span id="scorecardParamsCount" class="font-semibold text-success">--</span></p>
            </div>
          </div>
        </div>
      </div>
    `);
  }

  private attachEventListeners(): void {
    const header = this.container.querySelector('.accordion-header');
    const select = this.container.querySelector('#scorecardSelect') as HTMLSelectElement;
    
    if (header) {
      header.addEventListener('click', () => this.toggle());
    }
    
    if (select) {
      select.addEventListener('change', (e) => {
        const scorecardId = (e.target as HTMLSelectElement).value;
        this.onScorecardSelected(scorecardId);
      });
    }
  }

  loadScorecards(scorecards: Scorecard[]): void {
    this.scorecards = scorecards;
    const select = this.container.querySelector('#scorecardSelect') as HTMLSelectElement;
    if (!select) return;

    const optionsHtml = '<option value="">Select scorecard...</option>' +
      scorecards.map(sc => 
        `<option value="${escapeHtml(sc.id)}">${escapeHtml(sc.name)}</option>`
      ).join('');
    safeSetHTML(select, optionsHtml);
  }

  private onScorecardSelected(scorecardId: string): void {
    const scorecard = this.scorecards.find(sc => sc.id === scorecardId);
    const info = this.container.querySelector('#scorecardInfo') as HTMLElement;
    
    if (!scorecard) {
      if (info) info.style.display = 'none';
      return;
    }

    if (info) {
      info.style.display = 'block';
      (this.container.querySelector('#scorecardScoringType') as HTMLElement).textContent = scorecard.scoringType;
      (this.container.querySelector('#scorecardParamsCount') as HTMLElement).textContent = 
        `${scorecard.parameters.length} params`;
    }

    this.container.dispatchEvent(new CustomEvent('scorecard-selected', {
      detail: { scorecard }
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

