/**
 * Home Page State Management
 * Manages global state for the home page dashboard
 */

interface UserInfo {
  email?: string;
  role?: string;
}

interface DateFilter {
  start: Date | null;
  end: Date | null;
}

interface Filters {
  channel: string;
  status: string;
  agent: string;
}

interface Audit {
  id?: string;
  [key: string]: unknown;
}

interface Assignment {
  id?: string;
  [key: string]: unknown;
}

interface Notification {
  id: string;
  type: string;
  assignmentId?: string;
  auditId?: string;
  tableName?: string;
  [key: string]: unknown;
}

export const homeState = {
  // User state
  currentUserEmail: '' as string,
  currentUserRole: '' as string,
  isAgent: false as boolean,
  allUsers: [] as unknown[],
  allAssignments: [] as Assignment[],
  assignedAudits: [] as Audit[],
  sortBy: 'date_desc' as string,
  
  // Notifications
  notifications: [] as Notification[],
  unreadNotificationCount: 0 as number,
  
  // Date filter state
  dateFilter: { start: null, end: null } as DateFilter,
  currentFilters: { channel: '', status: '', agent: '' } as Filters,
  currentWeek: null as number | null,
  currentWeekYear: null as number | null,
  useWeekFilter: true as boolean,
  
  /**
   * Initialize state from user info
   */
  initialize(userInfo: UserInfo): void {
    this.currentUserEmail = (userInfo.email || '').toLowerCase().trim();
    this.currentUserRole = userInfo.role || '';
    this.isAgent = this.currentUserRole === 'Employee';
  },
  
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
};






