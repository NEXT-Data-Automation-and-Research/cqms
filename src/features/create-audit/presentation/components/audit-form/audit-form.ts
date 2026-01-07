/**
 * Audit Form Component
 * Main form container with accordion layout and progress indicator
 */

import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';

export class AuditForm {
  private container: HTMLElement;
  private sections: Map<string, HTMLElement> = new Map();
  private expandedSections: Set<string> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="glass-card rounded-xl p-4">
        <div class="form-progress mb-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-base font-bold text-white">Create New Audit</h3>
            <span class="text-sm text-white/60" id="formProgressText">0% Complete</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="formProgressBar" style="width: 0%"></div>
          </div>
        </div>
        
        <form id="auditForm" class="space-y-4">
          <div id="formSectionsContainer">
            <!-- Form sections will be loaded here -->
          </div>
          
          <div class="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" class="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors" id="resetFormBtn">
              Reset
            </button>
            <button type="submit" class="px-6 py-2 bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed" id="submitFormBtn">
              Submit Audit
            </button>
          </div>
        </form>
      </div>
    `);
  }

  private attachEventListeners(): void {
    const form = this.container.querySelector('#auditForm') as HTMLFormElement;
    const resetBtn = this.container.querySelector('#resetFormBtn') as HTMLButtonElement;
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.handleReset();
      });
    }
  }

  addSection(sectionId: string, sectionElement: HTMLElement): void {
    const container = this.container.querySelector('#formSectionsContainer');
    if (container) {
      container.appendChild(sectionElement);
      this.sections.set(sectionId, sectionElement);
    }
  }

  toggleSection(sectionId: string): void {
    const section = this.sections.get(sectionId);
    if (!section) return;

    const isExpanded = this.expandedSections.has(sectionId);
    if (isExpanded) {
      this.expandedSections.delete(sectionId);
      section.classList.remove('expanded');
    } else {
      this.expandedSections.add(sectionId);
      section.classList.add('expanded');
    }

    this.updateProgress();
  }

  expandSection(sectionId: string): void {
    const section = this.sections.get(sectionId);
    if (section && !this.expandedSections.has(sectionId)) {
      this.expandedSections.add(sectionId);
      section.classList.add('expanded');
      this.updateProgress();
    }
  }

  updateProgress(): void {
    const totalSections = this.sections.size;
    const completedSections = this.expandedSections.size;
    const progress = totalSections > 0 ? (completedSections / totalSections) * 100 : 0;

    const progressBar = this.container.querySelector('#formProgressBar') as HTMLElement;
    const progressText = this.container.querySelector('#formProgressText') as HTMLElement;
    
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
    if (progressText) {
      progressText.textContent = `${Math.round(progress)}% Complete`;
    }
  }

  private handleSubmit(): void {
    this.container.dispatchEvent(new CustomEvent('form-submit', {
      detail: { formData: this.getFormData() }
    }));
  }

  private handleReset(): void {
    this.container.dispatchEvent(new CustomEvent('form-reset'));
    this.expandedSections.clear();
    this.sections.forEach(section => section.classList.remove('expanded'));
    this.updateProgress();
  }

  private getFormData(): FormData {
    const form = this.container.querySelector('#auditForm') as HTMLFormElement;
    return new FormData(form);
  }
}

