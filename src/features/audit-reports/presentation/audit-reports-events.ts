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
   * Setup date filter listeners
   */
  private setupDateFilterListeners(): void {
    const dateBtn = document.getElementById('dateBtn');
    if (dateBtn) {
      dateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('dateDropdown');
        if (dropdown) {
          // Toggle using CSS class like auditor's dashboard
          dropdown.classList.toggle('active');
        }
      });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.date-picker-dropdown')) {
        const dropdown = document.getElementById('dateDropdown');
        if (dropdown) dropdown.classList.remove('active');
      }
    });

    // Prevent clicks inside dropdown from closing it
    const dropdown = document.getElementById('dateDropdown');
    if (dropdown) {
      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Apply date filter
    const applyDateFilter = document.getElementById('applyDateFilter');
    if (applyDateFilter) {
      applyDateFilter.addEventListener('click', (e) => {
        e.stopPropagation();
        const startDate = (document.getElementById('startDate') as HTMLInputElement)?.value;
        const endDate = (document.getElementById('endDate') as HTMLInputElement)?.value;
        
        if (startDate && endDate) {
          // Clear quick date button active states
          const quickDateButtons = ['todayBtn', 'yesterdayBtn', 'thisWeekBtn', 'lastWeekBtn', 'thisMonthBtn', 'lastMonthBtn'];
          quickDateButtons.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.remove('active');
          });
          
          this.controller.setDateRange({ startDate, endDate });
        }
        
        // Close the dropdown after applying (like auditor's dashboard)
        const dateDropdown = document.getElementById('dateDropdown');
        if (dateDropdown) dateDropdown.classList.remove('active');
      });
    }

    // Clear date filter
    const clearDateFilter = document.getElementById('clearDateFilter');
    if (clearDateFilter) {
      clearDateFilter.addEventListener('click', (e) => {
        e.stopPropagation();
        const startDateInput = document.getElementById('startDate') as HTMLInputElement;
        const endDateInput = document.getElementById('endDate') as HTMLInputElement;
        if (startDateInput) startDateInput.value = '';
        if (endDateInput) endDateInput.value = '';
        
        // Clear quick date button active states
        const quickDateButtons = ['todayBtn', 'yesterdayBtn', 'thisMonthBtn', 'lastMonthBtn'];
        quickDateButtons.forEach(id => {
          const btn = document.getElementById(id);
          if (btn) btn.classList.remove('active');
        });
        
        this.controller.setDateRange(null);
        const dateBtnText = document.getElementById('dateBtnText');
        if (dateBtnText) dateBtnText.textContent = 'Date Range';
        
        // Close the dropdown after clearing (like auditor's dashboard)
        const dateDropdown = document.getElementById('dateDropdown');
        if (dateDropdown) dateDropdown.classList.remove('active');
      });
    }
    
    // Prevent date inputs from closing dropdown
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    if (startDateInput) {
      startDateInput.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }
    if (endDateInput) {
      endDateInput.addEventListener('click', (e) => {
        e.stopPropagation();
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
          const quickDateButtons = ['todayBtn', 'yesterdayBtn', 'thisWeekBtn', 'lastWeekBtn', 'thisMonthBtn', 'lastMonthBtn'];
          
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
              // Disable week filter when using quick date buttons
              (this.controller as any).useWeekFilter = false;
              this.controller.setDateRange(range);
              (this.controller as any).updateWeekDisplay();
            }
          }
        }
      });
    }
    
    // Also attach direct listeners as fallback (in case delegation doesn't work)
    const quickDateButtons = ['todayBtn', 'yesterdayBtn', 'thisWeekBtn', 'lastWeekBtn', 'thisMonthBtn', 'lastMonthBtn'];
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
   * Get current week dates (Monday to Sunday)
   */
  private getCurrentWeekDates(): { start: Date; end: Date } {
    // Use Dhaka timezone if available
    const now = (window as any).getDhakaNow ? (window as any).getDhakaNow() : new Date();
    return this.getWeekDatesForDate(now);
  }
  
  /**
   * Get week dates for a given date (Monday to Sunday)
   */
  private getWeekDatesForDate(date: Date): { start: Date; end: Date } {
    // Use Dhaka timezone if available
    if ((window as any).getDhakaWeekNumber && (window as any).getDhakaWeekDates) {
      const weekNumber = (window as any).getDhakaWeekNumber(date);
      const year = date.getFullYear();
      return (window as any).getDhakaWeekDates(weekNumber, year);
    }
    
    // Standard week calculation (Monday to Sunday)
    const workingDate = new Date(date);
    const dayOfWeek = workingDate.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to Monday
    const monday = new Date(workingDate);
    monday.setDate(workingDate.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return { start: monday, end: sunday };
  }
  
  /**
   * Apply week date range
   */
  private applyWeekRange(weekDates: { start: Date; end: Date }): void {
    const startDate = weekDates.start.toISOString().split('T')[0];
    const endDate = weekDates.end.toISOString().split('T')[0];
    
    // Clear quick date button active states
    const quickDateButtons = ['todayBtn', 'yesterdayBtn', 'thisMonthBtn', 'lastMonthBtn'];
    quickDateButtons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.classList.remove('active');
    });
    
    // Set date range
    this.controller.setDateRange({ startDate, endDate });
    
    // Update date inputs
    const startDateInput = document.getElementById('startDate') as HTMLInputElement;
    const endDateInput = document.getElementById('endDate') as HTMLInputElement;
    if (startDateInput) startDateInput.value = startDate;
    if (endDateInput) endDateInput.value = endDate;
    
    // Update date button text
    const dateBtnText = document.getElementById('dateBtnText');
    if (dateBtnText) {
      dateBtnText.textContent = `${startDate} to ${endDate}`;
    }
    
    // Update week display
    this.updateWeekDisplay(weekDates);
  }
  
  /**
   * Update week display text
   */
  private updateWeekDisplay(weekDates: { start: Date; end: Date }): void {
    const weekText = document.getElementById('weekText');
    if (weekText) {
      const startStr = weekDates.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = weekDates.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      weekText.textContent = `${startStr} - ${endStr}`;
    }
  }
  
  /**
   * Format date as "15 Jan 2026"
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  /**
   * Format date range for display
   */
  private formatDateRange(startDate: string, endDate: string): string {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    
    // If same date, show only once
    if (startDate === endDate) {
      return start;
    }
    
    return `${start} to ${end}`;
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
   * Get quick date range
   */
  private getQuickDateRange(buttonId: string): { startDate: string; endDate: string } | null {
    // Use Dhaka timezone functions if available
    const getDhakaStartOfDay = (window as any).getDhakaStartOfDay;
    const getDhakaEndOfDay = (window as any).getDhakaEndOfDay;
    const getDhakaFirstDayOfMonth = (window as any).getDhakaFirstDayOfMonth;
    const getDhakaLastDayOfMonth = (window as any).getDhakaLastDayOfMonth;
    const getDhakaNow = (window as any).getDhakaNow;
    
    let start: Date;
    let end: Date;

    switch (buttonId) {
      case 'todayBtn':
        // Today: same date for start and end
        if (getDhakaStartOfDay && getDhakaEndOfDay) {
          const today = getDhakaNow ? getDhakaNow() : new Date();
          start = getDhakaStartOfDay(today);
          end = getDhakaEndOfDay(today);
        } else {
          const now = new Date();
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }
        break;
      case 'yesterdayBtn':
        // Yesterday: same date for start and end
        if (getDhakaStartOfDay && getDhakaEndOfDay) {
          const today = getDhakaNow ? getDhakaNow() : new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          start = getDhakaStartOfDay(yesterday);
          end = getDhakaEndOfDay(yesterday);
        } else {
          const now = new Date();
          const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          start = new Date(yesterday);
          end = new Date(yesterday);
        }
        break;
      case 'thisMonthBtn':
        if (getDhakaFirstDayOfMonth && getDhakaLastDayOfMonth) {
          const today = getDhakaNow ? getDhakaNow() : new Date();
          start = getDhakaFirstDayOfMonth(today);
          end = getDhakaLastDayOfMonth(today);
        } else {
          start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
          end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        }
        break;
      case 'thisWeekBtn':
        // This Week: Monday to Sunday of current week
        const getDhakaWeekNumber = (window as any).getDhakaWeekNumber;
        const getDhakaWeekDates = (window as any).getDhakaWeekDates;
        if (getDhakaWeekNumber && getDhakaWeekDates) {
          const today = getDhakaNow ? getDhakaNow() : new Date();
          const weekNumber = getDhakaWeekNumber(today);
          const year = today.getFullYear();
          const weekDates = getDhakaWeekDates(weekNumber, year);
          start = getDhakaStartOfDay ? getDhakaStartOfDay(weekDates.start) : weekDates.start;
          end = getDhakaEndOfDay ? getDhakaEndOfDay(weekDates.end) : weekDates.end;
        } else {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to Monday
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
          end = new Date(start);
          end.setDate(start.getDate() + 6);
        }
        break;
      case 'lastWeekBtn':
        // Last Week: Monday to Sunday of previous week
        const getDhakaWeekNumber2 = (window as any).getDhakaWeekNumber;
        const getDhakaWeekDates2 = (window as any).getDhakaWeekDates;
        if (getDhakaWeekNumber2 && getDhakaWeekDates2) {
          const today = getDhakaNow ? getDhakaNow() : new Date();
          const currentWeekNumber = getDhakaWeekNumber2(today);
          const year = today.getFullYear();
          let lastWeekNumber = currentWeekNumber - 1;
          let lastWeekYear = year;
          if (lastWeekNumber < 1) {
            lastWeekNumber = 52;
            lastWeekYear = year - 1;
          }
          const weekDates = getDhakaWeekDates2(lastWeekNumber, lastWeekYear);
          start = getDhakaStartOfDay ? getDhakaStartOfDay(weekDates.start) : weekDates.start;
          end = getDhakaEndOfDay ? getDhakaEndOfDay(weekDates.end) : weekDates.end;
        } else {
          const now = new Date();
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Days to Monday
          const thisWeekMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
          start = new Date(thisWeekMonday);
          start.setDate(thisWeekMonday.getDate() - 7); // Previous week Monday
          end = new Date(start);
          end.setDate(start.getDate() + 6); // Previous week Sunday
        }
        break;
      case 'lastMonthBtn':
        if (getDhakaFirstDayOfMonth && getDhakaLastDayOfMonth) {
          const today = getDhakaNow ? getDhakaNow() : new Date();
          const lastMonth = new Date(today);
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          start = getDhakaFirstDayOfMonth(lastMonth);
          end = getDhakaLastDayOfMonth(lastMonth);
        } else {
          const now = new Date();
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 0);
        }
        break;
      default:
        return null;
    }

    // Format dates in local timezone (not UTC)
    return {
      startDate: this.formatDateToYYYYMMDD(start),
      endDate: this.formatDateToYYYYMMDD(end)
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
      const input = target as HTMLInputElement;
      
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
    
    // Handle date inputs separately
    filterPanel.addEventListener('change', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'dateFromFilter' || target.id === 'dateToFilter' || target.id === 'fromDate' || target.id === 'toDate') {
        const fromDateInput = (document.getElementById('dateFromFilter') || document.getElementById('fromDate')) as HTMLInputElement;
        const toDateInput = (document.getElementById('dateToFilter') || document.getElementById('toDate')) as HTMLInputElement;
        const fromDate = fromDateInput?.value || '';
        const toDate = toDateInput?.value || '';
        
        if (fromDate && toDate) {
          this.controller.setDateRange({ startDate: fromDate, endDate: toDate });
        } else if (!fromDate && !toDate) {
          this.controller.setDateRange(null);
        }
      }
    }, { capture: false });

    // Add keyboard navigation: Enter key applies filters
    filterPanel.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement;
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
      if (target.id === 'clearFilters' || target.closest('#clearFilters')) {
        e.preventDefault();
        e.stopPropagation();
        this.controller.clearAllFilters();
        // Clear all input fields
        const inputs = [
          'searchInput', 'auditIdSearch', 'interactionIdFilter', 'interactionIdSearch', 
          'weekFilter', 'weekSearch', 'minScoreFilter', 'minScore', 'maxScoreFilter', 'maxScore',
          'minErrorsFilter', 'minErrors', 'maxErrorsFilter', 'maxErrors', 
          'dateFromFilter', 'fromDate', 'dateToFilter', 'toDate'
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
