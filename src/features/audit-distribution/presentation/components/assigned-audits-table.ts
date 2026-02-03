/**
 * Assigned Audits Table Component
 * Displays assigned audits with filtering and bulk operations
 */

import type { AuditAssignment, Auditor, Scorecard } from '../../domain/types.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export interface AssignedAuditsTableConfig {
  assignments: AuditAssignment[];
  totalCount?: number;
  page?: number;
  pageSize?: number;
  auditors: Auditor[];
  scorecards: Scorecard[];
  selectedAssignments: Set<string>;
  columnFilters: {
    week: string[];
    employee: string[];
    channel: string[];
    auditor: string[];
    scheduled_date: string[];
    scorecard: string[];
    status: string[];
  };
  onAssignmentSelect: (id: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onColumnFilterChange?: (column: string, values: string[]) => void;
  onBulkEdit?: (updates: { auditor?: string; scorecard?: string }) => void;
  onBulkDelete?: () => void;
  onRefresh?: () => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onDeleteAssignment?: (id: string) => void;
  onReassignAssignment?: (id: string, updates: { auditor_email?: string; scorecard_id?: string | null; scheduled_date?: string | null }) => void;
}

export class AssignedAuditsTable {
  private container: HTMLElement;
  private config: AssignedAuditsTableConfig;
  private reassignTargetId: string | null = null;
  private boundDelegate: (e: Event) => void;

  constructor(container: HTMLElement, config: AssignedAuditsTableConfig) {
    this.container = container;
    this.config = config;
    this.boundDelegate = this.handleDelegate.bind(this);
    this.render();
  }

  private render(): void {
    const { assignments, selectedAssignments, columnFilters, totalCount = assignments.length, page = 1, pageSize = 20 } = this.config;
    const hasActiveFilters = Object.values(columnFilters).some(filters => filters.length > 0);
    const selectedCount = selectedAssignments.size;
    const total = totalCount ?? assignments.length;
    const showPagination = total > pageSize;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);
    const selectableAssignments = assignments.filter(a => a.status !== 'completed');
    const allVisibleSelected = selectableAssignments.length > 0 && selectableAssignments.every(a => selectedAssignments.has(a.id));

    const rows = assignments.map(assignment => this.renderAssignmentRow(assignment, selectedAssignments)).join('');

