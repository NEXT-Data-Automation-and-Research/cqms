/**
 * Event Handlers for Scorecard Actions
 * CSP-safe event delegation for action buttons
 */

import type { ScorecardController } from './scorecard-controller.js';

export class ScorecardEventHandlers {
  private isAttached = false;
  private clickHandler: ((e: Event) => void) | null = null;

  constructor(private controller: ScorecardController) {}

  /**
   * Attach event listeners for action buttons (CSP-safe)
   * Only attaches once to avoid duplicate listeners
   */
  attachActionListeners(): void {
    const tbody = document.getElementById('scorecardsTableBody');
    if (!tbody) return;

    // Only attach listener once
    if (this.isAttached) return;

    // Create named handler function so we can remove it if needed
    this.clickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest('button[data-action]') as HTMLButtonElement;
      if (!button) return;

      const action = button.getAttribute('data-action');
      const scorecardId = button.getAttribute('data-scorecard-id');

      if (!action || !scorecardId) return;

      switch (action) {
        case 'view':
          this.controller.viewScorecard(scorecardId);
          break;
        case 'edit':
          this.controller.editScorecard(scorecardId);
          break;
        case 'toggle-status': {
          const newStatusAttr = button.getAttribute('data-new-status');
          // getAttribute always returns a string, so compare to 'true'
          const newStatus = newStatusAttr === 'true';
          this.controller.toggleStatus(scorecardId, newStatus);
          break;
        }
        case 'delete': {
          const tableName = button.getAttribute('data-table-name') || '';
          this.controller.deleteScorecard(scorecardId, tableName);
          break;
        }
        case 'cannot-delete': {
          const name = button.getAttribute('data-scorecard-name') || '';
          const auditCount = parseInt(button.getAttribute('data-audit-count') || '0', 10);
          this.controller.showCannotDeleteMessage(name, auditCount);
          break;
        }
      }
    };

    tbody.addEventListener('click', this.clickHandler);
    this.isAttached = true;
  }

  /**
   * Detach event listeners (for cleanup if needed)
   */
  detachActionListeners(): void {
    const tbody = document.getElementById('scorecardsTableBody');
    if (tbody && this.clickHandler) {
      tbody.removeEventListener('click', this.clickHandler);
      this.isAttached = false;
      this.clickHandler = null;
    }
  }
}

