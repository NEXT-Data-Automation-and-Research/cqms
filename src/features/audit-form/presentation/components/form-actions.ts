/**
 * Form Actions Component
 * Handles validation dropdown and action buttons (Cancel/Submit)
 */

export interface FormActionsConfig {
  onCancel?: () => void;
  onSubmit?: () => void;
  onValidationStatusChange?: (status: string) => void;
}

export class FormActions {
  private container: HTMLElement | null = null;
  private config: FormActionsConfig;

  constructor(config: FormActionsConfig = {}) {
    this.config = config;
  }

  /**
   * Render the form actions component
   */
  render(container: HTMLElement): void {
    this.container = container;
    container.innerHTML = this.getHTML();
    this.attachEventListeners();
  }

  /**
   * Initialize with existing DOM (doesn't replace HTML, just attaches listeners)
   */
  initializeWithExistingDOM(): void {
    this.attachEventListeners();
  }

  /**
   * Get HTML template
   */
  private getHTML(): string {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.4852rem; padding: 0.6469rem 0.9704rem; border-top: 0.0405rem solid #e5e7eb; background-color: #f9fafb; margin-top: auto;">
        <div style="display: flex; align-items: center; gap: 0.4852rem;">
          <div>
            <p style="font-size: 0.4447rem; color: #000000; margin: 0 0 0.1617rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0151rem; font-weight: 600;">Validation</p>
            <select id="validationStatus" name="validationStatus" required style="padding: 0.2425rem 0.3234rem; border: 0.0304rem solid #d1d5db; border-radius: 0.1617rem; background-color: #ffffff; color: #374151; font-size: 0.4852rem; font-family: 'Poppins', sans-serif; font-weight: 500; cursor: pointer; appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23374151\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 0.3234rem center; background-size: 0.5659rem; padding-right: 1.2937rem; min-width: 8rem;">
              <option value="Validated" selected>Validated</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div style="display: flex; gap: 0.4852rem;">
          <button type="button" id="cancelBtn" style="padding: 0.4852rem 1.2937rem; background-color: white; color: #374151; border: 0.0405rem solid #d1d5db; border-radius: 0.2425rem; font-size: 0.5659rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease;">Cancel</button>
          <button type="submit" id="submitAuditBtn" style="padding: 0.4852rem 1.2937rem; background: linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%); color: white; border: none; border-radius: 0.2425rem; font-size: 0.5659rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 0.0606rem 0.1213rem rgba(26, 115, 62, 0.2); position: relative;">✓ Submit Audit</button>
        </div>
      </div>
    `;
  }

  /**
   * Attach event listeners (can be called separately for existing DOM)
   */
  attachEventListeners(): void {
    const cancelBtn = document.getElementById('cancelBtn') as HTMLButtonElement;
    const submitBtn = document.getElementById('submitAuditBtn') as HTMLButtonElement;
    const validationStatus = document.getElementById('validationStatus') as HTMLSelectElement;

    if (cancelBtn && this.config.onCancel) {
      cancelBtn.addEventListener('click', () => {
        this.config.onCancel?.();
      });
    }

    if (submitBtn && this.config.onSubmit) {
      submitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.config.onSubmit?.();
      });
    }

    if (validationStatus && this.config.onValidationStatusChange) {
      validationStatus.addEventListener('change', (e) => {
        this.config.onValidationStatusChange?.((e.target as HTMLSelectElement).value);
      });
    }
  }

  /**
   * Get validation status select element
   */
  getValidationStatusSelect(): HTMLSelectElement | null {
    return document.getElementById('validationStatus') as HTMLSelectElement;
  }

  /**
   * Get cancel button
   */
  getCancelButton(): HTMLButtonElement | null {
    return document.getElementById('cancelBtn') as HTMLButtonElement;
  }

  /**
   * Get submit button
   */
  getSubmitButton(): HTMLButtonElement | null {
    return document.getElementById('submitAuditBtn') as HTMLButtonElement;
  }

  /**
   * Set submit button loading state
   */
  setSubmitLoading(loading: boolean): void {
    const submitBtn = this.getSubmitButton();
    if (submitBtn) {
      if (loading) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
      } else {
        submitBtn.disabled = false;
        submitBtn.textContent = '✓ Submit Audit';
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
      }
    }
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
