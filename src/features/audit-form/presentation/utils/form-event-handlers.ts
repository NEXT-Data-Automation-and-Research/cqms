/**
 * Form Event Handlers
 * Handles form event listeners (cancel, date changes, etc.)
 * Migrated from audit-form.html
 */

import { logInfo, logError } from '../../../../utils/logging-helper.js';

export class FormEventHandlers {
  /**
   * Setup form event listeners
   */
  setupEventListeners(): void {
    this.setupCancelHandler();
    this.setupInteractionDateHandler();
  }

  /**
   * Setup cancel button handler
   */
  private setupCancelHandler(): void {
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', async () => {
        await this.handleCancel();
      });
    }
  }

  /**
   * Setup interaction date change handler
   */
  private setupInteractionDateHandler(): void {
    const interactionDateField = document.getElementById('interactionDate');
    if (interactionDateField) {
      interactionDateField.addEventListener('change', () => {
        if (typeof (window as any).updateHeaderMetadata === 'function') {
          (window as any).updateHeaderMetadata();
        }
      });
    }
  }

  /**
   * Handle cancel button click
   */
  private async handleCancel(): Promise<void> {
    const confirmed = await this.showCancelConfirmation();
    
    if (!confirmed) return;

    const auditForm = document.getElementById('auditForm') as HTMLFormElement;
    if (auditForm) {
      auditForm.reset();
    }

    // Reset header to green (passing state)
    const headerElement = document.getElementById('auditFormHeader');
    if (headerElement) {
      headerElement.style.background = 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)';
    }

    // Hide timer
    const auditTimer = document.getElementById('auditTimer');
    if (auditTimer) {
      auditTimer.style.display = 'none';
    }

    // Reset timer if available
    if (typeof (window as any).resetTimer === 'function') {
      (window as any).resetTimer();
    }

    // Hide form modal
    const auditFormModal = document.getElementById('auditFormModal');
    if (auditFormModal) {
      auditFormModal.style.display = 'none';
    }

    // Reload pending audits if function exists
    if (typeof (window as any).loadPendingAudits === 'function') {
      await (window as any).loadPendingAudits();
    }

    // Update stats if function exists
    if (typeof (window as any).updateYourStats === 'function') {
      await (window as any).updateYourStats();
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Show cancel confirmation dialog
   */
  private async showCancelConfirmation(): Promise<boolean> {
    if ((window as any).confirmationDialog && typeof (window as any).confirmationDialog.show === 'function') {
      return await (window as any).confirmationDialog.show({
        title: 'Cancel Audit',
        message: 'Are you sure you want to cancel? All data will be lost.',
        confirmText: 'Cancel Audit',
        cancelText: 'Keep Editing',
        type: 'warning'
      });
    }
    return confirm('Are you sure you want to cancel? All data will be lost.');
  }
}

