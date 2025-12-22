/**
 * Domain Types for Auditor Dashboard
 * Type definitions and enums
 */

export type TabType = 'team-stats' | 'standup-view';

export type DateFilterType = 'today' | 'yesterday' | 'thisMonth' | 'lastMonth' | 'custom' | 'week';

export type AssignmentStatus = 'pending' | 'in_progress' | 'completed';

export interface DateRange {
  start: string | null; // YYYY-MM-DD format
  end: string | null; // YYYY-MM-DD format
}

export interface WeekInfo {
  week: number;
  year: number;
}

export interface LoadingState {
  isLoading: boolean;
  isInitialLoad: boolean;
  renderInProgress: boolean;
}

export interface ChartInstance {
  destroy: () => void;
}

