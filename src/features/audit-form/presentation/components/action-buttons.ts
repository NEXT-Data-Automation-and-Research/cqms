/**
 * Action Buttons Component
 * Handles mode-specific action buttons for the audit form
 * - Create mode: Cancel, Submit
 * - Edit mode: Cancel, Update
 * - View mode: Edit, Acknowledge, Request Reversal
 */

import type { AuditFormMode } from '../../domain/types.js';
import { isEditableMode } from '../../domain/types.js';
import type { AuditPermissions } from '../../domain/services/permission-service.js';

export interface ActionButtonsConfig {
  /** Current mode */
  mode?: AuditFormMode;
  /** User permissions for the audit */
  permissions?: AuditPermissions;
  /** Called when cancel is clicked */
  onCancel?: () => void;
  /** Called when submit is clicked */
  onSubmit?: () => void | Promise<void>;
  /** Called when edit is clicked (view mode) */
  onEdit?: () => void;
  /** Called when acknowledge is clicked (view mode) */
  onAcknowledge?: () => void | Promise<void>;
  /** Called when request reversal is clicked (view mode) */
  onRequestReversal?: () => void;
}

export class ActionButtons {
  private container: HTMLElement | null = null;
  private config: ActionButtonsConfig;
  private isSubmitting: boolean = false;

  constructor(config: ActionButtonsConfig = {}) {
    this.config = config;
  }

  /**
   * Render the action buttons
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  /**
   * Initialize with existing DOM
   */
  initializeWithExistingDOM(): void {
    this.container = document.getElementById('actionButtonsContainer');
    if (this.container) {
      this.attachEventListeners();
      this.updateVisibility();
    }
  }

  /**
   * Get HTML template based on mode
   */
  private getHTML(): string {
    const mode = this.config.mode || 'create';
    const permissions = this.config.permissions;
    
    if (isEditableMode(mode)) {
      return this.getEditableButtonsHTML(mode);
    } else {
      return this.getViewButtonsHTML(permissions);
    }
  }

  /**
   * Get editable mode buttons (create/edit)
   */
  private getEditableButtonsHTML(mode: AuditFormMode): string {
    const submitText = mode === 'create' ? 'Submit Audit' : 'Update Audit';
    
    return `
      <div id="actionButtonsContainer" style="display: flex; justify-content: flex-end; gap: 0.6469rem; padding: 0.6469rem 0.9704rem; background: #f9fafb; border-top: 0.0304rem solid #e5e7eb;">
        <button 
          type="button" 
          id="cancelBtn"
          style="padding: 0.4852rem 0.9704rem; background: #f3f4f6; color: #374151; border: 0.0304rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s;"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          id="submitAuditBtn"
          style="padding: 0.4852rem 0.9704rem; background: linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%); color: white; border: none; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.3234rem;"
        >
          <svg style="width: 0.5659rem; height: 0.5659rem; display: none;" id="submitSpinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4" stroke-dashoffset="10" style="animation: spin 1s linear infinite;" />
          </svg>
          <span id="submitBtnText">${submitText}</span>
        </button>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
  }

  /**
   * Get view mode buttons
   */
  private getViewButtonsHTML(permissions?: AuditPermissions): string {
    const canEdit = permissions?.canEdit ?? false;
    const canAcknowledge = permissions?.canAcknowledge ?? false;
    const canRequestReversal = permissions?.canRequestReversal ?? false;

    // Don't render if no actions available
    if (!canEdit && !canAcknowledge && !canRequestReversal) {
      return '<div id="actionButtonsContainer" style="display: none;"></div>';
    }

    return `
      <div id="actionButtonsContainer" style="display: flex; justify-content: flex-end; gap: 0.6469rem; padding: 0.6469rem 0.9704rem; background: #f9fafb; border-top: 0.0304rem solid #e5e7eb;">
        ${canRequestReversal ? `
          <button 
            type="button" 
            id="requestReversalBtn"
            style="padding: 0.4852rem 0.9704rem; background: #f59e0b; color: white; border: none; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.3234rem;"
          >
            <svg style="width: 0.5659rem; height: 0.5659rem;" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/>
            </svg>
            Request Reversal
          </button>
        ` : ''}
        
        ${canAcknowledge ? `
          <button 
            type="button" 
            id="acknowledgeBtn"
            style="padding: 0.4852rem 0.9704rem; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.3234rem;"
          >
            <svg style="width: 0.5659rem; height: 0.5659rem;" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
            Acknowledge
          </button>
        ` : ''}
        
        ${canEdit ? `
          <button 
            type="button" 
            id="editAuditBtn"
            style="padding: 0.4852rem 0.9704rem; background: #f59e0b; color: white; border: none; border-radius: 0.2425rem; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 0.3234rem;"
          >
            <svg style="width: 0.5659rem; height: 0.5659rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Audit
          </button>
        ` : ''}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn && this.config.onCancel) {
      cancelBtn.addEventListener('click', () => this.config.onCancel?.());
    }

