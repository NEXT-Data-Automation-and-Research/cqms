/**
 * Home Page State Management
 * Centralized state for the home page dashboard
 */

import type { User, Assignment, Audit, Notification, DateFilter, Filters } from './types.js';

export class HomeState {
  // User state
  currentUserEmail: string = '';
  currentUserRole: string = '';
  isAgent: boolean = false;
  allUsers: User[] = [];
  allAssignments: Assignment[] = [];
  assignedAudits: Audit[] = [];
  sortBy: string = 'date_desc';
  
  // Notifications
  notifications: Notification[] = [];
  unreadNotificationCount: number = 0;
  
  // Date filter state
  dateFilter: DateFilter = { start: null, end: null };
  currentFilters: Filters = { channel: '', status: '', agent: '' };
  currentWeek: number | null = null;
  currentWeekYear: number | null = null;
  useWeekFilter: boolean = true;

  /**
   * Initialize state from user info
   */
  initialize(userInfo: User): void {
    this.currentUserEmail = (userInfo.email || '').toLowerCase().trim();
    this.currentUserRole = userInfo.role || '';
    this.isAgent = this.currentUserRole === 'Employee';
  }

  /**
   * Reset state
   */
  reset(): void {
    this.currentUserEmail = '';
    this.currentUserRole = '';
    this.isAgent = false;
    this.allUsers = [];
    this.allAssignments = [];
    this.assignedAudits = [];
    this.notifications = [];
    this.unreadNotificationCount = 0;
    this.dateFilter = { start: null, end: null };
    this.currentFilters = { channel: '', status: '', agent: '' };
    this.currentWeek = null;
    this.currentWeekYear = null;
    this.useWeekFilter = true;
  }
}

// Export singleton instance
export const homeState = new HomeState();

