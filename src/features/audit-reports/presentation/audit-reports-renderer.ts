/**
 * Audit Reports Renderer
 * Main renderer for audit reports UI
 */

import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js';
import { logError } from '../../../utils/logging-helper.js';
import type { AuditReportsController } from './audit-reports-controller.js';
import type { AuditReport, AuditStats, PaginationState, AgentAcknowledgementStats } from '../domain/entities.js';
import { isAuditUnderReversal } from '../application/agent-acknowledgement-stats.js';
import type { ScorecardInfo } from '../infrastructure/audit-reports-repository.js';
import { renderKPICards, renderKPISkeletons } from './renderers/kpi-renderer.js';
import { renderAuditList } from './renderers/audit-list-renderer.js';
import { renderHeaderActions } from './renderers/header-renderer.js';
import { renderFilterPanel } from './renderers/filter-renderer.js';

/**
 * Load profile pictures for ack agent avatars (same pattern as audit-list and user management).
 * Fetches avatar_url from users then people table and injects img into each .ack-agent-avatar.
 */
async function loadAckAgentAvatars(container: HTMLElement): Promise<void> {
  const avatars = container.querySelectorAll<HTMLElement>('.ack-agent-avatar');
  if (avatars.length === 0) return;
  const emailToAvatars = new Map<string, HTMLElement[]>();
  const emails: string[] = [];
  avatars.forEach((el) => {
    const email = (el.getAttribute('data-agent-email') || '').trim();
    if (!email) return;
    const key = email.toLowerCase();
    if (!emailToAvatars.has(key)) {
      emailToAvatars.set(key, []);
      emails.push(email);
    }
    emailToAvatars.get(key)!.push(el);
  });
  if (emails.length === 0) return;
  try {
    const { getSecureSupabase } = await import('../../../utils/secure-supabase.js');
    const supabase = await getSecureSupabase(false);
    const { data: usersData } = await supabase
      .from('users')
      .select('email, avatar_url')
      .in('email', emails);
    const found = new Set(((usersData || []) as Array<{ email?: string }>).map((u) => (u.email || '').toLowerCase()));
    const missing = emails.filter((e) => !found.has(e.toLowerCase()));
    let peopleData: Array<{ email?: string; avatar_url?: string | null }> = [];
    if (missing.length > 0) {
      const { data } = await supabase
        .from('people')
        .select('email, avatar_url')
        .in('email', missing);
      peopleData = (data as Array<{ email?: string; avatar_url?: string | null }>) || [];
    }
    const avatarUrlMap = new Map<string, string | null>();
    (usersData || []).forEach((u: { email?: string; avatar_url?: string | null }) => {
      const url = u.avatar_url;
      if (url && String(url).trim() && String(url) !== 'null' && String(url) !== 'undefined') {
        avatarUrlMap.set((u.email || '').trim().toLowerCase(), url);
      }
    });
    peopleData.forEach((p) => {
      const url = p.avatar_url;
      if (url && String(url).trim() && String(url) !== 'null' && String(url) !== 'undefined') {
        const key = (p.email || '').trim().toLowerCase();
        if (!avatarUrlMap.has(key)) avatarUrlMap.set(key, url);
      }
    });
    emailToAvatars.forEach((elements, emailKey) => {
      const url = avatarUrlMap.get(emailKey);
      if (!url) return;
      elements.forEach((avatar) => {
        if (avatar.querySelector('img')) return;
        const initialsEl = avatar.querySelector('.avatar-initials') as HTMLElement;
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Profile';
        img.referrerPolicy = 'no-referrer';
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; inset: 0; z-index: 2;';
        img.onerror = () => img.remove();
        img.onload = () => {
          if (initialsEl) initialsEl.style.display = 'none';
        };
        avatar.appendChild(img);
      });
    });
  } catch (e) {
    logError('loadAckAgentAvatars failed:', e);
  }
}

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
   * Show the default audits view (Tab 0); hide Acknowledgement by agent tab content and update tab bar.
   * Show the full header actions bar (date range, quick-date, filter, sync).
   */
  showAuditsView(): void {
    const tabPanel = document.getElementById('auditReportsTabPanel');
    const ackView = document.getElementById('agentAcknowledgementView');
    const main = document.querySelector('main');
    if (tabPanel) tabPanel.style.display = 'block';
    if (ackView) ackView.style.display = 'none';
    if (main) main.classList.remove('audit-reports-ack-tab');
    this.updateAuditReportsTabBar(0);
  }

  /**
   * Update tab bar slider and active state (0 = Audit Reports, 1 = Acknowledgement by agent).
   */
  updateAuditReportsTabBar(activeIndex: number): void {
    const tabBar = document.getElementById('auditReportsTabBar');
    const slider = document.getElementById('auditReportsTabSlider');
    const tabs = document.querySelectorAll('.audit-reports-tab-btn');
    if (!tabBar || !slider || tabs.length < 2) return;
    tabs.forEach((t, i) => {
      (t as HTMLElement).classList.toggle('active', i === activeIndex);
    });
    const padding = 5;
    const tabCount = 2;
    const w = tabBar.offsetWidth;
    if (w > 0) {
      const tabWidth = (w - padding * 2) / tabCount;
      slider.style.left = `${padding + activeIndex * tabWidth}px`;
      slider.style.width = `${tabWidth}px`;
    } else {
      slider.style.left = activeIndex === 0 ? '0.2344rem' : '50%';
      slider.style.width = 'calc(50% - 0.1563rem)';
    }
  }

  /**
   * Render the "Acknowledgement by agent" view (legacy-style): 3 summary cards, filters bar, expandable agents table.
   * Hide the entire header actions bar (date range, quick-date, filter, sync) via CSS class; this tab uses lifetime data only.
   */
  renderAgentAcknowledgementView(stats: AgentAcknowledgementStats | null): void {
    const tabPanel = document.getElementById('auditReportsTabPanel');
    const ackView = document.getElementById('agentAcknowledgementView');
    const loading = document.getElementById('loadingIndicator');
    const main = document.querySelector('main');
    if (tabPanel) tabPanel.style.display = 'none';
    if (ackView) ackView.style.display = 'block';
    if (loading) loading.style.display = 'none';
    if (main) main.classList.add('audit-reports-ack-tab');
    this.updateAuditReportsTabBar(1);

    if (!stats) {
      const strip = document.getElementById('agentAckSummaryStrip');
      const tableWrap = document.getElementById('agentAcknowledgementTableWrap');
      if (strip) safeSetHTML(strip, '');
      if (tableWrap) safeSetHTML(tableWrap, '<div style="padding: 1rem; color: #6b7280;">No data.</div>');
      return;
    }

    const agentsWithPending = stats.byAgent.filter(r => r.pending > 0).length;
    const summaryStrip = document.getElementById('agentAckSummaryStrip');
    if (summaryStrip) {
      summaryStrip.innerHTML = `
        <div class="ack-stat-card">
          <div class="ack-stat-label">Total Agents</div>
          <div class="ack-stat-value">${stats.byAgent.length}</div>
          <div class="ack-stat-sub">&nbsp;</div>
        </div>
        <div class="ack-stat-card ack-stat-card--warning">
          <div class="ack-stat-label">Total Pending</div>
          <div class="ack-stat-value">${stats.pending}</div>
          <div class="ack-stat-sub">&nbsp;</div>
        </div>
        <div class="ack-stat-card ack-stat-card--warning">
          <div class="ack-stat-label">Agents with Pending</div>
          <div class="ack-stat-value">${agentsWithPending}</div>
          <div class="ack-stat-sub">&nbsp;</div>
        </div>
      `;
    }

    const formatRelativeOrDate = (iso: string | null | undefined): string => {
      if (!iso || typeof iso !== 'string') return '—';
      try {
        const date = new Date(iso);
        if (!Number.isFinite(date.getTime())) return '—';
        const now = Date.now();
        const diffMs = now - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        const day = date.getDate();
        const month = date.toLocaleString('en-GB', { month: 'short' });
        const year = date.getFullYear();
        const h = date.getHours();
        const m = date.getMinutes();
        return `${day}-${month}-${year} ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      } catch {
        return '—';
      }
    };
    const formatNestedDate = (d: string | undefined): string => {
      if (!d) return '—';
      try {
        const date = new Date(d);
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch {
        return '—';
      }
    };

    const getInitials = (name: string): string => {
      if (!name || !name.trim()) return '?';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return name.substring(0, 2).toUpperCase();
    };

    const filteredRows = this.controller.getAckFilteredRows();
    const expanded = this.controller.getAckExpandedAgentEmails();
    const supervisorNameMap = this.controller.getSupervisorNameMap();
    const getSupervisorName = (email: string | null | undefined): string => {
      if (!email || email === '-') return '—';
      return supervisorNameMap.get(email.trim().toLowerCase()) ?? email;
    };

    const pendingByAgent = new Map<string, AuditReport[]>();
    for (const a of stats.pendingAudits) {
      const e = ((a.employeeEmail ?? (a as any).employee_email) ?? '').trim().toLowerCase();
      if (!e) continue;
      if (!pendingByAgent.has(e)) pendingByAgent.set(e, []);
      pendingByAgent.get(e)!.push(a);
    }

    const searchInput = document.getElementById('ackSearchInput') as HTMLInputElement;
    const sortSelect = document.getElementById('ackSortSelect') as HTMLSelectElement;
    if (searchInput) searchInput.value = this.controller.getAckSearchQuery();
    if (sortSelect) {
      const s = this.controller.getAckSort();
      sortSelect.value = `${s.field}-${s.direction}`;
    }

    const agentsWithPendingList = stats.byAgent.filter(r => r.pending > 0);
    const channels = [...new Set(agentsWithPendingList.map(r => r.channel).filter((c): c is string => !!c && c !== '-'))].sort();
    const supervisors = [...new Set(agentsWithPendingList.map(r => r.teamSupervisor).filter((s): s is string => !!s && s !== '-'))].sort(
      (a, b) => getSupervisorName(a).localeCompare(getSupervisorName(b))
    );

    const channelOptionsEl = document.getElementById('ackChannelFilterOptions');
    const supervisorOptionsEl = document.getElementById('ackSupervisorFilterOptions');
    const currentChannels = this.controller.getAckChannelFilter();
    const currentSupervisors = this.controller.getAckSupervisorFilter();
    if (channelOptionsEl) {
      channelOptionsEl.innerHTML = channels
        .map(
          ch =>
            `<label class="ack-filter-option">
              <input type="checkbox" data-ack-filter="channel" value="${escapeHtml(ch)}" ${currentChannels.includes(ch) ? 'checked' : ''}>
              ${escapeHtml(ch)}
            </label>`
        )
        .join('');
    }
    if (supervisorOptionsEl) {
      supervisorOptionsEl.innerHTML = supervisors
        .map(
          sup =>
            `<label class="ack-filter-option">
              <input type="checkbox" data-ack-filter="supervisor" value="${escapeHtml(sup)}" ${currentSupervisors.includes(sup) ? 'checked' : ''}>
              ${escapeHtml(getSupervisorName(sup))}
            </label>`
        )
        .join('');
    }

    const tableWrap = document.getElementById('agentAcknowledgementTableWrap');
    if (tableWrap) {
      if (filteredRows.length === 0) {
        safeSetHTML(
          tableWrap,
          '<table class="agents-table" style="width: 100%; border-collapse: collapse;"><tbody><tr><td colspan="7" style="text-align: center; padding: 2rem; color: #6b7280;">No agents found matching your filters</td></tr></tbody></table>'
        );
      } else {
        const rowsHtml: string[] = [];
        for (const r of filteredRows) {
          const key = r.agentEmail.trim().toLowerCase();
          const isExpanded = expanded.has(key);
          const supervisorName = getSupervisorName(r.teamSupervisor);
          const lastAckDisplay = formatRelativeOrDate(r.lastAcknowledgedAt ?? null);
          const lastLoginDisplay = formatRelativeOrDate(r.lastLoginAt ?? null);
          const channelBadge =
            r.channel && r.channel !== '-'
              ? `<span class="channel-badge" style="display: inline-block; padding: 0.25rem 0.5rem; background: #e5e7eb; border-radius: 0.25rem; font-size: 0.75rem;">${escapeHtml(r.channel)}</span>`
              : '<span style="color: #9ca3af;">—</span>';
          const initials = getInitials(r.agentName || r.agentEmail || '');
          rowsHtml.push(`
            <tr class="ack-agent-row ${isExpanded ? 'expanded' : ''}" data-agent-email="${escapeHtml(r.agentEmail)}" style="cursor: pointer;">
              <td class="ack-agent-cell" style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <span class="ack-expand-icon expand-icon" aria-hidden="true"></span>
                <div class="ack-agent-cell-content">
                  <div class="ack-agent-avatar" data-agent-email="${escapeHtml(r.agentEmail)}" title="${escapeHtml(r.agentName || r.agentEmail)}">
                    <span class="avatar-initials">${escapeHtml(initials)}</span>
                  </div>
                  <div>
                    <div class="agent-name-cell">${escapeHtml(r.agentName)}</div>
                    <div class="agent-email-cell">${escapeHtml(r.agentEmail)}</div>
                  </div>
                </div>
              </td>
              <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">${channelBadge}</td>
              <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; font-size: 0.8125rem; color: #6b7280;">${escapeHtml(supervisorName)}</td>
              <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">${r.pending}</td>
              <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; font-size: 0.8125rem; color: #6b7280;">${escapeHtml(lastAckDisplay)}</td>
              <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb; font-size: 0.8125rem; color: #6b7280;">${escapeHtml(lastLoginDisplay)}</td>
              <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">
                <a href="#" class="ack-expand-btn ack-view-audits-link" data-agent-email="${escapeHtml(r.agentEmail)}" data-prevent-toggle="1">${isExpanded ? 'Hide' : 'View'} Audits</a>
              </td>
            </tr>
          `);
          if (isExpanded) {
            const audits = (pendingByAgent.get(key) ?? []).slice().sort((a, b) => {
              const da = new Date(a.submittedAt ?? (a as any).submitted_at ?? 0).getTime();
              const db = new Date(b.submittedAt ?? (b as any).submitted_at ?? 0).getTime();
              return db - da;
            });
            let nestedRows = '';
            for (const audit of audits) {
              const tableName = (audit._scorecard_table ?? '').toString();
              const viewUrl =
                audit.id && tableName
                  ? `/audit-view.html?id=${encodeURIComponent(audit.id)}&table=${encodeURIComponent(tableName)}&mode=view`
                  : '#';
              const interactionId =
                (audit.interactionId ?? (audit as any).interaction_id ?? (audit as any).conversation_id ?? '')
                  .toString()
                  .trim() || '—';
              const score = audit.averageScore ?? (audit as any).average_score ?? '—';
              const underReversal = isAuditUnderReversal(audit)
                ? ' <span class="reversal-badge" style="display: inline-block; padding: 0.25rem 0.5rem; background: #fef3c7; color: #92400e; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">Under Reversal</span>'
                : '';
              nestedRows += `
                <tr>
                  <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">${escapeHtml((audit.id ?? '').toString())}</td>
                  <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">${escapeHtml(interactionId)}</td>
                  <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">${escapeHtml(formatNestedDate(audit.submittedAt ?? (audit as any).submitted_at ?? undefined))}</td>
                  <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">${escapeHtml((audit._scorecard_name ?? '').toString())}</td>
                  <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">${escapeHtml(String(score))}${score !== '—' ? '%' : ''}</td>
                  <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;">Pending${underReversal}</td>
                  <td style="padding: 0.5rem 0.75rem; border-bottom: 1px solid #e5e7eb;"><a href="${viewUrl}" class="ack-view-audit-btn audit-link">View Audit</a></td>
                </tr>
              `;
            }
            const emptyNested =
              audits.length === 0
                ? '<tr><td colspan="7" style="padding: 1rem; text-align: center; color: #6b7280;">No unacknowledged audits for this agent</td></tr>'
                : '';
            rowsHtml.push(`
              <tr class="nested-audits-row" data-nested-for="${escapeHtml(key)}" style="background: #f9fafb;">
                <td colspan="7" style="padding: 0; border-bottom: 1px solid #e5e7eb;">
                  <div class="nested-audits-container" style="padding: 1rem; max-height: 500px; overflow-y: auto;">
                    <table class="nested-audits-table" style="width: 100%; border-collapse: collapse; font-size: 0.75rem;">
                      <thead><tr style="background: #f3f4f6;">
                        <th style="padding: 0.5rem 0.75rem; text-align: left;">Audit ID</th>
                        <th style="padding: 0.5rem 0.75rem; text-align: left;">Interaction ID</th>
                        <th style="padding: 0.5rem 0.75rem; text-align: left;">Date</th>
                        <th style="padding: 0.5rem 0.75rem; text-align: left;">Scorecard</th>
                        <th style="padding: 0.5rem 0.75rem; text-align: left;">Score</th>
                        <th style="padding: 0.5rem 0.75rem; text-align: left;">Status</th>
                        <th style="padding: 0.5rem 0.75rem; text-align: left;">Action</th>
                      </tr></thead>
                      <tbody>${nestedRows}${emptyNested}</tbody>
                    </table>
                  </div>
                </td>
              </tr>
            `);
          }
        }
        safeSetHTML(
          tableWrap,
          `<table class="agents-table" style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
            <thead style="background: #f9fafb;">
              <tr>
                <th style="padding: 0.5rem 0.75rem; text-align: left;">Agent</th>
                <th style="padding: 0.5rem 0.75rem; text-align: left;">Channel</th>
                <th style="padding: 0.5rem 0.75rem; text-align: left;">Team Supervisor</th>
                <th style="padding: 0.5rem 0.75rem; text-align: left;">Pending Count</th>
                <th style="padding: 0.5rem 0.75rem; text-align: left;">Last Acknowledged at</th>
                <th style="padding: 0.5rem 0.75rem; text-align: left;">Last Login</th>
                <th style="padding: 0.5rem 0.75rem; text-align: left;">Action</th>
              </tr>
            </thead>
            <tbody>${rowsHtml.join('')}</tbody>
          </table>`
        );
        loadAckAgentAvatars(tableWrap);
      }
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