    // Submit button
    const submitBtn = document.getElementById('submitAuditBtn');
    if (submitBtn && this.config.onSubmit) {
      submitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!this.isSubmitting) {
          await this.handleSubmit();
        }
      });
    }

    // Edit button
    const editBtn = document.getElementById('editAuditBtn');
    if (editBtn && this.config.onEdit) {
      editBtn.addEventListener('click', () => this.config.onEdit?.());
    }

    // Acknowledge button
    const ackBtn = document.getElementById('acknowledgeBtn');
    if (ackBtn && this.config.onAcknowledge) {
      ackBtn.addEventListener('click', async () => {
        await this.config.onAcknowledge?.();
      });
    }

    // Request reversal button
    const reversalBtn = document.getElementById('requestReversalBtn');
    if (reversalBtn && this.config.onRequestReversal) {
      reversalBtn.addEventListener('click', () => this.config.onRequestReversal?.());
    }
  }

  /**
   * Handle submit with loading state
   */
  private async handleSubmit(): Promise<void> {
    this.setSubmitLoading(true);
    try {
      await this.config.onSubmit?.();
    } finally {
      this.setSubmitLoading(false);
    }
  }

  /**
   * Set submit button loading state
   */
  setSubmitLoading(loading: boolean): void {
    this.isSubmitting = loading;
    
    const submitBtn = document.getElementById('submitAuditBtn') as HTMLButtonElement;
    const spinner = document.getElementById('submitSpinner');
    const btnText = document.getElementById('submitBtnText');

    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.style.opacity = loading ? '0.7' : '1';
    }

    if (spinner) {
      spinner.style.display = loading ? 'block' : 'none';
    }

    if (btnText && loading) {
      btnText.textContent = 'Submitting...';
    }
  }

  /**
   * Update button visibility based on current mode and permissions
   */
  updateVisibility(): void {
    const mode = this.config.mode || 'create';
    const permissions = this.config.permissions;

    const cancelBtn = document.getElementById('cancelBtn');
    const submitBtn = document.getElementById('submitAuditBtn');
    const editBtn = document.getElementById('editAuditBtn');
    const ackBtn = document.getElementById('acknowledgeBtn');
    const reversalBtn = document.getElementById('requestReversalBtn');

    const isEditable = isEditableMode(mode);

    if (cancelBtn) cancelBtn.style.display = isEditable ? '' : 'none';
    if (submitBtn) submitBtn.style.display = isEditable ? '' : 'none';
    if (editBtn) editBtn.style.display = !isEditable && permissions?.canEdit ? '' : 'none';
    if (ackBtn) ackBtn.style.display = !isEditable && permissions?.canAcknowledge ? '' : 'none';
    if (reversalBtn) reversalBtn.style.display = !isEditable && permissions?.canRequestReversal ? '' : 'none';
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ActionButtonsConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.container) {
      this.container.innerHTML = this.getHTML();
      this.attachEventListeners();
    }
  }

  /**
   * Set mode
   */
  setMode(mode: AuditFormMode): void {
    this.config.mode = mode;
    this.updateVisibility();
  }

  /**
   * Set permissions
   */
  setPermissions(permissions: AuditPermissions): void {
    this.config.permissions = permissions;
    this.updateVisibility();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
