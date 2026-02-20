/**
 * Header Actions Renderer
 * Renders header actions (week navigation, date picker, export, etc.)
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import type { AuditReportsController } from '../audit-reports-controller.js';

export function renderHeaderActions(
  container: HTMLElement,
  controller: AuditReportsController
): void {
  const html = `
    <!-- Date range section: hidden on Acknowledgement-by-agent tab (lifetime data only) -->
    <div id="headerDateSection" class="header-date-section">
    <div class="date-picker-dropdown" style="position: relative; z-index: 1001;">
      <button class="action-btn" id="dateBtn">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
        <span id="dateBtnText">Date Range</span>
        <svg style="width: 0.5625rem; height: 0.5625rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      <div class="date-dropdown-menu" id="dateDropdown">
        <div class="filter-group">
          <label class="filter-label">Start Date</label>
          <input type="date" class="filter-input" id="startDate">
        </div>
        <div class="filter-group">
          <label class="filter-label">End Date</label>
          <input type="date" class="filter-input" id="endDate">
        </div>
        <div style="display: flex; gap: 0.375rem; margin-top: 0.375rem;">
          <button class="action-btn" style="flex: 1;" id="applyDateFilter">Apply</button>
          <button class="action-btn" style="flex: 1;" id="clearDateFilter">Clear</button>
        </div>
      </div>
    </div>
    <div class="quick-date-buttons-container">
      <button class="action-btn quick-date-btn" id="todayBtn">Today</button>
      <button class="action-btn quick-date-btn" id="yesterdayBtn">Yesterday</button>
      <button class="action-btn quick-date-btn" id="thisWeekBtn">This Week</button>
      <button class="action-btn quick-date-btn" id="lastWeekBtn">Last Week</button>
      <button class="action-btn quick-date-btn active" id="thisMonthBtn">This Month</button>
      <button class="action-btn quick-date-btn" id="lastMonthBtn">Last Month</button>
    </div>
    </div>
    <!-- Export Button - Hidden -->
    <button class="action-btn" id="exportBtn" style="display: none;">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
      </svg>
      <span>Export</span>
    </button>
    <button class="action-btn" id="filterBtn">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"></path>
      </svg>
    </button>
    <button class="action-btn" id="clearAllBtn" style="display: none;" title="Clear All Filters">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
      <span>Clear All</span>
    </button>
    <button id="viewAllBtn" style="display: none; padding: 0.4688rem 0.75rem; background-color: #f3f4f6; color: #374151; border: 0.0469rem solid #d1d5db; border-radius: 0.375rem; font-size: 0.6562rem; font-family: 'Poppins', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.2s ease;" class="action-btn">View All</button>
    <button class="action-btn" id="forceSyncBtn" title="Force Sync - Refresh data from database">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" id="syncIcon">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
      </svg>
      <span id="syncBtnText">Sync</span>
    </button>
    <div id="lastSyncTime" style="display: flex; align-items: center; gap: 0.375rem; padding: 0.4688rem 0.75rem; font-size: 0.5625rem; color: var(--text-secondary); font-family: 'Poppins', sans-serif;">
      <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span id="lastSyncText">Never synced</span>
    </div>
  `;

  safeSetHTML(container, html);
}

