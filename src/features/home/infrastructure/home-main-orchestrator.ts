/**
 * Home Dashboard Orchestrator
 * Coordinates all dashboard modules and initialization
 * This file should remain under 250 lines - all logic is delegated to modules
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
    showNotifications?: () => void;
    hideNotifications?: () => void;
    applyFilters?: () => void;
    applyDateFilter?: () => void;
    clearDateFilter?: () => void;
    sortAssignedAudits?: () => void;
    toggleSortMenu?: () => void;
    showCalendar?: () => void;
    hideCalendar?: () => void;
    showGrid?: () => void;
    hideGrid?: () => void;
    hideAvatarLogout?: () => void;
  }
}

import type { User } from './types.js';
import { homeState } from './state.js';
import { waitForSupabase } from './utils.js';
import { DateFilterManager } from './date-filter-manager.js';
import { UpdatesLoader } from './modules/updates-loader.js';
import { UpdatesRenderer } from './modules/updates-renderer.js';
import { AuditLoader } from './modules/audit-loader.js';
import { AuditRenderer } from './modules/audit-renderer.js';
import { StatsCalculator } from './modules/stats-calculator.js';
import { StatsRenderer } from './modules/stats-renderer.js';
import { FilterManager } from './modules/filter-manager.js';
import { UserProfileManager } from './modules/user-profile-manager.js';
import { EventListenersManager } from './modules/event-listeners.js';
import { EventsLoader } from './modules/events-loader.js';
import { EventsRenderer } from './modules/events-renderer.js';
import { NotificationManager } from './modules/notification-manager.js';
import { UIVisibilityManager } from './modules/ui-visibility-manager.js';
import { ActionHandlers } from './modules/action-handlers.js';
import { logError } from '../../../utils/logging-helper.js';

// Initialize modules
const dateFilterManager = new DateFilterManager();
const updatesLoader = new UpdatesLoader(dateFilterManager);
const updatesRenderer = new UpdatesRenderer();
const auditLoader = new AuditLoader(dateFilterManager);
const auditRenderer = new AuditRenderer();
const statsCalculator = new StatsCalculator(dateFilterManager);
const statsRenderer = new StatsRenderer();
const filterManager = new FilterManager();
const userProfileManager = new UserProfileManager();
const eventListenersManager = new EventListenersManager(dateFilterManager);
const eventsLoader = new EventsLoader();
const eventsRenderer = new EventsRenderer();
const notificationManager = new NotificationManager();
const uiVisibilityManager = new UIVisibilityManager();
const actionHandlers = new ActionHandlers(
  dateFilterManager,
  updatesLoader,
  updatesRenderer,
  statsCalculator,
  statsRenderer,
  auditLoader,
  auditRenderer,
  notificationManager
);

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
  await initializeDashboard();
});

async function initializeDashboard(): Promise<void> {
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    homeState.initialize(userInfo);

    if (!homeState.currentUserEmail) {
      logError('No user logged in');
      return;
    }

    // Initialize UI immediately
    dateFilterManager.initializeDateFilter();
    eventListenersManager.setup();
    dateFilterManager.updateWeekDisplay();
    userProfileManager.updateUserAvatar(userInfo);
    uiVisibilityManager.setup(homeState.isAgent);

    // Wait for Supabase
    const supabaseReady = await waitForSupabase(2000);
    if (!supabaseReady) {
      logError('Supabase client not initialized');
      return;
    }

    // Load users (with cache)
    await loadUsersWithCache();

    // Load all dashboard data in parallel
    const period = dateFilterManager.getCurrentPeriodDates();
    await Promise.all([
      loadRecentUpdates(period),
      updateStats(period),
      loadAssignedAudits(period),
      loadNotifications(),
      loadUpcomingEvents()
    ]);

    // Populate filters (non-blocking)
    filterManager.populateFilters().catch(err => logError('Error populating filters:', err));

  } catch (error) {
    logError('Error initializing dashboard:', error);
  }
}

async function loadUsersWithCache(): Promise<void> {
  const cachedUsers = sessionStorage.getItem('cachedUsers');
  const cachedUsersTime = sessionStorage.getItem('cachedUsersTime');
  const cacheAge = cachedUsersTime ? Date.now() - parseInt(cachedUsersTime) : Infinity;
  
  if (cachedUsers && cacheAge < 300000) {
    homeState.allUsers = JSON.parse(cachedUsers);
  } else {
    await userProfileManager.loadAllUsers();
    sessionStorage.setItem('cachedUsers', JSON.stringify(homeState.allUsers));
    sessionStorage.setItem('cachedUsersTime', Date.now().toString());
  }
}

async function loadRecentUpdates(period: any): Promise<void> {
  const updates = await updatesLoader.loadRecentUpdates(period, homeState.allUsers);
  updatesRenderer.render(updates);
}

async function updateStats(period: any): Promise<void> {
  const stats = await statsCalculator.calculate(period);
  statsRenderer.render(stats);
}

async function loadAssignedAudits(period: any): Promise<void> {
  await auditLoader.loadAssignedAudits(period, homeState.currentFilters);
  auditRenderer.render(homeState.assignedAudits, homeState.allUsers);
}

async function loadNotifications(): Promise<void> {
  await notificationManager.load();
}

async function loadUpcomingEvents(): Promise<void> {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
  const events = await eventsLoader.loadUpcomingEvents(userInfo);
  eventsRenderer.render(events);
}

// Expose global functions for HTML onclick handlers
window.logout = () => userProfileManager.logout();

// Expose functions globally for HTML onclick handlers
(window as any).applyFilters = () => actionHandlers.applyFilters();
(window as any).applyDateFilter = () => actionHandlers.applyDateFilter();
(window as any).clearDateFilter = () => actionHandlers.clearDateFilter();
(window as any).sortAssignedAudits = () => actionHandlers.sortAssignedAudits();
(window as any).toggleSortMenu = () => actionHandlers.toggleSortMenu();
(window as any).showNotifications = () => notificationManager.show();
(window as any).hideNotifications = () => notificationManager.hide();

