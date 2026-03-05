/**
 * Audit Reports Event Handlers
 * Handles all user interactions
 */

import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js';
import { AuditReportsController } from './audit-reports-controller.js';
import type { AuditReport } from '../domain/entities.js';
import { escapeHtml } from '../../../utils/html-sanitizer.js';

export class AuditReportsEventHandlers {
  constructor(private controller: AuditReportsController) {}

  /**
   * Setup all event listeners
   */
  setupEventListeners(): void {
    logInfo('[AuditReportsEvents] Setting up event listeners...');
    // Setup filter event listeners using event delegation (works even if panel rendered later)
    this.setupFilterEventListeners();

    // Tab bar (Audit Reports | Acknowledgement by agent) - same pattern as Auditors Dashboard
    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest?.('.audit-reports-tab-btn');
      if (!target) return;
      const index = (target as HTMLElement).getAttribute('data-tab-index');
      if (index !== '0' && index !== '1') return;
      e.preventDefault();
      const mode = index === '0' ? 'audits' : 'ackByAgent';
      this.controller.setViewMode(mode);
    });

    // Acknowledgement-by-agent tab: search, sort, filters, expand
    document.addEventListener('input', (e) => {
      const el = e.target as HTMLElement;
      if (el?.id === 'ackSearchInput') {
        this.controller.setAckSearchQuery((el as HTMLInputElement).value);
      }
    });
    document.addEventListener('change', (e) => {
      const el = e.target as HTMLElement;
      if (el?.id === 'ackSortSelect') {
        const val = (el as HTMLSelectElement).value;
        const [field, direction] = val.split('-') as ['count' | 'name', 'asc' | 'desc'];
        if (field && direction) this.controller.setAckSort(field, direction);
      }
      const checkbox = el?.closest?.('[data-ack-filter]');
      if (checkbox && (el as HTMLInputElement).type === 'checkbox') {
        const container = (el as HTMLInputElement).closest('[id="ackChannelFilterOptions"], [id="ackSupervisorFilterOptions"]');
        if (!container) return;
        const isChannel = container.id === 'ackChannelFilterOptions';
        const checked = container.querySelectorAll<HTMLInputElement>('input:checked');
        const values = Array.from(checked).map(c => c.value);
        if (isChannel) this.controller.setAckChannelFilter(values);
        else this.controller.setAckSupervisorFilter(values);
      }
    });
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const ackView = document.getElementById('agentAcknowledgementView');
      if (!ackView?.contains(target)) return;

      if (target.closest?.('#ackChannelFilterTrigger')) {
        const dd = document.getElementById('ackChannelFilterDropdown');
        const other = document.getElementById('ackSupervisorFilterDropdown');
        if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
        if (other) other.style.display = 'none';
        return;
      }
      if (target.closest?.('#ackSupervisorFilterTrigger')) {
        const dd = document.getElementById('ackSupervisorFilterDropdown');
        const other = document.getElementById('ackChannelFilterDropdown');
        if (dd) dd.style.display = dd.style.display === 'none' ? 'block' : 'none';
        if (other) other.style.display = 'none';
        return;
      }
      if (target.closest?.('.ack-multi-select-container')) return;
      const chDd = document.getElementById('ackChannelFilterDropdown');
      const supDd = document.getElementById('ackSupervisorFilterDropdown');
      if (chDd) chDd.style.display = 'none';
      if (supDd) supDd.style.display = 'none';

      if (target.closest?.('.ack-agent-row')) {
        const row = target.closest('.ack-agent-row') as HTMLElement;
        if ((target as HTMLElement).closest('a')) return;
        const email = row.getAttribute('data-agent-email');
        if (email) this.controller.toggleAgentExpanded(email);
      }
    });

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
      exportBtn.addEventListener('click', async () => {
        await this.controller.exportToCSV();
      });
    }

    // Filter button
    const filterBtn = document.getElementById('filterBtn');
    logInfo('[AuditReportsEvents] Filter button found:', !!filterBtn);
    if (filterBtn) {
      const toggleFilterPanel = (e?: Event) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        const panel = document.getElementById('filterPanel');
        if (!panel) {
          logError('Filter panel not found');
          return;
        }

        // Render filter panel if it hasn't been rendered yet
        if (panel.innerHTML.trim() === '') {
          this.controller.renderFilterPanel();
          // Re-attach filter event listeners after rendering
          this.setupFilterEventListeners();
        }
        
        // Check current visibility state - check both inline style and computed style
        const inlineDisplay = panel.style.display;
        const computedDisplay = window.getComputedStyle(panel).display;
        const isCurrentlyVisible = (inlineDisplay === 'block' || (inlineDisplay === '' && computedDisplay !== 'none'));
        
        logInfo('[FilterToggle] Current state:', { inlineDisplay, computedDisplay, isCurrentlyVisible });
        
        if (isCurrentlyVisible) {
          // Hide panel
          logInfo('[FilterToggle] Hiding filter panel');
          panel.style.setProperty('display', 'none', 'important');
          filterBtn.classList.remove('active');
          // Close all multi-select dropdowns when closing panel
          document.querySelectorAll('.multi-select-dropdown').forEach((el: any) => {
            el.style.display = 'none';
          });
        } else {
          // Show panel (though it should already be visible by default)
          logInfo('[FilterToggle] Showing filter panel');
          panel.style.setProperty('display', 'block', 'important');
          filterBtn.classList.add('active');
          // Ensure multi-select filters are populated
          this.controller.populateMultiSelectFiltersIfNeeded().catch(err => {
            logError('Error populating filters:', err);
          });
          // Focus first input when opening
          setTimeout(() => {
            const firstInput = panel.querySelector('input, select') as HTMLElement;
            if (firstInput) {
              firstInput.focus();
            }
          }, 100);
        }
      };

      filterBtn.addEventListener('click', toggleFilterPanel);

      // Add keyboard shortcut: Ctrl+F or Cmd+F to toggle filter panel
      document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f' && !(e.target as HTMLElement)?.matches('input, textarea')) {
          e.preventDefault();
          toggleFilterPanel();
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
   * Setup date filter listeners — initializes the DateRangePicker component
   */
  private setupDateFilterListeners(): void {
    this.initDateRangePicker();
  }

  /**
   * Initialize the DateRangePicker component via dynamic import.
   * Replaces the old date-picker-dropdown and quick-date-buttons.
   */
  private async initDateRangePicker(): Promise<void> {
    const container = document.getElementById('reportsDatePickerContainer');
    if (!container) return;

    try {
      const { DateRangePicker } = await import('/js/date-range-picker.js' as any);

      const picker = new DateRangePicker(container, {
        mode: 'range',
        label: 'Date Range',
        defaultPreset: 'last30',
        onApply: ({ from, to }: { from: Date; to: Date | null }) => {
          const startDateInput = document.getElementById('startDate') as HTMLInputElement;
          const endDateInput = document.getElementById('endDate') as HTMLInputElement;

          if (from) {
            const startStr = this.formatDateToYYYYMMDD(from);
            const endStr = to ? this.formatDateToYYYYMMDD(to) : startStr;

            if (startDateInput) startDateInput.value = startStr;
            if (endDateInput) endDateInput.value = endStr;

            this.controller.setDateRange({ startDate: startStr, endDate: endStr });
          }
        },
        onClear: () => {
          const startDateInput = document.getElementById('startDate') as HTMLInputElement;
          const endDateInput = document.getElementById('endDate') as HTMLInputElement;
          if (startDateInput) startDateInput.value = '';
          if (endDateInput) endDateInput.value = '';
          this.controller.setDateRange(null);
        }
      });

      // Store picker reference on window for external access if needed
      (window as any).__reportsDateRangePicker = picker;
    } catch (err) {
      logError('[AuditReportsEvents] Failed to initialize DateRangePicker:', err);
    }
  }

  /**
   * Format date to YYYY-MM-DD in local timezone (not UTC)
   */
  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
        return;
      }
      // Multi-select dropdowns: checkbox change should update filters and re-render
      const checkbox = target as HTMLInputElement;
      if (checkbox.type === 'checkbox') {
        const optionsContainer = checkbox.closest('[id$="Options"]') as HTMLElement;
        if (optionsContainer && optionsContainer.id) {
          const filterId = optionsContainer.id.replace(/Options$/, '');
          const updateMultiSelect = (window as any).updateMultiSelect;
          if (typeof updateMultiSelect === 'function') {
            updateMultiSelect(filterId);
          }
        }
      }
    }, { capture: false });

    filterPanel.addEventListener('input', (e) => {
      const target = e.target as HTMLElement;
      const input = target as HTMLInputElement;

      // Multi-select search: filter options by typed text (works without inline oninput, e.g. when CSP/sanitizer strips it)
      if (target.classList.contains('multi-select-search') || (target.id && target.id.endsWith('Search') && target.closest('.multi-select-dropdown'))) {
        const filterId = target.id ? target.id.replace(/Search$/, '') : '';
        if (filterId) {
          const filterMultiSelectOptions = (window as any).filterMultiSelectOptions;
          if (typeof filterMultiSelectOptions === 'function') {
            filterMultiSelectOptions(filterId);
          }
        }
        return;
      }

      if (target.id === 'searchInput') {
        const query = input.value.trim();
        this.controller.setFilters({ searchQuery: query || undefined });
      } else if (target.id === 'auditIdSearch') {
        const query = input.value.trim();
        if (query) {
          this.controller.setFilters({ auditId: query });
        } else {
          const state = this.controller.getState();
          const filters = { ...state.filters };
          delete filters.auditId;
          this.controller.setFilters(filters);
        }
      } else if (target.id === 'interactionIdFilter' || target.id === 'interactionIdSearch') {
        const query = input.value.trim();
        if (query) {
          this.controller.setFilters({ interactionId: query });
        } else {
          const state = this.controller.getState();
          const filters = { ...state.filters };
          delete filters.interactionId;
          this.controller.setFilters(filters);
        }
      } else if (target.id === 'weekFilter' || target.id === 'weekSearch') {
        const week = input.value ? parseInt(input.value, 10) : undefined;
        if (week && week >= 1 && week <= 52) {
          this.controller.setFilters({ week });
        } else {
          const state = this.controller.getState();
          const filters = { ...state.filters };
          delete filters.week;
          this.controller.setFilters(filters);
        }
      } else if (target.id === 'minScoreFilter' || target.id === 'minScore') {
        const minScore = input.value ? parseFloat(input.value) : undefined;
        if (minScore !== undefined && minScore >= 0 && minScore <= 100) {
          this.controller.setFilters({ minScore });
        } else {
          const state = this.controller.getState();
          const filters = { ...state.filters };
          delete filters.minScore;
          this.controller.setFilters(filters);
        }
      } else if (target.id === 'maxScoreFilter' || target.id === 'maxScore') {
        const maxScore = input.value ? parseFloat(input.value) : undefined;
        if (maxScore !== undefined && maxScore >= 0 && maxScore <= 100) {
          this.controller.setFilters({ maxScore });
        } else {
          const state = this.controller.getState();
          const filters = { ...state.filters };
          delete filters.maxScore;
          this.controller.setFilters(filters);
        }
      } else if (target.id === 'minErrorsFilter' || target.id === 'minErrors') {
        const minErrors = input.value ? parseInt(input.value, 10) : undefined;
        if (minErrors !== undefined && minErrors >= 0) {
          this.controller.setFilters({ minErrors });
        } else {
          const state = this.controller.getState();
          const filters = { ...state.filters };
          delete filters.minErrors;
          this.controller.setFilters(filters);
        }
      } else if (target.id === 'maxErrorsFilter' || target.id === 'maxErrors') {
        const maxErrors = input.value ? parseInt(input.value, 10) : undefined;
        if (maxErrors !== undefined && maxErrors >= 0) {
          this.controller.setFilters({ maxErrors });
        } else {
          const state = this.controller.getState();
          const filters = { ...state.filters };
          delete filters.maxErrors;
          this.controller.setFilters(filters);
        }
      }
    }, { capture: false });

    // Add keyboard navigation: Enter key applies filters
    filterPanel.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
      // Multi-select trigger: Enter/Space toggles dropdown (accessibility)
      const trigger = target.closest('.multi-select-trigger') as HTMLElement;
      if (trigger && (e.key === 'Enter' || e.key === ' ')) {
        const filterId = (trigger.dataset?.filterId as string) || trigger.id?.replace(/Trigger$/, '') || '';
        if (filterId) {
          const toggleMultiSelect = (window as any).toggleMultiSelect;
          if (typeof toggleMultiSelect === 'function') {
            e.preventDefault();
            toggleMultiSelect(filterId);
          }
        }
        return;
      }
      if (e.key === 'Enter' && (target.tagName === 'INPUT' || target.tagName === 'SELECT')) {
        e.preventDefault();
        // Trigger change event to apply filter
        target.dispatchEvent(new Event('change', { bubbles: true }));
        // For text inputs, also trigger input event
        if (target.tagName === 'INPUT') {
          target.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }, { capture: false });

    filterPanel.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      // Multi-select "Select All" / "Clear" buttons (delegation so it works even if inline onclick is blocked)
      const actionBtn = target.closest('.multi-select-action-btn') as HTMLElement;
      if (actionBtn) {
        const dropdown = actionBtn.closest('.multi-select-dropdown') as HTMLElement;
        if (dropdown?.id?.endsWith('Dropdown')) {
          const filterId = dropdown.id.replace(/Dropdown$/, '');
          const isSelectAll = actionBtn.textContent?.trim().toLowerCase().includes('select all');
          const fn = isSelectAll ? (window as any).selectAllMultiSelect : (window as any).clearMultiSelect;
          if (typeof fn === 'function') {
            e.preventDefault();
            e.stopPropagation();
            fn(filterId);
          }
        }
        return;
      }
      // Multi-select trigger: open/close dropdown (delegation so it works even if inline onclick is blocked e.g. CSP)
      const trigger = target.closest('.multi-select-trigger') as HTMLElement;
      if (trigger && (trigger.id?.endsWith('Trigger') || trigger.dataset?.filterId)) {
        const filterId = (trigger.dataset?.filterId as string) || trigger.id?.replace(/Trigger$/, '') || '';
        if (filterId) {
          const toggleMultiSelect = (window as any).toggleMultiSelect;
          if (typeof toggleMultiSelect === 'function') {
            e.preventDefault();
            e.stopPropagation();
            toggleMultiSelect(filterId);
          }
        }
        return;
      }
      if (target.id === 'clearFilters' || target.closest('#clearFilters')) {
        e.preventDefault();
        e.stopPropagation();
        this.controller.clearAllFilters();
        // Clear all input fields
        const inputs = [
          'searchInput', 'auditIdSearch', 'interactionIdFilter', 'interactionIdSearch', 
          'weekFilter', 'weekSearch', 'minScoreFilter', 'minScore', 'maxScoreFilter', 'maxScore',
          'minErrorsFilter', 'minErrors', 'maxErrorsFilter', 'maxErrors'
        ];
        inputs.forEach(id => {
          const el = document.getElementById(id) as HTMLInputElement;
          if (el) el.value = '';
        });
        const scorecardSelector = document.getElementById('scorecardSelector') as HTMLSelectElement;
        if (scorecardSelector) scorecardSelector.value = 'all';
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
  console.log('[AuditReports] showAuditModal called with auditId:', auditId);
  
  try {
    const state = controller.getState();
    console.log('[AuditReports] State has', state.audits.length, 'audits');
    
    const audit = state.audits.find(a => a.id === auditId);
    console.log('[AuditReports] Found audit:', audit ? 'yes' : 'no');
    
    if (!audit) {
      console.error('[AuditReports] Audit not found in state for ID:', auditId);
      alert('Audit not found');
      return;
    }
    
    console.log('[AuditReports] Audit data:', { 
      id: audit.id, 
      employeeName: audit.employeeName,
      hasTranscript: !!audit.transcript,
      transcriptLength: audit.transcript?.length || 0,
      _scorecard_table: audit._scorecard_table,
      _scorecard_id: audit._scorecard_id,
      _scorecard_name: audit._scorecard_name,
      averageScore: audit.averageScore,
      totalErrorsCount: audit.totalErrorsCount
    });
    
    // Import modal dynamically to avoid circular dependencies
    console.log('[AuditReports] Importing AuditDetailModal...');
    const { AuditDetailModal } = await import('./modals/audit-detail-modal.js');
    console.log('[AuditReports] Creating modal instance...');
    const modal = new AuditDetailModal(controller);
    console.log('[AuditReports] Opening modal...');
    await modal.open(audit);
    console.log('[AuditReports] Modal opened successfully');
  } catch (error) {
    console.error('[AuditReports] Error in showAuditModal:', error);
    logError('Error in showAuditModal:', error);
    alert('Error opening audit details. Please try again.');
  }
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
