/**
 * Type definitions for global utility functions
 */
export {};

declare global {
  interface Window {
    supabaseClient?: any;
    applyQuickDateFilter?: (period: string, options?: any) => void;
    logout?: () => Promise<void>;
    getDhakaNow?: () => Date;
    getDhakaWeekNumber?: (date: Date) => number;
    getDhakaWeekDates?: (weekNumber: number, year: number) => { start: Date; end: Date };
    getDhakaStartOfDay?: (date?: Date) => Date;
    getDhakaEndOfDay?: (date?: Date) => Date;
    getDhakaFirstDayOfMonth?: (date: Date) => Date;
    getDhakaLastDayOfMonth?: (date: Date) => Date;
    formatDhakaDateForInput?: (date: Date) => string;
    formatDhakaDate?: (date: Date, options?: any) => string;
    parseDhakaDate?: (dateString: string) => Date;
    dhakaDateToUTCISO?: (date: Date) => string;
    toDhakaTime?: (utcString: string) => Date;
    componentsLoaded?: boolean;
  }
}

interface User {
  email?: string;
  name?: string;
  role?: string;
  channel?: string;
  team?: string;
  team_supervisor?: string;
  quality_mentor?: boolean;
  employee_id?: string;
  intercom_admin_alias?: string;
  [key: string]: unknown;
}

interface Assignment {
  id?: string;
  employee_email?: string;
  employee_name?: string;
  auditor_email?: string;
  status?: string;
  created_at?: string;
  scheduled_date?: string;
  channel?: string;
  scorecard_id?: string;
  scorecards?: {
    id?: string;
    name?: string;
    table_name?: string;
  };
  [key: string]: unknown;
}

interface Audit {
  id?: string;
  employee_email?: string;
  employee_name?: string;
  auditor_email?: string;
  auditor_name?: string;
  status?: string;
  passing_status?: string;
  passingStatus?: string;
  average_score?: number | string;
  averageScore?: number | string;
  total_errors_count?: number | string;
  totalErrorsCount?: number | string;
  interaction_id?: string;
  channel?: string;
  submitted_at?: string;
  created_at?: string;
  reversal_requested_at?: string;
  reversalRequestedAt?: string;
  reversal_responded_at?: string;
  reversalRespondedAt?: string;
  reversal_approved?: boolean | string | number | null;
  acknowledgement_status?: string;
  acknowledgementStatus?: string;
  audit_duration?: number | string;
  _scorecard_id?: string;
  _scorecard_name?: string;
  _scorecard_table?: string;
  _scoring_type?: string;
  _isAssignment?: boolean;
  [key: string]: unknown;
}

interface Notification {
  id: string;
  type: string;
  title?: string;
  message?: string;
  timestamp?: string;
  status?: string;
  assignmentId?: string;
  auditId?: string;
  tableName?: string;
  scorecardId?: string;
  scorecardTable?: string;
  interactionId?: string;
  displayName?: string | null;
  displayEmail?: string | null;
  statusText?: string;
  [key: string]: unknown;
}

interface Update {
  id: string;
  type: string;
  timestamp?: string;
  status?: string;
  assignmentId?: string;
  auditId?: string;
  scorecardId?: string;
  scorecardTable?: string;
  interactionId?: string;
  displayName?: string | null;
  displayEmail?: string | null;
  statusText?: string;
  [key: string]: unknown;
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

interface PeriodDates {
  start: Date;
  end: Date;
}

interface StatsData {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  remaining: number;
  percentage: number;
  daysRemaining: number;
  avgDuration: number;
  avgDurationText: string;
  totalAuditsConducted: number;
  totalScoreSum: number;
  totalAuditsWithScore: number;
  avgQualityScore: number;
  avgQualityScoreText: string;
  passingCount: number;
  notPassingCount: number;
  activeReversals: number;
  resolvedReversals: number;
  totalReversals: number;
  requiresAcknowledgment: number;
}

interface FiltersData {
  channels: string[];
  agents: string[];
}

interface Scorecard {
  id?: string;
  name?: string;
  table_name?: string;
  scoring_type?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

interface Event {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  type?: string;
  meet_link?: string;
  created_by?: string;
  participants?: string[] | string;
  [key: string]: unknown;
}

// Dashboard State
let currentUserEmail: string = '';
let currentUserRole: string = '';
let isAgent: boolean = false;
let allUsers: User[] = [];
let allAssignments: Assignment[] = [];
let assignedAudits: Audit[] = [];
let sortBy: string = 'date_desc'; // Default will be updated based on user role
let notifications: Notification[] = [];
let unreadNotificationCount: number = 0;

// Date Filter State
let dateFilter: DateFilter = { start: null, end: null };
let currentFilters: Filters = { channel: '', status: '', agent: '' };
let currentWeek: number | null = null; // Current week number (1-52)
let currentWeekYear: number | null = null; // Year for the current week
let useWeekFilter: boolean = true; // Whether to use week filter (default) or date range filter

// Helper function to get week number (1-52)
function getWeekNumber(date: Date | null = null): number {
  if (!date && window.getDhakaNow) date = window.getDhakaNow();
  if (!date) date = new Date();
  if (window.getDhakaWeekNumber) {
    return window.getDhakaWeekNumber(date);
  }
  return 1; // Fallback
}

// Helper function to get week dates (Monday to Sunday)
function getWeekDates(weekNumber: number, year: number): { start: Date; end: Date } {
  if (window.getDhakaWeekDates) {
    return window.getDhakaWeekDates(weekNumber, year);
  }
  // Fallback
  return { start: new Date(), end: new Date() };
}

// Initialize week filter
function initializeWeekFilter(): void {
  const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
  if (window.getDhakaWeekNumber) {
    currentWeek = window.getDhakaWeekNumber(today);
  }
  currentWeekYear = today.getFullYear();
  updateWeekDisplay();
}

// Update week display
function updateWeekDisplay(): void {
  const weekTextEl = document.getElementById('weekText');
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const weekDisplay = document.getElementById('weekDisplay');
  
  // Initialize current week if not set
  if (currentWeek === null) {
    const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
    currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
    currentWeekYear = today.getFullYear();
  }
  
  if (weekTextEl) {
    if (useWeekFilter && currentWeek !== null) {
      weekTextEl.textContent = `Week ${currentWeek}`;
    } else {
      weekTextEl.textContent = `Week ${currentWeek || '-'}`;
    }
  }
  
  // Always enable week navigation buttons - they can switch to week view when clicked
  if (prevWeekBtn) {
    prevWeekBtn.removeAttribute('disabled');
    (prevWeekBtn as HTMLButtonElement).disabled = false;
    prevWeekBtn.style.opacity = '1';
    prevWeekBtn.style.cursor = 'pointer';
    prevWeekBtn.style.pointerEvents = 'auto';
  }
  
  if (nextWeekBtn) {
    nextWeekBtn.removeAttribute('disabled');
    (nextWeekBtn as HTMLButtonElement).disabled = false;
    nextWeekBtn.style.opacity = '1';
    nextWeekBtn.style.cursor = 'pointer';
    nextWeekBtn.style.pointerEvents = 'auto';
  }
  
  // Update week display styling
  if (weekDisplay) {
    if (useWeekFilter) {
      weekDisplay.style.backgroundColor = '#1a733e';
      weekDisplay.style.color = 'white';
      weekDisplay.style.borderColor = '#1a733e';
      weekDisplay.style.cursor = 'default';
      weekDisplay.style.pointerEvents = 'auto';
    } else {
      weekDisplay.style.backgroundColor = '#f3f4f6';
      weekDisplay.style.color = '#6b7280';
      weekDisplay.style.borderColor = '#e5e7eb';
      weekDisplay.style.cursor = 'pointer';
      weekDisplay.style.pointerEvents = 'auto';
    }
  }
}

// Navigate week
function navigateWeek(direction: number): void {
  // Initialize current week if not set
  if (currentWeek === null || currentWeekYear === null) {
    const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
    currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
    currentWeekYear = today.getFullYear();
  }
  
  if (currentWeek !== null) {
    currentWeek += direction;
    
    // Handle week overflow/underflow
    if (currentWeek > 52) {
      currentWeek = 1;
      if (currentWeekYear !== null) currentWeekYear += 1;
    } else if (currentWeek < 1) {
      currentWeek = 52;
      if (currentWeekYear !== null) currentWeekYear -= 1;
    }
  }
  
  // Switch to week view when navigating
  useWeekFilter = true;
  dateFilter.start = null;
  dateFilter.end = null;
  const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
  const dateBtnTextEl = document.getElementById('dateBtnText');
  if (startDateInput) startDateInput.value = '';
  if (endDateInput) endDateInput.value = '';
  if (dateBtnTextEl) dateBtnTextEl.textContent = 'Date Range';
  
  // Clear active state of quick filter buttons when switching to week view
  const quickDateButtons = document.querySelectorAll('.quick-date-btn');
  quickDateButtons.forEach(btn => btn.classList.remove('active'));
  
  updateWeekDisplay();
  
  // Reload data with week filter
  Promise.all([
    loadRecentUpdates(),
    updateYourStats(),
    loadAssignedAudits(),
    loadNotifications()
  ]);
}

// Function to switch to week view when week display is clicked
function switchToWeekView(): void {
  // Initialize current week if not set
  if (currentWeek === null) {
    const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
    currentWeek = window.getDhakaWeekNumber ? window.getDhakaWeekNumber(today) : 1;
    currentWeekYear = today.getFullYear();
  }
  
  useWeekFilter = true;
  dateFilter.start = null;
  dateFilter.end = null;
  const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
  const dateBtnTextEl = document.getElementById('dateBtnText');
  if (startDateInput) startDateInput.value = '';
  if (endDateInput) endDateInput.value = '';
  if (dateBtnTextEl) dateBtnTextEl.textContent = 'Date Range';
  
  // Clear active state of quick filter buttons when switching to week view
  const quickDateButtons = document.querySelectorAll('.quick-date-btn');
  quickDateButtons.forEach(btn => btn.classList.remove('active'));
  
  updateWeekDisplay();
  
  // Reload data with week filter
  Promise.all([
    loadRecentUpdates(),
    updateYourStats(),
    loadAssignedAudits(),
    loadNotifications()
  ]);
}

// Initialize date filter (now uses month filter by default)
function initializeDateFilter(): void {
  // Initialize month filter (default view)
  const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
  const firstDay = window.getDhakaFirstDayOfMonth ? window.getDhakaFirstDayOfMonth(today) : new Date();
  const lastDay = window.getDhakaLastDayOfMonth ? window.getDhakaLastDayOfMonth(today) : new Date();
  
  dateFilter.start = firstDay;
  dateFilter.end = lastDay;
  useWeekFilter = false;
  
  const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
  if (startDateInput && window.formatDhakaDateForInput) startDateInput.value = window.formatDhakaDateForInput(firstDay);
  if (endDateInput && window.formatDhakaDateForInput) endDateInput.value = window.formatDhakaDateForInput(lastDay);
  
  updateDateButtonText();
  
  // Activate "This Month" button
  const quickDateButtons = document.querySelectorAll('.quick-date-btn');
  quickDateButtons.forEach(btn => btn.classList.remove('active'));
  const thisMonthBtn = document.getElementById('thisMonthBtn');
  if (thisMonthBtn) {
    thisMonthBtn.classList.add('active');
  }
  
  // Initialize week filter for display purposes
  initializeWeekFilter();
}

function formatDateForInput(date: Date): string {
  if (window.formatDhakaDateForInput) {
    return window.formatDhakaDateForInput(date);
  }
  return date.toISOString().split('T')[0]; // Fallback
}

function updateDateButtonText(): void {
  const dateBtnText = document.getElementById('dateBtnText');
  if (!dateBtnText) return;
  
  if (dateFilter.start && dateFilter.end) {
    const start = dateFilter.start instanceof Date ? dateFilter.start : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(dateFilter.start)) : dateFilter.start);
    const end = dateFilter.end instanceof Date ? dateFilter.end : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(dateFilter.end)) : dateFilter.end);
    const startStr = window.formatDhakaDate ? window.formatDhakaDate(start, { month: 'short', day: 'numeric' }) : start.toLocaleDateString();
    const endStr = window.formatDhakaDate ? window.formatDhakaDate(end, { month: 'short', day: 'numeric' }) : end.toLocaleDateString();
    dateBtnText.textContent = `${startStr} - ${endStr}`;
  } else {
    dateBtnText.textContent = 'Date Range';
  }
}

// Get current period dates (week or date range)
function getCurrentPeriodDates(): PeriodDates {
  if (dateFilter.start || dateFilter.end) {
    // Using date range filter
    return {
      start: dateFilter.start ? (dateFilter.start instanceof Date ? dateFilter.start : (window.getDhakaStartOfDay && window.parseDhakaDate && window.formatDhakaDateForInput ? window.getDhakaStartOfDay(window.parseDhakaDate(window.formatDhakaDateForInput(dateFilter.start))) : new Date(dateFilter.start))) : new Date(0),
      end: dateFilter.end ? (dateFilter.end instanceof Date ? dateFilter.end : (window.getDhakaEndOfDay && window.parseDhakaDate && window.formatDhakaDateForInput ? window.getDhakaEndOfDay(window.parseDhakaDate(window.formatDhakaDateForInput(dateFilter.end))) : new Date(dateFilter.end))) : (window.getDhakaNow ? window.getDhakaNow() : new Date())
    };
  } else if (useWeekFilter && currentWeek !== null && currentWeekYear !== null) {
    // Using week filter
    return window.getDhakaWeekDates ? window.getDhakaWeekDates(currentWeek, currentWeekYear) : { start: new Date(), end: new Date() };
  } else {
    // Default to current week
    const today = window.getDhakaNow ? window.getDhakaNow() : new Date();
    return window.getDhakaWeekDates && window.getDhakaWeekNumber ? window.getDhakaWeekDates(window.getDhakaWeekNumber(today), today.getFullYear()) : { start: new Date(), end: new Date() };
  }
}

// Apply date filter
function applyDateFilter(): void {
  const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
  
  if (startDateInput && startDateInput.value) {
    const startDate = window.getDhakaStartOfDay ? window.getDhakaStartOfDay(window.parseDhakaDate ? window.parseDhakaDate(startDateInput.value) : new Date(startDateInput.value)) : new Date(startDateInput.value);
    dateFilter.start = startDate;
  } else {
    dateFilter.start = null;
  }
  
  if (endDateInput && endDateInput.value) {
    const endDate = window.getDhakaEndOfDay ? window.getDhakaEndOfDay(window.parseDhakaDate ? window.parseDhakaDate(endDateInput.value) : new Date(endDateInput.value)) : new Date(endDateInput.value);
    dateFilter.end = endDate;
  } else {
    dateFilter.end = null;
  }
  
  // Update button text
  if (dateFilter.start || dateFilter.end) {
    const start = dateFilter.start ? (window.formatDhakaDate ? window.formatDhakaDate(dateFilter.start instanceof Date ? dateFilter.start : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(dateFilter.start)) : dateFilter.start), { month: 'short', day: 'numeric' }) : dateFilter.start.toLocaleDateString()) : 'Start';
    const end = dateFilter.end ? (window.formatDhakaDate ? window.formatDhakaDate(dateFilter.end instanceof Date ? dateFilter.end : (window.parseDhakaDate && window.formatDhakaDateForInput ? window.parseDhakaDate(window.formatDhakaDateForInput(dateFilter.end)) : dateFilter.end), { month: 'short', day: 'numeric' }) : dateFilter.end.toLocaleDateString()) : 'End';
    const dateBtnText = document.getElementById('dateBtnText');
    if (dateBtnText) {
      dateBtnText.textContent = `${start} - ${end}`;
    }
    useWeekFilter = false; // Date range overrides week filter
    
    // Clear active state of quick filter buttons when using custom date range
    const quickDateButtons = document.querySelectorAll('.quick-date-btn');
    quickDateButtons.forEach(btn => btn.classList.remove('active'));
    
    updateWeekDisplay(); // Update week display to show "-"
  } else {
    updateDateButtonText();
    useWeekFilter = true; // Clear date range, go back to week filter
    updateWeekDisplay(); // Update week display to show week number
  }
  
  const dateDropdown = document.getElementById('dateDropdown');
  if (dateDropdown) dateDropdown.classList.remove('active');
  
  // Reload data with filters
  Promise.all([
    loadRecentUpdates(),
    updateYourStats(),
    loadAssignedAudits(),
    loadNotifications()
  ]);
}

// Use shared date filter utility - wrap to provide page-specific callbacks
// Note: home.html uses Date objects instead of date strings
// Save reference to original utility function before defining wrapper
const originalApplyQuickDateFilter = window.applyQuickDateFilter;

