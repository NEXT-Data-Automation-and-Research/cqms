/**
 * Assigned Audits View Renderer
 * Dedicated tab view for viewing and managing audit assignments (reassign, delete, bulk actions)
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { AuditDistributionService } from '../../application/audit-distribution-service.js';
import { AssignedAuditsTable } from '../components/assigned-audits-table.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logError } from '../../../../utils/logging-helper.js';
import type { AuditAssignment, Scorecard } from '../../domain/types.js';

export interface AssignedAuditsViewRendererConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
}

export class AssignedAuditsViewRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService;
  private assignedAuditsTable: AssignedAuditsTable | null = null;
  private selectedAssignmentIds = new Set<string>();
  private onRefreshAssignments: (() => void) | null = null;
  private assignedAuditsPage = 1;
  private assignedAuditsPageSize = 20;

  constructor(config: AssignedAuditsViewRendererConfig) {
    this.stateManager = config.stateManager;
    this.service = config.service;
  }

  render(container: HTMLElement): void {
    this.onRefreshAssignments = () => {
      this.service.loadAssignments().then(assignments => {
        this.stateManager.setAssignments(assignments);
        this.renderTable();
      }).catch(err => logError('[AssignedAuditsView] Error refreshing assignments:', err));
    };

    safeSetHTML(container, `
      <div class="px-4 py-6 max-w-7xl mx-auto w-full">
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="px-4 py-2.5 border-b border-gray-200 bg-gray-50">
            <div class="flex items-baseline gap-2">
              <h2 class="text-base font-semibold text-gray-900">Assigned Audits</h2>
              <p class="text-xs text-gray-600">View, reassign, or delete audit assignments. Use checkboxes for bulk actions.</p>
            </div>
          </div>
          <div id="assignedAuditsTableContainer" class="p-4"></div>
        </div>
      </div>
    `);

    this.renderTable();
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
    return list;
  }

  private enrichAssignmentsWithScorecard(assignments: AuditAssignment[], scorecards: Scorecard[]): AuditAssignment[] {
    return assignments.map(a => ({
      ...a,
      scorecard: a.scorecard_id ? scorecards.find(s => s.id === a.scorecard_id) : undefined
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

    this.assignedAuditsTable = new AssignedAuditsTable(container, {
      assignments: paginatedAssignments,
      totalCount,
      page: this.assignedAuditsPage,
      pageSize: this.assignedAuditsPageSize,
      auditors: allAuditors,
      scorecards: state.scorecards,
      selectedAssignments: this.selectedAssignmentIds,
      columnFilters: state.columnFilters,
      onAssignmentSelect: (id, selected) => {
        if (selected) this.selectedAssignmentIds.add(id);
        else this.selectedAssignmentIds.delete(id);
        this.assignedAuditsTable?.update({ selectedAssignments: this.selectedAssignmentIds });
      },
      onSelectAll: (selected) => {
        if (selected) {
          paginatedAssignments.filter(a => a.status !== 'completed').forEach(a => this.selectedAssignmentIds.add(a.id));
          paginatedAssignments.filter(a => a.status === 'completed').forEach(a => this.selectedAssignmentIds.delete(a.id));
        } else {
          paginatedAssignments.forEach(a => this.selectedAssignmentIds.delete(a.id));
        }
        this.assignedAuditsTable?.update({ selectedAssignments: this.selectedAssignmentIds });
      },
      onPageChange: (page) => {
        this.assignedAuditsPage = page;
        this.renderTable();
      },
      onPageSizeChange: (pageSize) => {
        this.assignedAuditsPageSize = pageSize;
        this.assignedAuditsPage = 1;
        this.renderTable();
      },
      onColumnFilterChange: (column, values) => {
        this.stateManager.setColumnFilters(column, values);
        this.renderTable();
      },
      onBulkEdit: async (updates) => {
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
          alert(`Updated ${ids.length} assignment(s).`);
        } catch (e) {
          logError('[AssignedAuditsView] Bulk edit failed:', e);
          alert(`Failed to update: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      },
      onBulkDelete: async () => {
        const ids = Array.from(this.selectedAssignmentIds);
        if (ids.length === 0) return;
        if (!confirm(`Delete ${ids.length} assignment(s)? This cannot be undone.`)) return;
        try {
          await this.service.deleteAssignments(ids);
          this.selectedAssignmentIds.clear();
          const updated = await this.service.loadAssignments();
          this.stateManager.setAssignments(updated);
          this.renderTable();
          alert(`Deleted ${ids.length} assignment(s).`);
        } catch (e) {
          logError('[AssignedAuditsView] Bulk delete failed:', e);
          alert(`Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      },
      onRefresh: () => this.onRefreshAssignments?.(),
      onDeleteAssignment: async (id) => {
        if (!confirm('Delete this assignment? This cannot be undone.')) return;
        try {
          await this.service.deleteAssignment(id);
          this.selectedAssignmentIds.delete(id);
          const updated = await this.service.loadAssignments();
          this.stateManager.setAssignments(updated);
          this.renderTable();
        } catch (e) {
          logError('[AssignedAuditsView] Delete assignment failed:', e);
          alert(`Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      },
      onReassignAssignment: async (id, updates) => {
        try {
          await this.service.updateAssignment(id, updates);
          const updated = await this.service.loadAssignments();
          this.stateManager.setAssignments(updated);
          this.renderTable();
        } catch (e) {
          logError('[AssignedAuditsView] Reassign failed:', e);
          alert(`Failed to update: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
      }
    });
  }

  refresh(): void {
    this.renderTable();
  }
}
