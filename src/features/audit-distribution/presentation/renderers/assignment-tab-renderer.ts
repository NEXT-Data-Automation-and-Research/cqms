/**
 * Assignment Tab Renderer
 * Handles rendering and updates for the assignment tab
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { FilterBar } from '../components/filter-bar.js';
import { EmployeeList } from '../components/employee-list.js';
import { AuditorSelectionModal } from '../components/auditor-selection-modal.js';
import { Pagination } from '../components/pagination.js';
import { AuditDistributionService } from '../../application/audit-distribution-service.js';
import { getAuthenticatedSupabase } from '../../../../utils/authenticated-supabase.js';
import { logInfo, logError } from '../../../../utils/logging-helper.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { getActiveFilterChips } from '../components/filter-chip-utils.js';
import type { Employee } from '../../domain/types.js';
import confirmationDialog from '../../../../components/confirmation-dialog.js';

export interface AssignmentTabRendererConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
  onEmployeeListUpdate?: () => void;
  onAssignmentComplete?: () => void;
  /** When false, auditor modal is not shown (e.g. for AI Audit tab). Default true. */
  showAuditorModal?: boolean;
}

export class AssignmentTabRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService;
  private config: AssignmentTabRendererConfig;
  private filterBar: FilterBar | null = null;
  private employeeList: EmployeeList | null = null;
  private auditorModal: AuditorSelectionModal | null = null;
  private pagination: Pagination | null = null;

  constructor(config: AssignmentTabRendererConfig) {
    this.stateManager = config.stateManager;
    this.service = config.service;
    this.config = config;
  }

  render(): void {
    this.initializeFilterBar();
    this.initializePagination();
    this.initializeSelectionActions();
    this.updateEmployeeList();
    this.initializeAuditorModal();
  }

  private initializeFilterBar(): void {
    // Prefer filters inside people section header, then legacy expanded/compact
    const peopleSectionFilter = document.getElementById('peopleSectionFilterContainer');
    const expandedFilterContainer = document.getElementById('expandedFilterContainer');
    const filterBarContainer = document.getElementById('filterBarContainer');
    const container = peopleSectionFilter || expandedFilterContainer || filterBarContainer;

    if (!container) return;

    const state = this.stateManager.getState();
    const useExpanded = !!(peopleSectionFilter || expandedFilterContainer);
    const useCompact = !!peopleSectionFilter; // Compact search + filters in people section header

    this.filterBar = new FilterBar(container, {
      employees: state.employees,
      filters: state.filters,
      expanded: useExpanded,
      compact: useCompact,
      onFilterChange: (filters) => {
        // Replace filters completely when coming from modal (preserves search if needed)
        this.stateManager.replaceFilters(filters);
        // Update filter bar to show new filter chips
        const state = this.stateManager.getState();
        if (this.filterBar) {
          this.filterBar.update({
            employees: state.employees,
            filters: state.filters
          });
        }
        this.updateEmployeeList();
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      }
    });
  }

  private initializePagination(): void {
    const paginationBottomContainer = document.getElementById('paginationBottomContainer');
    if (!paginationBottomContainer) return;

    const state = this.stateManager.getState();

    this.pagination = new Pagination(paginationBottomContainer, {
      currentPage: state.pagination.currentPage,
      itemsPerPage: state.pagination.itemsPerPage,
      totalItems: state.pagination.totalItems,
      onPageChange: (page) => {
        this.stateManager.setPagination(page);
        this.updateEmployeeList();
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      },
      onItemsPerPageChange: (itemsPerPage) => {
        this.stateManager.setPagination(1, itemsPerPage);
        this.updateEmployeeList();
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      }
    });
  }


  private getActiveFilterChips(): any[] {
    const state = this.stateManager.getState();
    return getActiveFilterChips(state.filters, state.employees);
  }

  private initializeSelectionActions(): void {
    const container = document.getElementById('selectionActionsContainer');
    if (!container) return;

    const state = this.stateManager.getState();
    const hasSelectedEmployees = state.selectedEmployees.size > 0;

    safeSetHTML(container, `
      <div class="flex items-center justify-between w-full gap-4">
        <div class="flex items-center gap-2">
          <button
            id="selectAllButton"
            class="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 hover:border-primary transition-all font-medium flex items-center gap-1.5"
            title="Select all visible employees"
            data-action="select-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Select All</span>
          </button>
          ${hasSelectedEmployees ? `
            <button
              id="deselectAllButton"
              class="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 hover:border-primary transition-all font-medium flex items-center gap-1.5"
              title="Deselect all employees"
              data-action="deselect-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              <span>Clear Selection</span>
            </button>
          ` : ''}
        </div>
      </div>
    `);

    // Attach event listeners
    const selectAllBtn = container.querySelector('[data-action="select-all"]');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        const state = this.stateManager.getState();
        const auditCount = state.bulkAuditCount > 0 ? state.bulkAuditCount : 1;
        state.filteredEmployees.forEach(emp => {
          this.stateManager.toggleEmployeeSelection(emp.email, true, auditCount);
        });
        this.updateEmployeeList();
        this.updateSelectionActions();
        this.updateAuditorModal();
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      });
    }

    const deselectAllBtn = container.querySelector('[data-action="deselect-all"]');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => {
        const state = this.stateManager.getState();
        state.selectedEmployees.clear();
        this.updateEmployeeList();
        this.updateSelectionActions();
        this.hideAuditorModal();
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      });
    }

  }

  private updateSelectionActions(): void {
    const container = document.getElementById('selectionActionsContainer');
    if (!container) return;

    const state = this.stateManager.getState();
    const hasSelectedEmployees = state.selectedEmployees.size > 0;

    const deselectBtn = container.querySelector('[data-action="deselect-all"]');
    if (hasSelectedEmployees && !deselectBtn) {
      // Add clear button if not present
      const selectAllBtn = container.querySelector('[data-action="select-all"]');
      if (selectAllBtn && selectAllBtn.parentElement) {
        const clearBtn = document.createElement('button');
        clearBtn.id = 'deselectAllButton';
        clearBtn.className = 'px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 hover:border-primary transition-all font-medium flex items-center gap-1.5';
        clearBtn.setAttribute('title', 'Deselect all employees');
        clearBtn.setAttribute('data-action', 'deselect-all');
        clearBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
          <span>Clear Selection</span>
        `;
        clearBtn.addEventListener('click', () => {
          const state = this.stateManager.getState();
          state.selectedEmployees.clear();
          this.updateEmployeeList();
          this.updateSelectionActions();
          this.hideAuditorModal();
          if (this.config.onEmployeeListUpdate) {
            this.config.onEmployeeListUpdate();
          }
        });
        selectAllBtn.parentElement.appendChild(clearBtn);
      }
    } else if (!hasSelectedEmployees && deselectBtn) {
      // Remove clear button if no selections
      deselectBtn.remove();
    }
  }

  private initializeAuditorModal(): void {
    if (this.config.showAuditorModal === false) return;
    const modalContainer = document.getElementById('auditorModalContainer');
    if (!modalContainer) {
      logError('[AssignmentTabRenderer] Auditor modal container not found');
      return;
    }

    const state = this.stateManager.getState();
    this.auditorModal = new AuditorSelectionModal(modalContainer, {
      auditors: state.auditors,
      otherAuditors: state.otherAuditors,
      includeOtherAuditors: state.includeOtherAuditors,
      selectedAuditors: state.selectedAuditors,
      bulkAuditCount: state.bulkAuditCount,
      selectedEmployeeCount: state.selectedEmployees.size,
      scheduledDate: state.scheduledDate,
      onToggleIncludeOthers: () => {
        this.stateManager.toggleIncludeOtherAuditors();
        this.updateAuditorModal();
      },
      onAuditorSelect: (email, selected) => {
        this.stateManager.toggleAuditorSelection(email, selected);
        this.updateAuditorModal();
      },
      onSelectAllAuditors: (visibleEmails: string[]) => {
        this.stateManager.getState().selectedAuditors.clear();
        visibleEmails.forEach((email) => {
          this.stateManager.toggleAuditorSelection(email, true);
        });
        this.updateAuditorModal();
      },
      onDeselectAllAuditors: () => {
        this.stateManager.getState().selectedAuditors.clear();
        this.updateAuditorModal();
      },
      onBulkAuditCountChange: (count) => {
        this.stateManager.setBulkAuditCount(count);
        this.updateAuditorModal();
      },
      onScheduledDateChange: (date) => {
        this.stateManager.setScheduledDate(date);
        this.updateAuditorModal();
      },
      onAssign: async () => {
        await this.handleAssign();
      },
      onClose: () => {
        this.hideAuditorModal();
      }
    });
  }

  private showAuditorModal(): void {
    if (this.config.showAuditorModal === false) return;
    this.updateAuditorModal();
    this.auditorModal?.show();
  }

  private hideAuditorModal(): void {
    this.auditorModal?.hide();
  }

  private updateAuditorModal(): void {
    if (!this.auditorModal) return;
    
    const state = this.stateManager.getState();
    this.auditorModal.update({
      auditors: state.auditors,
      otherAuditors: state.otherAuditors,
      includeOtherAuditors: state.includeOtherAuditors,
      selectedAuditors: state.selectedAuditors,
      bulkAuditCount: state.bulkAuditCount,
      selectedEmployeeCount: state.selectedEmployees.size,
      scheduledDate: state.scheduledDate
    });
  }

  private async handleAssign(): Promise<void> {
    try {
      const state = this.stateManager.getState();
      
      if (state.selectedEmployees.size === 0) {
        alert('Please select at least one employee.');
        return;
      }

      if (state.selectedAuditors.size === 0) {
        alert('Please select at least one auditor.');
        return;
      }

      if (state.bulkAuditCount <= 0) {
        alert('Please set audits per employee.');
        return;
      }

      // Get current user email
      const supabase = await getAuthenticatedSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      // Get applicable scorecard for first employee (or use null)
      const firstEmployee = Array.from(state.selectedEmployees.values())[0].employee;
      const applicableScorecards = this.service.getApplicableScorecards(firstEmployee, state.scorecards);
      const scorecardId = applicableScorecards.length > 0 ? applicableScorecards[0].id : null;

      // Create assignments
      const employeeEmails = Array.from(state.selectedEmployees.keys());
      const auditorEmails = Array.from(state.selectedAuditors);

      const assignments = await this.service.createBulkAssignments({
        employeeEmails,
        auditorEmails,
        auditsPerEmployee: state.bulkAuditCount,
        scorecardId,
        scheduledDate: state.scheduledDate,
        assignedBy: user.email
      });

      // Show success message
      alert(`Successfully assigned ${assignments.length} audit(s) to ${auditorEmails.length} auditor(s).`);

      // Clear selections
      state.selectedEmployees.clear();
      state.selectedAuditors.clear();
      this.stateManager.setBulkAuditCount(0);
      this.stateManager.setScheduledDate(null);

      // Refresh data
      const updatedAssignments = await this.service.loadAssignments();
      this.stateManager.setAssignments(updatedAssignments);

      // Hide modal
      this.hideAuditorModal();

      // Update UI
      this.updateEmployeeList();
      
      if (this.config.onAssignmentComplete) {
        this.config.onAssignmentComplete();
      }
    } catch (error) {
      logError('Error assigning audits:', error);
      await confirmationDialog.show({
        title: 'Assign failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        confirmText: 'OK',
        type: 'error',
        showCancel: false,
      });
    }
  }

  updateEmployeeList(): void {
    // Use view-specific containers (each view has its own people list now)
    let contentContainer = document.getElementById('employeeListContent');
    let selectionActionsContainer = document.getElementById('selectionActionsContainer');
    let paginationContainer = document.getElementById('paginationBottomContainer');
    
    // If still no container, try to create it (legacy support)
    if (!contentContainer) {
      const mainContainer = document.getElementById('employeeListContainer');
      if (mainContainer) {
        contentContainer = document.createElement('div');
        contentContainer.id = 'employeeListContent';
        contentContainer.className = 'flex-1 min-h-0 overflow-y-auto';
        mainContainer.appendChild(contentContainer);
      } else {
        return;
      }
    }

    const state = this.stateManager.getState();
    const auditStats = new Map<string, { assigned: number; completed: number }>();
    
    state.filteredEmployees.forEach(emp => {
      const assigned = state.assignments.filter(a => 
        a.employee_email === emp.email && a.status !== 'cancelled'
      ).length;
      const completed = state.assignments.filter(a => 
        a.employee_email === emp.email && a.status === 'completed'
      ).length;
      auditStats.set(emp.email, { assigned, completed });
    });

    this.employeeList = new EmployeeList(contentContainer, {
      employees: state.filteredEmployees,
      selectedEmployees: new Set(state.selectedEmployees.keys()),
      auditStats,
      groupBy: state.filters.groupBy,
      compact: true, // Compact table view like Assigned Audits list
      onEmployeeSelect: (email, selected) => {
        const currentState = this.stateManager.getState();
        const auditCount = currentState.bulkAuditCount > 0 ? currentState.bulkAuditCount : 1;
        this.stateManager.toggleEmployeeSelection(email, selected, auditCount);
        
        // Show auditor pane when employees are selected (unless showAuditorModal is false)
        const updatedState = this.stateManager.getState();
        if (this.config.showAuditorModal !== false) {
          if (updatedState.selectedEmployees.size > 0) {
            this.showAuditorModal();
          } else {
            this.hideAuditorModal();
          }
        }
        
        this.updateSelectionActions();
        
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      }
    });

    if (this.pagination) {
      this.pagination.update({
        currentPage: state.pagination.currentPage,
        itemsPerPage: state.pagination.itemsPerPage,
        totalItems: state.pagination.totalItems
      });
    }
  }


  refresh(): void {
    // Update filter bar with latest employees and filters
    const state = this.stateManager.getState();
    if (this.filterBar) {
      this.filterBar.update({
        employees: state.employees,
        filters: state.filters
      });
    } else {
      // If filter bar doesn't exist yet, initialize it
      this.initializeFilterBar();
    }
    this.updateEmployeeList();
    this.updateSelectionActions();
    this.updateAuditorModal();

    if (this.config.showAuditorModal !== false) {
      if (state.selectedEmployees.size > 0) {
        this.showAuditorModal();
      } else {
        this.hideAuditorModal();
      }
    }
  }
}