window.applyQuickDateFilter = function(period: string): void {
  // Check if the utility function is available
  if (typeof originalApplyQuickDateFilter !== 'function') {
    console.error('applyQuickDateFilter utility not loaded yet. Please ensure date-filter-utils.js is loaded.');
    // Fallback: try to apply the filter manually
    try {
      const today = window.getDhakaStartOfDay ? window.getDhakaStartOfDay() : new Date();
      let startDate: Date, endDate: Date;
      
      switch(period) {
        case 'today':
          startDate = window.getDhakaStartOfDay ? window.getDhakaStartOfDay() : new Date();
          endDate = window.getDhakaEndOfDay ? window.getDhakaEndOfDay() : new Date();
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = window.getDhakaStartOfDay ? window.getDhakaStartOfDay(yesterday) : yesterday;
          endDate = window.getDhakaEndOfDay ? window.getDhakaEndOfDay(yesterday) : yesterday;
          break;
        case 'thisMonth':
          startDate = window.getDhakaFirstDayOfMonth ? window.getDhakaFirstDayOfMonth(today) : new Date();
          endDate = window.getDhakaLastDayOfMonth ? window.getDhakaLastDayOfMonth(today) : new Date();
          break;
        default:
          return;
      }
      
      dateFilter.start = startDate;
      dateFilter.end = endDate;
      useWeekFilter = false;
      
      const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
      const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
      if (startDateInput) startDateInput.value = formatDateForInput(startDate);
      if (endDateInput) endDateInput.value = formatDateForInput(endDate);
      
      updateDateButtonText();
      updateWeekDisplay();
      
      // Update active state
      const quickDateButtons = document.querySelectorAll('.quick-date-btn');
      quickDateButtons.forEach(btn => btn.classList.remove('active'));
      const activeButton = document.getElementById(period + 'Btn');
      if (activeButton) activeButton.classList.add('active');
      
      // Refresh data
      Promise.all([
        loadRecentUpdates(),
        updateYourStats(),
        loadAssignedAudits(),
        loadNotifications()
      ]);
    } catch (error) {
      console.error('Error applying quick date filter:', error);
    }
    return;
  }
  
  originalApplyQuickDateFilter(period, {
    dateFilter: dateFilter,
    setUseWeekFilter: () => { useWeekFilter = false; },
    useDateObjects: true,
    formatDateForInput: formatDateForInput,
    onUpdate: updateWeekDisplay,
    onRefresh: () => {
      Promise.all([
        loadRecentUpdates(),
        updateYourStats(),
        loadAssignedAudits(),
        loadNotifications()
      ]);
    }
  });
};

// Clear date filter
function clearDateFilter(): void {
  dateFilter.start = null;
  dateFilter.end = null;
  const startDateInput = document.getElementById('startDate') as HTMLInputElement | null;
  const endDateInput = document.getElementById('endDate') as HTMLInputElement | null;
  if (startDateInput) startDateInput.value = '';
  if (endDateInput) endDateInput.value = '';
  updateDateButtonText();
  const dateDropdown = document.getElementById('dateDropdown');
  if (dateDropdown) dateDropdown.classList.remove('active');
  useWeekFilter = true; // Go back to week filter
  
  // Clear active state of quick filter buttons
  const quickDateButtons = document.querySelectorAll('.quick-date-btn');
  quickDateButtons.forEach(btn => btn.classList.remove('active'));
  
  updateWeekDisplay(); // Update week display to show week number
  
  // Reload data with week filter
  Promise.all([
    loadRecentUpdates(),
    updateYourStats(),
    loadAssignedAudits(),
    loadNotifications()
  ]);
}

// Apply filters
function applyFilters(): void {
  const channelSelect = document.getElementById('filterChannel') as HTMLSelectElement | null;
  const statusSelect = document.getElementById('filterStatus') as HTMLSelectElement | null;
  const agentSelect = document.getElementById('filterAgent') as HTMLSelectElement | null;
  
  currentFilters.channel = channelSelect ? channelSelect.value : '';
  currentFilters.status = statusSelect ? statusSelect.value : '';
  currentFilters.agent = agentSelect ? agentSelect.value : '';
  
  // Reload data with filters
  Promise.all([
    loadRecentUpdates(),
    updateYourStats(),
    loadAssignedAudits(),
    loadNotifications()
  ]);
}

// Populate filter options
async function populateFilters() {
  try {
    // Always fetch fresh data
    await fetchAndCacheFilters();
  } catch (error) {
    console.error('Error populating filters:', error);
  }
}

