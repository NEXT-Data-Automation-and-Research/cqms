/**
 * Form Header Component
 * Handles the header section with employee info, metadata cards, and close button
 * Uses the existing header-template.ts for HTML generation
 */

import { generateAuditHeader } from '../templates/header-template.js';
import type { HeaderOptions } from '../../domain/types.js';

export interface FormHeaderConfig {
  onClose?: () => void;
  headerOptions?: HeaderOptions;
}

export class FormHeaderComponent {
  private container: HTMLElement | null = null;
  private config: FormHeaderConfig;

  constructor(config: FormHeaderConfig = {}) {
    this.config = config;
  }

  /**
   * Render the form header component
   */
  render(container: HTMLElement): void {
    this.container = container;
    
    const headerOptions: HeaderOptions = {
      title: 'Create New Audit',
      mode: 'edit',
      headerActions: this.getCloseButtonHTML(),
      ...this.config.headerOptions
    };

    container.innerHTML = generateAuditHeader(headerOptions);
    this.attachEventListeners();
  }

  /**
   * Get close button HTML
   */
  private getCloseButtonHTML(): string {
    return `
      <button type="button" id="formHeaderCloseBtn" style="background: rgba(255,255,255,0.2); border: 0.0606rem solid white; border-radius: 0.2425rem; width: 1.2937rem; height: 1.2937rem; font-size: 0.8086rem; cursor: pointer; color: white; font-weight: bold; transition: all 0.2s; display: flex; align-items: center; justify-content: center; flex-shrink: 0;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'" title="Close (Esc)">×</button>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    const closeBtn = document.getElementById('formHeaderCloseBtn');
    if (closeBtn && this.config.onClose) {
      closeBtn.addEventListener('click', () => {
        this.config.onClose?.();
      });
    }

    // ESC key handler
    if (this.config.onClose) {
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.config.onClose?.();
        }
      };
      document.addEventListener('keydown', escHandler);
      
      // Store handler for cleanup
      (this as any)._escHandler = escHandler;
    }
  }

  /**
   * Update header metadata
   */
  updateMetadata(metadata: Partial<HeaderOptions['audit']>): void {
    if (!this.container) return;

    const headerOptions: HeaderOptions = {
      title: 'Create New Audit',
      mode: 'edit',
      headerActions: this.getCloseButtonHTML(),
      audit: {
        ...this.config.headerOptions?.audit,
        ...metadata
      },
      ...this.config.headerOptions
    };

    this.container.innerHTML = generateAuditHeader(headerOptions);
    this.attachEventListeners();
  }

  /**
   * Update header title
   */
  updateTitle(title: string): void {
    if (!this.container) return;

    // Find the title element within the header
    const titleElement = this.container.querySelector('h2');
    if (titleElement) {
      titleElement.textContent = title;
    }
  }

  /**
   * Update header background gradient
   */
  updateGradient(gradient: string): void {
    if (!this.container) return;
    this.container.style.background = gradient;
  }

  /**
   * Get employee name select element
   */
  getEmployeeNameSelect(): HTMLSelectElement | null {
    return document.getElementById('employeeName') as HTMLSelectElement;
  }

  /**
   * Get employee email input
   */
  getEmployeeEmailInput(): HTMLInputElement | null {
    return document.getElementById('employeeEmail') as HTMLInputElement;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    // Remove ESC handler if it exists
    if ((this as any)._escHandler) {
      document.removeEventListener('keydown', (this as any)._escHandler);
    }

    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
