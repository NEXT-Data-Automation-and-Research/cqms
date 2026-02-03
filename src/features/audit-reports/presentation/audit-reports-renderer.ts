/**
 * Audit Reports Renderer
 * Main renderer for audit reports UI
 */

import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js';
import { logError } from '../../../utils/logging-helper.js';
import type { AuditReportsController } from './audit-reports-controller.js';
import type { AuditReport, AuditStats, PaginationState } from '../domain/entities.js';
import type { ScorecardInfo } from '../infrastructure/audit-reports-repository.js';
import { renderKPICards, renderKPISkeletons } from './renderers/kpi-renderer.js';
import { renderAuditList } from './renderers/audit-list-renderer.js';
import { renderHeaderActions } from './renderers/header-renderer.js';
import { renderFilterPanel } from './renderers/filter-renderer.js';

export class AuditReportsRenderer {
  constructor(private controller: AuditReportsController) {}

  /**
   * Initialize UI
   */
  initializeUI(): void {
    this.renderHeaderActions();
  }

  /**
   * Render header actions
   */
  renderHeaderActions(): void {
    const container = document.getElementById('headerActions');
    if (!container) {
      logError('headerActions container not found');
      return;
    }
    renderHeaderActions(container, this.controller);
  }

  /**
   * Render scorecard selector
   * @param scorecards - list of scorecards to show
   * @param currentScorecardId - optional current selection to preserve (e.g. when re-rendering panel)
   */
  renderScorecardSelector(scorecards: ScorecardInfo[], currentScorecardId?: string | null): void {
    const selector = document.getElementById('scorecardSelector') as HTMLSelectElement;
    if (!selector) {
      logError('scorecardSelector not found');
      return;
    }

    let html = '<option value="all">All Scorecards</option>';
    
    if (scorecards && scorecards.length > 0) {
      html += scorecards.map(scorecard => {
        const label = escapeHtml(scorecard.name + (scorecard.is_active ? '' : ' (Inactive)'));
        return `<option value="${escapeHtml(scorecard.id)}" data-table-name="${escapeHtml(scorecard.table_name)}">${label}</option>`;
      }).join('');
    }

    safeSetHTML(selector, html);
    const state = this.controller.getState();
    const selected = currentScorecardId ?? state.currentScorecardId ?? null;
    if (selected && scorecards?.some(s => s.id === selected)) {
      selector.value = selected;
    } else {
      selector.value = 'all';
    }
  }

  /**
   * Show loading state for KPI cards
   */
  showStatsLoading(): void {
    const container = document.getElementById('kpiGrid');
    if (!container) {
      logError('kpiGrid container not found');
      return;
    }
    renderKPISkeletons(container);
  }

  /**
   * Render statistics (KPI cards)
   */
  renderStats(stats: AuditStats | null): void {
    const container = document.getElementById('kpiGrid');
    if (!container) {
      logError('kpiGrid container not found');
      return;
    }

    if (!stats) {
      // Show skeleton if no stats
      this.showStatsLoading();
      return;
    }

    renderKPICards(container, stats, this.controller);
  }

  /**
   * Render audit list
   */
  renderAudits(audits: AuditReport[], pagination: PaginationState, hasActiveFilters: boolean = false): void {
    const loading = document.getElementById('loadingIndicator');
    const container = document.getElementById('auditList');
    if (!container) {
      logError('auditList container not found');
      return;
    }

    // Hide loading indicator when rendering
    if (loading) loading.style.display = 'none';

    if (audits.length === 0) {
      this.renderEmptyState(container, hasActiveFilters);
      container.style.display = 'flex';
      return;
    }

    renderAuditList(container, audits, this.controller);
    container.style.display = 'flex';
  }

