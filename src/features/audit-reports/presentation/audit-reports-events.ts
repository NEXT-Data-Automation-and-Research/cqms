/**
 * Audit Reports Event Handlers
 * Handles all user interactions
 */

import { logInfo, logError } from '../../../utils/logging-helper.js';
import { AuditReportsController } from './audit-reports-controller.js';
import type { AuditReport } from '../domain/entities.js';
import { escapeHtml } from '../../../utils/html-sanitizer.js';

export class AuditReportsEventHandlers {
  constructor(private controller: AuditReportsController) {}

  /**
   * Setup all event listeners
   */
  setupEventListeners(): void {
    // Setup filter event listeners using event delegation (works even if panel rendered later)
    this.setupFilterEventListeners();

    // Scorecard selector - also set up via delegation but keep direct listener as fallback
    const scorecardSelector = document.getElementById('scorecardSelector') as HTMLSelectElement;
    if (scorecardSelector) {
      scorecardSelector.addEventListener('change', () => {
        const value = scorecardSelector.value;
        this.controller.setScorecard(value === 'all' ? null : value);
      });
    }

    // Search input - also set up via delegation but keep direct listener as fallback
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim();
        this.controller.setFilters({ searchQuery: query || undefined });
      });
    }

    // Export button
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.controller.exportToCSV();
      });
    }

    // Filter button
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
      filterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const panel = document.getElementById('filterPanel');
        if (panel) {
          // Render filter panel if it hasn't been rendered yet
          if (panel.innerHTML.trim() === '') {
            this.controller.renderFilterPanel();
            // Re-attach filter event listeners after rendering
            this.setupFilterEventListeners();
          }
          
          // Toggle visibility
          const isCurrentlyVisible = panel.style.display !== 'none' && panel.style.display !== '';
          if (isCurrentlyVisible) {
            panel.style.display = 'none';
            filterBtn.classList.remove('active');
          } else {
            panel.style.display = 'block';
            filterBtn.classList.add('active');
          }
        }
      });
    }

    // Clear all filters
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.controller.setFilters({});
        this.controller.setDateRange(null);
        if (searchInput) searchInput.value = '';
        if (scorecardSelector) scorecardSelector.value = 'all';
        this.controller.setScorecard(null);
      });
    }

    // Force sync
    const forceSyncBtn = document.getElementById('forceSyncBtn');
    if (forceSyncBtn) {
      forceSyncBtn.addEventListener('click', () => {
        this.controller.forceSync();
      });
    }

    // View all button (for employees)
    const viewAllBtn = document.getElementById('viewAllBtn');
    if (viewAllBtn) {
      viewAllBtn.addEventListener('click', () => {
        this.controller.toggleViewAll();
        // Button text will be updated by renderer after toggle
      });
    }

    // Date filter buttons
    this.setupDateFilterListeners();

    // Pagination
    this.setupPaginationListeners();

    // Expose controller globally for onclick handlers
    (window as any).auditReportsController = this.controller;
    
    // Attach controller methods
    (this.controller as any).showAuditModal = async (auditId: string) => {
      await showAuditModal(this.controller, auditId);
    };
    
    (this.controller as any).editAudit = (auditId: string) => {
      editAudit(this.controller, auditId);
    };
    
    (this.controller as any).deleteAudit = async (auditId: string) => {
      await deleteAuditById(this.controller, auditId);
    };
  }

  /**
   * Setup date filter listeners
   */
  private setupDateFilterListeners(): void {
    const dateBtn = document.getElementById('dateBtn');
    if (dateBtn) {
      dateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('dateDropdown');
        if (dropdown) {
          dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.date-picker-dropdown')) {
        const dropdown = document.getElementById('dateDropdown');
        if (dropdown) dropdown.style.display = 'none';
      }
    });

    // Apply date filter
    const applyDateFilter = document.getElementById('applyDateFilter');
    if (applyDateFilter) {
      applyDateFilter.addEventListener('click', () => {
        const startDate = (document.getElementById('startDate') as HTMLInputElement)?.value;
        const endDate = (document.getElementById('endDate') as HTMLInputElement)?.value;
        
        if (startDate && endDate) {
          this.controller.setDateRange({ startDate, endDate });
          const dateBtnText = document.getElementById('dateBtnText');
          if (dateBtnText) {
            dateBtnText.textContent = `${startDate} to ${endDate}`;
          }
        }
      });
    }

    // Clear date filter
    const clearDateFilter = document.getElementById('clearDateFilter');
    if (clearDateFilter) {
      clearDateFilter.addEventListener('click', () => {
        const startDateInput = document.getElementById('startDate') as HTMLInputElement;
        const endDateInput = document.getElementById('endDate') as HTMLInputElement;
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        this.controller.setDateRange(null);
        const dateBtnText = document.getElementById('dateBtnText');
        if (dateBtnText) dateBtnText.textContent = 'Date Range';
      });
    }

    // Quick date filters - use event delegation to ensure they work even after re-renders
    const headerActions = document.getElementById('headerActions');
    if (headerActions) {
      // Use event delegation for quick date buttons
      headerActions.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const btn = target.closest('.quick-date-btn') as HTMLButtonElement;
        if (btn && btn.id) {
          e.preventDefault();
          e.stopPropagation();
          
          const btnId = btn.id;
          const quickDateButtons = ['todayBtn', 'yesterdayBtn', 'thisMonthBtn', 'lastMonthBtn'];
          
          if (quickDateButtons.includes(btnId)) {
            // Remove active class from all
            quickDateButtons.forEach(id => {
              const b = document.getElementById(id);
              if (b) b.classList.remove('active');
            });
            btn.classList.add('active');

            const range = this.getQuickDateRange(btnId);
            if (range) {
              logInfo(`Setting date range from quick button: ${btnId}`);
              this.controller.setDateRange(range);
            }
          }
        }
      });
    }
    
    // Also attach direct listeners as fallback (in case delegation doesn't work)
    const quickDateButtons = ['todayBtn', 'yesterdayBtn', 'thisMonthBtn', 'lastMonthBtn'];
    quickDateButtons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        // Store handler reference to avoid duplicates
        const handler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Remove active class from all
          quickDateButtons.forEach(id => {
            const b = document.getElementById(id);
            if (b) b.classList.remove('active');
          });
          btn.classList.add('active');

          const range = this.getQuickDateRange(btnId);
          if (range) {
            logInfo(`Setting date range from direct listener: ${btnId}`);
            this.controller.setDateRange(range);
          }
        };
        
        // Remove existing listener if any
        btn.removeEventListener('click', handler);
        btn.addEventListener('click', handler);
      }
    });
  }

  /**
   * Get quick date range
   */
  private getQuickDateRange(buttonId: string): { startDate: string; endDate: string } | null {
    const now = new Date();
    let start: Date;
    let end: Date = new Date(now);

    switch (buttonId) {
      case 'todayBtn':
        start = new Date(now);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterdayBtn':
        start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonthBtn':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'lastMonthBtn':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        break;
      default:
        return null;
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  }

  /**
   * Setup filter event listeners using event delegation
   * This works even if the filter panel is rendered later
   */
  private setupFilterEventListeners(): void {
    const filterPanel = document.getElementById('filterPanel');
    if (!filterPanel) return;

    // Prevent duplicate listeners by checking if already attached
    if ((filterPanel as any).__filterListenersAttached) {
      return;
    }
    (filterPanel as any).__filterListenersAttached = true;

    // Use event delegation for filter elements
    filterPanel.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'scorecardSelector') {
        const select = target as HTMLSelectElement;
        const value = select.value;
        this.controller.setScorecard(value === 'all' ? null : value);
      }
    }, { capture: false });

    filterPanel.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'searchInput') {
        const input = target as HTMLInputElement;
        const query = input.value.trim();
        this.controller.setFilters({ searchQuery: query || undefined });
      } else if (target.id === 'auditIdSearch') {
        const input = target as HTMLInputElement;
        const query = input.value.trim();
        if (query) {
          this.controller.setFilters({ auditId: query });
        } else {
          // Get current filters from state
          const state = this.controller.getState();
          const filters = { ...state.filters };
          delete filters.auditId;
          this.controller.setFilters(filters);
        }
      }
    }, { capture: false });

    filterPanel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'clearFilters' || target.closest('#clearFilters')) {
        e.preventDefault();
        e.stopPropagation();
        this.controller.setFilters({});
        this.controller.setDateRange(null);
        const searchInput = document.getElementById('searchInput') as HTMLInputElement;
        if (searchInput) searchInput.value = '';
        const scorecardSelector = document.getElementById('scorecardSelector') as HTMLSelectElement;
        if (scorecardSelector) scorecardSelector.value = 'all';
        const auditIdSearch = document.getElementById('auditIdSearch') as HTMLInputElement;
        if (auditIdSearch) auditIdSearch.value = '';
        this.controller.setScorecard(null);
      }
    }, { capture: false });
  }

  /**
   * Setup pagination listeners
   */
  private setupPaginationListeners(): void {
    // Use event delegation for pagination buttons
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const pageBtn = target.closest('[data-page]') as HTMLElement;
      if (pageBtn && pageBtn.dataset.page) {
        const page = parseInt(pageBtn.dataset.page, 10);
        if (!isNaN(page) && page > 0) {
          this.controller.setPage(page);
        }
      }
    });
  }
}

