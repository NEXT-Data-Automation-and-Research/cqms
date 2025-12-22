/**
 * Application Layer - Auditor Dashboard State
 * Manages application state and business logic
 */

import type {
  Auditor,
  AuditorStats,
  TeamStats,
  StandupViewData,
  Filters,
  PeriodDates
} from '../domain/entities.js';
import type { 
  DateFilterType,
  DateRange,
  WeekInfo,
  TabType,
  LoadingState
} from '../domain/types.js';

export class AuditorDashboardState {
  // Current user
  currentUserEmail: string = '';
  currentUserRole: string = '';

  // Data
  allUsers: Auditor[] = [];
  allAssignments: any[] = [];
  unfilteredAssignments: any[] = [];
  allScorecards: any[] = [];
  cachedScorecardTables: string[] = [];

  // Current view
  currentTab: TabType = 'team-stats';
  currentFilters: Filters = {
    status: '',
    channel: '',
    auditor: '',
    employee: '',
    scorecard: ''
  };

  // Date/Period filtering
  dateFilter: DateRange = { start: null, end: null };
  currentWeek: number | null = null;
  currentWeekYear: number | null = null;
  useWeekFilter: boolean = false;

  // Stats data
  teamStats: TeamStats | null = null;
  standupViewData: StandupViewData | null = null;

  // Loading state
  loading: LoadingState = {
    isLoading: false,
    isInitialLoad: true,
    renderInProgress: false
  };

  // Fetch tracking
  currentFetchId: number = 0;

  // Presence tracking
  onlineAuditors: Set<string> = new Set();
  presenceChannel: any = null;
  heartbeatInterval: any = null;

  /**
   * Initialize state with current user
   */
  initialize(userEmail: string, userRole: string): void {
    this.currentUserEmail = userEmail;
    this.currentUserRole = userRole;
  }

  /**
   * Cancel any ongoing fetches
   */
  cancelOngoingFetches(): void {
    this.currentFetchId++;
    this.loading.isLoading = false;
    this.loading.renderInProgress = false;
  }

  /**
   * Get current period dates based on active filter
   */
  getCurrentPeriodDates(): PeriodDates {
    if (this.dateFilter.start || this.dateFilter.end) {
      const start = this.dateFilter.start
        ? window.getDhakaStartOfDay?.(window.parseDhakaDate?.(this.dateFilter.start) || new Date()) || new Date(0)
        : new Date(0);
      const end = this.dateFilter.end
        ? window.getDhakaEndOfDay?.(window.parseDhakaDate?.(this.dateFilter.end) || new Date()) || new Date()
        : window.getDhakaNow?.() || new Date();
      return { start, end };
    } else if (this.useWeekFilter && this.currentWeek !== null) {
      const weekDates = window.getDhakaWeekDates?.(this.currentWeek, this.currentWeekYear || new Date().getFullYear());
      return weekDates || { start: new Date(), end: new Date() };
    } else {
      // Default to today
      const today = window.getDhakaNow?.() || new Date();
      return {
        start: window.getDhakaStartOfDay?.(today) || today,
        end: window.getDhakaEndOfDay?.(today) || today
      };
    }
  }

  /**
   * Initialize today filter
   */
  initializeTodayFilter(): void {
    const today = window.getDhakaNow?.() || new Date();
    const startOfDay = window.getDhakaStartOfDay?.(today) || today;
    const endOfDay = window.getDhakaEndOfDay?.(today) || today;
    const startStr = window.formatDhakaDateForInput?.(startOfDay) || '';
    const endStr = window.formatDhakaDateForInput?.(endOfDay) || '';

    this.dateFilter.start = startStr;
    this.dateFilter.end = endStr;
    this.useWeekFilter = false;
  }

  /**
   * Switch to week view
   */
  switchToWeekView(): void {
    if (this.currentWeek === null) {
      const today = window.getDhakaNow?.() || new Date();
      this.currentWeek = window.getDhakaWeekNumber?.(today) || 1;
      this.currentWeekYear = today.getFullYear();
    }
    this.useWeekFilter = true;
    this.dateFilter.start = null;
    this.dateFilter.end = null;
  }

  /**
   * Navigate week
   */
  navigateWeek(direction: number): void {
    if (this.currentWeek === null) {
      const today = window.getDhakaNow?.() || new Date();
      this.currentWeek = window.getDhakaWeekNumber?.(today) || 1;
      this.currentWeekYear = today.getFullYear();
    }

    this.currentWeek += direction;

    if (this.currentWeek > 52) {
      this.currentWeek = 1;
      this.currentWeekYear = (this.currentWeekYear || new Date().getFullYear()) + 1;
    } else if (this.currentWeek < 1) {
      this.currentWeek = 52;
      this.currentWeekYear = (this.currentWeekYear || new Date().getFullYear()) - 1;
    }
  }

  /**
   * Apply date filter
   */
  applyDateFilter(startDate: string | null, endDate: string | null): void {
    if (startDate || endDate) {
      this.dateFilter.start = startDate;
      this.dateFilter.end = endDate || startDate; // If only one date, use it for both
      this.useWeekFilter = false;
    } else {
      this.initializeTodayFilter();
    }
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.currentFilters = {
      status: '',
      channel: '',
      auditor: '',
      employee: '',
      scorecard: ''
    };
    this.allAssignments = [...this.unfilteredAssignments];
  }

  /**
   * Apply filters to assignments
   */
  applyFilters(): void {
    this.allAssignments = [...this.unfilteredAssignments];

    if (this.currentFilters.status) {
      this.allAssignments = this.allAssignments.filter(a => a.status === this.currentFilters.status);
    }

    if (this.currentFilters.channel) {
      this.allAssignments = this.allAssignments.filter(a => {
        const emp = this.allUsers.find(u => u.email === a.employee_email);
        return emp && emp.channel === this.currentFilters.channel;
      });
    }

    if (this.currentFilters.auditor) {
      this.allAssignments = this.allAssignments.filter(a => a.auditor_email === this.currentFilters.auditor);
    }

    if (this.currentFilters.employee) {
      this.allAssignments = this.allAssignments.filter(a => a.employee_email === this.currentFilters.employee);
    }

    if (this.currentFilters.scorecard) {
      this.allAssignments = this.allAssignments.filter(a => a.scorecard_id === this.currentFilters.scorecard);
    }
  }

  /**
   * Reset state
   */
  reset(): void {
    this.allUsers = [];
    this.allAssignments = [];
    this.unfilteredAssignments = [];
    this.teamStats = null;
    this.standupViewData = null;
    this.loading = {
      isLoading: false,
      isInitialLoad: true,
      renderInProgress: false
    };
  }
}

// Singleton instance
export const auditorDashboardState = new AuditorDashboardState();

