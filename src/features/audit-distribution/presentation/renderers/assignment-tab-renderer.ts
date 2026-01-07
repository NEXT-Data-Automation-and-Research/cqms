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

export interface AssignmentTabRendererConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
  onEmployeeListUpdate?: () => void;
  onAssignmentComplete?: () => void;
}

export class AssignmentTabRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService;
  private config: AssignmentTabRendererConfig;
  private filterBar: FilterBar | null = null;
  private employeeList: EmployeeList | null = null;
  private auditorModal: AuditorSelectionModal | null = null;
  private pagination: Pagination | null = null;
  private assignButtonClickHandler: ((e: Event) => void) | null = null;

  constructor(config: AssignmentTabRendererConfig) {
    this.stateManager = config.stateManager;
    this.service = config.service;
    this.config = config;
  }

  render(): void {
    this.initializeFilterBar();
    this.initializePagination();
    this.updateEmployeeList();
    this.initializeAuditorModal();
    this.initializeAssignButton();
    this.updateAssignButtonState();
  }

  private initializeFilterBar(): void {
    const filterBarContainer = document.getElementById('filterBarContainer');
    if (!filterBarContainer) return;

    const state = this.stateManager.getState();

    this.filterBar = new FilterBar(filterBarContainer, {
      employees: state.employees,
      filters: state.filters,
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
      },
      onSelectAll: () => {
        const state = this.stateManager.getState();
        const auditCount = state.bulkAuditCount > 0 ? state.bulkAuditCount : 1;
        state.filteredEmployees.forEach(emp => {
          this.stateManager.toggleEmployeeSelection(emp.email, true, auditCount);
        });
        this.updateEmployeeList();
        this.updateAuditorModal();
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      },
      onDeselectAll: () => {
        state.selectedEmployees.clear();
        this.updateEmployeeList();
        this.updateAssignButtonState();
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

  private initializeAssignButton(): void {
    // Remove existing listener if it exists
    const existingButton = document.getElementById('assignAuditsButton');
    if (existingButton && this.assignButtonClickHandler) {
      existingButton.removeEventListener('click', this.assignButtonClickHandler);
      this.assignButtonClickHandler = null;
    }

    // Use setTimeout to ensure DOM is fully ready
    setTimeout(() => {
      const assignButton = document.getElementById('assignAuditsButton');
      if (assignButton) {
        // Create the click handler
        this.assignButtonClickHandler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Get fresh state from state manager
          const state = this.stateManager.getState();
          
          // Check if any employees are selected
          if (state.selectedEmployees.size === 0) {
            alert('Please select at least one employee first.');
            return;
          }
          
          this.showAuditorModal();
        };
        
        // Attach the listener
        assignButton.addEventListener('click', this.assignButtonClickHandler);
        
        logInfo('[AssignmentTabRenderer] Assign button initialized successfully');
      } else {
        logError('[AssignmentTabRenderer] Assign button not found in DOM');
      }
    }, 0);
  }

  private initializeAuditorModal(): void {
    let modalContainer = document.getElementById('auditorModalContainer');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'auditorModalContainer';
      document.body.appendChild(modalContainer);
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
      onSelectAllAuditors: () => {
        const state = this.stateManager.getState();
        const auditorsToSelect = state.includeOtherAuditors
          ? [...state.auditors, ...state.otherAuditors]
          : state.auditors;
        auditorsToSelect.forEach(a => {
          this.stateManager.toggleAuditorSelection(a.email, true);
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
      this.updateAssignButtonState();
      
      if (this.config.onAssignmentComplete) {
        this.config.onAssignmentComplete();
      }
    } catch (error) {
      logError('Error assigning audits:', error);
      alert(`Failed to assign audits: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  updateEmployeeList(): void {
    let contentContainer = document.getElementById('employeeListContent');
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
      onEmployeeSelect: (email, selected) => {
        const currentState = this.stateManager.getState();
        const auditCount = currentState.bulkAuditCount > 0 ? currentState.bulkAuditCount : 1;
        this.stateManager.toggleEmployeeSelection(email, selected, auditCount);
        
        // Update button state after selection change
        this.updateAssignButtonState();
        
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      },
      onEmployeeClick: (email) => {
        // Navigate to user profile page
        const profileUrl = `/src/features/audit-distribution/presentation/user-profile-page.html?email=${encodeURIComponent(email)}`;
        window.location.href = profileUrl;
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
    this.updateAuditorModal();
    this.updateAssignButtonState();
  }

  /**
   * Update the visual state of the Create audit button based on selected employees
   */
  private updateAssignButtonState(): void {
    const assignButton = document.getElementById('assignAuditsButton');
    if (!assignButton) return;

    const state = this.stateManager.getState();
    const hasSelectedEmployees = state.selectedEmployees.size > 0;

    // Show/hide button based on selection
    if (hasSelectedEmployees) {
      assignButton.classList.remove('hidden');
    } else {
      assignButton.classList.add('hidden');
      return; // Early return when hidden
    }

    // Remove existing highlight classes
    assignButton.classList.remove(
      'ring-2',
      'ring-primary',
      'ring-offset-2',
      'ring-offset-transparent',
      'shadow-primary/50',
      'shadow-2xl',
      'scale-105',
      'animate-pulse'
    );

    // Add highlight effect when employees are selected
    assignButton.classList.add(
      'ring-2',
      'ring-primary',
      'ring-offset-2',
      'ring-offset-transparent',
      'shadow-primary/50',
      'shadow-2xl',
      'scale-105'
    );
    
    // Add subtle pulse animation (removed after 3 seconds to avoid distraction)
    assignButton.classList.add('animate-pulse');
    setTimeout(() => {
      assignButton.classList.remove('animate-pulse');
    }, 3000);
    
    // Update button text to show count
    const countSpan = assignButton.querySelector('span');
    if (countSpan) {
      const selectedCount = state.selectedEmployees.size;
      countSpan.textContent = selectedCount > 1 
        ? `Create audit (${selectedCount})` 
        : 'Create audit';
    }
  }
}