  /**
   * Render empty state
   */
  private renderEmptyState(container: HTMLElement, hasActiveFilters: boolean): void {
    const message = hasActiveFilters
      ? 'No audits match your current filters.'
      : 'No audits found.';
    
    const suggestion = hasActiveFilters
      ? 'Try adjusting your filters to see more results.'
      : 'Audits will appear here once they are created.';

    safeSetHTML(container, `
      <div style="padding: 3rem 2rem; text-align: center; color: #6b7280;">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; opacity: 0.4;">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <p style="font-size: 0.875rem; font-weight: 600; color: #374151; margin: 0 0 0.5rem;">${escapeHtml(message)}</p>
        <p style="font-size: 0.75rem; color: #9ca3af; margin: 0;">${escapeHtml(suggestion)}</p>
        ${hasActiveFilters ? `
          <button id="clearFiltersBtn" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #1A733E; color: white; border: none; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">
            Clear Filters
          </button>
        ` : ''}
      </div>
    `);

    // Add event listener for clear filters button
    if (hasActiveFilters) {
      const clearBtn = container.querySelector('#clearFiltersBtn');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.controller.clearAllFilters();
        });
      }
    }
  }

  /**
   * Render pagination
   */
  renderPagination(pagination: PaginationState): void {
    const container = document.getElementById('paginationContainer');
    if (!container) {
      logError('paginationContainer not found');
      return;
    }

    if (pagination.totalPages <= 1) {
      container.style.display = 'none';
      return;
    }

    const html = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
        <div style="font-size: 0.6562rem; color: var(--text-secondary); font-family: 'Poppins', sans-serif;">
          Showing ${((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} to ${Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of ${pagination.totalItems} audits
        </div>
        <div style="display: flex; gap: 0.375rem; align-items: center;">
          <button class="action-btn" ${pagination.currentPage === 1 ? 'disabled' : ''} data-page="${pagination.currentPage - 1}" style="padding: 0.375rem 0.75rem;">
            Previous
          </button>
          <div id="pageNumbers" style="display: flex; gap: 0.25rem;">
            ${this.renderPageNumbers(pagination)}
          </div>
          <button class="action-btn" ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''} data-page="${pagination.currentPage + 1}" style="padding: 0.375rem 0.75rem;">
            Next
          </button>
        </div>
      </div>
    `;

    safeSetHTML(container, html);
    container.style.display = 'block';
  }

  /**
   * Render page numbers
   */
  private renderPageNumbers(pagination: PaginationState): string {
    const pages: string[] = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.currentPage;

    // Show first page
    if (currentPage > 3) {
      pages.push(`<button class="action-btn" data-page="1" style="padding: 0.375rem 0.75rem;">1</button>`);
      if (currentPage > 4) {
        pages.push('<span style="padding: 0.375rem;">...</span>');
      }
    }

    // Show pages around current page
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      const active = i === currentPage ? 'style="background-color: var(--primary-color); color: white;"' : '';
      pages.push(`<button class="action-btn" data-page="${i}" style="padding: 0.375rem 0.75rem;" ${active}>${i}</button>`);
    }

    // Show last page
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) {
        pages.push('<span style="padding: 0.375rem;">...</span>');
      }
      pages.push(`<button class="action-btn" data-page="${totalPages}" style="padding: 0.375rem 0.75rem;">${totalPages}</button>`);
    }

    return pages.join('');
  }

  /**
   * Show loading indicator
   */
  showLoading(): void {
    const loading = document.getElementById('loadingIndicator');
    const list = document.getElementById('auditList');
    if (loading) loading.style.display = 'flex';
    if (list) list.style.display = 'none';
  }

  /**
   * Hide loading indicator
   */
  hideLoading(): void {
    const loading = document.getElementById('loadingIndicator');
    const list = document.getElementById('auditList');
    if (loading) loading.style.display = 'none';
    // Ensure audit list is visible if it has content
    if (list && list.innerHTML.trim() !== '') {
      list.style.display = 'flex';
    }
  }

  /**
   * Show error message
   */
  showError(message: string): void {
    const loading = document.getElementById('loadingIndicator');
    const container = document.getElementById('auditList');
    if (loading) loading.style.display = 'none';
    if (container) {
      safeSetHTML(container, `<div style="padding: 2rem; text-align: center; color: #ef4444;">${escapeHtml(message)}</div>`);
      container.style.display = 'flex';
    }
  }

  /**
   * Toggle view all button visibility and update its state
   */
  toggleViewAllButton(show: boolean): void {
    const btn = document.getElementById('viewAllBtn');
    if (btn) {
      btn.style.display = show ? 'inline-flex' : 'none';
    }
  }

  /**
   * Update view all button state (text and styling)
   */
  updateViewAllButtonState(showingAllAudits: boolean): void {
    const btn = document.getElementById('viewAllBtn');
    if (!btn) return;

    if (showingAllAudits) {
      // Currently showing all audits - button should offer to show "My Audits Only"
      btn.textContent = 'My Audits Only';
      btn.style.backgroundColor = '#1A733E';
      btn.style.color = 'white';
      btn.style.borderColor = '#1A733E';
    } else {
      // Currently showing own audits - button should offer to "View All"
      btn.textContent = 'View All';
      btn.style.backgroundColor = '#f3f4f6';
      btn.style.color = '#374151';
      btn.style.borderColor = '#d1d5db';
    }
  }

  /**
   * Show employee mode indicator
   */
  showEmployeeModeIndicator(showingAllAudits: boolean, employeeEmail: string): void {
    const container = document.getElementById('employeeModeIndicator');
    if (!container) {
      // Create the indicator if it doesn't exist
      const headerActions = document.getElementById('headerActions');
      if (headerActions) {
        const indicator = document.createElement('div');
        indicator.id = 'employeeModeIndicator';
        indicator.style.cssText = 'display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 0.375rem; font-size: 0.625rem; color: #92400e; font-family: "Poppins", sans-serif;';
        headerActions.insertBefore(indicator, headerActions.firstChild);
        this.updateEmployeeModeIndicator(indicator, showingAllAudits, employeeEmail);
      }
      return;
    }
    this.updateEmployeeModeIndicator(container, showingAllAudits, employeeEmail);
  }

  private updateEmployeeModeIndicator(container: HTMLElement, showingAllAudits: boolean, employeeEmail: string): void {
    if (showingAllAudits) {
      container.style.backgroundColor = '#dbeafe';
      container.style.borderColor = '#93c5fd';
      container.style.color = '#1e40af';
      container.innerHTML = `
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span>Viewing all audits</span>
      `;
    } else {
      container.style.backgroundColor = '#fef3c7';
      container.style.borderColor = '#fcd34d';
      container.style.color = '#92400e';
      container.innerHTML = `
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
        <span>Viewing your audits only</span>
      `;
    }
  }

  /**
   * Hide employee mode indicator (for non-employees)
   */
  hideEmployeeModeIndicator(): void {
    const container = document.getElementById('employeeModeIndicator');
    if (container) {
      container.remove();
    }
  }

  /**
   * Update sync time display
   */
  updateSyncTime(time: Date | null): void {
    const syncText = document.getElementById('lastSyncText');
    if (!syncText) return;

    if (time) {
      const minutesAgo = Math.floor((Date.now() - time.getTime()) / 60000);
      const text = minutesAgo < 1 ? 'Just now' : `${minutesAgo} minute${minutesAgo > 1 ? 's' : ''} ago`;
      safeSetHTML(syncText, escapeHtml(text));
    } else {
      safeSetHTML(syncText, 'Never synced');
    }
  }

  /**
   * Set sync state
   */
  setSyncState(syncing: boolean): void {
    const btn = document.getElementById('forceSyncBtn') as HTMLButtonElement | null;
    const icon = document.getElementById('syncIcon');
    const text = document.getElementById('syncBtnText');
    
    if (btn) {
      btn.disabled = syncing;
    }
    if (icon && syncing) {
      icon.style.animation = 'spin 1s linear infinite';
    } else if (icon) {
      icon.style.animation = '';
    }
    if (text) {
      safeSetHTML(text, syncing ? 'Syncing...' : 'Sync');
    }
  }

  /**
   * Render filter panel
   */
  renderFilterPanel(): void {
    const container = document.getElementById('filterPanel');
    if (!container) {
      logError('filterPanel container not found');
      return;
    }

    renderFilterPanel(container, this.controller);
    // Re-populate scorecard dropdown after panel render so it never shows "Loading scorecards..." when we have data
    const scorecards = this.controller.getScorecards();
    if (scorecards && scorecards.length >= 0) {
      this.renderScorecardSelector(scorecards);
    }
  }
}

