/**
 * Interaction Details Section Component
 */

import type { Interaction } from '../../../domain/entities.js';
import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';

export class InteractionDetailsSection {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="accordion-section" data-section="interaction-details">
        <div class="accordion-header" data-toggle="interaction-details">
          <h3>
            <span>2</span>
            Interaction Details
          </h3>
          <svg class="accordion-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="accordion-content">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Interaction ID</label>
              <input type="text" id="interactionId" name="interactionId" required 
                     placeholder="Enter interaction ID..." class="form-input w-full" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-white/80 mb-2">Date</label>
                <input type="date" id="interactionDate" name="interactionDate" required class="form-input w-full" />
              </div>
              <div>
                <label class="block text-sm font-medium text-white/80 mb-2">Channel</label>
                <select id="interactionChannel" name="interactionChannel" required class="form-input w-full">
                  <option value="">Select channel...</option>
                  <option value="chat">Chat</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium text-white/80 mb-2">Client Email</label>
              <input type="email" id="clientEmail" name="clientEmail" class="form-input w-full" />
            </div>
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

  setInteraction(interaction: Interaction): void {
    (this.container.querySelector('#interactionId') as HTMLInputElement).value = interaction.id;
    (this.container.querySelector('#interactionDate') as HTMLInputElement).value = interaction.date;
    (this.container.querySelector('#interactionChannel') as HTMLSelectElement).value = interaction.channel;
    (this.container.querySelector('#clientEmail') as HTMLInputElement).value = interaction.clientEmail;
  }

  toggle(): void {
    const section = this.container.querySelector('.accordion-section') as HTMLElement;
    if (section) {
      section.classList.toggle('expanded');
    }
  }
}

