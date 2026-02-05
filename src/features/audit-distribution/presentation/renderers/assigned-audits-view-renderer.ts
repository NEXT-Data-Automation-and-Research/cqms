/**
 * Assigned Audits View Renderer
 * Dedicated tab view for viewing and managing audit assignments (reassign, delete, bulk actions)
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { AuditDistributionService } from '../../application/audit-distribution-service.js';
import { AssignedAuditsTable } from '../components/assigned-audits-table.js';
import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { logError } from '../../../../utils/logging-helper.js';
import type { AuditAssignment, Scorecard } from '../../domain/types.js';
import confirmationDialog from '../../../../components/confirmation-dialog.js';

/** Show confirmation modal (logout-style). */
async function showConfirmModal(options: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'error' | 'warning' | 'success' | 'info' | 'confirm';
}): Promise<boolean> {
  return confirmationDialog.show({
    ...options,
    cancelText: options.cancelText ?? 'Cancel',
    showCancel: true,
  });
}

/** Show message modal (alert-style: OK only, no Cancel). */
async function showAlertModal(options: {
  title: string;
  message: string;
  confirmText?: string;
  type?: 'error' | 'warning' | 'success' | 'info';
}): Promise<void> {
  await confirmationDialog.show({
    ...options,
    confirmText: options.confirmText ?? 'OK',
    showCancel: false,
  });
}

export interface AssignedAuditsViewRendererConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
}

