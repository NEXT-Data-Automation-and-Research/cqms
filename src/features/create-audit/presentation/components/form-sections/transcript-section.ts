/**
 * Transcript Section Component
 */

import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';

export class TranscriptSection {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="accordion-section" data-section="transcript">
        <div class="accordion-header" data-toggle="transcript">
          <h3>
            <span>5</span>
            Transcript
          </h3>
          <svg class="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="accordion-content">
          <div>
            <label class="block text-sm font-medium text-white/80 mb-2">
              Interaction Transcript
              <span class="text-xs text-white/60 ml-2" id="transcriptCharCount">0 characters</span>
            </label>
            <textarea id="transcript" 
                      name="transcript" 
                      rows="10" 
                      required
                      placeholder="Paste the interaction transcript here..." 
                      class="form-input w-full font-mono text-sm"></textarea>
          </div>
        </div>
      </div>
    `);
  }

  private attachEventListeners(): void {
    const header = this.container.querySelector('.accordion-header');
    const textarea = this.container.querySelector('#transcript') as HTMLTextAreaElement;
    
    if (header) {
      header.addEventListener('click', () => this.toggle());
    }
    
    if (textarea) {
      textarea.addEventListener('input', () => {
        const count = textarea.value.length;
        const countEl = this.container.querySelector('#transcriptCharCount') as HTMLElement;
        if (countEl) {
          countEl.textContent = `${count.toLocaleString()} characters`;
        }
      });
    }
  }

  setTranscript(transcript: string): void {
    const textarea = this.container.querySelector('#transcript') as HTMLTextAreaElement;
    if (textarea) {
      textarea.value = transcript;
      textarea.dispatchEvent(new Event('input'));
    }
  }

  toggle(): void {
    const section = this.container.querySelector('.accordion-section') as HTMLElement;
    if (section) {
      section.classList.toggle('expanded');
    }
  }
}

