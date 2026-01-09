/**
 * Scorecard Controller
 * Main controller for scorecard management page
 */

import { getAuthenticatedSupabase } from '../../../../utils/authenticated-supabase.js';
import { DatabaseFactory } from '../../../../infrastructure/database-factory.js';
import { ScorecardRepository } from '../infrastructure/scorecard-repository.js';
import { ScorecardService } from '../application/scorecard-service.js';
import { escapeHtml, safeSetHTML, safeSetTableBodyHTML } from '../../../../utils/html-sanitizer.js';
import { logError, logInfo } from '../../../../utils/logging-helper.js';
import { createScorecardRowHTML } from './utils/html-utils.js';
import { ScorecardEventHandlers } from './event-handlers.js';
import type { Scorecard, ScorecardParameter, Channel } from '../domain/entities.js';

export class ScorecardController {
  private service: ScorecardService;
  private scorecards: Scorecard[] = [];
  private filteredScorecards: Scorecard[] = [];
  private availableChannels: Channel[] = [];
  private eventHandlers: ScorecardEventHandlers;

  constructor() {
    // Service will be initialized after Supabase is ready
    this.service = null as any;
    this.eventHandlers = new ScorecardEventHandlers(this);
  }

  /**
   * Initialize service (call after Supabase is ready)
   */
  private initializeService(): void {
    if (!(window as any).supabaseClient) {
      throw new Error('Supabase client not initialized. Ensure window.supabaseClient is set.');
    }
    const db = DatabaseFactory.createClient();
    const repository = new ScorecardRepository(db);
    this.service = new ScorecardService(repository);
  }

  /**
   * Initialize the page
   */
  async initialize(): Promise<void> {
    try {
      // Ensure Supabase client is ready
      if (!(window as any).supabaseClient) {
        await new Promise<void>((resolve) => {
          if ((window as any).supabaseClient) {
            resolve();
          } else {
            window.addEventListener('supabaseClientReady', () => resolve(), { once: true });
          }
        });
      }
      
      // Initialize service
      this.initializeService();
      
      await this.loadChannels();
      await this.loadScorecards();
      this.updateStatistics();
      this.renderScorecards();
    } catch (error) {
      logError('Failed to initialize scorecards page', error);
      this.showError('Failed to load scorecards. Please refresh the page.');
    }
  }

  /**
   * Load scorecards
   */
  async loadScorecards(): Promise<void> {
    try {
      this.scorecards = await this.service.loadScorecards();
      this.filteredScorecards = this.scorecards;
      this.updateStatistics();
      this.renderScorecards();
    } catch (error) {
      logError('Failed to load scorecards', error);
      throw error;
    }
  }

  /**
   * Load channels
   */
  async loadChannels(): Promise<void> {
    try {
      this.availableChannels = await this.service.loadChannels();
    } catch (error) {
      logError('Failed to load channels', error);
      this.availableChannels = [];
    }
  }

  /**
   * Render scorecards table
   */
  renderScorecards(): void {
    const tbody = document.getElementById('scorecardsTableBody');
    if (!tbody) {
      return;
    }

    if (this.filteredScorecards.length === 0) {
      safeSetTableBodyHTML(tbody as HTMLTableSectionElement, '<tr><td colspan="9" style="text-align: center; padding: 1.5rem; color: #6b7280;">No scorecards found</td></tr>');
      return;
    }

    const rowsHTML = this.filteredScorecards.map(scorecard => createScorecardRowHTML(scorecard)).join('');
    safeSetTableBodyHTML(tbody as HTMLTableSectionElement, rowsHTML);
    
    // ✅ SECURITY: Attach event listeners programmatically (CSP-safe, no inline handlers)
    this.eventHandlers.attachActionListeners();
  }

  /**
   * Update statistics
   */
  updateStatistics(): void {
    const total = this.scorecards.length;
    const active = this.scorecards.filter(s => s.is_active).length;
    const inactive = total - active;

    const totalEl = document.getElementById('totalScorecards');
    const activeEl = document.getElementById('activeScorecards');
    const inactiveEl = document.getElementById('inactiveScorecards');
    const countEl = document.getElementById('scorecardsCount');

    if (totalEl) totalEl.textContent = String(total);
    if (activeEl) activeEl.textContent = String(active);
    if (inactiveEl) inactiveEl.textContent = String(inactive);
    if (countEl) countEl.textContent = `${this.filteredScorecards.length} Scorecard${this.filteredScorecards.length !== 1 ? 's' : ''}`;
  }

