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
    <input type="hidden" id="startDate">
    <input type="hidden" id="endDate">
    <div id="reportsDatePickerContainer"></div>
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

