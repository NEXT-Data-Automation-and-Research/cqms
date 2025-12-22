/**
 * Statistics Tab Renderer
 * Handles rendering and updates for the statistics tab
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { AgentSummaryTable } from '../components/agent-summary-table.js';
import { AssignedAuditsTable } from '../components/assigned-audits-table.js';

export interface StatisticsTabRendererConfig {
  stateManager: AuditDistributionStateManager;
}

export class StatisticsTabRenderer {
  private stateManager: AuditDistributionStateManager;
  private agentSummaryTable: AgentSummaryTable | null = null;
  private assignedAuditsTable: AssignedAuditsTable | null = null;

  constructor(config: StatisticsTabRendererConfig) {
    this.stateManager = config.stateManager;
  }

  render(): void {
    this.renderAgentSummarySection();
    this.renderAssignedAuditsSection();
  }

  private renderAgentSummarySection(): void {
    const container = document.getElementById('agentSummarySection');
    if (!container) return;

    const state = this.stateManager.getState();

    this.agentSummaryTable = new AgentSummaryTable(container, {
      summaries: state.agentSummaries,
      onTargetUpdate: (email, target) => {
        // TODO: Update target in state
        console.log('Update target', email, target);
      },
      dateFilter: state.dateFilter,
      onDateFilterChange: (period) => {
        // TODO: Update date filter
        console.log('Date filter change', period);
      },
      onRefresh: () => {
        // TODO: Refresh summaries
        console.log('Refresh summaries');
      }
    });
  }

  private renderAssignedAuditsSection(): void {
    const container = document.getElementById('assignedAuditsSection');
    if (!container) return;

    const state = this.stateManager.getState();
    const selectedAssignments = new Set<string>();

    this.assignedAuditsTable = new AssignedAuditsTable(container, {
      assignments: state.assignments,
      auditors: [...state.auditors, ...state.otherAuditors],
      scorecards: state.scorecards,
      selectedAssignments,
      columnFilters: state.columnFilters,
      onAssignmentSelect: (id, selected) => {
        if (selected) {
          selectedAssignments.add(id);
        } else {
          selectedAssignments.delete(id);
        }
        this.updateAssignedAuditsTable();
      },
      onSelectAll: (selected) => {
        if (selected) {
          state.assignments.forEach(a => {
            if (a.status !== 'completed') {
              selectedAssignments.add(a.id);
            }
          });
        } else {
          selectedAssignments.clear();
        }
        this.updateAssignedAuditsTable();
      },
      onBulkEdit: (updates) => {
        // TODO: Implement bulk edit
        console.log('Bulk edit', updates);
      },
      onBulkDelete: () => {
        // TODO: Implement bulk delete
        console.log('Bulk delete');
      },
      onRefresh: () => {
        // TODO: Refresh assignments
        console.log('Refresh assignments');
      }
    });
  }

  private updateAssignedAuditsTable(): void {
    if (this.assignedAuditsTable) {
      const state = this.stateManager.getState();
      const selectedAssignments = new Set<string>();
      
      this.assignedAuditsTable.update({
        assignments: state.assignments,
        selectedAssignments
      });
    }
  }

  refresh(): void {
    if (this.agentSummaryTable) {
      const state = this.stateManager.getState();
      this.agentSummaryTable.update({
        summaries: state.agentSummaries
      });
    }
    this.updateAssignedAuditsTable();
  }
}