export class AssignedAuditsViewRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService;
  private container: HTMLElement | null = null;
  private assignedAuditsTable: AssignedAuditsTable | null = null;
  private selectedAssignmentIds = new Set<string>();
  private onRefreshAssignments: (() => void) | null = null;
  private assignedAuditsPage = 1;
  private assignedAuditsPageSize = 20;
  private assignedAuditsSearch = '';
  private searchDebounceTimer: number | null = null;

  constructor(config: AssignedAuditsViewRendererConfig) {
    this.stateManager = config.stateManager;
    this.service = config.service;
  }

  render(container: HTMLElement): void {
    this.container = container;
    this.onRefreshAssignments = () => {
      this.service.loadAssignments().then(assignments => {
        this.stateManager.setAssignments(assignments);
        this.renderTable();
      }).catch(err => logError('[AssignedAuditsView] Error refreshing assignments:', err));
    };

    const state = this.stateManager.getState();
    const allAuditors = [...state.auditors, ...state.otherAuditors];
    const uniqueWeeks = [...new Set(state.assignments.map(a => a.week).filter((w): w is number => w != null))].sort((a, b) => a - b);
    const cf = state.columnFilters;

    safeSetHTML(container, `
      <div class="px-4 py-6 max-w-7xl mx-auto w-full">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
            <div class="flex items-baseline gap-2">
              <h2 class="text-base font-semibold text-gray-900">Assigned Audits</h2>
              <p class="text-xs text-gray-600">View, reassign, or delete audit assignments. Use checkboxes for bulk actions.</p>
            </div>
          </div>
          <div id="assignedAuditsFilterBar" class="px-4 py-3 border-b border-gray-200 bg-white">
            <div class="flex flex-wrap items-center gap-2">
              <div class="min-w-[180px] max-w-[240px]">
                <div class="relative">
                  <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  </div>
                  <input type="text" id="assignedAuditsSearch" class="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" placeholder="Search employee, auditor, scorecard..." value="${escapeHtml(this.assignedAuditsSearch)}" autocomplete="off" />
                </div>
              </div>
              <div class="flex items-center gap-1.5">
                <label for="assignedFilterStatus" class="text-xs font-medium text-gray-600 whitespace-nowrap">Status</label>
                <select id="assignedFilterStatus" class="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[100px]">
                  <option value="">All</option>
                  <option value="pending" ${cf.status.includes('pending') ? 'selected' : ''}>Pending</option>
                  <option value="in_progress" ${cf.status.includes('in_progress') ? 'selected' : ''}>In Progress</option>
                  <option value="completed" ${cf.status.includes('completed') ? 'selected' : ''}>Completed</option>
                  <option value="cancelled" ${cf.status.includes('cancelled') ? 'selected' : ''}>Cancelled</option>
                </select>
              </div>
              <div class="flex items-center gap-1.5">
                <label for="assignedFilterAuditor" class="text-xs font-medium text-gray-600 whitespace-nowrap">Auditor</label>
                <select id="assignedFilterAuditor" class="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[120px]">
                  <option value="">All</option>
                  ${allAuditors.map(a => `<option value="${escapeHtml(a.email)}" ${cf.auditor.includes(a.email) ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}
                </select>
              </div>
              <div class="flex items-center gap-1.5">
                <label for="assignedFilterScorecard" class="text-xs font-medium text-gray-600 whitespace-nowrap">Scorecard</label>
                <select id="assignedFilterScorecard" class="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[140px]">
                  <option value="">All</option>
                  ${state.scorecards.map(s => `<option value="${escapeHtml(s.id)}" ${cf.scorecard.includes(s.id) ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
                </select>
              </div>
              <div class="flex items-center gap-1.5">
                <label for="assignedFilterWeek" class="text-xs font-medium text-gray-600 whitespace-nowrap">Week</label>
                <select id="assignedFilterWeek" class="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[80px]">
                  <option value="">All</option>
                  ${uniqueWeeks.map(w => `<option value="${w}" ${cf.week.includes(String(w)) ? 'selected' : ''}>${w}</option>`).join('')}
                </select>
              </div>
              <button type="button" id="assignedAuditsClearFilters" class="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg border border-red-200 font-medium hover:bg-red-200/80 transition-all" style="display: none;">
                Clear all
              </button>
            </div>
          </div>
          <div id="assignedAuditsTableContainer" class="p-4"></div>
        </div>
      </div>
    `);

    this.attachFilterBarListeners();
    this.renderTable();
  }

  private syncFilterBarFromState(state: { columnFilters: { week: string[]; status: string[]; auditor: string[]; scorecard: string[] } }): void {
    const cf = state.columnFilters;
    const statusSelect = document.getElementById('assignedFilterStatus') as HTMLSelectElement;
    const auditorSelect = document.getElementById('assignedFilterAuditor') as HTMLSelectElement;
    const scorecardSelect = document.getElementById('assignedFilterScorecard') as HTMLSelectElement;
    const weekSelect = document.getElementById('assignedFilterWeek') as HTMLSelectElement;
    const searchInput = document.getElementById('assignedAuditsSearch') as HTMLInputElement;
    const clearBtn = document.getElementById('assignedAuditsClearFilters');
    if (statusSelect) statusSelect.value = cf.status[0] ?? '';
    if (auditorSelect) auditorSelect.value = cf.auditor[0] ?? '';
    if (scorecardSelect) scorecardSelect.value = cf.scorecard[0] ?? '';
    if (weekSelect) weekSelect.value = cf.week[0] ?? '';
    if (searchInput) searchInput.value = this.assignedAuditsSearch;
    const hasActive = Boolean(this.assignedAuditsSearch || cf.status.length || cf.auditor.length || cf.scorecard.length || cf.week.length);
    if (clearBtn) (clearBtn as HTMLElement).style.display = hasActive ? '' : 'none';
  }

  private attachFilterBarListeners(): void {
    const searchInput = document.getElementById('assignedAuditsSearch') as HTMLInputElement;
    const statusSelect = document.getElementById('assignedFilterStatus') as HTMLSelectElement;
    const auditorSelect = document.getElementById('assignedFilterAuditor') as HTMLSelectElement;
    const scorecardSelect = document.getElementById('assignedFilterScorecard') as HTMLSelectElement;
    const weekSelect = document.getElementById('assignedFilterWeek') as HTMLSelectElement;
    const clearBtn = document.getElementById('assignedAuditsClearFilters');

    const applyFiltersAndRender = () => {
      this.assignedAuditsPage = 1;
      this.renderTable();
    };

    searchInput?.addEventListener('input', () => {
      if (this.searchDebounceTimer != null) clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = window.setTimeout(() => {
        this.searchDebounceTimer = null;
        this.assignedAuditsSearch = (searchInput?.value ?? '').trim();
        this.assignedAuditsPage = 1;
        this.renderTable();
      }, 300);
    });

    const setColumnFilter = (column: string, value: string) => {
      this.stateManager.setColumnFilters(column, value ? [value] : []);
      applyFiltersAndRender();
    };

    statusSelect?.addEventListener('change', () => setColumnFilter('status', statusSelect?.value ?? ''));
    auditorSelect?.addEventListener('change', () => setColumnFilter('auditor', auditorSelect?.value ?? ''));
    scorecardSelect?.addEventListener('change', () => setColumnFilter('scorecard', scorecardSelect?.value ?? ''));
    weekSelect?.addEventListener('change', () => setColumnFilter('week', weekSelect?.value ?? ''));

    clearBtn?.addEventListener('click', () => {
      this.assignedAuditsSearch = '';
      this.stateManager.clearColumnFilters();
      this.assignedAuditsPage = 1;
      if (searchInput) searchInput.value = '';
      if (this.container) this.render(this.container);
    });
  }

  private getFilteredAssignments(): AuditAssignment[] {
    const state = this.stateManager.getState();
    let list = [...state.assignments];
    const cf = state.columnFilters;
    if (cf.week.length) list = list.filter(a => a.week != null && cf.week.includes(String(a.week)));
    if (cf.employee.length) list = list.filter(a => cf.employee.includes(a.employee_email));
    if (cf.auditor.length) list = list.filter(a => cf.auditor.includes(a.auditor_email));
    if (cf.scheduled_date.length) list = list.filter(a => a.scheduled_date && cf.scheduled_date.includes(a.scheduled_date));
    if (cf.scorecard.length) list = list.filter(a => a.scorecard_id && cf.scorecard.includes(a.scorecard_id));
    if (cf.status.length) list = list.filter(a => cf.status.includes(a.status));

    const q = this.assignedAuditsSearch.trim().toLowerCase();
    if (q) {
      const auditorByName = new Map<string, string>();
      for (const au of [...state.auditors, ...state.otherAuditors]) {
        auditorByName.set(au.email, au.name ?? '');
      }
      const scorecardByName = new Map<string, string>();
      for (const s of state.scorecards) {
        scorecardByName.set(s.id, s.name ?? '');
      }
      list = list.filter(a => {
        const auditorName = auditorByName.get(a.auditor_email) ?? '';
        const scorecardName = (a.scorecard_id && scorecardByName.get(a.scorecard_id)) ?? '';
        const employeeName = a.employee_name ?? '';
        const statusLabel = a.status.replace('_', ' ');
        return [employeeName, a.employee_email, auditorName, a.auditor_email, scorecardName, statusLabel].some(
          val => val.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }

  private enrichAssignmentsWithScorecard(assignments: AuditAssignment[], scorecards: Scorecard[]): AuditAssignment[] {
    const byId = new Map(scorecards.map(s => [s.id, s]));
    return assignments.map(a => ({
      ...a,
      scorecard: a.scorecard_id ? byId.get(a.scorecard_id) : undefined
    }));
  }

  /** Latest assigned at top: sort by created_at desc, then by scheduled_date desc. */
  private sortAssignmentsByScheduledAndCreated(assignments: AuditAssignment[]): AuditAssignment[] {
    return [...assignments].sort((a, b) => {
      const aCreated = new Date(a.created_at).getTime();
      const bCreated = new Date(b.created_at).getTime();
      if (aCreated !== bCreated) return bCreated - aCreated; // latest assigned first
      const aSched = a.scheduled_date ? new Date(a.scheduled_date).getTime() : 0;
      const bSched = b.scheduled_date ? new Date(b.scheduled_date).getTime() : 0;
      return bSched - aSched; // then by scheduled date (latest first)
    });
  }

  private renderTable(): void {
    const container = document.getElementById('assignedAuditsTableContainer');
    if (!container) return;
    const state = this.stateManager.getState();
    const filtered = this.getFilteredAssignments();
    const enriched = this.enrichAssignmentsWithScorecard(filtered, state.scorecards);
    const sorted = this.sortAssignmentsByScheduledAndCreated(enriched);
    const totalCount = sorted.length;
    const maxPage = Math.max(1, Math.ceil(totalCount / this.assignedAuditsPageSize));
    if (this.assignedAuditsPage > maxPage) this.assignedAuditsPage = maxPage;
    const start = (this.assignedAuditsPage - 1) * this.assignedAuditsPageSize;
    const end = start + this.assignedAuditsPageSize;
    const paginatedAssignments = sorted.slice(start, end);
    const allAuditors = [...state.auditors, ...state.otherAuditors];

    this.syncFilterBarFromState(state);

    const tableConfig = {
      assignments: paginatedAssignments,
      totalCount,
      page: this.assignedAuditsPage,
      pageSize: this.assignedAuditsPageSize,
      auditors: allAuditors,
      scorecards: state.scorecards,
      selectedAssignments: this.selectedAssignmentIds,
      columnFilters: state.columnFilters,
      onAssignmentSelect: (id: string, selected: boolean) => {
        if (selected) this.selectedAssignmentIds.add(id);
        else this.selectedAssignmentIds.delete(id);
        this.assignedAuditsTable?.update({ selectedAssignments: this.selectedAssignmentIds });
      },
      onSelectAll: (selected: boolean) => {
        if (selected) {
          paginatedAssignments.filter(a => a.status !== 'completed').forEach(a => this.selectedAssignmentIds.add(a.id));
          paginatedAssignments.filter(a => a.status === 'completed').forEach(a => this.selectedAssignmentIds.delete(a.id));
        } else {
          paginatedAssignments.forEach(a => this.selectedAssignmentIds.delete(a.id));
        }
        this.assignedAuditsTable?.update({ selectedAssignments: this.selectedAssignmentIds });
      },
      onPageChange: (page: number) => {
        this.assignedAuditsPage = page;
        this.renderTable();
      },
      onPageSizeChange: (pageSize: number) => {
        this.assignedAuditsPageSize = pageSize;
        this.assignedAuditsPage = 1;
        this.renderTable();
      },
      onColumnFilterChange: (column: string, values: string[]) => {
        this.stateManager.setColumnFilters(column, values);
        this.renderTable();
      },
      onBulkEdit: async (updates: { auditor?: string; scorecard?: string }) => {
        const ids = Array.from(this.selectedAssignmentIds);
        if (ids.length === 0) return;
        try {
          for (const id of ids) {
            await this.service.updateAssignment(id, {
              auditor_email: updates.auditor,
              scorecard_id: updates.scorecard ?? undefined
            });
          }
          this.selectedAssignmentIds.clear();
          const updated = await this.service.loadAssignments();
          this.stateManager.setAssignments(updated);
          this.renderTable();
          await showAlertModal({ title: 'Success', message: `Updated ${ids.length} assignment(s).`, type: 'success' });
        } catch (e) {
          logError('[AssignedAuditsView] Bulk edit failed:', e);
          await showAlertModal({ title: 'Update failed', message: e instanceof Error ? e.message : 'Unknown error', type: 'error' });
        }
      },
      onBulkDelete: async () => {
        const ids = Array.from(this.selectedAssignmentIds);
        if (ids.length === 0) return;
        const confirmed = await showConfirmModal({
          title: 'Delete assignments',
          message: `Delete ${ids.length} assignment(s)? This cannot be undone.`,
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'error',
        });
        if (!confirmed) return;
        try {
          await this.service.deleteAssignments(ids);
          this.selectedAssignmentIds.clear();
          const updated = await this.service.loadAssignments();
          this.stateManager.setAssignments(updated);
          this.renderTable();
          await showAlertModal({ title: 'Success', message: `Deleted ${ids.length} assignment(s).`, type: 'success' });
        } catch (e) {
          logError('[AssignedAuditsView] Bulk delete failed:', e);
          await showAlertModal({ title: 'Delete failed', message: e instanceof Error ? e.message : 'Unknown error', type: 'error' });
        }
      },
      onRefresh: () => this.onRefreshAssignments?.(),
      onDeleteAssignment: async (id: string) => {
        const confirmed = await showConfirmModal({
          title: 'Delete assignment',
          message: 'Delete this assignment? This cannot be undone.',
          confirmText: 'Delete',
          cancelText: 'Cancel',
          type: 'error',
        });
        if (!confirmed) return;
        try {
          await this.service.deleteAssignment(id);
          this.selectedAssignmentIds.delete(id);
          const updated = await this.service.loadAssignments();
          this.stateManager.setAssignments(updated);
          this.renderTable();
          await showAlertModal({ title: 'Success', message: 'Assignment deleted.', type: 'success' });
        } catch (e) {
          logError('[AssignedAuditsView] Delete assignment failed:', e);
          await showAlertModal({ title: 'Delete failed', message: e instanceof Error ? e.message : 'Unknown error', type: 'error' });
        }
      },
      onReassignAssignment: async (id: string, updates: { auditor_email?: string; scorecard_id?: string | null; scheduled_date?: string | null }) => {
        const confirmed = await showConfirmModal({
          title: 'Reassign audit',
          message: 'Are you sure you want to reassign this audit? The auditor, scorecard, or scheduled date will be updated.',
          confirmText: 'Reassign',
          cancelText: 'Cancel',
          type: 'warning',
        });
        if (!confirmed) return;
        try {
          await this.service.updateAssignment(id, updates);
          const updated = await this.service.loadAssignments();
          this.stateManager.setAssignments(updated);
          this.renderTable();
          await showAlertModal({ title: 'Success', message: 'Audit reassigned successfully.', type: 'success' });
        } catch (e) {
          logError('[AssignedAuditsView] Reassign failed:', e);
          await showAlertModal({ title: 'Update failed', message: e instanceof Error ? e.message : 'Unknown error', type: 'error' });
        }
      }
    };

    if (this.assignedAuditsTable) {
      this.assignedAuditsTable.update(tableConfig);
    } else {
      this.assignedAuditsTable = new AssignedAuditsTable(container, tableConfig);
    }
  }

  refresh(): void {
    this.renderTable();
  }
}