  /**
   * View scorecard details
   */
  async viewScorecard(id: string): Promise<void> {
    try {
      const { scorecard, parameters } = await this.service.loadScorecardWithParameters(id);
      // Open view modal (implementation in modal component)
      if (window.scorecardModals) {
        window.scorecardModals.openViewModal(scorecard, parameters);
      }
    } catch (error) {
      logError('Failed to view scorecard', error);
      this.showError('Failed to load scorecard details');
    }
  }

  /**
   * Edit scorecard
   */
  async editScorecard(id: string): Promise<void> {
    try {
      if (!id || id.trim() === '') {
        throw new Error('Scorecard ID is required');
      }

      const { scorecard, parameters } = await this.service.loadScorecardWithParameters(id);
      
      if (!scorecard) {
        throw new Error('Scorecard not found');
      }

      // Open edit modal (implementation in modal component)
      if (window.scorecardModals) {
        window.scorecardModals.openEditModal(scorecard, parameters || []);
      } else {
        throw new Error('Scorecard modals not initialized');
      }
    } catch (error) {
      // Extract error message properly from AppError or regular Error
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      logError('Failed to edit scorecard', {
        message: errorMessage,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      });
      
      this.showError(`Failed to load scorecard for editing: ${errorMessage}`);
    }
  }

  /**
   * Toggle scorecard status
   */
  async toggleStatus(id: string, newStatus: boolean): Promise<void> {
    try {
      await this.service.updateScorecard(id, { is_active: newStatus });
      await this.loadScorecards();
    } catch (error) {
      logError('Failed to toggle scorecard status', error);
      this.showError('Failed to update scorecard status');
    }
  }

  /**
   * Delete scorecard
   */
  async deleteScorecard(id: string, tableName: string): Promise<void> {
    try {
      const confirmed = await window.confirmationDialog?.show({
        title: 'Delete Scorecard?',
        message: `This scorecard has no audit reports.\n\nThe scorecard configuration and its database table will be permanently deleted.\n\nContinue?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'warning'
      });

      if (!confirmed) return;

      await this.service.deleteScorecard(id, tableName);
      await this.loadScorecards();

      await window.confirmationDialog?.show({
        title: 'Deleted',
        message: 'Scorecard and its database table deleted successfully.',
        confirmText: 'OK',
        type: 'success'
      });
    } catch (error) {
      logError('Failed to delete scorecard', error);
      this.showError('Failed to delete scorecard: ' + (error as Error).message);
    }
  }

  /**
   * Show cannot delete message
   */
  async showCannotDeleteMessage(name: string, auditCount: number): Promise<void> {
    await window.confirmationDialog?.show({
      title: '🔒 Cannot Delete Scorecard',
      message: `The scorecard "${name}" contains ${auditCount} audit report(s) and cannot be deleted.\n\n📌 What you can do:\n• Use the "Deactivate" button to hide it from view\n• Keep it inactive to preserve audit history\n\n⚠️ To permanently delete this scorecard and all its audit reports, please contact your System Administrator.`,
      confirmText: 'OK',
      type: 'info'
    });
  }

  /**
   * Get available channels
   */
  getAvailableChannels(): Channel[] {
    return this.availableChannels;
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    if (window.confirmationDialog) {
      window.confirmationDialog.show({
        title: 'Error',
        message: message,
        confirmText: 'OK',
        type: 'error'
      });
    } else {
      alert(message);
    }
  }
}

// Export for use in HTML
declare global {
  interface Window {
    scorecardController: ScorecardController;
    scorecardModals?: {
      openViewModal: (scorecard: Scorecard, parameters: ScorecardParameter[]) => void;
      openEditModal: (scorecard: Scorecard, parameters: ScorecardParameter[]) => void;
      openCreateModal: () => void;
      openBulkImportModal: () => void;
    };
    confirmationDialog?: {
      show: (options: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        type?: 'success' | 'error' | 'warning' | 'info';
      }) => Promise<boolean>;
    };
  }
}

