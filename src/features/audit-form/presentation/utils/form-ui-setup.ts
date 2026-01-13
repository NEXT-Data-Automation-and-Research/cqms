/**
 * Form UI Setup
 * Handles UI initialization (tooltips, date selectors, Quill editors)
 * Migrated from audit-form.html
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';
import { getQuillManager } from './quill-manager.js';

export class FormUISetup {
  /**
   * Setup all UI components
   */
  setupUI(): void {
    this.initializeRecommendationsEditor();
    this.setupDateSelectors();
    this.setupTooltips();
  }

  /**
   * Initialize Quill editor for recommendations
   */
  initializeRecommendationsEditor(): void {
    const recommendationsContainer = document.getElementById('quill_recommendations');
    if (!recommendationsContainer) {
      logWarn('Recommendations Quill container not found');
      return;
    }

    const quillManager = getQuillManager();
    quillManager.initializeEditor(
      'quill_recommendations',
      'recommendations',
      'Enter recommendations and next steps for the employee...'
    );
  }

  /**
   * Setup date selectors
   */
  setupDateSelectors(): void {
    const pullConversationsDateInput = document.getElementById('pullConversationsDate');
    if (pullConversationsDateInput) {
      pullConversationsDateInput.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        const pullConversationsAdminId = (window as any).pullConversationsAdminId;
        if (pullConversationsAdminId && target.value) {
          if (typeof (window as any).fetchConversationsForCurrentUser === 'function') {
            await (window as any).fetchConversationsForCurrentUser(target.value);
          }
        }
      });
    }
  }

  /**
   * Setup tooltips
   */
  setupTooltips(): void {
    // Setup column tooltips
    const tooltipContainers = document.querySelectorAll('.column-tooltip-container');
    tooltipContainers.forEach(container => {
      const infoIcon = container.querySelector('.info-icon');
      const tooltip = container.querySelector('.column-tooltip');
      
      if (infoIcon && tooltip) {
        infoIcon.addEventListener('mouseenter', () => {
          (tooltip as HTMLElement).style.display = 'block';
        });
        infoIcon.addEventListener('mouseleave', () => {
          (tooltip as HTMLElement).style.display = 'none';
        });
      }
    });
  }

  /**
   * Initialize header metadata
   */
  initializeHeaderMetadata(): void {
    if (typeof (window as any).updateHeaderMetadata === 'function') {
      (window as any).updateHeaderMetadata();
      
      // Also call after a delay to ensure all fields are initialized
      setTimeout(() => {
        if (typeof (window as any).updateHeaderMetadata === 'function') {
          (window as any).updateHeaderMetadata();
        }
      }, 500);
    }
  }
}

