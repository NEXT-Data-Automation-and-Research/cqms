/**
 * Audit Detail Modal
 * Modal for displaying detailed audit information
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logError, logInfo } from '../../../../utils/logging-helper.js';
import type { AuditReportsController } from '../audit-reports-controller.js';
import type { AuditReport } from '../../domain/entities.js';
import { renderAuditDetailModalHTML } from './utils/audit-detail-modal-renderer.js';
import { setupModalResizer } from './utils/modal-resizer.js';

export class AuditDetailModal {
  private modal: HTMLElement | null = null;
  private controller: AuditReportsController | null = null;
  private currentAudit: AuditReport | null = null;

  constructor(controller: AuditReportsController) {
    this.controller = controller;
  }

  /**
   * Open the audit detail modal
   */
  async open(audit: AuditReport): Promise<void> {
    try {
      logInfo('Opening audit detail modal:', audit.id);

      // Create modal element if it doesn't exist
      if (!this.modal) {
        this.modal = document.createElement('div');
        this.modal.className = 'modal';
        this.modal.id = 'auditDetailModal';
        document.body.appendChild(this.modal);
      }

      // Load scorecard parameters if needed
      let scorecardParameters: any[] = [];
      const scorecardId = audit._scorecard_id;
      
      if (scorecardId && this.controller) {
        try {
          const repository = this.controller.getRepository();
          if (repository) {
            scorecardParameters = await repository.loadScorecardParameters(scorecardId);
          }
        } catch (error) {
          logError('Error loading scorecard parameters:', error);
        }
      }

      // Store current audit reference
      this.currentAudit = audit;

      // Render modal HTML
      const html = renderAuditDetailModalHTML(audit, scorecardParameters);
      safeSetHTML(this.modal, html);

      // Show modal
      this.modal.classList.add('active');
      document.body.style.overflow = 'hidden';

      // Attach event listeners
      this.attachEventListeners();

      // Setup resizable splitter
      setupModalResizer();
    } catch (error) {
      logError('Error opening audit detail modal:', error);
      throw error;
    }
  }

  /**
   * Close the modal
   */
  close(): void {
    if (this.modal) {
      this.modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('#auditDetailModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Close on backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // View Full Audit button
    const viewFullBtn = this.modal.querySelector('#auditDetailModalViewFull');
    if (viewFullBtn) {
      viewFullBtn.addEventListener('click', () => {
        // Use stored audit reference
        const audit = this.currentAudit;
        
        if (audit && audit._scorecard_id && audit._scorecard_table) {
          // Navigate to unified audit-view page in view mode
          window.location.href = `audit-view.html?id=${audit.id}&scorecard=${audit._scorecard_id}&table=${audit._scorecard_table}&mode=view`;
          this.close();
        } else {
          logError('Cannot navigate: Missing audit information', { 
            audit, 
            hasScorecardId: !!audit?._scorecard_id,
            hasScorecardTable: !!audit?._scorecard_table 
          });
          alert('Cannot view full audit: Missing required information.');
        }
      });
    }

    // Close button at bottom
    const bottomCloseBtn = this.modal.querySelector('#auditDetailModalBottomClose');
    if (bottomCloseBtn) {
      bottomCloseBtn.addEventListener('click', () => this.close());
    }

    // Copy interaction ID button
    const copyInteractionBtn = this.modal.querySelector('#copyInteractionId');
    if (copyInteractionBtn) {
      copyInteractionBtn.addEventListener('click', () => {
        const interactionId = this.modal?.querySelector('#interactionIdValue')?.textContent || '';
        navigator.clipboard.writeText(interactionId).then(() => {
          const btn = copyInteractionBtn as HTMLElement;
          // Store original SVG element for restoration
          const originalSvg = btn.querySelector('svg')?.outerHTML || '';
          const checkmarkSvg = '<svg style="width: 0.6562rem; height: 0.6562rem;" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          safeSetHTML(btn, checkmarkSvg);
          setTimeout(() => {
            if (originalSvg) {
              safeSetHTML(btn, originalSvg);
            }
          }, 1000);
        });
      });
    }

    // Copy client email button
    const copyEmailBtn = this.modal.querySelector('#copyClientEmail');
    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', () => {
        const email = this.modal?.querySelector('#clientEmailValue')?.textContent || '';
        navigator.clipboard.writeText(email).then(() => {
          const btn = copyEmailBtn as HTMLElement;
          // Store original SVG element for restoration
          const originalSvg = btn.querySelector('svg')?.outerHTML || '';
          const checkmarkSvg = '<svg style="width: 0.6562rem; height: 0.6562rem;" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
          safeSetHTML(btn, checkmarkSvg);
          setTimeout(() => {
            if (originalSvg) {
              safeSetHTML(btn, originalSvg);
            }
          }, 1000);
        });
      });
    }
  }
}

