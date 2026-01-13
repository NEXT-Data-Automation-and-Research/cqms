/**
 * Audit Reports Renderer
 * Main renderer for audit reports UI
 */

import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js';
import { logError } from '../../../utils/logging-helper.js';
import type { AuditReportsController } from './audit-reports-controller.js';
import type { AuditReport, AuditStats, PaginationState } from '../domain/entities.js';
import type { ScorecardInfo } from '../infrastructure/audit-reports-repository.js';
import { renderKPICards } from './renderers/kpi-renderer.js';
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
   */
  renderScorecardSelector(scorecards: ScorecardInfo[]): void {
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
    selector.value = 'all';
  }

  /**
   * Render statistics (KPI cards)
   */
  renderStats(stats: AuditStats | null): void {
    if (!stats) return;

    const container = document.getElementById('kpiGrid');
    if (!container) {
      logError('kpiGrid container not found');
      return;
    }

    renderKPICards(container, stats, this.controller);
  }

  /**
   * Render audit list
   */
  renderAudits(audits: AuditReport[], pagination: PaginationState): void {
    const loading = document.getElementById('loadingIndicator');
    const container = document.getElementById('auditList');
    if (!container) {
      logError('auditList container not found');
      return;
    }

    // Hide loading indicator when rendering
    if (loading) loading.style.display = 'none';

    if (audits.length === 0) {
      safeSetHTML(container, '<div style="padding: 2rem; text-align: center; color: #6b7280;">No audits found.</div>');
      container.style.display = 'flex';
      return;
    }

    renderAuditList(container, audits, this.controller);
    container.style.display = 'flex';
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
   * Toggle view all button visibility
   */
  toggleViewAllButton(show: boolean): void {
    const btn = document.getElementById('viewAllBtn');
    if (btn) {
      btn.style.display = show ? 'block' : 'none';
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
  }
}

