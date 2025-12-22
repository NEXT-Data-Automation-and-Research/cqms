/**
 * Presentation Layer - Auditor Dashboard Event Handlers
 * Handles all user interactions and events
 */

import type { AuditorDashboardState } from '../application/auditor-dashboard-state.js';
import type { AuditorDashboardService } from '../application/auditor-dashboard-service.js';
import type { AuditorDashboardRenderer } from './auditor-dashboard-renderer.js';

export class AuditorDashboardEventHandlers {
  constructor(
    private state: AuditorDashboardState,
    private service: AuditorDashboardService,
    private renderer: AuditorDashboardRenderer
  ) {}

  /**
   * Setup all event listeners
   */
  setupEventListeners(): void {
    this.setupWeekNavigation();
    this.setupDatePicker();
    this.setupFilterDropdown();
    this.setupTabSwitching();
    this.setupClickOutside();
  }

  /**
   * Setup week navigation
   */
  private setupWeekNavigation(): void {
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const weekDisplay = document.getElementById('weekDisplay');

    if (prevWeekBtn) {
      prevWeekBtn.addEventListener('click', () => {
        if (!this.state.useWeekFilter) {
          this.state.switchToWeekView();
        }
        this.navigateWeek(-1);
      });
    }

    if (nextWeekBtn) {
      nextWeekBtn.addEventListener('click', () => {
        if (!this.state.useWeekFilter) {
          this.state.switchToWeekView();
        }
        this.navigateWeek(1);
      });
    }

    if (weekDisplay) {
      weekDisplay.addEventListener('click', () => {
        if (!this.state.useWeekFilter) {
          this.state.switchToWeekView();
          this.refreshData();
        }
      });
    }
  }

