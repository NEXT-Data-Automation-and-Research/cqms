/**
 * Global Confirmation Dialog Component
 * A reusable confirmation dialog for all types of confirmations, alerts, and messages
 * Designed with Tailwind CSS to match modern modal patterns
 * Standalone JavaScript version for direct script loading
 */

(function() {
  'use strict';

  class ConfirmationDialog {
    constructor() {
      this.overlay = null;
      this.dialog = null;
      this.resolvePromise = null;
      this.currentPromise = null;
    }

    /**
     * Show confirmation dialog
     * @param {Object} options - Dialog options
     * @param {string} [options.title] - Dialog title (optional)
     * @param {string} options.message - Dialog message
     * @param {string} [options.confirmText='OK'] - Confirm button text
     * @param {string} [options.cancelText='Cancel'] - Cancel button text
     * @param {string} [options.type='confirm'] - Dialog type: 'error', 'warning', 'success', 'info', 'confirm'
     * @param {boolean} [options.showCancel] - Whether to show cancel button
     * @returns {Promise<boolean>} Promise that resolves to true if confirmed, false if cancelled
     */
    async show(options) {
      // If a dialog is already open, close it first
      if (this.currentPromise) {
        this.close();
      }

      // Create new promise
      this.currentPromise = new Promise((resolve) => {
        this.resolvePromise = resolve;
      });

      const {
        title = this.getDefaultTitle(type),
        message,
        confirmText = 'OK',
        cancelText = 'Cancel',
        type = 'confirm',
        showCancel = cancelText !== '' && cancelText !== null && cancelText !== undefined
      } = options;

      // Create overlay
      this.overlay = document.createElement('div');
      this.overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
      this.overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 99999 !important; display: flex !important; align-items: center !important; justify-content: center !important; overflow-y: auto !important;';
      this.overlay.setAttribute('role', 'dialog');
      this.overlay.setAttribute('aria-modal', 'true');
      this.overlay.setAttribute('aria-labelledby', 'confirmation-dialog-title');
      this.overlay.setAttribute('aria-describedby', 'confirmation-dialog-message');

      // Create dialog container
      const dialogContainer = document.createElement('div');
      dialogContainer.className = 'relative p-4 w-full max-w-md';
      dialogContainer.style.cssText = 'margin: 1rem !important;';

      // Get icon color based on type
      const iconColor = this.getIconColor(type);

      // Build dialog HTML matching the provided design
      dialogContainer.innerHTML = `
        <!-- Modal content -->
        <div class="confirmation-dialog" style="background: white; border-radius: 0.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); padding: 1.5rem; max-width: 50rem; width: 100%;">
          <!-- Header with icon and title -->
          <div class="confirmation-header" style="display: flex; flex-direction: column; align-items: center; margin-bottom: 0.5rem; gap: 0.75rem;">
            <div class="confirmation-logo" style="background-color: ${this.getIconBackgroundColor(type)}; width: 3rem; height: 3rem; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              ${this.getIconSVG(type, iconColor)}
            </div>
            ${title ? `
              <h3 class="confirmation-title" id="confirmation-dialog-title" style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #111827; text-align: center;">
                ${this.escapeHtml(title)}
              </h3>
            ` : ''}
          </div>
          
          <!-- Body with message -->
          <div class="confirmation-body" style="margin-bottom: 1rem; margin-top: 0.25rem;">
            <p class="confirmation-message" id="confirmation-dialog-message" style="margin: 0; font-size: 0.9375rem; line-height: 1.6; color: #6b7280; text-align: center;">
              ${this.formatMessage(message)}
            </p>
          </div>
          
          <!-- Action buttons -->
          <div class="confirmation-actions" style="display: flex; justify-content: center; align-items: center; gap: 0.75rem;">
            <button class="confirmation-btn confirmation-btn-confirm type-${type}" type="button" data-action="confirm" aria-label="Confirm action" autofocus style="padding: 0.625rem 1.5rem; font-size: 0.9375rem; font-weight: 500; border: none; border-radius: 0.375rem; cursor: pointer; background-color: ${this.getButtonColor(type)}; color: white; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;">
              ${this.escapeHtml(confirmText)}
            </button>
            ${showCancel ? `
              <button class="confirmation-btn confirmation-btn-cancel" type="button" data-action="cancel" aria-label="Cancel action" style="padding: 0.625rem 1.5rem; font-size: 0.9375rem; font-weight: 500; border: 1px solid #d1d5db; border-radius: 0.375rem; cursor: pointer; background: white; color: #374151; transition: all 0.2s; white-space: nowrap; flex-shrink: 0;">
                ${this.escapeHtml(cancelText)}
              </button>
            ` : ''}
          </div>
        </div>
      `;

      // Store reference to the inner dialog
      this.dialog = dialogContainer.querySelector('.confirmation-dialog');

      // Append dialog to overlay
      this.overlay.appendChild(dialogContainer);
      document.body.appendChild(this.overlay);

      // Attach event listeners
      this.attachEventListeners();

      // Set initial opacity for fade-in
      this.overlay.style.opacity = '0';
      this.overlay.style.transition = 'opacity 0.2s ease';
      
      // Fade in
      requestAnimationFrame(() => {
        if (this.overlay) {
          this.overlay.style.opacity = '1';
        }
      });

      // Focus management
      const confirmButton = dialogContainer.querySelector('[data-action="confirm"]');
      if (confirmButton) {
        setTimeout(() => confirmButton.focus(), 100);
      }

      // Handle Escape key
      const escapeHandler = (e) => {
        if (e.key === 'Escape' && this.overlay) {
          this.handleCancel();
        }
      };
      document.addEventListener('keydown', escapeHandler);
      this.overlay._escapeHandler = escapeHandler;

      // Return promise
      return this.currentPromise;
    }

    /**
     * Close the dialog
     */
    close() {
      if (this.overlay) {
        // Fade out
        this.overlay.style.opacity = '0';
        
        // Remove after animation
        setTimeout(() => {
          if (this.overlay && this.overlay.parentNode) {
            // Remove escape handler
            const escapeHandler = this.overlay._escapeHandler;
            if (escapeHandler) {
              document.removeEventListener('keydown', escapeHandler);
            }
            
            this.overlay.parentNode.removeChild(this.overlay);
            this.overlay = null;
            this.dialog = null;
          }
        }, 200);
      }

      // Resolve promise if pending
      if (this.resolvePromise) {
        this.resolvePromise(false);
        this.resolvePromise = null;
      }
      this.currentPromise = null;
    }

    /**
     * Get default title based on type
     */
    getDefaultTitle(type) {
      switch (type) {
        case 'error':
          return 'Error';
        case 'warning':
          return 'Warning';
        case 'success':
          return 'Success';
        case 'info':
          return 'Information';
        case 'confirm':
          return 'Confirm Action';
        default:
          return 'Confirmation';
      }
    }

    /**
     * Get button color based on type
     */
    getButtonColor(type) {
      switch (type) {
        case 'error':
        case 'confirm':
          return '#ef4444'; // red-500
        case 'warning':
          return '#f59e0b'; // yellow-500
        case 'success':
          return '#10b981'; // green-500
        case 'info':
          return '#3b82f6'; // blue-500
        default:
          return '#ef4444';
      }
    }

    /**
     * Get icon background color based on type
     */
    getIconBackgroundColor(type) {
      switch (type) {
        case 'error':
        case 'confirm':
          return 'rgba(239, 68, 68, 0.2)'; // light red
        case 'warning':
          return 'rgba(245, 158, 11, 0.2)'; // light yellow
        case 'success':
          return 'rgba(16, 185, 129, 0.2)'; // light green
        case 'info':
          return 'rgba(59, 130, 246, 0.2)'; // light blue
        default:
          return 'rgba(239, 68, 68, 0.2)';
      }
    }

    /**
     * Get icon color based on type
     */
    getIconColor(type) {
      switch (type) {
        case 'error':
        case 'confirm':
          return '#ef4444'; // red-500
        case 'warning':
          return '#f59e0b'; // yellow-500
        case 'success':
          return '#10b981'; // green-500
        case 'info':
          return '#3b82f6'; // blue-500
        default:
          return '#ef4444';
      }
    }

    /**
     * Get icon SVG based on type
     */
    getIconSVG(type, iconColor) {
      switch (type) {
        case 'error':
        case 'confirm':
          return `
            <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 0 24 24" width="1.5rem" fill="${iconColor}">
              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path>
            </svg>
          `;
        case 'warning':
          return `
            <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 0 24 24" width="1.5rem" fill="${iconColor}">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"></path>
            </svg>
          `;
        case 'success':
          return `
            <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 0 24 24" width="1.5rem" fill="${iconColor}">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"></path>
            </svg>
          `;
        case 'info':
          return `
            <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 0 24 24" width="1.5rem" fill="${iconColor}">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"></path>
            </svg>
          `;
        default:
          return `
            <svg xmlns="http://www.w3.org/2000/svg" height="1.5rem" viewBox="0 0 24 24" width="1.5rem" fill="${iconColor}">
              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path>
            </svg>
          `;
      }
    }

    /**
     * Attach event listeners to dialog buttons
     */
    attachEventListeners() {
      if (!this.overlay) return;

      // Use event delegation
      this.overlay.addEventListener('click', (e) => {
        const target = e.target;
        const actionButton = target.closest('[data-action]');
        const action = actionButton ? actionButton.getAttribute('data-action') : null;
        
        if (action === 'confirm') {
          this.handleConfirm();
        } else if (action === 'cancel') {
          this.handleCancel();
        } else if (target === this.overlay) {
          // Click on backdrop - close dialog
          this.handleCancel();
        }
      });
    }

    /**
     * Handle confirm action
     */
    handleConfirm() {
      if (this.resolvePromise) {
        this.resolvePromise(true);
        this.resolvePromise = null;
      }
      this.close();
    }

    /**
     * Handle cancel action
     */
    handleCancel() {
      if (this.resolvePromise) {
        this.resolvePromise(false);
        this.resolvePromise = null;
      }
      this.close();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * Format message (preserve line breaks)
     */
    formatMessage(message) {
      // Escape HTML first
      const escaped = this.escapeHtml(message);
      // Convert newlines to <br>
      return escaped.replace(/\n/g, '<br>');
    }
  }

  // Create singleton instance
  const confirmationDialog = new ConfirmationDialog();

  // Expose globally
  if (typeof window !== 'undefined') {
    window.confirmationDialog = confirmationDialog;
  }
})();
