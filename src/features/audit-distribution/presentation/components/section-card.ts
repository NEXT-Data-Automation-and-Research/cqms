/**
 * Section Card Component
 * Reusable collapsible section card with header
 */

import { safeSetHTML, escapeHtml, sanitizeHTML } from '../../../../utils/html-sanitizer.js';

export interface SectionCardConfig {
  number?: string;
  title: string;
  subtitle?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export class SectionCard {
  private container: HTMLElement;
  private config: SectionCardConfig;
  private contentElement: HTMLElement | null = null;
  private isExpanded: boolean;

  constructor(container: HTMLElement, config: SectionCardConfig) {
    this.container = container;
    this.config = {
      collapsible: false,
      defaultExpanded: true,
      ...config
    };
    this.isExpanded = this.config.defaultExpanded ?? true;
    this.render();
  }

  private render(): void {
    const { number, title, subtitle, collapsible } = this.config;
    const iconRotation = this.isExpanded ? 'rotate-180' : '';

    safeSetHTML(this.container, `
      <div class="glass-card rounded-xl p-4">
        <div
          class="glass-header section-header flex items-center gap-2.5 mb-3 pb-3 border-b border-white/10 ${collapsible ? 'cursor-pointer transition-all rounded-t-xl -mx-4 -mt-4 px-4 pt-4' : ''}"
          ${collapsible ? 'onclick="this.dispatchEvent(new CustomEvent(\'toggle\'))"' : ''}
        >
          ${number ? `<div class="section-number w-6 h-6 bg-gradient-to-br from-primary to-primary-dark text-white rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-md">${number}</div>` : ''}
          <div class="flex-1 min-w-0">
            <h2 class="section-title text-base font-bold text-white m-0 tracking-tight leading-tight">${escapeHtml(title)}</h2>
            ${subtitle ? `<p class="section-subtitle text-xs text-white/75 mt-0.5 mb-0 leading-snug line-clamp-1" title="${escapeHtml(subtitle)}">${escapeHtml(subtitle)}</p>` : ''}
          </div>
          ${collapsible ? `
            <svg class="w-5 h-5 text-white/60 transition-all duration-300 ${iconRotation} flex-shrink-0 hover:text-white" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          ` : ''}
        </div>
        <div class="section-content" style="display: ${this.isExpanded ? 'block' : 'none'}">
          <!-- Content will be inserted here -->
        </div>
      </div>
    `);

    this.contentElement = this.container.querySelector('.section-content');
    
    if (collapsible) {
      const header = this.container.querySelector('.section-header');
      if (header) {
        header.addEventListener('toggle', () => {
          this.toggle();
        });
      }
    }
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
    const content = this.container.querySelector('.section-content') as HTMLElement;
    const icon = this.container.querySelector('svg');
    
    if (content) {
      content.style.display = this.isExpanded ? 'block' : 'none';
    }
    
    if (icon) {
      icon.classList.toggle('rotate-180', this.isExpanded);
    }

    if (this.config.onToggle) {
      this.config.onToggle(this.isExpanded);
    }
  }

  setExpanded(expanded: boolean): void {
    if (this.isExpanded !== expanded) {
      this.toggle();
    }
  }

  setContent(html: string): void {
    if (this.contentElement) {
      safeSetHTML(this.contentElement, sanitizeHTML(html));
    }
  }

  appendContent(element: HTMLElement): void {
    if (this.contentElement) {
      this.contentElement.appendChild(element);
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

