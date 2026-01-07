/**
 * Recommendations Section Component
 */

import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';

export class RecommendationsSection {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="accordion-section" data-section="recommendations">
        <div class="accordion-header" data-toggle="recommendations">
          <h3>
            <span>6</span>
            Recommendations
          </h3>
          <svg class="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="accordion-content">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Recommendations and Next Steps
            </label>
            <textarea id="recommendations" 
                      name="recommendations" 
                      rows="4" 
                      placeholder="Enter recommendations and next steps for the employee..." 
                      class="form-input w-full"></textarea>
          </div>
        </div>
      </div>
    `);
  }

  private attachEventListeners(): void {
    const header = this.container.querySelector('.accordion-header');
    if (header) {
      header.addEventListener('click', () => this.toggle());
    }
  }

  setRecommendations(recommendations: string): void {
    const textarea = this.container.querySelector('#recommendations') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = recommendations;
    }
  }

  toggle(): void {
    const section = this.container.querySelector('.accordion-section') as HTMLElement;
    if (section) {
      section.classList.toggle('expanded');
    }
  }
}