async function fetchAndCacheFilters() {
  try {
    // Load all assignments for filter population (without filters)
    let allAssignmentsForFilters: Audit[] = [];
    
    if (isAgent) {
      // For agents, load all completed audits to get channels
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        for (const scorecard of scorecards) {
          try {
            const { data: audits, error } = await (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('channel, employee_email')
              .eq('employee_email', currentUserEmail);
            
            if (!error && audits) {
              allAssignmentsForFilters = allAssignmentsForFilters.concat(audits);
            }
          } catch (err) {
            console.warn(`Error loading audits for filters from ${scorecard.table_name}:`, err);
          }
        }
      }
    } else {
      // For auditors, load all assignments from audit tables
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const assignmentPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            // Query scorecard tables (all audits in scorecard tables are completed by default)
            let { data: audits, error } = await (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('channel, employee_email')
              .eq('auditor_email', currentUserEmail);
            
            if (error) {
              // If error, table might not have auditor_email column - skip this table silently
              // Don't log warning as this is expected for some tables
              return [];
            }
            
            if (!error && audits) {
              return audits;
            }
            return [];
          } catch (err) {
            console.warn(`Error loading from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const assignmentResults = await Promise.all(assignmentPromises);
        allAssignmentsForFilters = assignmentResults.flat();
      }
    }
    
    // Populate channels
    const channels = [...new Set(allAssignmentsForFilters.map((a: Audit) => a.channel).filter((ch): ch is string => Boolean(ch)))].sort();
    const agents = !isAgent ? [...new Set(allAssignmentsForFilters.map((a: Audit) => a.employee_email).filter((em): em is string => Boolean(em)))].sort() : [];
    
    // Update UI with fresh data
    const filtersData: FiltersData = { channels, agents };
    console.log('Updating UI with fresh filters');
    renderFiltersFromData(filtersData);
  } catch (error) {
    console.error('Error populating filters:', error);
  }
}

function renderFiltersFromData(filtersData: FiltersData): void {
  const { channels, agents } = filtersData;
  
  // Populate channels
  const channelSelect = document.getElementById('filterChannel') as HTMLSelectElement | null;
  if (channelSelect) {
    const existingValue = channelSelect.value;
    channelSelect.innerHTML = '<option value="">All Channels</option>';
    channels.forEach((channel: string) => {
      const option = document.createElement('option');
      option.value = channel;
      option.textContent = channel;
      channelSelect.appendChild(option);
    });
    if (existingValue) channelSelect.value = existingValue;
  }

  // Populate agents (only for auditors)
  if (!isAgent) {
    const agentSelect = document.getElementById('filterAgent') as HTMLSelectElement | null;
    const agentGroup = document.getElementById('filterAgentGroup');
    if (agentSelect && agentGroup) {
      const existingValue = agentSelect.value;
      agentSelect.innerHTML = '<option value="">All Agents</option>';
      agents.forEach((agent: string) => {
        const option = document.createElement('option');
        option.value = agent;
        option.textContent = formatAgentName(agent);
        agentSelect.appendChild(option);
      });
      if (existingValue) agentSelect.value = existingValue;
      agentGroup.style.display = 'flex';
    }
  }
}

function formatAgentName(email: string | null | undefined): string {
  if (!email || email === 'Unknown') return 'Unknown';
  return email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
}

// Helper function to check if date is within filter range
function isDateInRange(date: string | Date, filterStart: Date | null, filterEnd: Date | null): boolean {
  // If no filters, check against current period (week or date range)
  if (!filterStart && !filterEnd) {
    const period = getCurrentPeriodDates();
    filterStart = period.start;
    filterEnd = period.end;
  }
  
  if (!filterStart && !filterEnd) return true;
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  if (filterStart) {
    const start = new Date(filterStart);
    start.setHours(0, 0, 0, 0);
    if (checkDate < start) return false;
  }
  
  if (filterEnd) {
    const end = new Date(filterEnd);
    end.setHours(23, 59, 59, 999);
    if (checkDate > end) return false;
  }
  
  return true;
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async function() {
  await initializeDashboard();
});

// Wait for Supabase with better strategy
async function waitForSupabase(maxWait = 2000): Promise<boolean> {
  if ((window as any).supabaseClient) return true;
  
  const startTime = Date.now();
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if ((window as any).supabaseClient) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > maxWait) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 50); // Check every 50ms instead of 100ms
  });
}

async function initializeDashboard() {
  try {
    // Get current user immediately (from cache) - no need to wait
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    currentUserEmail = (userInfo.email || '').toLowerCase().trim();
    currentUserRole = userInfo.role || '';
    isAgent = currentUserRole === 'Employee';

    if (!currentUserEmail) {
      console.error('No user logged in');
      return;
    }

    // Initialize UI immediately - no waiting
    initializeDateFilter();
    setupEventListeners();
    // Ensure week display is properly initialized after event listeners are set up
    updateWeekDisplay();
    updateUserAvatar(userInfo);

    // Update section titles for agents and hide create audit button
    if (isAgent) {
      const auditsTitle = document.getElementById('auditsSectionTitle');
      if (auditsTitle) auditsTitle.textContent = 'My Audits';
      const updatesTitle = document.getElementById('updatesSectionTitle');
      if (updatesTitle) updatesTitle.textContent = 'Updates to my audits';
      const createAuditBtn = document.getElementById('createAuditBtn');
      if (createAuditBtn) createAuditBtn.style.display = 'none';
      // Hide Create Audit and Settings from Quick Actions for employees
      const quickActionCreateAudit = document.getElementById('quickActionCreateAudit');
      if (quickActionCreateAudit) quickActionCreateAudit.style.display = 'none';
      const quickActionSettings = document.getElementById('quickActionSettings');
      if (quickActionSettings) quickActionSettings.style.display = 'none';
      const inProgressCard = document.getElementById('inProgressCard');
      if (inProgressCard) inProgressCard.style.display = 'none';
      const avgDurationCard = document.getElementById('avgDurationCard');
      if (avgDurationCard) avgDurationCard.style.display = 'none';
      const auditsConductedCard = document.getElementById('auditsConductedCard');
      if (auditsConductedCard) auditsConductedCard.style.display = 'none';
      const remainingCard = document.getElementById('remainingCard');
      if (remainingCard) remainingCard.style.display = 'none';
      // Hide average quality score card for agents
      const avgQualityScoreCard = document.getElementById('avgQualityScoreCard');
      if (avgQualityScoreCard) avgQualityScoreCard.style.display = 'none';
      // Show pass rate card for agents
      const passRateCard = document.getElementById('passRateCard');
      if (passRateCard) passRateCard.style.display = 'block';
      // Show acknowledgment card for agents
      const requiresAcknowledgmentCard = document.getElementById('requiresAcknowledgmentCard');
      if (requiresAcknowledgmentCard) requiresAcknowledgmentCard.style.display = 'block';
    } else {
      // Hide pass rate card for non-agents
      const passRateCard = document.getElementById('passRateCard');
      if (passRateCard) passRateCard.style.display = 'none';
      // Hide acknowledgment card for non-agents
      const requiresAcknowledgmentCard = document.getElementById('requiresAcknowledgmentCard');
      if (requiresAcknowledgmentCard) requiresAcknowledgmentCard.style.display = 'none';
      // Ensure avgDuration card is visible for auditors
      const avgDurationCard = document.getElementById('avgDurationCard');
      if (avgDurationCard) avgDurationCard.style.display = 'block';
      // Ensure average quality score card is visible for auditors
      const avgQualityScoreCard = document.getElementById('avgQualityScoreCard');
      if (avgQualityScoreCard) avgQualityScoreCard.style.display = 'block';
      const auditsConductedCard = document.getElementById('auditsConductedCard');
      if (auditsConductedCard) auditsConductedCard.style.display = 'block';
      const remainingCard = document.getElementById('remainingCard');
      if (remainingCard) remainingCard.style.display = 'block';
      const auditsTitle = document.getElementById('auditsSectionTitle');
      if (auditsTitle) auditsTitle.textContent = 'My Assigned Audits';
      const viewAllBtn = document.getElementById('viewAllBtn');
      if (viewAllBtn) viewAllBtn.style.display = 'block';
      const statusAscOption = document.getElementById('statusAscOption');
      const statusDescOption = document.getElementById('statusDescOption');
      if (statusAscOption) statusAscOption.textContent = 'Status (Pending → In Progress)';
      if (statusDescOption) statusDescOption.textContent = 'Status (In Progress → Pending)';
      sortBy = 'status_desc';
      const auditSortBy = document.getElementById('auditSortBy') as HTMLSelectElement | null;
      if (auditSortBy) auditSortBy.value = 'status_desc';
    }

    // Wait for Supabase in parallel with UI setup (max 2 seconds)
    const supabaseReady = await waitForSupabase(2000);
    
    if (!supabaseReady) {
      console.error('Supabase client not initialized');
      // Show error state in UI
      return;
    }

    // Load data in optimized order - users first, then everything in parallel
    // Use cached users if available
    const cachedUsers = sessionStorage.getItem('cachedUsers');
    const cachedUsersTime = sessionStorage.getItem('cachedUsersTime');
    const cacheAge = cachedUsersTime ? Date.now() - parseInt(cachedUsersTime) : Infinity;
    
    if (cachedUsers && cacheAge < 300000) { // 5 minutes cache
      allUsers = JSON.parse(cachedUsers);
    } else {
      await loadAllUsers();
      sessionStorage.setItem('cachedUsers', JSON.stringify(allUsers));
      sessionStorage.setItem('cachedUsersTime', Date.now().toString());
    }

    // Load all dashboard data in parallel
    await Promise.all([
      loadRecentUpdates(),
      updateYourStats(),
      loadAssignedAudits(),
      loadNotifications(),
      loadUpcomingEvents() // Preload events for calendar modal
    ]);

    // Populate filter options after loading data (non-blocking)
    populateFilters().catch(err => console.error('Error populating filters:', err));

  } catch (error) {
    console.error('Error initializing dashboard:', error);
  }
}

function setupEventListeners() {
  // Week navigation buttons
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const weekDisplay = document.getElementById('weekDisplay');
  
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => navigateWeek(-1));
  }
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => navigateWeek(1));
  }
  
  // Make week display clickable to switch to week view when in month/date range view
  if (weekDisplay) {
    weekDisplay.addEventListener('click', function(e) {
      e.stopPropagation();
      if (!useWeekFilter) {
        switchToWeekView();
      }
    });
    // Ensure it's clickable
    weekDisplay.style.pointerEvents = 'auto';
  }

  // Date button
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

  // Close dropdown when clicking outside
  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && !target.closest('.date-picker-dropdown')) {
      const dropdown = document.getElementById('dateDropdown');
      if (dropdown) {
        dropdown.classList.remove('active');
      }
    }
  });

  // Filter button
  const filterBtn = document.getElementById('filterBtn');
  if (filterBtn) {
    filterBtn.addEventListener('click', () => {
      const panel = document.getElementById('filterPanel');
      if (panel) {
        panel.classList.toggle('active');
        filterBtn.classList.toggle('active');
      }
    });
  }
}

function updateUserAvatar(userInfo: User): void {
  const avatarEl = document.getElementById('userAvatar');
  if (!avatarEl) return;

  if (userInfo.avatar) {
    avatarEl.innerHTML = `<img src="${userInfo.avatar}" alt="${userInfo.name || 'User'}" class="w-full h-full rounded-full object-cover">`;
  } else if (userInfo.name) {
    const initials = userInfo.name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
    avatarEl.innerHTML = `<span class="text-xs font-semibold">${initials}</span>`;
  }
  
  // Populate the premium dashboard
  populatePremiumDashboard();
}

// Populate the elegant profile dashboard
async function populatePremiumDashboard() {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  
  // Populate basic info
  const dashboardUserName = document.getElementById('dashboardUserName');
  const dashboardUserEmail = document.getElementById('dashboardUserEmail');
  const dashboardUserRole = document.getElementById('dashboardUserRole');
  const dashboardAvatar = document.getElementById('dashboardAvatar');
  const dashboardTodayDate = document.getElementById('dashboardTodayDate');
  
  if (dashboardUserName) dashboardUserName.textContent = userInfo.name || 'Unknown User';
  if (dashboardUserEmail) dashboardUserEmail.textContent = userInfo.email || '';
  if (dashboardUserRole) dashboardUserRole.textContent = userInfo.role || 'User';
  
  // Set today's date
  if (dashboardTodayDate) {
    const today = new Date();
    dashboardTodayDate.textContent = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  
  // Update dashboard avatar
  if (dashboardAvatar) {
    if (userInfo.avatar) {
      dashboardAvatar.innerHTML = `<img src="${userInfo.avatar}" class="w-full h-full rounded-full object-cover">`;
    } else if (userInfo.name) {
      const initials = userInfo.name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
      dashboardAvatar.innerHTML = `<span class="text-sm font-bold">${initials}</span>`;
    }
  }
  
  // Fetch full user details from database
  try {
    const { data: userData, error } = await window.supabaseClient
      .from('users')
      .select('email, name, role, channel, team, team_supervisor, quality_mentor, employee_id, intercom_admin_alias')
      .eq('email', currentUserEmail)
      .single();
    
    if (!error && userData) {
      const isEmployee = userData.role === 'Employee';
      const isAdmin = userData.role === 'Admin' || userData.role === 'Super Admin' || userData.role === 'Quality Analyst';
      
      // Show Intercom Alias for all users
      if (userData.intercom_admin_alias) {
        const pillIntercomAlias = document.getElementById('pillIntercomAlias');
        if (pillIntercomAlias) {
          pillIntercomAlias.classList.remove('hidden');
          const displayIntercomAlias = document.getElementById('displayIntercomAlias');
          if (displayIntercomAlias) displayIntercomAlias.textContent = userData.intercom_admin_alias;
        }
      }
      
      // Show/hide employee pills
      if (isEmployee) {
        const pillEmployeeId = document.getElementById('pillEmployeeId');
        const pillChannel = document.getElementById('pillChannel');
        const pillTeam = document.getElementById('pillTeam');
        const pillSupervisor = document.getElementById('pillSupervisor');
        
        if (pillEmployeeId) {
          pillEmployeeId.classList.remove('hidden');
          const displayEmployeeId = document.getElementById('displayEmployeeId');
          if (displayEmployeeId) displayEmployeeId.textContent = userData.employee_id || '-';
        }
        if (pillChannel) {
          pillChannel.classList.remove('hidden');
          const displayChannel = document.getElementById('displayChannel');
          if (displayChannel) displayChannel.textContent = userData.channel || '-';
        }
        if (pillTeam) {
          pillTeam.classList.remove('hidden');
          const displayTeam = document.getElementById('displayTeam');
          if (displayTeam) displayTeam.textContent = userData.team || '-';
        }
        if (pillSupervisor && userData.team_supervisor) {
          pillSupervisor.classList.remove('hidden');
          const displaySupervisor = document.getElementById('displaySupervisor');
          
          // Fetch supervisor name from users table
          try {
            const { data: supervisorData, error: supervisorError } = await window.supabaseClient
              .from('users')
              .select('name')
              .eq('email', userData.team_supervisor)
              .single();
            
            if (!supervisorError && supervisorData && supervisorData.name) {
              if (displaySupervisor) displaySupervisor.textContent = supervisorData.name;
            } else {
              // Fallback to email if name not found
              if (displaySupervisor) displaySupervisor.textContent = userData.team_supervisor || '-';
            }
          } catch (err) {
            console.warn('Could not fetch supervisor name:', err);
            if (displaySupervisor) displaySupervisor.textContent = userData.team_supervisor || '-';
          }
        }
      }
      
      // Show/hide admin pills
      if (isAdmin) {
        const pillAdminChannel = document.getElementById('pillAdminChannel');
        const pillQualityMentor = document.getElementById('pillQualityMentor');
        
        if (pillAdminChannel) {
          pillAdminChannel.classList.remove('hidden');
          const displayAdminChannel = document.getElementById('displayAdminChannel');
          if (displayAdminChannel) displayAdminChannel.textContent = userData.channel || 'All Channels';
        }
        if (pillQualityMentor && userData.quality_mentor) {
          pillQualityMentor.classList.remove('hidden');
        }
      }
    }
  } catch (error) {
    console.error('Error loading profile dashboard:', error);
  }
}

// Removed toggleUserProfile() - Avatar now navigates directly to profile.html
// Removed populateUserProfile() - No longer needed

// Logout function - uses Supabase signOut for proper logout
async function logout() {
  try {
    // Import and use Supabase signOut function
    // @ts-ignore - Dynamic import path resolved at runtime
    const { signOut } = await import('/js/utils/auth.js') as { signOut: () => Promise<void> }
    await signOut()
    // signOut() handles redirect to auth-page.html
  } catch (error) {
    console.error('Error during logout:', error)
    // Force cleanup and redirect on error
    localStorage.removeItem('userInfo')
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('lastLoginUpdate')
    localStorage.removeItem('supabase.auth.token')
    window.location.href = '/src/auth/presentation/auth-page.html'
  }
}

// Make logout function globally available for onclick handlers
window.logout = logout

async function loadAllUsers() {
  try {
    const { data, error } = await window.supabaseClient
      .from('users')
      .select('email, name, role, channel, quality_mentor')
      .eq('is_active', true);
    
    if (error) throw error;
    allUsers = data || [];
  } catch (error) {
    console.error('Error loading users:', error);
    allUsers = [];
  }
}

async function loadRecentUpdates() {
  try {
    const updatesFeed = document.getElementById('updatesFeed');
    if (!updatesFeed) return;

    const period = getCurrentPeriodDates();
    
    // Always fetch fresh data
    await fetchAndCacheRecentUpdates(period);
  } catch (error) {
    console.error('Error loading recent updates:', error);
  }
}

async function fetchAndCacheRecentUpdates(period: PeriodDates): Promise<void> {
  try {
    let allUpdates = [];

    if (isAgent) {
      // For agents: Only show completed audits and reversals (not pending/in_progress assignments)
      
      // 1. Load completed audits from scorecard tables
      const { data: scorecards, error: scError } = await window.supabaseClient
        .from('scorecards')
        .select('id, name, table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
        
        // Parallelize all scorecard queries
        const auditPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            const { data: audits, error } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('*')
              .eq('employee_email', currentUserEmail)
              .order('submitted_at', { ascending: false })
              .limit(20);
            
            if (!error && audits && audits.length > 0) {
              // Client-side filtering with exact email match
              const filteredAudits = audits.filter((audit: Audit) => {
                const emailToCheck = audit.employee_email;
                if (!emailToCheck) return false;
                return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
              });
              
              return filteredAudits.map((audit: Audit) => {
                // Don't fetch auditor info for agents - they shouldn't see it
                
                return {
                  id: `audit-${audit.id}`,
                  type: 'audit_completed',
                  displayName: null, // Don't show auditor name for agents
                  displayEmail: null, // Don't show auditor email for agents
                  timestamp: audit.submitted_at,
                  status: 'completed',
                  interactionId: audit.interaction_id,
                  scorecardId: scorecard.id,
                  scorecardTable: scorecard.table_name,
                  auditId: audit.id
                };
              });
            }
            return [];
          } catch (err) {
            console.warn(`Error loading audits from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const auditResults = await Promise.all(auditPromises);
        allUpdates.push(...auditResults.flat());
      }
      
      // 2. Load reversals (both requested and responded) - parallelized
      if (!scError && scorecards) {
        const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
        const reversalFilterField = 'employee_email';
        
        // Parallelize all reversal queries
        const reversalPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            // Query reversals - get all reversals and sort client-side to prioritize recent responses
            const { data: reversals, error } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('id, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, acknowledgement_status, interaction_id, submitted_at')
              .not('reversal_requested_at', 'is', null)
              .order('reversal_requested_at', { ascending: false })
              .limit(200);
            
            if (!error && reversals && reversals.length > 0) {
              // Sort reversals: prioritize those with recent responses
              reversals.sort((a: Audit, b: Audit) => {
                const aResponded = a.reversal_responded_at ? new Date(a.reversal_responded_at).getTime() : 0;
                const bResponded = b.reversal_responded_at ? new Date(b.reversal_responded_at).getTime() : 0;
                if (aResponded !== bResponded) {
                  return bResponded - aResponded; // Most recent responses first
                }
                // If both have no response or same response time, sort by request time
                const aRequested = new Date(a.reversal_requested_at || 0).getTime();
                const bRequested = new Date(b.reversal_requested_at || 0).getTime();
                return bRequested - aRequested;
              });
              
              // Filter by email first
              let filteredReversals = reversals.filter((rev: Audit) => {
                const emailToCheck = rev[reversalFilterField];
                if (!emailToCheck) return false;
                return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
              });
              
              // For agents: Apply the same filtering logic as reversal.html
              // Show reversals that need acknowledgement (pending, approved but not acknowledged, rejected but not acknowledged)
              if (isAgent) {
                filteredReversals = filteredReversals.filter((reversal: Audit) => {
                  const acknowledgementStatus = reversal.acknowledgement_status || reversal.acknowledgementStatus || '';
                  const isAcknowledged = acknowledgementStatus && (
                    acknowledgementStatus.toLowerCase().includes('acknowledged') || 
                    acknowledgementStatus === 'Acknowledged'
                  );
                  
                  // Show if:
                  // 1. Not approved yet (pending) AND not acknowledged
                  // 2. Approved but not acknowledged
                  // 3. Rejected but not acknowledged
                  const isPending = reversal.reversal_approved === null;
                  const isApproved = reversal.reversal_approved === true || reversal.reversal_approved === 'true' || reversal.reversal_approved === 1 || reversal.reversal_approved === '1';
                  const isRejected = reversal.reversal_approved === false || reversal.reversal_approved === 'false' || reversal.reversal_approved === 0 || reversal.reversal_approved === '0';
                  
                  return !isAcknowledged && (isPending || isApproved || isRejected);
                });
              }
              
              // Debug logging
              console.log(`Found ${filteredReversals.length} reversals for ${normalizedCurrentEmail} (isAgent: ${isAgent})`, filteredReversals.map((r: Audit) => ({
                  id: r.id,
                  reversal_approved: r.reversal_approved,
                acknowledgement_status: r.acknowledgement_status,
                  reversal_responded_at: r.reversal_responded_at,
                  reversal_requested_at: r.reversal_requested_at
                })));
              
              const updates: Update[] = [];
              filteredReversals.forEach((reversal: Audit) => {
                // Don't fetch auditor info for agents - they shouldn't see it
                const interactionId = reversal.interaction_id || 'N/A';
                
                // Determine reversal status - check if it's been responded to first, then check acknowledgement
                const acknowledgementStatus = reversal.acknowledgement_status || reversal.acknowledgementStatus;
                const isAcknowledged = acknowledgementStatus && (
                  acknowledgementStatus.toLowerCase().includes('acknowledged') || 
                  acknowledgementStatus === 'Acknowledged'
                );
                
                let status = null;
                
                // Determine status from reversal_approved and acknowledgement_status
                // Check acknowledgement first
                if (acknowledgementStatus === 'Acknowledged') {
                  status = 'Acknowledged';
                }
                // If reversal was responded to, check approval status
                else if (reversal.reversal_responded_at) {
                  const approved = reversal.reversal_approved;
                  if (approved === true || approved === 'true' || approved === 1 || approved === '1') {
                    status = 'Approved';
                  } else if (approved === false || approved === 'false' || approved === 0 || approved === '0') {
                    status = 'Rejected';
                  } else {
                    status = 'Pending';
                  }
                }
                // If reversal was requested but not responded to yet
                else if (reversal.reversal_requested_at && !reversal.reversal_responded_at) {
                  status = 'Pending';
                }
                
                // For agents: Show all reversals that appear in reversal.html
                // This includes: pending reversals, approved but not acknowledged, rejected but not acknowledged
                // Since we've already filtered to only show these, we should add updates for all of them
                
                // Add reversal request update (for pending reversals)
                if (status === 'Pending' && reversal.reversal_requested_at) {
                  updates.push({
                    id: `reversal-request-${reversal.id}`,
                    type: 'reversal_requested',
                    displayName: null, // Don't show auditor name for agents
                    displayEmail: null, // Don't show auditor email for agents
                    timestamp: reversal.reversal_requested_at,
                    status: 'reversal_requested',
                    interactionId: interactionId,
                    scorecardId: scorecard.id,
                    scorecardTable: scorecard.table_name,
                    auditId: reversal.id
                  });
                }
                
                // Add status change update when reversal has been approved/rejected but NOT yet acknowledged
                // For employees, we want to show when their reversal has been approved or rejected (so they can acknowledge it)
                if (status && (status === 'Approved' || status === 'Rejected') && !isAcknowledged) {
                  const statusText = status === 'Approved' ? 'approved' : 'rejected';
                  
                  // Use reversal_responded_at if available, otherwise use reversal_requested_at
                  const statusTimestamp = reversal.reversal_responded_at || reversal.reversal_requested_at;
                  
                  // Debug logging
                      console.log(`Adding reversal status update for ${reversal.id}:`, {
                        status,
                        statusText,
                    timestamp: statusTimestamp,
                    isAcknowledged,
                    acknowledgementStatus,
                    reversal_approved: reversal.reversal_approved,
                    reversal_responded_at: reversal.reversal_responded_at
                  });
                    
                    updates.push({
                      id: `reversal-status-${reversal.id}`,
                      type: 'reversal_status_update',
                      displayName: null, // Don't show auditor name for agents
                      displayEmail: null, // Don't show auditor email for agents
                    timestamp: statusTimestamp,
                      status: status,
                      statusText: statusText,
                      interactionId: interactionId,
                      scorecardId: scorecard.id,
                      scorecardTable: scorecard.table_name,
                      auditId: reversal.id
                    });
                }
              });
              return updates;
            }
            return [];
          } catch (err) {
            console.warn(`Error loading reversals from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const reversalResults = await Promise.all(reversalPromises);
        allUpdates.push(...reversalResults.flat());
      }
      
    } else {
      // For auditors: Show all assignment status changes (pending, in_progress, completed) from audit tables
      const { data: scorecards, error: scError } = await window.supabaseClient
        .from('scorecards')
        .select('id, name, table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
        
        const assignmentPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            // Query scorecard tables (all audits in scorecard tables are completed by default)
            // Use submitted_at for ordering since assignment_created_at doesn't exist in scorecard tables
            let { data: audits, error } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('*')
              .eq('auditor_email', currentUserEmail)
              .order('submitted_at', { ascending: false })
              .limit(20);
            
            if (error) {
              // If error, table might not have auditor_email column - skip this table silently
              // Don't log warning as this is expected for some tables
              return [];
            }
            
            if (!error && audits) {
              return audits.map((audit: Audit) => ({
                ...audit,
                status: 'completed', // All audits in scorecard tables are completed by default
                created_at: audit.created_at,
                completed_at: audit.submitted_at
              }));
            }
            return [];
          } catch (err) {
            console.warn(`Error loading from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const assignmentResults = await Promise.all(assignmentPromises);
        const filteredAssignments = assignmentResults.flat().filter(assignment => {
          const auditorEmail = (assignment.auditor_email || '').toLowerCase().trim();
          return auditorEmail === normalizedCurrentEmail;
        });
        
        filteredAssignments.forEach(assignment => {
          const employeeEmail = (assignment.employee_email || '').toLowerCase().trim();
          const employeeUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
          const employeeName = employeeUser?.name || assignment.employee_name || assignment.employee_email?.split('@')[0] || 'Unknown';
          
          allUpdates.push({
            id: `assignment-${assignment.id}`,
            type: 'assignment',
            displayName: employeeName,
            displayEmail: assignment.employee_email,
            timestamp: assignment.status === 'completed' && assignment.completed_at 
              ? assignment.completed_at 
              : (assignment.scheduled_date ? new Date(assignment.scheduled_date + 'T00:00:00').toISOString() : assignment.created_at),
            status: assignment.status,
            assignmentId: assignment.id
          });
        });
      }
      
      // Also load reversals for auditors - parallelized
      // For auditors: Show only unprocessed reversals (same as reversal.html)
      const { data: reversalScorecards, error: reversalScError } = await window.supabaseClient
        .from('scorecards')
        .select('id, name, table_name')
        .eq('is_active', true);
      
      if (!reversalScError && reversalScorecards) {
        const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
        const reversalFilterField = 'auditor_email';
        
        // Parallelize all reversal queries
        const reversalPromises = reversalScorecards.map(async (scorecard: Scorecard) => {
          try {
            // For auditors: Only get unprocessed reversals (reversal_approved is null) - same as reversal.html
            // Try query with reversal filters first
            let { data: reversals, error } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('id, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, interaction_id')
              .not('reversal_requested_at', 'is', null)
              .is('reversal_approved', null) // Only unprocessed reversals
              .order('reversal_requested_at', { ascending: false })
              .limit(50);
            
            // If error, try without reversal_approved filter (some tables may not have this column)
            if (error) {
              const retryQuery = await window.supabaseClient
                .from(scorecard.table_name)
                .select('id, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, interaction_id')
                .not('reversal_requested_at', 'is', null)
                .order('reversal_requested_at', { ascending: false })
                .limit(50);
              
              if (!retryQuery.error && retryQuery.data) {
                reversals = retryQuery.data;
                error = null;
                // Filter client-side for unprocessed reversals (reversal_approved is null)
                if (reversals && reversals.some((r: Audit) => r.reversal_approved !== undefined)) {
                  reversals = reversals.filter((r: Audit) => r.reversal_approved === null);
                }
              } else {
                // If still error, table might not have reversal columns - skip this table silently
                return [];
              }
            }
            
            if (!error && reversals && reversals.length > 0) {
              // Filter by email
              const filteredReversals = reversals.filter((rev: Audit) => {
                const emailToCheck = rev[reversalFilterField];
                if (!emailToCheck) return false;
                return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
              });
              
              console.log(`Found ${filteredReversals.length} unprocessed reversals for auditor ${normalizedCurrentEmail}`);
              
              const updates: Update[] = [];
              // For auditors: These are all unprocessed reversals (same as what appears in reversal.html)
              filteredReversals.forEach((reversal: Audit) => {
                const employeeEmail = (reversal.employee_email || '').toLowerCase().trim();
                const employeeUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
                const employeeName = employeeUser?.name || reversal.employee_email?.split('@')[0] || 'Unknown';
                const interactionId = reversal.interaction_id || 'N/A';
                
                // Add update for unprocessed reversal request (these appear in reversal.html)
                if (reversal.reversal_requested_at) {
                  updates.push({
                    id: `reversal-request-${reversal.id}`,
                    type: 'reversal_requested',
                    displayName: employeeName,
                    displayEmail: reversal.employee_email,
                    timestamp: reversal.reversal_requested_at,
                    status: 'reversal_requested',
                    interactionId: interactionId,
                    scorecardId: scorecard.id,
                    scorecardTable: scorecard.table_name,
                    auditId: reversal.id
                  });
                }
              });
              return updates;
            }
            return [];
          } catch (err) {
            console.warn(`Error loading reversals from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const reversalResults = await Promise.all(reversalPromises);
        allUpdates.push(...reversalResults.flat());
      }
    }

    // Apply date filter to updates (but always include recent reversal status updates for agents)
    // Use week filter if date range is not set
    const period = getCurrentPeriodDates();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    allUpdates = allUpdates.filter(update => {
      if (!update.timestamp) return false;
      
      // For agents, always include reversal status updates from the last 7 days
      if (isAgent && update.type === 'reversal_status_update') {
        const updateDate = new Date(update.timestamp);
        if (updateDate >= sevenDaysAgo) {
          return true; // Always show recent reversal status updates
        }
      }
      
      return isDateInRange(update.timestamp, period.start, period.end);
    });
    
    // Sort all updates by timestamp (most recent first)
    allUpdates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Limit to 15 most recent
    allUpdates = allUpdates.slice(0, 15);
    
    // Update UI with fresh data
    console.log('Updating UI with fresh recent updates');
    renderRecentUpdatesFromData(allUpdates);
  } catch (error) {
    console.error('Error fetching recent updates:', error);
  }
}

function renderRecentUpdatesFromData(allUpdates: Update[]): void {
  const updatesFeed = document.getElementById('updatesFeed');
  if (!updatesFeed) return;
  
  // Count reversal status updates for agents
  if (isAgent) {
    const reversalStatusUpdates = allUpdates.filter((u: Update) => u.type === 'reversal_status_update');
    const reversalCountEl = document.getElementById('reversalUpdatesCount');
    if (reversalCountEl) {
      if (reversalStatusUpdates.length > 0) {
        reversalCountEl.textContent = String(reversalStatusUpdates.length);
        reversalCountEl.style.display = 'inline-flex';
      } else {
        reversalCountEl.style.display = 'none';
      }
    }
  }

  if (allUpdates.length === 0) {
    updatesFeed.innerHTML = `
      <div class="px-4 py-6 text-center text-gray-500 text-xs">
        <p>No recent updates</p>
      </div>
    `;
    return;
  }

  updatesFeed.innerHTML = allUpdates.map(update => {
      const timestamp = formatTimestamp(update.timestamp);
      const initials = getInitials(update.displayName);
      
      let statusText = '';
      if (update.type === 'audit_completed') {
        const interactionId = update.interactionId || 'N/A';
        statusText = isAgent ? `#${interactionId} was audited` : `completed your audit`;
      } else if (update.type === 'reversal_requested') {
        statusText = isAgent 
          ? `You requested reversal for audit ${update.interactionId || ''}`
          : `requested reversal for audit ${update.interactionId || ''}`;
      } else if (update.type === 'reversal_status_update') {
        const statusDisplay = update.status === 'Approved' ? 'approved' : update.status === 'Rejected' ? 'rejected' : update.status === 'Acknowledged' ? 'acknowledged' : 'updated';
        statusText = isAgent
          ? `Your reversal request has been ${statusDisplay}`
          : `Reversal request for audit ${update.interactionId || ''} has been ${statusDisplay}`;
      } else if (update.type === 'reversal_responded') {
        statusText = 'responded to your reversal request';
      } else {
        statusText = getStatusText(update.status || '', isAgent);
      }
      
      let onClickAction = '';
      if (update.type === 'audit_completed' || update.type === 'reversal_requested' || update.type === 'reversal_responded' || update.type === 'reversal_status_update') {
        onClickAction = `onclick="viewAuditDetails('${update.auditId}', '${update.scorecardId || ''}', '${update.scorecardTable || ''}')"`;
      } else if (update.assignmentId) {
        onClickAction = `onclick="viewAudit('${update.assignmentId}')"`;
      }

      // Determine styling for different update types
      let bgColor = 'bg-primary/10';
      let textColor = 'text-primary';
      if (update.type === 'reversal_status_update') {
        if (update.status === 'Approved') {
          bgColor = 'bg-success/10';
          textColor = 'text-success';
        } else if (update.status === 'Rejected') {
          bgColor = 'bg-error/10';
          textColor = 'text-error';
        } else if (update.status === 'Acknowledged') {
          bgColor = 'bg-primary/10';
          textColor = 'text-primary';
        } else {
          bgColor = 'bg-warning/10';
          textColor = 'text-warning';
        }
      } else if (update.type === 'reversal_requested') {
        bgColor = 'bg-warning/10';
        textColor = 'text-warning';
      } else if (update.type === 'audit_completed' && isAgent) {
        // Use success colors for completed audits for employees
        bgColor = 'bg-success/10';
        textColor = 'text-success';
      }

      // For employees viewing any updates, use generic icon instead of auditor initials/names
      const useGenericIcon = isAgent && (update.type === 'audit_completed' || update.type === 'reversal_requested' || update.type === 'reversal_status_update');
      const iconContent = useGenericIcon 
        ? `<svg class="w-4 h-4 ${textColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>`
        : `<span class="text-xs font-semibold ${textColor}">${initials}</span>`;

      // For agents viewing audit_completed updates, show View button on the right
      const showViewButton = isAgent && update.type === 'audit_completed';
      const viewButton = showViewButton 
        ? `<button onclick="event.stopPropagation(); viewAuditDetails('${update.auditId}', '${update.scorecardId || ''}', '${update.scorecardTable || ''}')" class="px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded hover:bg-primary-dark transition-colors flex-shrink-0">
            View
          </button>`
        : '';

      return `
        <div class="px-4 py-2.5 hover:bg-gray-50 transition-colors ${onClickAction ? 'cursor-pointer' : ''}" ${onClickAction || ''}>
          <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
              ${iconContent}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs text-gray-900 leading-snug">
                ${isAgent && (update.type === 'reversal_requested' || update.type === 'reversal_status_update' || update.type === 'audit_completed')
                  ? statusText
                  : update.displayName 
                    ? `<span class="font-medium">${escapeHtml(update.displayName)}</span> ${statusText}`
                    : statusText
                }
              </p>
              <p class="text-[10px] text-gray-500 mt-0.5">${timestamp}</p>
            </div>
            ${viewButton}
          </div>
        </div>
      `;
    }).join('');
}

async function loadAssignedAudits() {
  try {
    console.log('Loading audits for user:', currentUserEmail, 'Role:', currentUserRole, 'IsAgent:', isAgent);
    
    const period = getCurrentPeriodDates();
    
    // Always fetch fresh data
    await fetchAndCacheAssignedAudits(period);
  } catch (error) {
    console.error('Error loading assigned audits:', error);
  }
}

async function fetchAndCacheAssignedAudits(period: PeriodDates): Promise<void> {
  try {
    if (isAgent) {
      // For employees: Load completed audits from scorecard tables
      await loadCompletedAuditsForEmployee();
    } else {
      // For auditors: Load pending/in-progress assignments from audit_assignments
      await loadPendingAssignmentsForAuditor();
    }

    // Update UI with fresh data
    console.log('Updating UI with fresh assigned audits');
    renderAssignedAudits();
  } catch (error) {
    console.error('Error fetching assigned audits:', error);
    const assignedAuditsList = document.getElementById('assignedAuditsList');
    if (assignedAuditsList) assignedAuditsList.innerHTML = `
      <div class="px-4 py-8 text-center text-red-500 text-xs">
        <p>Error loading audits</p>
      </div>
    `;
  }
}

async function loadCompletedAuditsForEmployee() {
  // Load all scorecards to query audit tables
  const { data: scorecards, error: scError } = await window.supabaseClient
    .from('scorecards')
    .select('id, name, table_name, scoring_type')
    .eq('is_active', true);
  
  if (scError) throw scError;
  
  let combinedAudits: Audit[] = [];
  const auditFilterField = 'employee_email';
  
  console.log('Loading completed audits for employee, filtering by:', auditFilterField, 'for email:', currentUserEmail);
  
  // Load audits from all scorecard tables
  for (const scorecard of (scorecards || [])) {
      try {
        // Try with exact match first (case-sensitive)
        const { data, error } = await window.supabaseClient
          .from(scorecard.table_name)
          .select('*')
          .order('submitted_at', { ascending: false })
          .limit(500); // Get more to filter client-side
        
        if (error) {
          console.warn(`Error loading from ${scorecard.table_name}:`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          console.log(`Found ${data.length} audits in ${scorecard.table_name} before filtering`);
          
          // Client-side filtering with exact email match (case-insensitive)
          let filteredAudits = data.filter((audit: Audit) => {
            const emailToCheck = audit[auditFilterField];
            if (!emailToCheck) return false;
            
            const normalizedEmailToCheck = emailToCheck.toLowerCase().trim();
            const matches = normalizedEmailToCheck === currentUserEmail;
            
            if (!matches && auditFilterField === 'employee_email') {
              // Debug: log mismatches for employees
              console.log(`Mismatch in ${scorecard.table_name}:`, {
                auditId: audit.id,
                expectedEmail: currentUserEmail,
                foundEmail: emailToCheck,
                normalizedFound: normalizedEmailToCheck,
                employee_email: audit.employee_email,
                employee_name: audit.employee_name
              });
            }
            
            return matches;
          });
          
          // Apply date filter (week or date range)
          const period = getCurrentPeriodDates();
          filteredAudits = filteredAudits.filter((audit: Audit) => {
            const auditDate = audit.submitted_at;
            if (!auditDate) return false;
            return isDateInRange(auditDate, period.start, period.end);
          });
          
          // Apply channel filter
          if (currentFilters.channel) {
            filteredAudits = filteredAudits.filter((audit: Audit) => audit.channel === currentFilters.channel);
          }
          
          console.log(`After filtering: ${filteredAudits.length} audits match for ${currentUserEmail}`);
          
          // Debug: Log the filtered audits to verify they're correct
          if (isAgent && filteredAudits.length > 0) {
            console.log('Filtered audits for employee:', filteredAudits.map((a: Audit) => ({
              id: a.id,
              employee_email: a.employee_email,
              employee_name: a.employee_name,
              auditor_email: a.auditor_email,
              auditor_name: a.auditor_name
            })));
          }
          
          // Add scorecard info to each audit
          const auditsWithScorecard = filteredAudits.map((audit: Audit) => ({
            ...audit,
            _scorecard_id: scorecard.id,
            _scorecard_name: scorecard.name,
            _scorecard_table: scorecard.table_name,
            _scoring_type: scorecard.scoring_type,
            _isAssignment: false
          }));
          combinedAudits = combinedAudits.concat(auditsWithScorecard);
        }
      } catch (err) {
        console.warn(`Exception loading from ${scorecard.table_name}:`, err);
        continue;
      }
    }
    
    // Sort by submitted_at descending
    combinedAudits.sort((a, b) => {
      const dateA = new Date(a.submitted_at || 0).getTime();
      const dateB = new Date(b.submitted_at || 0).getTime();
      return dateB - dateA;
    });
    
    // Final verification: Ensure all audits belong to current user
    const invalidAudits = combinedAudits.filter(audit => {
      const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim();
      return auditEmployeeEmail !== currentUserEmail;
    });
    
    if (invalidAudits.length > 0) {
      console.error('CRITICAL: Found audits that do not belong to current user:', invalidAudits);
      combinedAudits = combinedAudits.filter(audit => {
        const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim();
        return auditEmployeeEmail === currentUserEmail;
      });
    }
    
    // Limit total results
    combinedAudits = combinedAudits.slice(0, 50);
    
    console.log(`Final completed audits count: ${combinedAudits.length} for employee ${currentUserEmail}`);
    
    assignedAudits = combinedAudits;
    allAssignments = combinedAudits;
}

async function loadPendingAssignmentsForAuditor() {
  // Load pending and in-progress assignments from audit_assignments table
  const { data, error } = await window.supabaseClient
    .from('audit_assignments')
    .select(`
      *,
      scorecards:scorecard_id (
        id,
        name,
        table_name
      )
    `)
    .eq('auditor_email', currentUserEmail)
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error loading assignments:', error);
    throw error;
  }
  
  // Normalize and filter client-side for exact match
  const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
  let filteredAssignments = (data || []).filter((assignment: Assignment) => {
    const auditorEmail = (assignment.auditor_email || '').toLowerCase().trim();
    return auditorEmail === normalizedCurrentEmail;
  });
  
  // Apply date filter (week or date range) - use scheduled_date if available, otherwise created_at
  const period = getCurrentPeriodDates();
  filteredAssignments = filteredAssignments.filter((assignment: Assignment) => {
    // Use scheduled_date if available, otherwise fall back to created_at date
    const assignmentDate = assignment.scheduled_date 
      ? new Date(assignment.scheduled_date + 'T00:00:00') // Convert DATE to Date object
      : assignment.created_at;
    if (!assignmentDate) return false;
    return isDateInRange(assignmentDate, period.start, period.end);
  });
  
  // Apply channel filter
  if (currentFilters.channel) {
    filteredAssignments = filteredAssignments.filter((assignment: Assignment) => assignment.channel === currentFilters.channel);
  }
  
  // Apply status filter
  if (currentFilters.status) {
    filteredAssignments = filteredAssignments.filter((assignment: Assignment) => assignment.status === currentFilters.status);
  }
  
  // Apply agent filter
  if (currentFilters.agent) {
    filteredAssignments = filteredAssignments.filter((assignment: Assignment) => assignment.employee_email === currentFilters.agent);
  }
  
  console.log(`Found ${filteredAssignments.length} pending/in-progress assignments for auditor ${currentUserEmail}`);
  
  // Map assignments to a format similar to audits for rendering
  assignedAudits = filteredAssignments.map((assignment: Assignment) => ({
    ...assignment,
    _scorecard_id: assignment.scorecard_id,
    _scorecard_name: assignment.scorecards?.name || 'Unknown Scorecard',
    _scorecard_table: assignment.scorecards?.table_name || '',
    _isAssignment: true,
    // Map assignment fields to audit-like fields for rendering
    id: assignment.id,
    employee_name: assignment.employee_name,
    employee_email: assignment.employee_email,
    auditor_email: assignment.auditor_email,
    status: assignment.status,
    created_at: assignment.created_at,
    scheduled_date: assignment.scheduled_date
  }));
  
  allAssignments = assignedAudits;
}

function renderAssignedAudits(): void {
  const list = document.getElementById('assignedAuditsList');
  const countEl = document.getElementById('pendingCount');

  if (!list) return;

  // Update count
  if (countEl) countEl.textContent = String(assignedAudits.length);

  if (assignedAudits.length === 0) {
    const emptyMessage = isAgent 
      ? 'Your completed audits will appear here'
      : 'No pending audits assigned';
    list.innerHTML = `
      <div class="px-4 py-8 text-center text-gray-500 text-xs">
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        <p class="font-medium text-gray-700 mb-1">No audits found</p>
        <p class="text-gray-500">${emptyMessage}</p>
      </div>
    `;
    return;
  }

  // Sort audits
  const sorted = [...assignedAudits];
  sortAudits(sorted);

  list.innerHTML = sorted.map(audit => {
    // Check if this is an assignment (pending audit) or a completed audit
    const isAssignment = audit._isAssignment === true;
    
    if (isAssignment) {
      // Render assignment (pending audit) for auditors
      const employeeEmail = (audit.employee_email || '').toLowerCase().trim();
      const displayUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
      const displayName = audit.employee_name || displayUser?.name || audit.employee_email?.split('@')[0] || 'Unknown';
      const displayEmail = audit.employee_email || '';
      const scorecardName = audit._scorecard_name || 'Unknown Scorecard';
      const initials = getInitials(displayName);
      
      let statusBadge = '';
      if (audit.status === 'in_progress') {
        statusBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-100 text-yellow-800">In Progress</span>';
      } else {
        statusBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-800">Pending</span>';
      }
      
      const requestDate = formatTimestamp(audit.created_at);

      return `
        <div class="px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0" onclick="window.location.href='create-audit.html'">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              <div class="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                ${initials}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <h4 class="text-xs font-semibold text-gray-900 truncate">
                    ${escapeHtml(displayName)}
                  </h4>
                </div>
                <p class="text-[10px] text-gray-600 flex items-center gap-1 flex-wrap">
                  <span class="truncate">${escapeHtml(displayEmail)}</span>
                  <span class="text-gray-300">•</span>
                  <span class="font-medium text-gray-700">${escapeHtml(scorecardName)}</span>
                  <span class="text-gray-300">•</span>
                  <span>${requestDate}</span>
                </p>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              ${statusBadge}
              <button onclick="event.stopPropagation(); window.location.href='create-audit.html'" class="px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded hover:bg-primary-dark transition-colors">
                Get Started
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      // Render completed audit for employees
      // Verify the audit belongs to the current user (for debugging)
      if (isAgent) {
        const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim();
        if (auditEmployeeEmail !== currentUserEmail) {
          console.error('CRITICAL: Audit does not belong to current user!', {
            auditId: audit.id,
            auditEmployeeEmail,
            currentUserEmail,
            audit
          });
        }
      }
      
      // For agents, don't show auditor info; for auditors, show employee info
      let displayUser, displayName, displayEmail;
      if (isAgent) {
        // For employees, don't show auditor info - use generic icon instead
        displayName = null; // Don't show auditor name
        displayEmail = null; // Don't show auditor email
      } else {
        // For auditors, show who they audited (the employee)
        const employeeEmail = (audit.employee_email || '').toLowerCase().trim();
        displayUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
        displayName = audit.employee_name || displayUser?.name || audit.employee_email?.split('@')[0] || 'Unknown';
        displayEmail = audit.employee_email || '';
      }
      
      const scorecardName = audit._scorecard_name || 'Unknown Scorecard';
      // For agents, use generic icon instead of initials; for auditors, use employee initials
      const initials = isAgent ? null : getInitials(displayName);
      
      // Get passing status
      const passingStatus = audit.passing_status || audit.passingStatus || 'Unknown';
      const normalizedStatus = passingStatus === 'Passing' ? 'Passed' : (passingStatus === 'Not Passing' ? 'Not Passed' : passingStatus);
      const statusColor = normalizedStatus === 'Passed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
      const statusIcon = normalizedStatus === 'Passed' ? '✓' : '✗';
      
      const submittedDate = formatTimestamp(audit.submitted_at);
      const averageScore = audit.average_score || audit.averageScore || '0';
      const totalErrors = audit.total_errors_count || audit.totalErrorsCount || '0';
      const interactionId = audit.interaction_id || 'N/A';
      const channel = audit.channel || 'N/A';
      
      // Debug logging for reversal status
      if (audit.reversal_requested_at) {
        console.log('Audit with reversal:', {
          id: audit.id,
          employee_email: audit.employee_email,
          reversal_requested_at: audit.reversal_requested_at,
          reversal_responded_at: audit.reversal_responded_at,
          reversal_approved: audit.reversal_approved,
          acknowledgement_status: audit.acknowledgement_status
        });
      }
      
      const reversalStatusChip = getReversalStatusChip(audit);
      const acknowledgmentStatusChip = getAcknowledgmentStatusChip(audit);

      return `
        <div class="px-4 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer border-b border-gray-100 last:border-0" onclick="viewAuditDetails('${audit.id}', '${audit._scorecard_id || ''}', '${audit._scorecard_table || ''}')">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2.5 flex-1 min-w-0">
              ${isAgent ? `
                <!-- For agents: Use generic icon instead of auditor avatar -->
                <div class="w-8 h-8 rounded bg-success/10 flex items-center justify-center flex-shrink-0">
                  <svg class="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
              ` : `
                <!-- For auditors: Show employee avatar -->
                <div class="w-8 h-8 rounded bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  ${initials}
                </div>
              `}
              <div class="flex-1 min-w-0">
                ${isAgent ? `
                  <!-- For employees: 2 rows, info compact -->
                  <!-- Row 1: Interaction ID + Scorecard + Passing Status -->
                  <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <h4 class="text-xs font-semibold text-gray-900 truncate">
                      ${escapeHtml(interactionId)}
                    </h4>
                    ${audit._scorecard_name ? `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                        ${escapeHtml(audit._scorecard_name)}
                      </span>
                    ` : ''}
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold ${statusColor}">
                      ${statusIcon} ${normalizedStatus}
                    </span>
                  </div>
                  <!-- Row 2: Channel • Score • Errors • Date -->
                  <p class="text-[10px] text-gray-600 flex items-center gap-1 flex-wrap">
                    <span>${escapeHtml(channel)}</span>
                    <span class="text-gray-300">•</span>
                    <span class="font-medium text-gray-700">${averageScore}%</span>
                    <span class="text-gray-300">•</span>
                    <span>${totalErrors} errors</span>
                    <span class="text-gray-300">•</span>
                    <span>${submittedDate}</span>
                  </p>
                ` : `
                  <!-- For auditors: 2 rows, info compact -->
                  <!-- Row 1: Employee name + Scorecard -->
                  <div class="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <h4 class="text-xs font-semibold text-gray-900 truncate">
                      ${escapeHtml(displayName)}
                    </h4>
                    ${audit._scorecard_name ? `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                        ${escapeHtml(audit._scorecard_name)}
                      </span>
                    ` : ''}
                  </div>
                  <!-- Row 2: Interaction ID • Channel • Score • Errors • Date -->
                  <p class="text-[10px] text-gray-600 flex items-center gap-1 flex-wrap">
                    <span>${escapeHtml(interactionId)}</span>
                    <span class="text-gray-300">•</span>
                    <span>${escapeHtml(channel)}</span>
                    <span class="text-gray-300">•</span>
                    <span class="flex flex-col items-start">
                      <span class="font-medium text-gray-700">${averageScore}%</span>
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold ${statusColor} mt-0.5">
                        ${statusIcon} ${normalizedStatus}
                      </span>
                    </span>
                    <span class="text-gray-300">•</span>
                    <span>${totalErrors} errors</span>
                    <span class="text-gray-300">•</span>
                    <span>${submittedDate}</span>
                  </p>
                `}
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              ${acknowledgmentStatusChip}
              ${reversalStatusChip}
              <button onclick="event.stopPropagation(); viewAuditDetails('${audit.id}', '${audit._scorecard_id || ''}', '${audit._scorecard_table || ''}')" class="px-2.5 py-1 bg-primary text-white text-[10px] font-semibold rounded hover:bg-primary-dark transition-colors">
                View Details
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');
}

function sortAudits(audits: Audit[]): void {
  audits.sort((a, b) => {
    const isAssignmentA = a._isAssignment === true;
    const isAssignmentB = b._isAssignment === true;
    
    switch (sortBy) {
      case 'name_asc':
        // For agents, sort by auditor; for auditors, sort by employee
        const nameA = (isAgent ? (a.auditor_name || a.auditor_email || '') : (a.employee_name || a.employee_email || '')).toLowerCase();
        const nameB = (isAgent ? (b.auditor_name || b.auditor_email || '') : (b.employee_name || b.employee_email || '')).toLowerCase();
        return nameA.localeCompare(nameB);
      case 'name_desc':
        const nameA2 = (isAgent ? (a.auditor_name || a.auditor_email || '') : (a.employee_name || a.employee_email || '')).toLowerCase();
        const nameB2 = (isAgent ? (b.auditor_name || b.auditor_email || '') : (b.employee_name || b.employee_email || '')).toLowerCase();
        return nameB2.localeCompare(nameA2);
      case 'status_asc':
        // For assignments, sort by assignment status; for audits, sort by passing status
        if (isAssignmentA && isAssignmentB) {
          const statusOrder: { [key: string]: number } = { 'pending': 0, 'in_progress': 1 };
          return (statusOrder[a.status || ''] || 0) - (statusOrder[b.status || ''] || 0);
        }
        const statusA = (a.passing_status || a.passingStatus || '').toLowerCase();
        const statusB = (b.passing_status || b.passingStatus || '').toLowerCase();
        return statusA.localeCompare(statusB);
      case 'status_desc':
        if (isAssignmentA && isAssignmentB) {
          const statusOrder: { [key: string]: number } = { 'pending': 0, 'in_progress': 1 };
          return (statusOrder[b.status || ''] || 0) - (statusOrder[a.status || ''] || 0);
        }
        const statusA2 = (a.passing_status || a.passingStatus || '').toLowerCase();
        const statusB2 = (b.passing_status || b.passingStatus || '').toLowerCase();
        return statusB2.localeCompare(statusA2);
      case 'date_asc':
        const dateA = new Date(a.submitted_at || a.created_at || 0).getTime();
        const dateB = new Date(b.submitted_at || b.created_at || 0).getTime();
        return dateA - dateB;
      case 'date_desc':
      default:
        const dateA2 = new Date(a.submitted_at || a.created_at || 0).getTime();
        const dateB2 = new Date(b.submitted_at || b.created_at || 0).getTime();
        return dateB2 - dateA2;
    }
  });
}

function sortAssignedAudits(): void {
  const select = document.getElementById('auditSortBy') as HTMLSelectElement | null;
  if (select) {
    sortBy = select.value;
    renderAssignedAudits();
  }
}

function toggleSortMenu() {
  const menu = document.getElementById('sortMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
}

// Close sort menu when clicking outside
document.addEventListener('click', function(event: MouseEvent) {
  const sortBtn = document.getElementById('sortBtn');
  const sortMenu = document.getElementById('sortMenu');
  const target = event.target as Node | null;
  if (sortMenu && sortBtn && target && !sortMenu.contains(target) && !sortBtn.contains(target)) {
    sortMenu.classList.add('hidden');
  }
});

// Removed event listener for closing user profile dropdown - no longer needed

// Update your stats (assignment progress)
async function updateYourStats() {
  try {
    if (!currentUserEmail) {
      console.log('No user email found for stats');
      return;
    }
    
    const period = getCurrentPeriodDates();
    
    // Always fetch fresh data
    await fetchAndCacheStats(period);
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

async function fetchAndCacheStats(period: PeriodDates) {
  try {
    if (!currentUserEmail) {
      console.log('No user email found for stats');
      return;
    }
    
    // Load assignments for current user
    // Filter by employee_email if agent, otherwise by auditor_email
    const filterField = isAgent ? 'employee_email' : 'auditor_email';
    const { data: assignments, error: assignmentsError } = await (window.supabaseClient as any)
      .from('audit_assignments')
      .select('*')
      .eq(filterField, currentUserEmail)
      .order('created_at', { ascending: false });
    
    if (assignmentsError) {
      console.error('Error loading assignments for stats:', assignmentsError);
      return;
    }
    
    // Apply date filter to assignments (week or date range) for total assigned count
    let allAssignments = assignments || [];
    const period = getCurrentPeriodDates();
    allAssignments = allAssignments.filter((assignment: Assignment) => {
      // Use scheduled_date if available, otherwise fall back to created_at date
      const assignmentDate = assignment.scheduled_date 
        ? new Date(assignment.scheduled_date + 'T00:00:00') // Convert DATE to Date object
        : assignment.created_at;
      if (!assignmentDate) return false;
      return isDateInRange(assignmentDate, period.start, period.end);
    });
    
    const totalAssigned = allAssignments.length;
    const inProgress = allAssignments.filter((a: Assignment) => a.status === 'in_progress').length;
    const pending = allAssignments.filter((a: Assignment) => a.status === 'pending').length;
    
    // Count completed audits from scorecard tables (based on submitted_at, not created_at)
    let completed = 0;
    try {
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const auditFilterField = isAgent ? 'employee_email' : 'auditor_email';
        const completedPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            // Query for completed audits (those with submitted_at)
            let completedQuery = (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('id, submitted_at')
              .eq(auditFilterField, currentUserEmail)
              .not('submitted_at', 'is', null);
            
            // Apply date filters server-side if possible (convert Dhaka to UTC)
            if (period.start && window.dhakaDateToUTCISO) {
              completedQuery = completedQuery.gte('submitted_at', window.dhakaDateToUTCISO(period.start));
            }
            if (period.end && window.dhakaDateToUTCISO) {
              completedQuery = completedQuery.lte('submitted_at', window.dhakaDateToUTCISO(period.end));
            }
            
            const completedResult = await completedQuery;
            
            if (completedResult.error) {
              // If server-side date filter fails, try without date filter and filter client-side
              const retryQuery = await (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('id, submitted_at')
                .eq(auditFilterField, currentUserEmail)
                .not('submitted_at', 'is', null);
              
              if (retryQuery.data) {
                // Filter client-side by date
                const filteredCompleted = retryQuery.data.filter((audit: Audit) => {
                  if (!audit.submitted_at) return false;
                  const auditDate = window.toDhakaTime ? window.toDhakaTime(audit.submitted_at) : new Date(audit.submitted_at);
                  return (!period.start || auditDate >= period.start) && 
                         (!period.end || auditDate <= period.end);
                });
                return filteredCompleted.length;
              }
              return 0;
            }
            
            return (completedResult.data || []).length;
          } catch (err) {
            console.warn(`Error counting completed audits from ${scorecard.table_name}:`, err);
            return 0;
          }
        });
        
        const completedCounts = await Promise.all(completedPromises);
        completed = completedCounts.reduce((sum: number, count: number) => sum + count, 0);
      } else {
        // Fallback to assignment-based count if no scorecards
        completed = allAssignments.filter((a: Assignment) => a.status === 'completed').length;
      }
    } catch (error) {
      console.error('Error calculating completed count:', error);
      // Fallback to assignment-based count on error
      completed = allAssignments.filter((a: Assignment) => a.status === 'completed').length;
    }
    
    const remaining = pending + inProgress;
    
    // Calculate percentage
    const percentage = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
    
    // Calculate working days remaining (assuming 5 working days per week)
    const today = new Date();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (5 - today.getDay())); // Friday
    const daysRemaining = Math.max(0, Math.ceil((endOfWeek.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Calculate average audit duration
    let avgDuration = 0;
    let avgDurationText = '-';
    
    try {
      // Get all scorecards to query audit tables
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const auditFilterField = isAgent ? 'employee_email' : 'auditor_email';
        
        // Get period for date filtering (matching auditor-dashboard.html approach)
        const period = getCurrentPeriodDates();
        
        // Parallelize all duration queries
        const durationPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            // Build query with date filters server-side first (matching auditor-dashboard.html)
            let durationQuery = (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('audit_duration, submitted_at')
              .eq(auditFilterField, currentUserEmail)
              .not('audit_duration', 'is', null);
            
            // Apply date filters server-side if possible (convert Dhaka to UTC)
            if (period.start && window.dhakaDateToUTCISO) {
              durationQuery = durationQuery.gte('submitted_at', window.dhakaDateToUTCISO(period.start));
            }
            if (period.end && window.dhakaDateToUTCISO) {
              durationQuery = durationQuery.lte('submitted_at', window.dhakaDateToUTCISO(period.end));
            }
            
            // Execute query
            let result = await durationQuery;
            let audits = result.data;
            let error = result.error;
            
            // If server-side date filter fails, try without date filter and filter client-side
            if (error && period && (period.start || period.end)) {
              console.warn(`Server-side date filter failed for ${scorecard.table_name}, falling back to client-side filtering:`, error);
              const retryQuery = (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('audit_duration, submitted_at')
                .eq(auditFilterField, currentUserEmail)
                .not('audit_duration', 'is', null);
              
              const retryResult = await retryQuery;
              if (retryResult.data && period.start) {
                // Filter client-side by date
                retryResult.data = retryResult.data.filter((audit: Audit) => {
                  if (!audit.submitted_at) return false;
                  const auditDate = window.toDhakaTime ? window.toDhakaTime(audit.submitted_at) : new Date(audit.submitted_at);
                  return (!period.start || auditDate >= period.start) && 
                         (!period.end || auditDate <= period.end);
                });
                audits = retryResult.data;
                error = null;
              } else if (retryResult.error) {
                // If still error, table might not have the filter field column - skip this table silently
                return [];
              }
            }
            
            // If error, try without audit_duration filter (some tables may not have this column)
            if (error) {
              let retryQuery = (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('audit_duration, submitted_at')
                .eq(auditFilterField, currentUserEmail);
              
              // Apply date filters if period exists
              if (period.start && window.dhakaDateToUTCISO) {
                retryQuery = retryQuery.gte('submitted_at', window.dhakaDateToUTCISO(period.start));
              }
              if (period.end && window.dhakaDateToUTCISO) {
                retryQuery = retryQuery.lte('submitted_at', window.dhakaDateToUTCISO(period.end));
              }
              
              const retryResult = await retryQuery;
              if (!retryResult.error && retryResult.data) {
                // Filter client-side for non-null audit_duration
                audits = retryResult.data.filter((a: Audit) => a.audit_duration != null);
                // Also apply client-side date filtering as fallback
                if (period.start && audits) {
                  audits = audits.filter((audit: Audit) => {
                    if (!audit.submitted_at) return false;
                    const auditDate = window.toDhakaTime ? window.toDhakaTime(audit.submitted_at) : new Date(audit.submitted_at);
                    return (!period.start || auditDate >= period.start) && 
                           (!period.end || auditDate <= period.end);
                  });
                }
                error = null;
              } else {
                // If still error, table might not have the filter field column - skip this table silently
                return [];
              }
            }
            
            if (!error && audits && audits.length > 0) {
              // Fallback client-side filtering if server-side filter didn't work or data has no date
              if (period.start) {
                audits = audits.filter((audit: Audit) => {
                  if (!audit.submitted_at) return false;
                  const auditDate = window.toDhakaTime ? window.toDhakaTime(audit.submitted_at) : new Date(audit.submitted_at);
                  return (!period.start || auditDate >= period.start) && 
                         (!period.end || auditDate <= period.end);
                });
              }
              
              return audits.map((audit: Audit) => {
                // Handle duration conversion
                // NEW FORMAT: All numeric values are in SECONDS (as of timer update)
                // LEGACY FORMAT: String time formats (MM:SS or HH:MM:SS) or very old numeric values in minutes
                let durationInMinutes = 0;
                if (typeof audit.audit_duration === 'number') {
                  // All numeric audit_duration values are now in seconds, convert to minutes
                  durationInMinutes = audit.audit_duration / 60;
                } else if (typeof audit.audit_duration === 'string') {
                  // Try parsing as integer first
                  const asInt = parseInt(audit.audit_duration);
                  if (!isNaN(asInt)) {
                    // If it's a numeric string, treat as seconds (new format)
                    durationInMinutes = asInt / 60; // Convert seconds to minutes
                  } else {
                    // Legacy format: time string (MM:SS or HH:MM:SS)
                    const timeParts = audit.audit_duration.split(':');
                    if (timeParts.length === 2) {
                      // MM:SS format
                      const minutes = parseInt(timeParts[0]) || 0;
                      const seconds = parseInt(timeParts[1]) || 0;
                      durationInMinutes = minutes + (seconds / 60);
                    } else if (timeParts.length === 3) {
                      // HH:MM:SS format
                      const hours = parseInt(timeParts[0]) || 0;
                      const minutes = parseInt(timeParts[1]) || 0;
                      const seconds = parseInt(timeParts[2]) || 0;
                      durationInMinutes = (hours * 60) + minutes + (seconds / 60);
                    }
                  }
                }
                return durationInMinutes > 0 ? durationInMinutes : null;
              }).filter(Boolean);
            }
            return [];
          } catch (err) {
            console.warn(`Error getting duration from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const durationResults = await Promise.all(durationPromises);
        const allDurations = durationResults.flat();
        const totalDuration = allDurations.reduce((sum: number, d: number) => sum + d, 0);
        const auditCount = allDurations.length;
        
        if (auditCount > 0) {
          avgDuration = totalDuration / auditCount; // Average in minutes
          
          // Format duration (avgDuration is in minutes)
          if (avgDuration >= 60) {
            const hours = Math.floor(avgDuration / 60);
            const minutes = Math.round(avgDuration % 60);
            avgDurationText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
          } else {
            avgDurationText = `${Math.round(avgDuration)}m`;
          }
          console.log(`Calculated avgDuration: ${avgDurationText} from ${auditCount} audits`);
        } else {
          console.log('No audits with duration data found for avgDuration calculation');
        }
      }
    } catch (error) {
      console.error('Error calculating average duration:', error);
    }
    
    // Calculate total audits conducted
    let totalAuditsConducted = 0;
    let totalScoreSum = 0;
    let totalAuditsWithScore = 0;
    let avgQualityScore = 0;
    let avgQualityScoreText = '-';
    let passingCount = 0;
    let notPassingCount = 0;
    
    if (isAgent) {
      // For employees: Count completed audits from scorecard tables
      // Use the same logic as loadCompletedAuditsForEmployee
      try {
        const { data: scorecards, error: scError } = await (window.supabaseClient as any)
          .from('scorecards')
          .select('id, name, table_name, scoring_type')
          .eq('is_active', true);
        
        if (!scError && scorecards) {
          const auditFilterField = 'employee_email';
          const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
          
          // Parallelize all audit queries
          const auditPromises = scorecards.map(async (scorecard: Scorecard) => {
            try {
              const { data: audits, error } = await (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('*')
                .order('submitted_at', { ascending: false })
                .limit(500);
              
              if (!error && audits && audits.length > 0) {
                let filteredAudits = audits.filter((audit: Audit) => {
                  const emailToCheck = audit[auditFilterField];
                  if (!emailToCheck) return false;
                  const normalizedEmailToCheck = emailToCheck.toLowerCase().trim();
                  return normalizedEmailToCheck === normalizedCurrentEmail;
                });
                
                // Apply date filter (week or date range)
                const period = getCurrentPeriodDates();
                filteredAudits = filteredAudits.filter((audit: Audit) => {
                  const auditDate = audit.submitted_at;
                  if (!auditDate) return false;
                  return isDateInRange(auditDate, period.start, period.end);
                });
                
                return filteredAudits.map((audit: Audit) => {
                  const score = parseFloat(String(audit.average_score || audit.averageScore || 0));
                  const passingStatus = audit.passing_status || audit.passingStatus || '';
                  const normalizedStatus = normalizePassingStatus(passingStatus);
                  
                  return { 
                    score: !isNaN(score) ? score : null,
                    passingStatus: normalizedStatus
                  };
                });
              }
              return [];
            } catch (err) {
              console.warn(`Error getting audits from ${scorecard.table_name}:`, err);
              return [];
            }
          });
          
          const auditResults = await Promise.all(auditPromises);
          const allAudits = auditResults.flat();
          totalAuditsConducted = allAudits.length;
          allAudits.forEach((audit: { score: number | null; passingStatus: string }) => {
            if (audit.score !== null) {
              totalScoreSum += audit.score;
              totalAuditsWithScore++;
            }
            // Count passing/not passing - use normalized status for consistency
            const normalizedStatus = normalizePassingStatus(audit.passingStatus);
            if (normalizedStatus === 'Passed') {
              passingCount++;
            } else {
              // Count everything else (including 'Not Passed', 'Not Passing', empty, null, etc.) as 'Not Passed'
              notPassingCount++;
            }
          });
          
          if (totalAuditsWithScore > 0) {
            avgQualityScore = totalScoreSum / totalAuditsWithScore;
            avgQualityScoreText = `${Math.round(avgQualityScore)}%`;
          }
          
          console.log(`Stats for employee: ${totalAuditsConducted} audits conducted, ${avgQualityScoreText} average score, ${passingCount} passing, ${notPassingCount} not passing`);
        }
      } catch (error) {
        console.error('Error calculating audits conducted and average score:', error);
      }
    } else {
      // For auditors: Count completed audits from scorecard tables (same as average quality score calculation)
      // This ensures we count all audits, even if they don't exist in audit_assignments table
      try {
        const { data: scorecards, error: scError } = await (window.supabaseClient as any)
          .from('scorecards')
          .select('id, name, table_name, scoring_type')
          .eq('is_active', true);
        
        if (!scError && scorecards) {
          const auditFilterField = 'auditor_email';
          const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
          const period = getCurrentPeriodDates();
          
          // Parallelize all audit queries - get all audits conducted by this auditor
          // Use the same logic as agents, but filter by auditor_email instead of employee_email
          const auditPromises = scorecards.map(async (scorecard: Scorecard) => {
            try {
              const { data: audits, error } = await (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('*')
                .order('submitted_at', { ascending: false })
                .limit(500);
              
              if (!error && audits && audits.length > 0) {
                // Filter by auditor email (case-insensitive) - same logic as agents use for employee_email
                let filteredAudits = audits.filter((audit: Audit) => {
                  const emailToCheck = audit[auditFilterField];
                  if (!emailToCheck) return false;
                  const normalizedEmailToCheck = emailToCheck.toLowerCase().trim();
                  return normalizedEmailToCheck === normalizedCurrentEmail;
                });
                
                // Apply date filter (week or date range)
                filteredAudits = filteredAudits.filter((audit: Audit) => {
                  const auditDate = audit.submitted_at;
                  if (!auditDate) return false;
                  return isDateInRange(auditDate, period.start, period.end);
                });
                
                return filteredAudits.map((audit: Audit) => {
                  const score = parseFloat(String(audit.average_score || audit.averageScore || 0));
                  const passingStatus = audit.passing_status || audit.passingStatus || '';
                  const normalizedStatus = normalizePassingStatus(passingStatus);
                  
                  return { 
                    score: !isNaN(score) ? score : null,
                    passingStatus: normalizedStatus
                  };
                });
              }
              return [];
            } catch (err) {
              console.warn(`Error getting audits from ${scorecard.table_name}:`, err);
              return [];
            }
          });
          
          const auditResults = await Promise.all(auditPromises);
          const allAudits = auditResults.flat();
          
          // Count total audits conducted from scorecard tables
          totalAuditsConducted = allAudits.length;
          
          // Calculate average quality score from all audits conducted by this auditor
          allAudits.forEach((audit: { score: number | null; passingStatus: string }) => {
            if (audit.score !== null) {
              totalScoreSum += audit.score;
              totalAuditsWithScore++;
            }
            // Count passing/not passing - use normalized status for consistency
            const normalizedStatus = normalizePassingStatus(audit.passingStatus);
            if (normalizedStatus === 'Passed') {
              passingCount++;
            } else {
              // Count everything else (including 'Not Passed', 'Not Passing', empty, null, etc.) as 'Not Passed'
              notPassingCount++;
            }
          });
          
          if (totalAuditsWithScore > 0) {
            avgQualityScore = totalScoreSum / totalAuditsWithScore;
            avgQualityScoreText = `${Math.round(avgQualityScore)}%`;
          }
          
          console.log(`Stats for auditor: ${totalAuditsConducted} audits conducted (from scorecard tables), ${avgQualityScoreText} average quality score (from ${totalAuditsWithScore} scored audits filtered by auditor_email), ${passingCount} passed, ${notPassingCount} not passed`);
        }
      } catch (error) {
        console.error('Error calculating audits conducted and average quality score for auditor:', error);
      }
    }
    
    // Calculate reversal counts (active and resolved)
    let activeReversals = 0;
    let resolvedReversals = 0;
    let totalReversals = 0;
    let requiresAcknowledgment = 0;
    
    // For agents: Count audits with acknowledgement_status = 'pending'
    if (isAgent) {
      try {
        const { data: scorecards, error: scError } = await (window.supabaseClient as any)
          .from('scorecards')
          .select('table_name')
          .eq('is_active', true);
        
        if (!scError && scorecards) {
          const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
          
          // Parallelize all audit count queries
          const auditPromises = scorecards.map(async (scorecard: Scorecard) => {
            try {
              // Get all audits for this employee and filter client-side
              const { data: allAudits, error: auditError } = await (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('id, employee_email, acknowledgement_status, submitted_at')
                .limit(1000);
              
              if (!auditError && allAudits) {
                // Filter by email (case-insensitive) and acknowledgement_status = 'pending'
                let pendingAudits = allAudits.filter((audit: Audit) => {
                  const emailToCheck = audit.employee_email;
                  if (!emailToCheck) return false;
                  const emailMatches = emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
                  
                  const ackStatus = audit.acknowledgement_status || audit.acknowledgementStatus || '';
                  const isPending = ackStatus && (
                    ackStatus.toLowerCase() === 'pending' || 
                    ackStatus === 'Pending'
                  );
                  
                  return emailMatches && isPending;
                });
                
                // Apply date filter (week or date range)
                const period = getCurrentPeriodDates();
                pendingAudits = pendingAudits.filter((audit: Audit) => {
                  const auditDate = audit.submitted_at;
                  if (!auditDate) return false;
                  return isDateInRange(auditDate, period.start, period.end);
                });
                
                console.log(`Found ${pendingAudits.length} pending audits in ${scorecard.table_name} for ${currentUserEmail}`);
                
                return pendingAudits.length;
              }
              return 0;
            } catch (err) {
              console.warn(`Error counting pending audits in ${scorecard.table_name}:`, err);
              return 0;
            }
          });
          
          const auditCounts = await Promise.all(auditPromises);
          requiresAcknowledgment = auditCounts.reduce((sum: number, count: number) => sum + count, 0);
          
          console.log(`Total audits requiring acknowledgment for agent ${currentUserEmail}:`, requiresAcknowledgment);
        }
      } catch (error) {
        console.error('Error calculating acknowledgment count:', error);
      }
    }
    
    // Calculate reversal counts (for reversal card stats)
    try {
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const reversalFilterField = isAgent ? 'employee_email' : 'auditor_email';
        
        // Parallelize all reversal count queries
        const reversalPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            // Try query with reversal_requested_at filter first
            let { data: allReversals, error: allError } = await (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('reversal_requested_at, reversal_responded_at, ' + reversalFilterField)
              .not('reversal_requested_at', 'is', null)
              .limit(500);
            
            // If error, table might not have reversal_requested_at column - skip this table silently
            if (allError) {
              // Don't log warning as this is expected for some tables
              return [];
            }
            
            if (!allError && allReversals) {
              const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
              
              // Filter by email (case-insensitive)
              let filteredReversals = allReversals.filter((reversal: Audit) => {
                const emailToCheck = reversal[reversalFilterField];
                if (!emailToCheck) return false;
                return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
              });
              
              // Apply date filter based on reversal_requested_at (week or date range)
              const period = getCurrentPeriodDates();
              filteredReversals = filteredReversals.filter((reversal: Audit) => {
                const reversalDate = reversal.reversal_requested_at;
                if (!reversalDate) return false;
                return isDateInRange(reversalDate, period.start, period.end);
              });
              
              return filteredReversals.map((reversal: Audit) => {
                const active = reversal.reversal_requested_at && !reversal.reversal_responded_at;
                const resolved = !!reversal.reversal_responded_at;
                return { active, resolved };
              });
            }
            return [];
          } catch (err) {
            console.warn(`Error counting reversals in ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const reversalResults = await Promise.all(reversalPromises);
        const allReversalsData = reversalResults.flat();
        
        // Count all reversals for total/active/resolved stats
        allReversalsData.forEach((reversal: { active: boolean; resolved: boolean }) => {
          totalReversals++;
          if (reversal.active) activeReversals++;
          if (reversal.resolved) resolvedReversals++;
        });
      }
    } catch (error) {
      console.error('Error calculating reversal counts:', error);
    }
    
    // Collect all stats into an object for caching
    const statsData = {
      totalAssigned,
      completed,
      inProgress,
      pending,
      remaining,
      percentage,
      daysRemaining,
      avgDuration,
      avgDurationText,
      totalAuditsConducted,
      totalScoreSum,
      totalAuditsWithScore,
      avgQualityScore,
      avgQualityScoreText,
      passingCount,
      notPassingCount,
      activeReversals,
      resolvedReversals,
      totalReversals,
      requiresAcknowledgment
    };
    
    // Update UI with fresh data
    console.log('Updating UI with fresh stats');
    renderStatsFromData(statsData);
    
  } catch (error) {
    console.error('Error updating your stats:', error);
  }
}

function renderStatsFromData(stats: StatsData) {
  const {
    totalAssigned,
    completed,
    inProgress,
    pending,
    remaining,
    percentage,
    daysRemaining,
    avgDurationText,
    totalAuditsConducted,
    totalAuditsWithScore,
    avgQualityScoreText,
    passingCount,
    notPassingCount,
    activeReversals,
    resolvedReversals,
    totalReversals,
    requiresAcknowledgment
  } = stats;
  
  // Update stat cards
  const statsAuditsConductedCount = document.getElementById('statsAuditsConductedCount');
  const statsRemainingText = document.getElementById('statsRemainingText');
  const statsRemainingProgress = document.getElementById('statsRemainingProgress');
  const statsAvgQualityScore = document.getElementById('statsAvgQualityScore');
  const statsAvgScoreSubtitle = document.getElementById('statsAvgScoreSubtitle');
  const statsPassingCount = document.getElementById('statsPassingCount');
  const statsNotPassingCount = document.getElementById('statsNotPassingCount');
  const statsRemainingCount = document.getElementById('statsRemainingCount');
  const statsInProgressCount = document.getElementById('statsInProgressCount');
  const statsDaysRemaining = document.getElementById('statsDaysRemaining');
  const statsReversalTotalCount = document.getElementById('statsReversalTotalCount');
  const statsReversalActiveCount = document.getElementById('statsReversalActiveCount');
  const statsReversalResolvedCount = document.getElementById('statsReversalResolvedCount');
  const statsRequiresAcknowledgmentCount = document.getElementById('statsRequiresAcknowledgmentCount');
  const requiresAcknowledgmentCard = document.getElementById('requiresAcknowledgmentCard');
  const statsAvgDuration = document.getElementById('statsAvgDuration');
  const statsAvgDurationSubtitle = document.getElementById('statsAvgDurationSubtitle');
  
  // Update Audits Conducted card
  if (statsAuditsConductedCount) statsAuditsConductedCount.textContent = String(totalAuditsConducted);
  if (statsRemainingText) statsRemainingText.textContent = `${remaining} remaining`;
  
  // Calculate progress bar percentage (completed / total assigned, showing completed portion in green)
  const completedCount = totalAssigned - remaining;
  const progressPercentage = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;
  if (statsRemainingProgress) {
    statsRemainingProgress.style.width = `${Math.min(100, progressPercentage)}%`;
    if (progressPercentage > 0) {
      statsRemainingProgress.classList.remove('bg-warning');
      statsRemainingProgress.classList.add('bg-success');
    } else {
      statsRemainingProgress.classList.remove('bg-success');
      statsRemainingProgress.classList.add('bg-warning');
    }
  }
  
  // Update Average Quality Score card
  if (statsAvgQualityScore) statsAvgQualityScore.textContent = avgQualityScoreText;
  if (statsAvgScoreSubtitle) {
    statsAvgScoreSubtitle.textContent = totalAuditsConducted > 0 ? `from ${totalAuditsConducted} audits` : 'No audits yet';
  }
  
  // Update passing and not passing count chips
  if (statsPassingCount) {
    const loadingSpan = statsPassingCount.querySelector('span.inline-block');
    if (loadingSpan) {
      loadingSpan.remove();
    }
    const svg = statsPassingCount.querySelector('svg');
    const textSpan = statsPassingCount.querySelector('span:last-child');
    if (svg && textSpan) {
      let nextSibling = svg.nextSibling;
      while (nextSibling && nextSibling !== textSpan) {
        const toRemove = nextSibling;
        nextSibling = nextSibling.nextSibling;
        toRemove.remove();
      }
      textSpan.textContent = `${passingCount} Passed`;
    }
  }
  if (statsNotPassingCount) {
    const loadingSpan = statsNotPassingCount.querySelector('span.inline-block');
    if (loadingSpan) {
      loadingSpan.remove();
    }
    const svg = statsNotPassingCount.querySelector('svg');
    const textSpan = statsNotPassingCount.querySelector('span:last-child');
    if (svg && textSpan) {
      let nextSibling = svg.nextSibling;
      while (nextSibling && nextSibling !== textSpan) {
        const toRemove = nextSibling;
        nextSibling = nextSibling.nextSibling;
        toRemove.remove();
      }
      textSpan.textContent = `${notPassingCount} Not Passed`;
    }
  }
  
  // Calculate and update Pass Rate (for employees)
  const passRate = totalAuditsConducted > 0 ? Math.round((passingCount / totalAuditsConducted) * 100) : 0;
  const statsPassRate = document.getElementById('statsPassRate');
  const statsPassRateChange = document.getElementById('statsPassRateChange');
  if (statsPassRate) {
    const loadingDiv = statsPassRate.querySelector('div');
    if (loadingDiv) loadingDiv.remove();
    statsPassRate.textContent = `${passRate}%`;
  }
  if (statsPassRateChange) {
    // Hide the "X passed" text since we're showing counts as chips in the Pass Rate card
    statsPassRateChange.style.display = 'none';
  }
  
  // Update other cards
  if (statsRemainingCount) statsRemainingCount.textContent = String(remaining);
  if (statsInProgressCount) statsInProgressCount.textContent = String(inProgress);
  if (statsDaysRemaining) statsDaysRemaining.textContent = `${daysRemaining} working day${daysRemaining !== 1 ? 's' : ''} remaining`;
  
  // Update Reversal card
  if (statsReversalTotalCount) statsReversalTotalCount.textContent = String(totalReversals);
  if (statsReversalActiveCount) statsReversalActiveCount.textContent = String(activeReversals);
  if (statsReversalResolvedCount) statsReversalResolvedCount.textContent = String(resolvedReversals);
  
  // Update Requires Acknowledgment card (agents only)
  if (isAgent && statsRequiresAcknowledgmentCount && requiresAcknowledgmentCard) {
    statsRequiresAcknowledgmentCount.textContent = String(requiresAcknowledgment);
    requiresAcknowledgmentCard.style.display = 'block';
  } else if (requiresAcknowledgmentCard) {
    requiresAcknowledgmentCard.style.display = 'none';
  }
  
  // Update Avg Duration card
  if (statsAvgDuration) {
    // Clear any loading placeholder and set the value directly
    statsAvgDuration.innerHTML = '';
    const displayValue = avgDurationText || '-';
    statsAvgDuration.textContent = displayValue;
    // Ensure element is visible (in case it was hidden)
    statsAvgDuration.style.display = '';
    console.log('Rendering avgDuration:', displayValue);
  } else {
    console.warn('statsAvgDuration element not found');
  }
  if (statsAvgDurationSubtitle) {
    statsAvgDurationSubtitle.textContent = 'per audit';
  }
}

function viewAudit(assignmentId: string) {
  window.location.href = `create-audit.html?assignment=${assignmentId}`;
}

function viewAuditDetails(auditId: string, scorecardId: string, tableName: string) {
  window.location.href = `audit-view.html?id=${auditId}&scorecard=${scorecardId || ''}&table=${tableName || ''}`;
}

function formatTimestamp(timestamp: string | Date | null | undefined) {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function getStatusText(status: string, isAgentView = false): string {
  if (isAgentView) {
    // For agents, show status from their perspective
    const statusMap: { [key: string]: string } = {
      'pending': 'audit assigned',
      'in_progress': 'audit in progress',
      'completed': 'audit completed'
    };
    return statusMap[status] || 'updated';
  } else {
    // For auditors, show status from their perspective
    const statusMap: { [key: string]: string } = {
      'pending': 'was assigned',
      'in_progress': 'started',
      'completed': 'completed'
    };
    return statusMap[status] || 'updated';
  }
}

// Helper function to normalize passing status (handles both old and new values)
function normalizePassingStatus(status: string | null | undefined): string {
  if (!status) return status || '';
  // Convert old values to new ones for consistency
  if (status === 'Passing' || status === 'Pass') return 'Passed';
  if (status === 'Not Passing') return 'Not Passed';
  return status; // Return as-is if already normalized or unknown
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
}

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getAcknowledgmentStatusChip(audit: Audit): string {
  const acknowledgementStatus = audit.acknowledgement_status || audit.acknowledgementStatus || '';
  
  // Check if acknowledged
  const isAcknowledged = acknowledgementStatus && (
    acknowledgementStatus.toLowerCase().includes('acknowledged') || 
    acknowledgementStatus === 'Acknowledged'
  );
  
  // Check if pending
  const isPending = acknowledgementStatus && (
    acknowledgementStatus.toLowerCase() === 'pending' || 
    acknowledgementStatus === 'Pending'
  );
  
  // If no status or empty, default to pending (since audits are created with pending by default)
  if (!acknowledgementStatus || acknowledgementStatus.trim() === '') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: #fef3c7; color: #92400e;">
      <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Acknowledgement Pending
    </span>`;
  }
  
  if (isAcknowledged) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: #dcfce7; color: #166534;">
      <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      Acknowledged
    </span>`;
  }
  
  if (isPending) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: #fef3c7; color: #92400e;">
      <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Acknowledgement Pending
    </span>`;
  }
  
  // Default: show pending if status is unknown
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: #fef3c7; color: #92400e;">
    <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    Acknowledgement Pending
  </span>`;
}

function getReversalStatusChip(audit: Audit): string {
  // Check if audit has reversal request
  const reversalRequestedAt = audit.reversal_requested_at || audit.reversalRequestedAt;
  const reversalRespondedAt = audit.reversal_responded_at || audit.reversalRespondedAt;
  const reversalApproved = audit.reversal_approved;
  const acknowledgementStatus = audit.acknowledgement_status || audit.acknowledgementStatus;
  
  // If no reversal was requested, return empty
  if (!reversalRequestedAt) return '';
  
  // Determine status from reversal_approved and acknowledgement_status
  let status = null;
  
  // Check acknowledgement first
  if (acknowledgementStatus === 'Acknowledged') {
    status = 'Acknowledged';
  } 
  // If reversal was requested but not responded to yet
  else if (reversalRequestedAt && !reversalRespondedAt) {
    status = 'Pending';
  }
  // If reversal was responded to, check approval status
  else if (reversalRespondedAt) {
    // Handle different possible formats for reversal_approved
    if (reversalApproved === true || reversalApproved === 'true' || reversalApproved === 1 || reversalApproved === '1') {
      status = 'Approved';
    } else if (reversalApproved === false || reversalApproved === 'false' || reversalApproved === 0 || reversalApproved === '0') {
      status = 'Rejected';
    } else {
      // If responded but approval status unclear, default to Pending
      status = 'Pending';
    }
  }
  
  // If no status determined, return empty string
  if (!status) return '';
  
  // Determine chip styling based on status
  let statusBgColor: string, statusTextColor: string, statusIcon: string, statusText: string;
  if (status === 'Pending') {
    statusBgColor = '#fef3c7';
    statusTextColor = '#92400e';
    statusIcon = `<svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`;
    statusText = 'Pending';
  } else if (status === 'Approved') {
    statusBgColor = '#dcfce7';
    statusTextColor = '#166534';
    statusIcon = `<svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>`;
    statusText = 'Approved';
  } else if (status === 'Rejected') {
    statusBgColor = '#fee2e2';
    statusTextColor = '#991b1b';
    statusIcon = `<svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>`;
    statusText = 'Rejected';
  } else if (status === 'Acknowledged') {
    statusBgColor = '#dbeafe';
    statusTextColor = '#1e40af';
    statusIcon = `<svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>`;
    statusText = 'Acknowledged';
  } else {
    statusBgColor = '#f3f4f6';
    statusTextColor = '#374151';
    statusIcon = '';
    statusText = status;
  }
  
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: ${statusBgColor}; color: ${statusTextColor};">
    ${statusIcon}
    ${statusText}
  </span>`;
}

// Notifications
async function loadNotifications() {
  try {
    if (!currentUserEmail) return;

    // Always fetch fresh data
    await fetchAndCacheNotifications();
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

async function fetchAndCacheNotifications() {
  try {
    if (!currentUserEmail) return;

    // Get recent audit assignments updates from audit tables
    // Filter by employee_email if agent, otherwise by auditor_email
    const notificationFilterField = isAgent ? 'employee_email' : 'auditor_email';
    
    const { data: scorecards, error: scError } = await window.supabaseClient
      .from('scorecards')
      .select('table_name')
      .eq('is_active', true);
    
    let assignments: Audit[] = [];
    if (!scError && scorecards) {
      const assignmentPromises = scorecards.map(async (scorecard: Scorecard) => {
        try {
          // Query scorecard tables (all audits in scorecard tables are completed by default)
          // Use submitted_at for ordering since assignment_created_at doesn't exist in scorecard tables
          let { data: audits, error } = await window.supabaseClient
            .from(scorecard.table_name)
            .select('*')
            .eq(notificationFilterField, currentUserEmail)
            .order('submitted_at', { ascending: false })
            .limit(20);
          
          if (error) {
            // If error, table might not have the filter field column - skip this table silently
            // Don't log warning as this is expected for some tables
            return [];
          }
          
          if (!error && audits) {
            return audits.map((audit: Audit) => ({
              ...audit,
              status: 'completed', // All audits in scorecard tables are completed by default
              created_at: audit.created_at,
              completed_at: audit.submitted_at
            }));
          }
          return [];
        } catch (err) {
          console.warn(`Error loading from ${scorecard.table_name}:`, err);
          return [];
        }
      });
      
      const assignmentResults = await Promise.all(assignmentPromises);
      assignments = assignmentResults.flat();
    }

    // Get reversals (audits with reversal requests)
    const { data: reversalScorecards, error: reversalScError } = await window.supabaseClient
      .from('scorecards')
      .select('table_name')
      .eq('is_active', true);

    let reversals: Audit[] = [];
    if (!reversalScError && reversalScorecards) {
      // Filter by employee_email if agent, otherwise by auditor_email
      const reversalNotificationFilterField = isAgent ? 'employee_email' : 'auditor_email';
      const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
      
      for (const scorecard of reversalScorecards) {
        try {
          // Get all reversals and filter client-side for case-insensitive matching
          // Try query with reversal_requested_at filter first
          let { data: auditReversals, error } = await window.supabaseClient
            .from(scorecard.table_name)
            .select('id, employee_name, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, acknowledgement_status, interaction_id, submitted_at')
            .not('reversal_requested_at', 'is', null)
            .order('reversal_requested_at', { ascending: false })
            .limit(200);

          // If error, table might not have reversal_requested_at column - skip this table silently
          if (error) {
            // Don't log warning as this is expected for some tables
            continue;
          }

          if (!error && auditReversals && auditReversals.length > 0) {
            // Filter reversals by email (case-insensitive)
            let filteredReversals = auditReversals.filter((rev: Audit) => {
              const emailToCheck = rev[reversalNotificationFilterField];
              if (!emailToCheck) return false;
              return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
            });
            
            // Apply the same filtering logic as reversal.html
            if (isAgent) {
              // For agents: Show reversals that need acknowledgement
              filteredReversals = filteredReversals.filter((reversal: Audit) => {
                const acknowledgementStatus = reversal.acknowledgement_status || reversal.acknowledgementStatus || '';
                const isAcknowledged = acknowledgementStatus && (
                  acknowledgementStatus.toLowerCase().includes('acknowledged') || 
                  acknowledgementStatus === 'Acknowledged'
                );
                
                const isPending = reversal.reversal_approved === null;
                const isApproved = reversal.reversal_approved === true || reversal.reversal_approved === 'true' || reversal.reversal_approved === 1 || reversal.reversal_approved === '1';
                const isRejected = reversal.reversal_approved === false || reversal.reversal_approved === 'false' || reversal.reversal_approved === 0 || reversal.reversal_approved === '0';
                
                return !isAcknowledged && (isPending || isApproved || isRejected);
              });
            } else {
              // For auditors: Only show unprocessed reversals (reversal_approved is null)
              filteredReversals = filteredReversals.filter((rev: Audit) => rev.reversal_approved === null);
            }
            
            // Sort reversals: prioritize those with recent responses
            filteredReversals.sort((a: Audit, b: Audit) => {
              const aResponded = a.reversal_responded_at ? new Date(a.reversal_responded_at).getTime() : 0;
              const bResponded = b.reversal_responded_at ? new Date(b.reversal_responded_at).getTime() : 0;
              if (aResponded !== bResponded) {
                return bResponded - aResponded; // Most recent responses first
              }
              const aRequested = new Date(a.reversal_requested_at || 0).getTime();
              const bRequested = new Date(b.reversal_requested_at || 0).getTime();
              return bRequested - aRequested;
            });
            
            filteredReversals.forEach((rev: Audit) => {
              // Determine reversal status - check if it's been responded to first, then check acknowledgement
              const acknowledgementStatus = rev.acknowledgement_status || rev.acknowledgementStatus;
              const isAcknowledged = acknowledgementStatus && (
                acknowledgementStatus.toLowerCase().includes('acknowledged') || 
                acknowledgementStatus === 'Acknowledged'
              );
              
              let status = null;
              
              // Determine status from reversal_approved and acknowledgement_status
              // Check acknowledgement first
              if (acknowledgementStatus === 'Acknowledged') {
                status = 'Acknowledged';
              }
              // If reversal was responded to, check approval status
              else if (rev.reversal_responded_at) {
                const approved = rev.reversal_approved;
                if (approved === true || approved === 'true' || approved === 1 || approved === '1') {
                  status = 'Approved';
                } else if (approved === false || approved === 'false' || approved === 0 || approved === '0') {
                  status = 'Rejected';
                } else {
                  status = 'Pending';
                }
              }
              // If reversal was requested but not responded to yet
              else if (rev.reversal_requested_at && !rev.reversal_responded_at) {
                status = 'Pending';
              }
              
              // For agents: Add notifications for all reversals that appear in reversal.html
              // For auditors: Only add notifications for unprocessed reversals (already filtered above)
              
              // Add notification for reversal request (for pending reversals)
              if (status === 'Pending') {
              reversals.push({
              ...rev,
              type: 'reversal',
                reversal_status: status,
              scorecard_table: scorecard.table_name
              });
              }
              
              // Add notification for status update if status is Approved or Rejected but NOT yet acknowledged
              if (status && (status === 'Approved' || status === 'Rejected') && !isAcknowledged) {
                const statusText = status === 'Approved' ? 'approved' : 'rejected';
                reversals.push({
                  ...rev,
                  type: 'reversal_status_update',
                  reversal_status: status,
                  status_text: statusText,
                  timestamp: rev.reversal_responded_at || rev.reversal_requested_at,
                  scorecard_table: scorecard.table_name
                });
              }
            });
          }
        } catch (err) {
          console.warn(`Error loading reversals from ${scorecard.table_name}:`, err);
        }
      }
    }

    // Combine and format notifications
    notifications = [];

    // Add assignment updates (only for auditors, or completed audits for agents)
    (assignments || []).forEach(assignment => {
      // For agents, only show completed audits, not pending/in_progress assignments
      if (isAgent && assignment.status !== 'completed') {
        return;
      }
      
      const employee = allUsers.find(u => u.email === assignment.employee_email);
      const employeeName = employee?.name || assignment.employee_name || assignment.employee_email?.split('@')[0] || 'Unknown';
      
      notifications.push({
        id: `assignment-${assignment.id}`,
        type: 'assignment',
        title: `Audit ${assignment.status === 'completed' ? 'completed' : assignment.status === 'in_progress' ? 'started' : 'assigned'}`,
        message: `${employeeName} - ${assignment.employee_name || 'Audit'}`,
        timestamp: assignment.scheduled_date ? new Date(assignment.scheduled_date + 'T00:00:00').toISOString() : assignment.created_at,
        status: assignment.status,
        assignmentId: assignment.id
      });
    });

    // Add reversal notifications
    reversals.forEach((reversal: Audit) => {
      if (reversal.type === 'reversal_status_update') {
        // Status update notification
        const statusDisplay = reversal.reversal_status === 'Approved' ? 'Approved' : reversal.reversal_status === 'Rejected' ? 'Rejected' : reversal.reversal_status === 'Acknowledged' ? 'Acknowledged' : 'Updated';
        const interactionId = reversal.interaction_id || '';
        notifications.push({
          id: `reversal-status-${reversal.id}`,
          type: 'reversal_status_update',
          title: `Reversal ${statusDisplay}`,
          message: isAgent 
            ? `Your reversal request has been ${reversal.status_text || 'updated'}`
            : `Reversal request${interactionId ? ` for ${interactionId}` : ''} has been ${reversal.status_text || 'updated'}`,
          timestamp: (reversal.timestamp || reversal.reversal_responded_at) as string | undefined,
          auditId: reversal.id as string | undefined,
          tableName: (reversal.scorecard_table as string | undefined),
          status: (reversal.reversal_status as string | undefined)
        });
      } else {
        // Initial reversal request notification
      notifications.push({
        id: `reversal-${reversal.id}`,
        type: 'reversal',
        title: 'Reversal Requested',
        message: `${reversal.employee_name || reversal.employee_email || 'Audit'} - Reversal requested`,
        timestamp: reversal.reversal_requested_at as string | undefined,
        auditId: reversal.id as string | undefined,
        tableName: (reversal.scorecard_table as string | undefined)
      });
      }
    });

    // Sort by timestamp (most recent first)
    notifications.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    // Limit to 20 most recent
    notifications = notifications.slice(0, 20);

    // Count unread notifications (last 7 days)
    // For agents, prioritize reversal status updates
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentNotifications = notifications.filter((n: Notification) => n.timestamp && new Date(n.timestamp).getTime() >= sevenDaysAgo.getTime());
    
    if (isAgent) {
      // For agents, count reversal status updates separately
      const reversalStatusUpdates = recentNotifications.filter(n => n.type === 'reversal_status_update');
      unreadNotificationCount = reversalStatusUpdates.length > 0 ? reversalStatusUpdates.length : recentNotifications.length;
    } else {
      unreadNotificationCount = recentNotifications.length;
    }

    // Update UI with fresh data
    console.log('Updating UI with fresh notifications');
    renderNotifications();
    updateNotificationBadge();

  } catch (error) {
    console.error('Error loading notifications:', error);
    const notificationsList = document.getElementById('notificationsList');
    if (notificationsList) notificationsList.innerHTML = `
      <div class="px-4 py-8 text-center text-red-500 text-xs">
        <p>Error loading notifications</p>
      </div>
    `;
  }
}

function renderNotifications() {
  const list = document.getElementById('notificationsList');
  if (!list) return;

  if (notifications.length === 0) {
    list.innerHTML = `
      <div class="px-4 py-8 text-center text-gray-500 text-xs">
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        <p class="font-medium text-gray-700 mb-1">No notifications</p>
        <p class="text-gray-500">You're all caught up!</p>
    </div>
    `;
    return;
  }

  list.innerHTML = notifications.map(notification => {
    const timestamp = formatTimestamp(notification.timestamp);
    let iconColor, bgColor;
    
    if (notification.type === 'reversal_status_update') {
      // Color based on status
      if (notification.status === 'Approved') {
        iconColor = 'text-success';
        bgColor = 'bg-success/10';
      } else if (notification.status === 'Rejected') {
        iconColor = 'text-error';
        bgColor = 'bg-error/10';
      } else if (notification.status === 'Acknowledged') {
        iconColor = 'text-primary';
        bgColor = 'bg-primary/10';
      } else {
        iconColor = 'text-warning';
        bgColor = 'bg-warning/10';
      }
    } else if (notification.type === 'reversal') {
      iconColor = 'text-warning';
      bgColor = 'bg-warning/10';
    } else {
      iconColor = 'text-primary';
      bgColor = 'bg-primary/10';
    }

    let iconPath = '';
    if (notification.type === 'reversal_status_update') {
      if (notification.status === 'Approved') {
        iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      } else if (notification.status === 'Rejected') {
        iconPath = 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z';
      } else {
        iconPath = 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z';
      }
    } else if (notification.type === 'reversal') {
      iconPath = 'M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z';
    } else if (notification.status === 'completed') {
      iconPath = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
    } else if (notification.status === 'in_progress') {
      iconPath = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
    } else {
      iconPath = 'M12 6v6m0 0v6m0-6h6m-6 0H6';
    }

    return `
      <div class="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onclick="handleNotificationClick('${notification.id}')">
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
            <svg class="w-4 h-4 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${iconPath}"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-gray-900 mb-0.5">${escapeHtml(notification.title)}</p>
            <p class="text-xs text-gray-600 mb-1">${escapeHtml(notification.message)}</p>
            <p class="text-[10px] text-gray-500">${timestamp}</p>
          </div>
        </div>
    </div>
    `;
  }).join('');
}

function updateNotificationBadge() {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;

  if (unreadNotificationCount > 0) {
    badge.classList.remove('hidden');
    badge.textContent = unreadNotificationCount > 9 ? '9+' : String(unreadNotificationCount);
  } else {
    badge.classList.add('hidden');
    badge.textContent = '';
  }
}

function showNotifications() {
  const modal = document.getElementById('notificationsModal');
  if (!modal) return;
  
  // Clear unread count when viewing notifications
  unreadNotificationCount = 0;
  updateNotificationBadge();
  
  // Load notifications when showing
  loadNotifications();
  modal.classList.remove('opacity-0', 'invisible');
  modal.classList.add('opacity-100', 'visible');
}

function hideNotifications() {
  const modal = document.getElementById('notificationsModal');
  if (!modal) return;
  
  modal.classList.remove('opacity-100', 'visible');
  modal.classList.add('opacity-0', 'invisible');
}

// Show notifications on hover
document.addEventListener('DOMContentLoaded', function() {
  const notificationBtn = document.getElementById('notificationBtn');
  const notificationModal = document.getElementById('notificationsModal');
  
  if (notificationBtn && notificationModal) {
    let hoverTimeout: ReturnType<typeof setTimeout> | undefined;
    
    notificationBtn.addEventListener('mouseenter', function() {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      showNotifications();
    });
    
    notificationBtn.addEventListener('mouseleave', function(e: MouseEvent) {
      // Check if mouse is moving to modal
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && notificationModal.contains(relatedTarget)) {
        return; // Don't hide if moving to modal
      }
      
      hoverTimeout = setTimeout(() => {
        hideNotifications();
      }, 200); // Small delay to allow moving to modal
    });
    
    notificationModal.addEventListener('mouseenter', function() {
      if (hoverTimeout) clearTimeout(hoverTimeout);
    });
    
    notificationModal.addEventListener('mouseleave', function() {
      hideNotifications();
    });
  }
  
  // Calendar hover functionality
  const calendarBtn = document.getElementById('calendarBtn');
  const calendarModal = document.getElementById('calendarModal');
  
  if (calendarBtn && calendarModal) {
    let calendarHoverTimeout: ReturnType<typeof setTimeout> | undefined;
    
    calendarBtn.addEventListener('mouseenter', function() {
      if (calendarHoverTimeout) clearTimeout(calendarHoverTimeout);
      showCalendar();
    });
    
    calendarBtn.addEventListener('mouseleave', function(e: MouseEvent) {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && calendarModal.contains(relatedTarget)) {
        return;
      }
      
      calendarHoverTimeout = setTimeout(() => {
        hideCalendar();
      }, 200);
    });
    
    calendarModal.addEventListener('mouseenter', function() {
      if (calendarHoverTimeout) clearTimeout(calendarHoverTimeout);
    });
    
    calendarModal.addEventListener('mouseleave', function() {
      hideCalendar();
    });
  }
  
  // Grid hover functionality
  const gridBtn = document.getElementById('gridBtn');
  const gridModal = document.getElementById('gridModal');
  
  if (gridBtn && gridModal) {
    let gridHoverTimeout: ReturnType<typeof setTimeout> | undefined;
    
    gridBtn.addEventListener('mouseenter', function() {
      if (gridHoverTimeout) clearTimeout(gridHoverTimeout);
      showGrid();
    });
    
    gridBtn.addEventListener('mouseleave', function(e: MouseEvent) {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && gridModal.contains(relatedTarget)) {
        return;
      }
      
      gridHoverTimeout = setTimeout(() => {
        hideGrid();
      }, 200);
    });
    
    gridModal.addEventListener('mouseenter', function() {
      if (gridHoverTimeout) clearTimeout(gridHoverTimeout);
    });
    
    gridModal.addEventListener('mouseleave', function() {
      hideGrid();
    });
  }
  
  // Avatar logout menu hover functionality
  const userProfileContainer = document.getElementById('userProfileContainer');
  const avatarLogoutMenu = document.getElementById('avatarLogoutMenu');
  
  if (userProfileContainer && avatarLogoutMenu) {
    let avatarHoverTimeout: ReturnType<typeof setTimeout> | undefined;
    
    userProfileContainer.addEventListener('mouseenter', function() {
      if (avatarHoverTimeout) clearTimeout(avatarHoverTimeout);
      avatarLogoutMenu.classList.remove('opacity-0', 'invisible');
      avatarLogoutMenu.classList.add('opacity-100', 'visible');
    });
    
    userProfileContainer.addEventListener('mouseleave', function(e: MouseEvent) {
      const relatedTarget = e.relatedTarget as Node | null;
      if (relatedTarget && avatarLogoutMenu.contains(relatedTarget)) {
        return;
      }
      
      avatarHoverTimeout = setTimeout(() => {
        hideAvatarLogout();
      }, 200);
    });
    
    avatarLogoutMenu.addEventListener('mouseenter', function() {
      if (avatarHoverTimeout) clearTimeout(avatarHoverTimeout);
    });
    
    avatarLogoutMenu.addEventListener('mouseleave', function() {
      hideAvatarLogout();
    });
  }
});

// Calendar modal functions
function showCalendar() {
  const modal = document.getElementById('calendarModal');
  if (!modal) return;
  
  // Load events when showing calendar
  loadUpcomingEvents();
  
  modal.classList.remove('opacity-0', 'invisible');
  modal.classList.add('opacity-100', 'visible');
}

function hideCalendar() {
  const modal = document.getElementById('calendarModal');
  if (!modal) return;
  
  modal.classList.remove('opacity-100', 'visible');
  modal.classList.add('opacity-0', 'invisible');
}

// Load upcoming events for calendar modal
async function loadUpcomingEvents() {
  try {
    if (!window.supabaseClient) {
      console.error('Supabase client not initialized');
      return;
    }

    const eventsList = document.getElementById('eventsList');
    if (!eventsList) return;

    // Get current user info
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    const currentUserEmail = (userInfo.email || '').toLowerCase().trim();
    const isSuperAdmin = userInfo.role === 'Super Admin';

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    let query = window.supabaseClient
      .from('events')
      .select('*');

    // Filter: only upcoming events (date >= today)
    query = query.gte('date', todayStr);

    // If user is not Super Admin, show events where they are a participant or creator
    if (!isSuperAdmin && currentUserEmail) {
      // First get all events where user is creator
      const { data: createdEvents, error: createdError } = await window.supabaseClient
        .from('events')
        .select('*')
        .eq('created_by', currentUserEmail)
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (createdError && createdError.code !== 'PGRST116' && !createdError.message.includes('does not exist')) {
        console.warn('Error loading created events:', createdError);
      }

      // Then get all events and filter client-side for participants
      const { data: allEvents, error: allError } = await window.supabaseClient
        .from('events')
        .select('*')
        .gte('date', todayStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (allError) {
        // If table doesn't exist, show empty state
        if (allError.code === 'PGRST116' || allError.message.includes('does not exist')) {
          renderEventsList([]);
          return;
        }
        throw allError;
      }

      // Filter events where user is a participant
      const participantEvents = (allEvents || []).filter((event: Event) => {
        if (!event.participants) return false;
        
        let participantEmails = [];
        if (Array.isArray(event.participants)) {
          participantEmails = event.participants;
        } else if (typeof event.participants === 'string') {
          try {
            const parsed = JSON.parse(event.participants);
            participantEmails = Array.isArray(parsed) ? parsed : [event.participants];
          } catch {
            participantEmails = event.participants.split(',').map((e: string) => e.trim()).filter((e: string) => e);
          }
        }
        
        return participantEmails.some((email: string) => email.toLowerCase().trim() === currentUserEmail);
      });

      // Combine created and participant events, remove duplicates
      const combinedEvents = [...(createdEvents || []), ...participantEvents];
      const uniqueEvents = combinedEvents.filter((event, index, self) => 
        index === self.findIndex(e => e.id === event.id)
      );

      // Filter to only show truly upcoming events
      const upcomingEvents = uniqueEvents.filter(event => {
        const eventDate = new Date(event.date || '');
        const eventDateStr = eventDate.toISOString().split('T')[0];
        
        // If event is today, check if start time is in the future (or if no start time, include it)
        if (eventDateStr === todayStr) {
          if (!event.start_time) return true; // Include all-day events
          return event.start_time > currentTime;
        }
        // If event is in the future, include it
        return eventDateStr > todayStr;
      });

      renderEventsList(upcomingEvents);
      return;
    }

    const { data, error } = await query
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(20);

    if (error) {
      console.error('Error loading events:', error);
      // If table doesn't exist, show empty state
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        renderEventsList([]);
        return;
      }
      eventsList.innerHTML = `
        <div class="px-4 py-8 text-center text-red-500 text-xs">
          <p>Error loading events</p>
        </div>
      `;
      return;
    }

    if (error) {
      throw error;
    }

    const events = data || [];
    
    // Filter to only show truly upcoming events (today's events must have start_time > current time)
    const upcomingEvents = events.filter((event: Event) => {
      const eventDate = new Date(event.date || '');
      const eventDateStr = eventDate.toISOString().split('T')[0];
      
      // If event is today, check if start time is in the future (or if no start time, include it)
      if (eventDateStr === todayStr) {
        if (!event.start_time) return true; // Include all-day events
        return event.start_time > currentTime;
      }
      // If event is in the future, include it
      return eventDateStr > todayStr;
    });

    renderEventsList(upcomingEvents);
  } catch (error) {
    console.error('Error loading upcoming events:', error);
    const eventsList = document.getElementById('eventsList');
    if (eventsList) {
      eventsList.innerHTML = `
        <div class="px-4 py-8 text-center text-red-500 text-xs">
          <p>Error loading events</p>
        </div>
      `;
    }
  }
}

function renderEventsList(events: Event[]): void {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) return;

  if (events.length === 0) {
    eventsList.innerHTML = `
      <div class="px-4 py-8 text-center text-gray-500 text-xs">
        <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <p class="font-medium text-gray-700 mb-1">No upcoming events</p>
        <p class="text-gray-500">Events will appear here when scheduled</p>
      </div>
    `;
    return;
  }

  const typeColors: { [key: string]: string } = {
    session: 'bg-blue-100 text-blue-800',
    meeting: 'bg-purple-100 text-purple-800',
    feedback: 'bg-green-100 text-green-800',
    training: 'bg-orange-100 text-orange-800'
  };

  const typeLabels: { [key: string]: string } = {
    session: 'Session',
    meeting: 'Meeting',
    feedback: 'Feedback',
    training: 'Training'
  };

  eventsList.innerHTML = events.map((event: Event) => {
    const eventDate = new Date(event.date || '');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    let dateDisplay = '';
    if (eventDate.toDateString() === today.toDateString()) {
      dateDisplay = 'Today';
    } else if (eventDate.toDateString() === tomorrow.toDateString()) {
      dateDisplay = 'Tomorrow';
    } else {
      dateDisplay = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const timeDisplay = event.start_time && event.end_time 
      ? `${event.start_time.substring(0, 5)} - ${event.end_time.substring(0, 5)}`
      : event.start_time 
        ? `${event.start_time.substring(0, 5)}`
        : '';

    return `
      <div class="px-4 py-3 hover:bg-gray-50 transition-colors">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 mt-0.5">
            <div class="w-10 h-10 rounded-lg ${typeColors[event.type || ''] || 'bg-gray-100 text-gray-800'} flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-2 mb-1">
              <div class="flex-1 min-w-0">
                <h4 class="text-xs font-semibold text-gray-900 truncate">${escapeHtml(event.title)}</h4>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold mt-1 ${typeColors[event.type || ''] || 'bg-gray-100 text-gray-800'}">
                  ${typeLabels[event.type || ''] || event.type || ''}
                </span>
              </div>
              ${event.meet_link ? `
                <a href="${escapeHtml(event.meet_link)}" target="_blank" rel="noopener noreferrer" 
                   class="flex-shrink-0 px-2 py-1 bg-blue-600 text-white text-[10px] font-semibold rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                   onclick="event.stopPropagation()"
                   title="Join Google Meet">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                  </svg>
                  Join
                </a>
              ` : ''}
            </div>
            <div class="flex items-center gap-3 text-[10px] text-gray-600 mt-1.5 flex-wrap">
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                ${dateDisplay}
              </span>
              ${timeDisplay ? `
                <span class="flex items-center gap-1">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  ${timeDisplay}
                </span>
              ` : ''}
            </div>
            ${event.description ? `
              <p class="text-[10px] text-gray-500 mt-1.5 line-clamp-2">${escapeHtml(event.description)}</p>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Grid modal functions
function showGrid() {
  const modal = document.getElementById('gridModal');
  if (!modal) return;
  
  modal.classList.remove('opacity-0', 'invisible');
  modal.classList.add('opacity-100', 'visible');
}

function hideGrid() {
  const modal = document.getElementById('gridModal');
  if (!modal) return;
  
  modal.classList.remove('opacity-100', 'visible');
  modal.classList.add('opacity-0', 'invisible');
}

// Avatar logout menu functions
function hideAvatarLogout() {
  const menu = document.getElementById('avatarLogoutMenu');
  if (!menu) return;
  
  menu.classList.remove('opacity-100', 'visible');
  menu.classList.add('opacity-0', 'invisible');
}

function handleNotificationClick(notificationId: string): void {
  const notification = notifications.find(n => n.id === notificationId);
  if (!notification) return;

  // Hide modal
  hideNotifications();

  // Navigate based on type
  if (notification.type === 'assignment' && notification.assignmentId) {
    viewAudit(notification.assignmentId);
  } else if ((notification.type === 'reversal' || notification.type === 'reversal_status_update') && notification.auditId && notification.tableName) {
    // Navigate to audit view for reversal
    window.location.href = `audit-view.html?id=${notification.auditId}&table=${notification.tableName}`;
  }
}