// Helper functions for controller methods
async function showAuditModal(controller: AuditReportsController, auditId: string): Promise<void> {
  logInfo('Show audit modal:', auditId);
  
  const state = controller.getState();
  const audit = state.audits.find(a => a.id === auditId);
  
  if (!audit) {
    alert('Audit not found');
    return;
  }
  
  // Import modal dynamically to avoid circular dependencies
  const { AuditDetailModal } = await import('./modals/audit-detail-modal.js');
  const modal = new AuditDetailModal(controller);
  await modal.open(audit);
}

function editAudit(controller: AuditReportsController, auditId: string): void {
  const state = controller.getState();
  const audit = state.audits.find(a => a.id === auditId);
  if (audit && audit._scorecard_id) {
    window.location.href = `create-audit.html?edit=${auditId}&scorecard=${audit._scorecard_id}&table=${audit._scorecard_table || ''}`;
  }
}

async function deleteAuditById(controller: AuditReportsController, auditId: string): Promise<void> {
  const state = controller.getState();
  const audit = state.audits.find(a => a.id === auditId);
  if (!audit) {
    alert('Audit not found');
    return;
  }

  if (window.confirmationDialog) {
    const confirmed = await window.confirmationDialog.show({
      title: 'Delete Audit?',
      message: `Are you sure you want to delete this audit?\n\nEmployee: ${audit.employeeName}\nInteraction ID: ${audit.interactionId}\n\nThis action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'warning'
    });

    if (confirmed) {
      try {
        await controller.deleteAudit(audit);
        if (window.confirmationDialog) {
          await window.confirmationDialog.show({
            title: 'Success!',
            message: 'Audit deleted successfully.',
            confirmText: 'OK',
            type: 'success'
          });
        }
      } catch (error) {
        logError('Error deleting audit:', error);
        if (window.confirmationDialog) {
          await window.confirmationDialog.show({
            title: 'Error',
            message: 'Failed to delete audit. Please try again.',
            confirmText: 'OK',
            type: 'error'
          });
        }
      }
    }
  } else {
    if (confirm('Are you sure you want to delete this audit?')) {
      try {
        await controller.deleteAudit(audit);
        alert('Audit deleted successfully.');
      } catch (error) {
        logError('Error deleting audit:', error);
        alert('Failed to delete audit. Please try again.');
      }
    }
  }
}