  /**
   * Setup date picker
   */
  private setupDatePicker(): void {
    const dateBtn = document.getElementById('dateBtn');
    if (dateBtn) {
      dateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('dateDropdown');
        if (dropdown) {
          dropdown.classList.toggle('active');
        }
      });
    }
  }

  /**
   * Setup filter dropdown
   */
  private setupFilterDropdown(): void {
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
      filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFilters();
      });
    }
  }

  /**
   * Setup tab switching
   */
  private setupTabSwitching(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        this.switchTab(index);
      });
    });
  }

  /**
   * Setup click outside handlers
   */
  private setupClickOutside(): void {
    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('.date-picker-dropdown')) {
        const dateDropdown = document.getElementById('dateDropdown');
        if (dateDropdown) {
          dateDropdown.classList.remove('active');
        }
      }
      if (!(e.target as HTMLElement).closest('.filter-dropdown')) {
        const filterDropdown = document.getElementById('filterDropdown');
        const filterBtn = document.getElementById('filterBtn');
        if (filterDropdown) {
          filterDropdown.classList.remove('active');
        }
        if (filterBtn) {
          filterBtn.classList.remove('active');
        }
      }
    });
  }

  /**
   * Navigate week
   */
  private navigateWeek(direction: number): void {
    this.state.cancelOngoingFetches();
    this.renderer.showLoadingState();
    this.state.navigateWeek(direction);
    this.updateWeekDisplay();
    this.refreshData();
  }

  /**
   * Switch tab
   */
  private switchTab(index: number): void {
    this.state.currentTab = index === 0 ? 'team-stats' : 'standup-view';
    this.updateTabUI();
    this.renderer.showLoadingState();
    this.refreshData();
  }

  /**
   * Update tab UI
   */
  private updateTabUI(): void {
    const tabButtons = document.querySelectorAll('.tab-button');
    const slider = document.querySelector('.tab-slider');
    const tabBar = document.querySelector('.tab-navigation');

    tabButtons.forEach((btn, idx) => {
      if (idx === (this.state.currentTab === 'team-stats' ? 0 : 1)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (slider && tabBar) {
      const containerPadding = 5;
      const tabWidth = ((tabBar as HTMLElement).offsetWidth - (containerPadding * 2)) / 2;
      const index = this.state.currentTab === 'team-stats' ? 0 : 1;
      (slider as HTMLElement).style.left = `${containerPadding + (index * tabWidth)}px`;
      (slider as HTMLElement).style.width = `${tabWidth}px`;
    }
  }

  /**
   * Update week display
   */
  private updateWeekDisplay(): void {
    const weekTextEl = document.getElementById('weekText');
    const weekDisplay = document.getElementById('weekDisplay');

    if (this.state.currentWeek === null) {
      const today = window.getDhakaNow?.() || new Date();
      this.state.currentWeek = window.getDhakaWeekNumber?.(today) || 1;
      this.state.currentWeekYear = today.getFullYear();
    }

    if (weekTextEl) {
      weekTextEl.textContent = `Week ${this.state.currentWeek || '-'}`;
    }

    if (weekDisplay) {
      if (this.state.useWeekFilter) {
        (weekDisplay as HTMLElement).style.backgroundColor = 'var(--primary-color)';
        (weekDisplay as HTMLElement).style.color = 'var(--white)';
        (weekDisplay as HTMLElement).style.borderColor = 'var(--primary-color)';
        (weekDisplay as HTMLElement).style.cursor = 'default';
      } else {
        (weekDisplay as HTMLElement).style.backgroundColor = '#f3f4f6';
        (weekDisplay as HTMLElement).style.color = '#6b7280';
        (weekDisplay as HTMLElement).style.borderColor = '#e5e7eb';
        (weekDisplay as HTMLElement).style.cursor = 'pointer';
      }
    }
  }

  /**
   * Toggle filters dropdown
   */
  private toggleFilters(): void {
    const dropdown = document.getElementById('filterDropdown');
    const filterBtn = document.getElementById('filterBtn');
    if (dropdown && filterBtn) {
      dropdown.classList.toggle('active');
      filterBtn.classList.toggle('active');
    }
  }

  /**
   * Refresh data based on current tab
   */
  private async refreshData(): Promise<void> {
    this.renderer.showLoadingState();
    
    try {
      if (this.state.currentTab === 'team-stats') {
        const stats = await this.service.calculateTeamStats();
        this.state.teamStats = stats;
        this.renderer.renderTeamStats(stats);
      } else {
        const data = await this.service.calculateStandupViewData();
        this.state.standupViewData = data;
        this.renderer.renderStandupView(data);
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      this.renderer.hideLoadingState();
    }
  }
}

// Global functions for inline event handlers
(window as any).applyDateFilter = function() {
  const startDateEl = document.getElementById('startDate') as HTMLInputElement;
  const endDateEl = document.getElementById('endDate') as HTMLInputElement;
  const startDate = startDateEl?.value || null;
  const endDate = endDateEl?.value || null;

  // This will be handled by the controller
  if ((window as any).auditorDashboardController) {
    (window as any).auditorDashboardController.applyDateFilter(startDate, endDate);
  }
};

(window as any).clearDateFilter = function() {
  if ((window as any).auditorDashboardController) {
    (window as any).auditorDashboardController.clearDateFilter();
  }
};

(window as any).applyFilters = function() {
  const statusEl = document.getElementById('statusFilter') as HTMLSelectElement;
  const channelEl = document.getElementById('channelFilter') as HTMLSelectElement;
  const auditorEl = document.getElementById('auditorFilter') as HTMLSelectElement;
  const employeeEl = document.getElementById('employeeFilter') as HTMLSelectElement;
  const scorecardEl = document.getElementById('scorecardFilter') as HTMLSelectElement;

  if ((window as any).auditorDashboardState) {
    (window as any).auditorDashboardState.currentFilters = {
      status: statusEl?.value || '',
      channel: channelEl?.value || '',
      auditor: auditorEl?.value || '',
      employee: employeeEl?.value || '',
      scorecard: scorecardEl?.value || ''
    };
    (window as any).auditorDashboardState.applyFilters();
  }
};

(window as any).clearFilters = function() {
  if ((window as any).auditorDashboardState) {
    (window as any).auditorDashboardState.clearFilters();
  }
};

(window as any).switchTab = async function(tabElement: HTMLElement, index: number) {
  if ((window as any).auditorDashboardController) {
    await (window as any).auditorDashboardController.switchTab(index);
  }
};

