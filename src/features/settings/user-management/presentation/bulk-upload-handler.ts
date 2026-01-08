/**
 * Bulk Upload Handler
 * Handles CSV bulk upload operations
 */

import { CSVHandler } from './csv-handler.js';
import { UserManagementService } from '../application/user-management-service.js';
import { logError } from '../../../../utils/logging-helper.js';
import { escapeHtml } from '../../../../utils/html-sanitizer.js';
import { getUserFriendlyErrorMessage } from '../../../../utils/error-sanitizer.js';

export class BulkUploadHandler {
  constructor(
    private csvHandler: CSVHandler,
    private service: UserManagementService,
    private loadInitialData: () => Promise<void>
  ) {}

  /**
   * Open bulk upload modal
   */
  openBulkUploadModal(): void {
    const modal = document.getElementById('bulkUploadModal');
    if (modal) {
      modal.style.display = 'flex';
      (document.getElementById('csvFileInput') as HTMLInputElement).value = '';
      (document.getElementById('uploadProgress') as HTMLElement).style.display = 'none';
      (document.getElementById('uploadResults') as HTMLElement).style.display = 'none';
      
      // Attach event listeners programmatically (CSP-safe, no inline handlers)
      const closeButton = modal.querySelector('#bulkUploadModalClose') as HTMLButtonElement;
      const cancelButton = modal.querySelector('#bulkUploadCancelBtn') as HTMLButtonElement;
      
      if (closeButton) {
        // Remove any existing listeners by cloning the button
        const newCloseButton = closeButton.cloneNode(true) as HTMLButtonElement;
        closeButton.parentNode?.replaceChild(newCloseButton, closeButton);
        newCloseButton.addEventListener('click', () => {
          this.closeBulkUploadModal();
        });
      }
      
      if (cancelButton) {
        // Remove any existing listeners by cloning the button
        const newCancelButton = cancelButton.cloneNode(true) as HTMLButtonElement;
        cancelButton.parentNode?.replaceChild(newCancelButton, cancelButton);
        newCancelButton.addEventListener('click', () => {
          this.closeBulkUploadModal();
        });
      }
    }
  }

  /**
   * Process bulk upload
   */
  async processBulkUpload(): Promise<void> {
    const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
    const file = fileInput?.files?.[0];

    if (!file) {
      alert('Please select a CSV file');
      return;
    }

    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadResults = document.getElementById('uploadResults');

    if (progressDiv) progressDiv.style.display = 'block';
    if (uploadResults) uploadResults.style.display = 'none';
    if (progressBar) progressBar.style.width = '0%';
    if (uploadStatus) uploadStatus.textContent = 'Reading file...';

    try {
      const rows = await this.csvHandler.parseCSV(file);
      if (progressBar) progressBar.style.width = '40%';
      if (uploadStatus) uploadStatus.textContent = `Processing ${rows.length} users...`;

      const result = await this.service.processBulkUpload(rows);

      if (progressBar) progressBar.style.width = '100%';
      if (uploadStatus) uploadStatus.textContent = 'Upload complete!';

      // Refresh data
      await this.loadInitialData();

      // Show results
      if (uploadResults) {
        let resultsHTML = `
          <div style="padding: 0.75rem; border-radius: 0.1875rem; background-color: #d1fae5; color: #065f46; margin-bottom: 0.375rem;">
            <strong>Success:</strong> ${result.success} user(s) uploaded successfully
          </div>
        `;

        if (result.failed > 0 || result.errors.length > 0) {
          resultsHTML += `
            <div style="padding: 0.75rem; border-radius: 0.1875rem; background-color: #fee2e2; color: #991b1b; margin-bottom: 0.375rem;">
              <strong>Failed:</strong> ${result.failed} user(s) failed to upload
            </div>
          `;

          if (result.errors.length > 0) {
            resultsHTML += `
              <div style="padding: 0.75rem; border-radius: 0.1875rem; background-color: #fef3c7; color: #92400e; max-height: 12.5rem; overflow-y: auto; font-size: 0.45rem;">
                <strong>Errors:</strong><br>
                ${result.errors.slice(0, 10).map(err => escapeHtml(err)).join('<br>')}
                ${result.errors.length > 10 ? `<br><em>... and ${result.errors.length - 10} more errors</em>` : ''}
              </div>
            `;
          }
        }

        uploadResults.innerHTML = resultsHTML;
        uploadResults.style.display = 'block';
      }
    } catch (error) {
      logError('[BulkUploadHandler] Error processing bulk upload:', error);
      const errorMessage = getUserFriendlyErrorMessage(error, 'process bulk upload');
      if (uploadStatus) {
        uploadStatus.textContent = `Error: ${errorMessage}`;
      }
      if (uploadResults) {
        uploadResults.innerHTML = `
          <div style="padding: 0.75rem; border-radius: 0.1875rem; background-color: #fee2e2; color: #991b1b;">
            <strong>Error:</strong> ${escapeHtml(errorMessage)}
          </div>
        `;
        uploadResults.style.display = 'block';
      }
    }
  }

  /**
   * Close bulk upload modal
   */
  closeBulkUploadModal(): void {
    const modal = document.getElementById('bulkUploadModal');
    if (modal) {
      modal.style.display = 'none';
      (document.getElementById('csvFileInput') as HTMLInputElement).value = '';
      (document.getElementById('uploadProgress') as HTMLElement).style.display = 'none';
      (document.getElementById('uploadResults') as HTMLElement).style.display = 'none';
    }
  }
}

