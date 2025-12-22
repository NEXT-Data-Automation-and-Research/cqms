/**
 * Assignment Tab Renderer
 * Handles rendering and updates for the assignment tab
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { FilterBar } from '../components/filter-bar.js';
import { EmployeeList } from '../components/employee-list.js';
import { AuditorSelectionPanel } from '../components/auditor-selection-panel.js';
import { Pagination } from '../components/pagination.js';
import { PanelManager } from '../managers/panel-manager.js';

export interface AssignmentTabRendererConfig {
  stateManager: AuditDistributionStateManager;
  panelManager: PanelManager;
  onEmployeeListUpdate?: () => void;
  onAuditorPanelUpdate?: () => void;
}

export class AssignmentTabRenderer {
  private stateManager: AuditDistributionStateManager;
  private panelManager: PanelManager;
  private config: AssignmentTabRendererConfig;
  private filterBar: FilterBar | null = null;
  private employeeList: EmployeeList | null = null;
  private auditorPanel: AuditorSelectionPanel | null = null;
  private pagination: Pagination | null = null;

  constructor(config: AssignmentTabRendererConfig) {
    this.stateManager = config.stateManager;
    this.panelManager = config.panelManager;
    this.config = config;
  }

  render(): void {
    this.initializeFilterBar();
    this.initializePagination();
    this.updateEmployeeList();
    this.updateAuditorPanel();
    this.initializeToggleButton();
  }

  private initializeFilterBar(): void {
    const filterBarContainer = document.getElementById('filterBarContainer');
    if (!filterBarContainer) return;

    const state = this.stateManager.getState();

    this.filterBar = new FilterBar(filterBarContainer, {
      employees: state.employees,
      filters: state.filters,
      onFilterChange: (filters) => {
        this.stateManager.setFilters(filters);
        this.updateEmployeeList();
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      },
      onSelectAll: () => {
        // TODO: Implement select all visible
      },
      onDeselectAll: () => {
        state.selectedEmployees.clear();
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

  private initializeToggleButton(): void {
    const toggleButton = document.getElementById('auditorPanelToggle');
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.panelManager.toggle();
      });
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
        const auditCount = state.bulkAuditCount > 0 ? state.bulkAuditCount : 1;
        this.stateManager.toggleEmployeeSelection(email, selected, auditCount);
        this.updateAuditorPanel();
        
        if (selected) {
          this.panelManager.show();
        }
        
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

  updateAuditorPanel(): void {
    const container = document.getElementById('auditorPanelContainer');
    if (!container) return;

    const state = this.stateManager.getState();
    const selectedEmployeeCount = state.selectedEmployees.size;

    if (this.auditorPanel) {
      this.auditorPanel.update({
        auditors: state.auditors,
        otherAuditors: state.otherAuditors,
        includeOtherAuditors: state.includeOtherAuditors,
        selectedAuditors: state.selectedAuditors,
        bulkAuditCount: state.bulkAuditCount,
        selectedEmployeeCount: selectedEmployeeCount
      });
      
      if (selectedEmployeeCount === 0) {
        this.auditorPanel.collapse();
        this.panelManager.hide();
      }
    } else {
      container.style.width = '0px';
      container.style.opacity = '0';
      
      this.auditorPanel = new AuditorSelectionPanel(container, {
        auditors: state.auditors,
        otherAuditors: state.otherAuditors,
        includeOtherAuditors: state.includeOtherAuditors,
        selectedAuditors: state.selectedAuditors,
        bulkAuditCount: state.bulkAuditCount,
        selectedEmployeeCount: selectedEmployeeCount,
        onToggleIncludeOthers: () => {
          this.stateManager.toggleIncludeOtherAuditors();
          this.updateAuditorPanel();
        },
        onAuditorSelect: (email, selected) => {
          this.stateManager.toggleAuditorSelection(email, selected);
          this.updateAuditorPanel();
        },
        onSelectAllAuditors: () => {
          const auditorsToSelect = state.includeOtherAuditors
            ? [...state.auditors, ...state.otherAuditors]
            : state.auditors;
          auditorsToSelect.forEach(a => {
            this.stateManager.toggleAuditorSelection(a.email, true);
          });
          this.updateAuditorPanel();
        },
        onDeselectAllAuditors: () => {
          state.selectedAuditors.clear();
          this.updateAuditorPanel();
        },
        onBulkAuditCountChange: (count) => {
          this.stateManager.setBulkAuditCount(count);
          this.updateAuditorPanel();
        },
        onAssign: () => {
          // TODO: Implement bulk assignment
          console.log('Assign audits');
        }
      });
    }

    if (this.config.onAuditorPanelUpdate) {
      this.config.onAuditorPanelUpdate();
    }
  }

  refresh(): void {
    this.updateEmployeeList();
    this.updateAuditorPanel();
  }
}