    const paginationHtml = showPagination ? `
      <div class="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-gray-200">
        <div class="flex items-center gap-2">
          <span class="text-xs text-gray-600">Showing ${startItem}–${endItem} of ${total}</span>
          <label class="text-xs text-gray-600">Per page:</label>
          <select data-action="pageSizeChange" class="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30">
            ${[10, 20, 50, 100].map(n => `<option value="${n}" ${pageSize === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div class="flex items-center gap-1">
          <button type="button" data-action="pagePrev" data-page="${page - 1}" class="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${page <= 1 ? 'disabled' : ''}>Prev</button>
          <span class="text-xs text-gray-600 px-2">Page ${page} of ${totalPages}</span>
          <button type="button" data-action="pageNext" data-page="${page + 1}" class="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed" ${page >= totalPages ? 'disabled' : ''}>Next</button>
        </div>
      </div>
    ` : '';

    safeSetHTML(this.container, `
      <div class="rounded-xl bg-gray-50/50 border border-gray-200 p-4">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
          <div class="flex items-center gap-2 flex-wrap">
            <button type="button" data-action="refresh" class="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-1.5 font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Refresh
            </button>
            <div class="flex items-center gap-1.5">
              <label for="tableStatusFilter" class="text-xs font-medium text-gray-600 whitespace-nowrap">Status</label>
              <select id="tableStatusFilter" class="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[100px]" data-action="statusFilterChange">
                <option value="">All</option>
                <option value="pending" ${columnFilters.status.includes('pending') ? 'selected' : ''}>Pending</option>
                <option value="in_progress" ${columnFilters.status.includes('in_progress') ? 'selected' : ''}>In Progress</option>
                <option value="completed" ${columnFilters.status.includes('completed') ? 'selected' : ''}>Completed</option>
                <option value="cancelled" ${columnFilters.status.includes('cancelled') ? 'selected' : ''}>Cancelled</option>
              </select>
            </div>
            <span class="text-sm font-medium text-gray-600">${showPagination ? `Showing ${startItem}–${endItem} of ${total}` : `${total} assignment(s)`}</span>
            ${hasActiveFilters ? `
              <button type="button" data-action="clearFilters" class="px-3 py-1.5 text-xs bg-red-100 text-red-700 rounded-lg border border-red-200 font-medium hover:bg-red-200/80 transition-all flex items-center gap-1.5">
                Clear Filters
              </button>
            ` : ''}
          </div>
          ${selectedCount > 0 ? `
            <div id="bulkActions" class="flex gap-2 items-center flex-wrap">
              <span class="text-xs text-gray-600 font-medium">${selectedCount} selected</span>
              <select id="bulkEditAuditor" class="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Change Auditor...</option>
                ${this.config.auditors.map(a => `
                  <option value="${this.escapeHtml(a.email)}">${this.escapeHtml(a.name)}</option>
                `).join('')}
              </select>
              <select id="bulkEditScorecard" class="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Change Scorecard...</option>
                ${this.config.scorecards.map(s => `
                  <option value="${this.escapeHtml(s.id)}">${this.escapeHtml(s.name)}</option>
                `).join('')}
              </select>
              <button type="button" data-action="bulkEdit" class="px-3 py-1.5 text-xs bg-primary text-white rounded-lg border-none hover:opacity-90 transition-all font-medium">
                Apply Changes
              </button>
              <button type="button" data-action="bulkDelete" class="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg border-none hover:bg-red-700 transition-all font-medium">
                Delete Selected
              </button>
            </div>
          ` : ''}
        </div>
        <div class="overflow-x-auto overflow-y-visible">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-gray-100 border-b border-gray-200">
                <th class="text-center p-2 w-4"><input type="checkbox" id="selectAllAssignments" class="cursor-pointer accent-primary w-4 h-4" ${allVisibleSelected ? 'checked' : ''} /></th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[7rem]">Scheduled</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[10rem]">Employee</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[9rem]">Auditor</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[8rem]">Scorecard</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[7rem]">Status</th>
                <th class="text-center p-2 font-semibold text-gray-700 w-14">Week</th>
                <th class="text-left p-2 font-semibold text-gray-700 min-w-[6rem]">Assigned</th>
                <th class="text-center p-2 font-semibold text-gray-700 w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${assignments.length === 0 ? `
                <tr><td colspan="9" class="text-center py-8 text-gray-500">No assignments found</td></tr>
              ` : rows}
            </tbody>
          </table>
        </div>
        ${paginationHtml}
      </div>
      <!-- Reassign modal -->
      <div id="reassignModal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reassignModalTitle">
        <div class="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200">
          <h3 id="reassignModalTitle" class="text-lg font-semibold text-gray-900 mb-4">Reassign Audit</h3>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Auditor</label>
              <select id="reassignAuditorSelect" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30">
                ${this.config.auditors.map(a => `<option value="${this.escapeHtml(a.email)}">${this.escapeHtml(a.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Scorecard</label>
              <select id="reassignScorecardSelect" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">— Keep current —</option>
                ${this.config.scorecards.map(s => `<option value="${this.escapeHtml(s.id)}">${this.escapeHtml(s.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Scheduled Date (optional)</label>
              <input type="date" id="reassignDateInput" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-6">
            <button type="button" data-action="reassignModalCancel" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button type="button" data-action="reassignModalSave" class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:opacity-90">Save</button>
          </div>
        </div>
      </div>
    `);

    this.attachEventListeners();
  }

  private getAuditorName(email: string): string {
    const auditor = this.config.auditors.find(a => a.email === email);
    return auditor ? auditor.name : email;
  }

  private renderAssignmentRow(assignment: AuditAssignment, selectedAssignments: Set<string>): string {
    const isSelected = selectedAssignments.has(assignment.id);
    const isCompleted = assignment.status === 'completed';
    const statusColors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'in_progress': 'bg-blue-100 text-blue-800 border border-blue-200',
      'completed': 'bg-green-100 text-green-800 border border-green-200',
      'cancelled': 'bg-red-100 text-red-800 border border-red-200'
    };

    const createdDate = new Date(assignment.created_at).toLocaleDateString();
    const scheduledDate = assignment.scheduled_date || createdDate;
    const auditorName = this.getAuditorName(assignment.auditor_email);
    const canEdit = assignment.status !== 'completed';

    return `
      <tr class="border-b border-gray-200 hover:bg-gray-50/80 transition-colors" data-assignment-id="${this.escapeHtml(assignment.id)}">
        <td class="p-2 text-center">
          <input
            type="checkbox"
            class="assignment-checkbox cursor-pointer accent-primary w-4 h-4"
            data-assignment-id="${this.escapeHtml(assignment.id)}"
            ${isSelected ? 'checked' : ''}
            ${isCompleted ? 'disabled' : ''}
          />
        </td>
        <td class="p-2 text-sm font-medium text-gray-900 whitespace-nowrap">${scheduledDate}</td>
        <td class="p-2 text-sm font-medium text-gray-900">${this.escapeHtml(assignment.employee_name || assignment.employee_email)}</td>
        <td class="p-2 text-sm text-gray-800">${this.escapeHtml(auditorName)}</td>
        <td class="p-2 text-sm text-gray-700">${this.escapeHtml(assignment.scorecard?.name || 'N/A')}</td>
        <td class="p-2 align-middle">
          <span class="inline-block px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap leading-tight ${statusColors[assignment.status] || 'bg-gray-100 text-gray-700 border border-gray-200'}">
            ${assignment.status.replace('_', ' ').toUpperCase()}
          </span>
        </td>
        <td class="p-2 text-sm text-center text-gray-600">${assignment.week ?? '-'}</td>
        <td class="p-2 text-sm text-gray-600 whitespace-nowrap">${createdDate}</td>
        <td class="p-2 text-center">
          ${canEdit ? `
            <div class="flex items-center justify-center gap-1">
              <button type="button" data-action="reassign-assignment" data-assignment-id="${this.escapeHtml(assignment.id)}" class="p-1.5 rounded-lg text-gray-600 hover:bg-primary/10 hover:text-primary transition-colors" title="Reassign">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button type="button" data-action="delete-assignment" data-assignment-id="${this.escapeHtml(assignment.id)}" class="p-1.5 rounded-lg text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          ` : '<span class="text-gray-400 text-xs">—</span>'}
        </td>
      </tr>
    `;
  }

  private handleDelegate(e: Event): void {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const assignmentId = btn.getAttribute('data-assignment-id');

    switch (action) {
      case 'refresh':
        this.config.onRefresh?.();
        break;
      case 'clearFilters':
        if (this.config.onColumnFilterChange) {
          Object.keys(this.config.columnFilters).forEach(column => {
            this.config.onColumnFilterChange!(column, []);
          });
        }
        break;
      case 'bulkEdit': {
        const auditorSelect = this.container.querySelector('#bulkEditAuditor') as HTMLSelectElement;
        const scorecardSelect = this.container.querySelector('#bulkEditScorecard') as HTMLSelectElement;
        const updates: { auditor?: string; scorecard?: string } = {};
        if (auditorSelect?.value) updates.auditor = auditorSelect.value;
        if (scorecardSelect?.value) updates.scorecard = scorecardSelect.value;
        if (this.config.onBulkEdit && (updates.auditor || updates.scorecard)) {
          this.config.onBulkEdit(updates);
        }
        break;
      }
      case 'bulkDelete':
        this.config.onBulkDelete?.();
        break;
      case 'delete-assignment':
        if (assignmentId) this.config.onDeleteAssignment?.(assignmentId);
        break;
      case 'reassign-assignment':
        if (assignmentId) this.openReassignModal(assignmentId);
        break;
      case 'reassignModalCancel':
        this.closeReassignModal();
        break;
      case 'reassignModalSave':
        this.saveReassignModal();
        break;
      case 'pagePrev':
      case 'pageNext': {
        const pageNum = btn.getAttribute('data-page');
        if (pageNum && this.config.onPageChange) {
          const p = parseInt(pageNum, 10);
          if (!isNaN(p) && p >= 1) this.config.onPageChange(p);
        }
        break;
      }
      case 'pageSizeChange':
        // Handled in attachEventListeners via change event on select
        break;
    }
  }

  private openReassignModal(assignmentId: string): void {
    this.reassignTargetId = assignmentId;
    const assignment = this.config.assignments.find(a => a.id === assignmentId);
    const modal = this.container.querySelector('#reassignModal') as HTMLElement;
    const auditorSelect = this.container.querySelector('#reassignAuditorSelect') as HTMLSelectElement;
    const scorecardSelect = this.container.querySelector('#reassignScorecardSelect') as HTMLSelectElement;
    const dateInput = this.container.querySelector('#reassignDateInput') as HTMLInputElement;
    if (modal) modal.classList.remove('hidden');
    if (auditorSelect && assignment) auditorSelect.value = assignment.auditor_email;
    if (scorecardSelect && assignment) scorecardSelect.value = assignment.scorecard_id || '';
    if (dateInput && assignment) dateInput.value = assignment.scheduled_date || '';
  }

  private closeReassignModal(): void {
    this.reassignTargetId = null;
    const modal = this.container.querySelector('#reassignModal') as HTMLElement;
    if (modal) modal.classList.add('hidden');
  }

  private saveReassignModal(): void {
    if (!this.reassignTargetId || !this.config.onReassignAssignment) {
      this.closeReassignModal();
      return;
    }
    const auditorSelect = this.container.querySelector('#reassignAuditorSelect') as HTMLSelectElement;
    const scorecardSelect = this.container.querySelector('#reassignScorecardSelect') as HTMLSelectElement;
    const dateInput = this.container.querySelector('#reassignDateInput') as HTMLInputElement;
    const updates: { auditor_email?: string; scorecard_id?: string | null; scheduled_date?: string | null } = {};
    if (auditorSelect?.value) updates.auditor_email = auditorSelect.value;
    if (scorecardSelect?.value) updates.scorecard_id = scorecardSelect.value;
    if (dateInput?.value) updates.scheduled_date = dateInput.value;
    this.config.onReassignAssignment(this.reassignTargetId, updates);
    this.closeReassignModal();
  }

  private attachEventListeners(): void {
    this.container.removeEventListener('click', this.boundDelegate);
    this.container.addEventListener('click', this.boundDelegate);

    const selectAllCheckbox = this.container.querySelector('#selectAllAssignments') as HTMLInputElement;
    selectAllCheckbox?.addEventListener('change', () => {
      if (this.config.onSelectAll) {
        this.config.onSelectAll(selectAllCheckbox.checked);
      }
    });

    this.container.querySelectorAll('.assignment-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const el = e.target as HTMLInputElement;
        const id = el.getAttribute('data-assignment-id');
        if (id) this.config.onAssignmentSelect(id, el.checked);
      });
    });

    // Close reassign modal on backdrop click
    const modal = this.container.querySelector('#reassignModal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) this.closeReassignModal();
    });

    // Page size change
    const pageSizeSelect = this.container.querySelector('select[data-action="pageSizeChange"]') as HTMLSelectElement;
    pageSizeSelect?.addEventListener('change', () => {
      if (this.config.onPageSizeChange) {
        const size = parseInt(pageSizeSelect.value, 10);
        if (!isNaN(size) && size >= 1) this.config.onPageSizeChange(size);
      }
    });

    // Status filter change
    const statusFilterSelect = this.container.querySelector('#tableStatusFilter') as HTMLSelectElement;
    statusFilterSelect?.addEventListener('change', () => {
      if (this.config.onColumnFilterChange) {
        const value = statusFilterSelect.value;
        this.config.onColumnFilterChange('status', value ? [value] : []);
      }
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  update(config: Partial<AssignedAuditsTableConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }
}

