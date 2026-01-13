/**
 * Audit Reports Loader
 * Initializes the audit reports feature
 */

import { DatabaseFactory } from '../../../infrastructure/database-factory.js';
import { AuditReportsRepository } from '../infrastructure/audit-reports-repository.js';
import { AuditReportsService } from '../application/audit-reports-service.js';
import { AuditReportsController } from './audit-reports-controller.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';
import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js';

export class AuditReportsLoader {
  private controller: AuditReportsController | null = null;
  private service: AuditReportsService | null = null;

  /**
   * Initialize the audit reports feature
   */
  async initialize(): Promise<void> {
    try {
      logInfo('Initializing audit reports...');

      // Check page access
      if (!this.checkPageAccess()) {
        return;
      }

      // Wait for Supabase to be ready
      await this.waitForSupabaseReady();

      // Initialize services
      await this.initializeServices();

      // Initialize controller
      this.initializeController();

      // Load initial data
      await this.loadInitialData();

      logInfo('Audit reports initialized successfully');
    } catch (error) {
      logError('Error initializing audit reports:', error);
      // Show error to user
      const loadingIndicator = document.getElementById('loadingIndicator');
      const auditList = document.getElementById('auditList');
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
      if (auditList) {
        auditList.style.display = 'flex';
        const errorMessage = error instanceof Error ? escapeHtml(error.message) : 'Unknown error occurred';
        safeSetHTML(auditList, `
          <div style="padding: 2rem; text-align: center; color: #ef4444;">
            <p style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Failed to load audit reports</p>
            <p style="font-size: 0.75rem; color: #6b7280; margin-bottom: 1rem;">${errorMessage}</p>
            <button id="retryButton" style="padding: 0.5rem 1rem; background: #1A733E; color: white; border: none; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; cursor: pointer;">Retry</button>
          </div>
        `);
        // Attach event listener for retry button
        const retryBtn = auditList.querySelector('#retryButton');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => {
            window.location.reload();
          });
        }
      }
    }
  }

  /**
   * Check page access
   */
  private checkPageAccess(): boolean {
    if (typeof window !== 'undefined' && 
        (window as any).accessControl && 
        typeof (window as any).accessControl.enforcePageAccess === 'function') {
      return (window as any).accessControl.enforcePageAccess('src/features/audit-reports/presentation/audit-reports.html');
    }
    return true;
  }

  /**
   * Wait for Supabase to be ready
   */
  private async waitForSupabaseReady(): Promise<void> {
    const maxWait = 10000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      if (typeof window !== 'undefined' && 
          ((window as any).supabaseClient || (window as any).supabaseReady)) {
        // Double-check that supabaseClient exists
        if (!(window as any).supabaseClient && (window as any).supabaseReady) {
          // Wait a bit more for supabaseClient to be set
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        if ((window as any).supabaseClient) {
          return;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Don't throw error, just log warning and try to continue
    logError('Supabase client not ready after timeout, continuing anyway...');
  }

  /**
   * Initialize services
   */
  private async initializeServices(): Promise<void> {
    const db = DatabaseFactory.createClient();
    const repository = new AuditReportsRepository(db);
    this.service = new AuditReportsService(repository);
  }

  /**
   * Initialize controller
   */
  private initializeController(): void {
    if (!this.service) {
      throw new Error('Service not initialized');
    }

    this.controller = new AuditReportsController(this.service);
    this.controller.initialize();
  }

  /**
   * Load initial data
   */
  private async loadInitialData(): Promise<void> {
    if (!this.controller) {
      throw new Error('Controller not initialized');
    }

    // Expose controller globally for event handlers
    (window as any).auditReportsController = this.controller;

    await this.controller.loadInitialData();
  }
}

