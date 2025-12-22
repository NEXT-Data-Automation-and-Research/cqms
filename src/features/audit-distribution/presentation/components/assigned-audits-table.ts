/**
 * Assigned Audits Table Component
 * Displays assigned audits with filtering and bulk operations
 */

import type { AuditAssignment, Auditor, Scorecard } from '../../domain/types.js';

export interface AssignedAuditsTableConfig {
  assignments: AuditAssignment[];
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
}

export class AssignedAuditsTable {
  private container: HTMLElement;
  private config: AssignedAuditsTableConfig;

  constructor(container: HTMLElement, config: AssignedAuditsTableConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  private render(): void {
    const { assignments, selectedAssignments, columnFilters } = this.config;
    const hasActiveFilters = Object.values(columnFilters).some(filters => filters.length > 0);
    const selectedCount = selectedAssignments.size;

    const rows = assignments.map(assignment => this.renderAssignmentRow(assignment, selectedAssignments)).join('');

    this.container.innerHTML = `
      <div class="glass-card rounded-xl p-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-white/10">
          <div class="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="flex-shrink-0 text-primary">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            <h2 class="text-base font-bold text-white m-0">Assigned Audits Overview</h2>
          </div>
          <button
            class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all flex items-center gap-1.5 font-medium"
            onclick="this.dispatchEvent(new CustomEvent('refresh'))"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-sm font-semibold text-white/90 m-0">All Assignments</h3>
            ${hasActiveFilters ? `
              <button
                class="px-3 py-1.5 text-xs bg-red-500/90 text-white rounded-lg border-none font-semibold hover:bg-red-500 transition-all flex items-center gap-1.5 shadow-sm"
                onclick="this.dispatchEvent(new CustomEvent('clearFilters'))"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                </svg>
                Clear Filters
              </button>
            ` : ''}
          </div>
          ${selectedCount > 0 ? `
            <div id="bulkActions" class="flex gap-2 items-center flex-wrap">
              <span class="text-xs text-white/80 font-medium">${selectedCount} selected</span>
              <select
                id="bulkEditAuditor"
                class="text-xs border border-white/20 rounded-lg px-2.5 py-1.5 bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">Change Auditor...</option>
                ${this.config.auditors.map(a => `
                  <option value="${this.escapeHtml(a.email)}" class="bg-gray-800">${this.escapeHtml(a.name)}</option>
                `).join('')}
              </select>
              <select
                id="bulkEditScorecard"
                class="text-xs border border-white/20 rounded-lg px-2.5 py-1.5 bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
              >
                <option value="">Change Scorecard...</option>
                ${this.config.scorecards.map(s => `
                  <option value="${this.escapeHtml(s.id)}" class="bg-gray-800">${this.escapeHtml(s.name)}</option>
                `).join('')}
              </select>
              <button
                class="px-3 py-1.5 text-xs bg-primary text-white rounded-lg border-none hover:bg-primary-dark transition-all font-medium shadow-sm"
                onclick="this.dispatchEvent(new CustomEvent('bulkEdit'))"
              >
                Apply Changes
              </button>
              <button
                class="px-3 py-1.5 text-xs bg-red-500/90 text-white rounded-lg border-none hover:bg-red-500 transition-all font-medium shadow-sm"
                onclick="this.dispatchEvent(new CustomEvent('bulkDelete'))"
              >
                Delete Selected
              </button>
            </div>
          ` : ''}
        </div>
        <div class="overflow-x-auto overflow-y-visible">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-white/5 border-b border-white/10">
                <th class="text-center p-2 w-4">
                  <input
                    type="checkbox"
                    id="selectAllAssignments"
                    class="cursor-pointer accent-primary w-4 h-4"
                  />
                </th>
                <th
                  class="text-left p-2 font-semibold text-white cursor-pointer hover:text-primary transition-colors relative"
                  onclick="this.dispatchEvent(new CustomEvent('columnFilter', { detail: 'week' }))"
                >
                  Week
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block align-middle ml-1 opacity-60">
                    <polygon points="12 2 2 12 22 12"/>
                  </svg>
                </th>
                <th
                  class="text-left p-2 font-semibold text-white cursor-pointer hover:text-primary transition-colors relative"
                  onclick="this.dispatchEvent(new CustomEvent('columnFilter', { detail: 'employee' }))"
                >
                  Employee
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block align-middle ml-1 opacity-60">
                    <polygon points="12 2 2 12 22 12"/>
                  </svg>
                </th>
                <th
                  class="text-left p-2 font-semibold text-white cursor-pointer hover:text-primary transition-colors relative"
                  onclick="this.dispatchEvent(new CustomEvent('columnFilter', { detail: 'channel' }))"
                >
                  Channel
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block align-middle ml-1 opacity-60">
                    <polygon points="12 2 2 12 22 12"/>
                  </svg>
                </th>
                <th
                  class="text-left p-2 font-semibold text-white cursor-pointer hover:text-primary transition-colors relative"
                  onclick="this.dispatchEvent(new CustomEvent('columnFilter', { detail: 'auditor' }))"
                >
                  Auditor
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block align-middle ml-1 opacity-60">
                    <polygon points="12 2 2 12 22 12"/>
                  </svg>
                </th>
                <th
                  class="text-left p-2 font-semibold text-white cursor-pointer hover:text-primary transition-colors relative"
                  onclick="this.dispatchEvent(new CustomEvent('columnFilter', { detail: 'scheduled_date' }))"
                >
                  Scheduled Date
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block align-middle ml-1 opacity-60">
                    <polygon points="12 2 2 12 22 12"/>
                  </svg>
                </th>
                <th
                  class="text-left p-2 font-semibold text-white cursor-pointer hover:text-primary transition-colors relative"
                  onclick="this.dispatchEvent(new CustomEvent('columnFilter', { detail: 'scorecard' }))"
                >
                  Scorecard
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block align-middle ml-1 opacity-60">
                    <polygon points="12 2 2 12 22 12"/>
                  </svg>
                </th>
                <th
                  class="text-left p-2 font-semibold text-white cursor-pointer hover:text-primary transition-colors relative"
                  onclick="this.dispatchEvent(new CustomEvent('columnFilter', { detail: 'status' }))"
                >
                  Status
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="inline-block align-middle ml-1 opacity-60">
                    <polygon points="12 2 2 12 22 12"/>
                  </svg>
                </th>
                <th class="text-left p-2 font-semibold text-white">Created</th>
              </tr>
            </thead>
            <tbody>
              ${assignments.length === 0 ? `
                <tr>
                  <td colspan="9" class="text-center py-8 text-white/60">No assignments found</td>
                </tr>
              ` : rows}
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderAssignmentRow(assignment: AuditAssignment, selectedAssignments: Set<string>): string {
    const isSelected = selectedAssignments.has(assignment.id);
    const isCompleted = assignment.status === 'completed';
    const statusColors: Record<string, string> = {
      'pending': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      'in_progress': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
      'completed': 'bg-green-500/20 text-green-400 border border-green-500/30',
      'cancelled': 'bg-red-500/20 text-red-400 border border-red-500/30'
    };

    const createdDate = new Date(assignment.created_at).toLocaleDateString();
    const scheduledDate = assignment.scheduled_date || createdDate;

    return `
      <tr class="border-b border-white/10 hover:bg-white/5 transition-colors" data-assignment-id="${this.escapeHtml(assignment.id)}">
        <td class="p-2 text-center">
          <input
            type="checkbox"
            class="assignment-checkbox cursor-pointer accent-primary w-4 h-4"
            data-assignment-id="${this.escapeHtml(assignment.id)}"
            ${isSelected ? 'checked' : ''}
            ${isCompleted ? 'disabled' : ''}
          />
        </td>
        <td class="p-2 text-sm text-center font-medium text-white">${assignment.week || '-'}</td>
        <td class="p-2 text-sm font-medium text-white">${this.escapeHtml(assignment.employee_name || assignment.employee_email)}</td>
        <td class="p-2 text-sm text-white/60">-</td>
        <td class="p-2 text-sm text-white/90">${this.escapeHtml(assignment.auditor_email)}</td>
        <td class="p-2 text-sm text-white/80">${scheduledDate}</td>
        <td class="p-2 text-sm text-white/80">${this.escapeHtml(assignment.scorecard?.name || 'N/A')}</td>
        <td class="p-2">
          <span class="px-2 py-1 rounded-lg text-xs font-semibold ${statusColors[assignment.status] || 'bg-white/10 text-white/80 border border-white/20'}">
            ${assignment.status.replace('_', ' ').toUpperCase()}
          </span>
        </td>
        <td class="p-2 text-sm text-white/60">${createdDate}</td>
      </tr>
    `;
  }

  private attachEventListeners(): void {
    const selectAllCheckbox = this.container.querySelector('#selectAllAssignments') as HTMLInputElement;
    selectAllCheckbox?.addEventListener('change', () => {
      if (this.config.onSelectAll) {
        this.config.onSelectAll(selectAllCheckbox.checked);
      }
    });

    const assignmentCheckboxes = this.container.querySelectorAll('.assignment-checkbox');
    assignmentCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const id = (checkbox as HTMLInputElement).getAttribute('data-assignment-id');
        const checked = (checkbox as HTMLInputElement).checked;
        if (id) {
          this.config.onAssignmentSelect(id, checked);
        }
      });
    });

    const columnFilterHeaders = this.container.querySelectorAll('[onclick*="columnFilter"]');
    columnFilterHeaders.forEach(header => {
      header.addEventListener('columnFilter', ((e: CustomEvent) => {
        const column = e.detail;
        // TODO: Show filter dropdown
        if (this.config.onColumnFilterChange) {
          // This would be handled by a filter dropdown component
        }
      }) as EventListener);
    });

    const bulkEditBtn = this.container.querySelector('[onclick*="bulkEdit"]');
    bulkEditBtn?.addEventListener('bulkEdit', () => {
      const auditorSelect = this.container.querySelector('#bulkEditAuditor') as HTMLSelectElement;
      const scorecardSelect = this.container.querySelector('#bulkEditScorecard') as HTMLSelectElement;
      
      const updates: { auditor?: string; scorecard?: string } = {};
      if (auditorSelect?.value) updates.auditor = auditorSelect.value;
      if (scorecardSelect?.value) updates.scorecard = scorecardSelect.value;

      if (this.config.onBulkEdit && (updates.auditor || updates.scorecard)) {
        this.config.onBulkEdit(updates);
      }
    });

    const bulkDeleteBtn = this.container.querySelector('[onclick*="bulkDelete"]');
    bulkDeleteBtn?.addEventListener('bulkDelete', () => {
      if (this.config.onBulkDelete) {
        this.config.onBulkDelete();
      }
    });

    const refreshBtn = this.container.querySelector('[onclick*="refresh"]');
    refreshBtn?.addEventListener('refresh', () => {
      if (this.config.onRefresh) {
        this.config.onRefresh();
      }
    });

    const clearFiltersBtn = this.container.querySelector('[onclick*="clearFilters"]');
    clearFiltersBtn?.addEventListener('clearFilters', () => {
      if (this.config.onColumnFilterChange) {
        Object.keys(this.config.columnFilters).forEach(column => {
          this.config.onColumnFilterChange!(column, []);
        });
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

