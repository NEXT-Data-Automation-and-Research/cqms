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
import { getActiveFilterChips, escapeHtml } from '../components/filter-chip-utils.js';
import type { Employee } from '../../domain/types.js';
import { getFirstFilterValue } from '../../domain/types.js';

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

  private attachFilterDropdownListeners(container: HTMLElement): void {
    // Filter button toggle
    const addFiltersBtn = container.querySelector('[data-action="toggle-filters"]');
    const filterDropdown = container.querySelector('#filterDropdown') as HTMLElement;
    
    if (addFiltersBtn && filterDropdown) {
      // Remove existing listeners to avoid duplicates
      const newAddFiltersBtn = addFiltersBtn.cloneNode(true) as HTMLElement;
      addFiltersBtn.parentNode?.replaceChild(newAddFiltersBtn, addFiltersBtn);
      
      newAddFiltersBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = filterDropdown.classList.contains('hidden');
        if (isHidden) {
          filterDropdown.classList.remove('hidden');
          // Close dropdown when clicking outside
          const closeOnOutsideClick = (event: MouseEvent) => {
            if (!filterDropdown.contains(event.target as Node) && event.target !== newAddFiltersBtn) {
              filterDropdown.classList.add('hidden');
              document.removeEventListener('click', closeOnOutsideClick);
            }
          };
          setTimeout(() => document.addEventListener('click', closeOnOutsideClick), 0);
        } else {
          filterDropdown.classList.add('hidden');
        }
      });
    }

    // Apply filters button
    const applyFiltersBtn = container.querySelector('[data-action="apply-filters"]');
    if (applyFiltersBtn) {
      // Remove existing listener to avoid duplicates
      const newApplyBtn = applyFiltersBtn.cloneNode(true) as HTMLElement;
      applyFiltersBtn.parentNode?.replaceChild(newApplyBtn, applyFiltersBtn);
      
      newApplyBtn.addEventListener('click', () => {
        const newFilters = { ...this.stateManager.getState().filters };
        
        // Get values from dropdowns
        const groupBy = (container.querySelector('#filterGroupBy') as HTMLSelectElement)?.value;
        const channel = (container.querySelector('#filterChannel') as HTMLSelectElement)?.value;
        const team = (container.querySelector('#filterTeam') as HTMLSelectElement)?.value;
        const department = (container.querySelector('#filterDepartment') as HTMLSelectElement)?.value;
        const country = (container.querySelector('#filterCountry') as HTMLSelectElement)?.value;
        const qualitySupervisor = (container.querySelector('#filterQualitySupervisor') as HTMLSelectElement)?.value;
        const teamSupervisor = (container.querySelector('#filterTeamSupervisor') as HTMLSelectElement)?.value;
        
        // Update filters
        if (groupBy && groupBy !== 'none') {
          newFilters.groupBy = groupBy as any;
        } else {
          delete newFilters.groupBy;
        }
        
        if (channel) {
          newFilters.channel = channel;
        } else {
          delete newFilters.channel;
        }
        
        if (team) {
          newFilters.team = team;
        } else {
          delete newFilters.team;
        }
        
        if (department) {
          newFilters.department = department;
        } else {
          delete newFilters.department;
        }
        
        if (country) {
          newFilters.country = country;
        } else {
          delete newFilters.country;
        }
        
        if (qualitySupervisor) {
          newFilters.qualitySupervisor = qualitySupervisor;
        } else {
          delete newFilters.qualitySupervisor;
        }
        
        if (teamSupervisor) {
          newFilters.teamSupervisor = teamSupervisor;
        } else {
          delete newFilters.teamSupervisor;
        }
        
        // Close dropdown
        if (filterDropdown) {
          filterDropdown.classList.add('hidden');
        }
        
        // Apply filters
        this.stateManager.replaceFilters(newFilters);
        if (this.filterBar) {
          this.filterBar.update({
            employees: this.stateManager.getState().employees,
            filters: newFilters
          });
        }
        this.updateEmployeeList();
        this.updateSelectionActions();
        if (this.config.onEmployeeListUpdate) {
          this.config.onEmployeeListUpdate();
        }
      });
    }
  }

  private getFilterDropdownHTML(): string {
    const state = this.stateManager.getState();
    // Use filteredEmployees to show only options from currently rendered list
    const employeesToUse = state.filteredEmployees.length > 0 ? state.filteredEmployees : state.employees;
    const { filters } = state;
    
    const isValidValue = (val: string | null | undefined): val is string => {
      return Boolean(val && val.trim() !== '' && val.toLowerCase() !== 'null');
    };
    
    const channels = [...new Set(employeesToUse.map(e => e.channel).filter(isValidValue))].sort();
    const teams = [...new Set(employeesToUse.map(e => e.team).filter(isValidValue))].sort();
    const departments = [...new Set(employeesToUse.map(e => e.department).filter(isValidValue))].sort();
    const countries = [...new Set(employeesToUse.map(e => e.country).filter(isValidValue))].sort();
    const qualitySupervisors = [...new Set(employeesToUse.map(e => e.quality_mentor).filter(isValidValue))].sort();
    const teamSupervisors = [...new Set(employeesToUse.map(e => e.team_supervisor).filter(isValidValue))].sort();

    const groupByValue = filters.groupBy || 'none';
    const channelValue = filters.channel || '';
    const teamValue = filters.team || '';
    const departmentValue = filters.department || '';
    const countryValue = filters.country || '';
    const qualitySupervisorValue = filters.qualitySupervisor || '';
    const teamSupervisorValue = filters.teamSupervisor || '';

    return `
      <div id="filterDropdown" class="hidden absolute right-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
        <div class="p-3 space-y-3">
          <!-- Group By -->
          <div>
            <label class="text-[10px] font-semibold text-gray-700 mb-1 block">Group By</label>
            <select id="filterGroupBy" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30">
              <option value="none" ${groupByValue === 'none' ? 'selected' : ''}>None</option>
              <option value="channel" ${groupByValue === 'channel' ? 'selected' : ''}>Channel</option>
              <option value="team" ${groupByValue === 'team' ? 'selected' : ''}>Team</option>
              <option value="quality_mentor" ${groupByValue === 'quality_mentor' ? 'selected' : ''}>Quality Mentor</option>
              <option value="team_supervisor" ${groupByValue === 'team_supervisor' ? 'selected' : ''}>Team Supervisor</option>
              <option value="department" ${groupByValue === 'department' ? 'selected' : ''}>Department</option>
              <option value="country" ${groupByValue === 'country' ? 'selected' : ''}>Country</option>
            </select>
          </div>
          
          <!-- Channel -->
          <div>
            <label class="text-[10px] font-semibold text-gray-700 mb-1 block">Channel</label>
            <select id="filterChannel" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30">
              <option value="">All Channels</option>
              ${channels.map(ch => `<option value="${escapeHtml(ch)}" ${channelValue === ch ? 'selected' : ''}>${escapeHtml(ch)}</option>`).join('')}
            </select>
          </div>
          
          <!-- Team -->
          <div>
            <label class="text-[10px] font-semibold text-gray-700 mb-1 block">Team</label>
            <select id="filterTeam" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30">
              <option value="">All Teams</option>
              ${teams.map(team => `<option value="${escapeHtml(team)}" ${teamValue === team ? 'selected' : ''}>${escapeHtml(team)}</option>`).join('')}
            </select>
          </div>
          
          <!-- Department -->
          <div>
            <label class="text-[10px] font-semibold text-gray-700 mb-1 block">Department</label>
            <select id="filterDepartment" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30">
              <option value="">All Departments</option>
              ${departments.map(dept => `<option value="${escapeHtml(dept)}" ${departmentValue === dept ? 'selected' : ''}>${escapeHtml(dept)}</option>`).join('')}
            </select>
          </div>
          
          <!-- Country -->
          <div>
            <label class="text-[10px] font-semibold text-gray-700 mb-1 block">Country</label>
            <select id="filterCountry" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30">
              <option value="">All Countries</option>
              ${countries.map(country => `<option value="${escapeHtml(country)}" ${countryValue === country ? 'selected' : ''}>${escapeHtml(country)}</option>`).join('')}
            </select>
          </div>
          
          <!-- Quality Mentor -->
          <div>
            <label class="text-[10px] font-semibold text-gray-700 mb-1 block">Quality Mentor</label>
            <select id="filterQualitySupervisor" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30">
              <option value="">All Quality Mentors</option>
              ${qualitySupervisors.map(qs => {
                const emp = state.employees.find(e => e.email === qs);
                const displayName = emp?.name || qs;
                return `<option value="${escapeHtml(qs)}" ${qualitySupervisorValue === qs ? 'selected' : ''}>${escapeHtml(displayName)}</option>`;
              }).join('')}
            </select>
          </div>
          
          <!-- Team Supervisor -->
          <div>
            <label class="text-[10px] font-semibold text-gray-700 mb-1 block">Team Supervisor</label>
            <select id="filterTeamSupervisor" class="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30">
              <option value="">All Team Supervisors</option>
              ${teamSupervisors.map(ts => {
                const emp = state.employees.find(e => e.email === ts);
                const displayName = emp?.name || ts;
                return `<option value="${escapeHtml(ts)}" ${teamSupervisorValue === ts ? 'selected' : ''}>${escapeHtml(displayName)}</option>`;
              }).join('')}
            </select>
          </div>
          
          <!-- Apply Button -->
          <div class="pt-2 border-t border-gray-200">
            <button
              id="applyFiltersBtn"
              class="w-full px-3 py-1.5 text-xs bg-primary text-white rounded-md font-semibold hover:bg-primary-dark transition-all"
              data-action="apply-filters"
              style="background-color: var(--home-primary-500, #1a733e);"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private initializeSelectionActions(): void {
    const container = document.getElementById('selectionActionsContainer');
    if (!container) return;

    const state = this.stateManager.getState();
    const hasSelectedEmployees = state.selectedEmployees.size > 0;
    const activeFilterChips = this.getActiveFilterChips();
    const hasActiveFilters = activeFilterChips.length > 0;

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
        
        <!-- Filter Button with Dropdown -->
        <div class="relative">
          <button
            id="addFiltersButton"
            class="relative px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50 hover:border-primary transition-all font-medium flex items-center gap-1.5"
            title="Add filters"
            data-action="toggle-filters"
            style="color: #4b5563;"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="4" y1="21" x2="4" y2="14"/>
              <line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/>
              <line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/>
              <line x1="9" y1="8" x2="15" y2="8"/>
              <line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            <span>Filters</span>
            ${hasActiveFilters ? `<span class="ml-1 px-1.5 py-0.5 bg-primary rounded-full text-[8px] text-white font-bold leading-none">${activeFilterChips.length}</span>` : ''}
          </button>
          
          <!-- Filter Dropdown -->
          ${this.getFilterDropdownHTML()}
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

    // Attach filter dropdown listeners
    this.attachFilterDropdownListeners(container);
  }

  private updateSelectionActions(): void {
    const container = document.getElementById('selectionActionsContainer');
    if (!container) return;

    const state = this.stateManager.getState();
    const hasSelectedEmployees = state.selectedEmployees.size > 0;
    const activeFilterChips = this.getActiveFilterChips();
    const hasActiveFilters = activeFilterChips.length > 0;

    // Update filter count badge if it exists
    const filterButton = container.querySelector('#addFiltersButton');
    if (filterButton) {
      const badge = filterButton.querySelector('span.bg-primary');
      if (hasActiveFilters) {
        if (!badge) {
          const newBadge = document.createElement('span');
          newBadge.className = 'ml-1 px-1.5 py-0.5 bg-primary rounded-full text-[8px] text-white font-bold leading-none';
          newBadge.textContent = activeFilterChips.length.toString();
          filterButton.appendChild(newBadge);
        } else {
          badge.textContent = activeFilterChips.length.toString();
        }
      } else if (badge) {
        badge.remove();
      }
    }

    // Update filter dropdown options based on filteredEmployees
    this.updateFilterDropdownOptions(container);

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

  private updateFilterDropdownOptions(container: HTMLElement): void {
    const filterDropdown = container.querySelector('#filterDropdown');
    if (!filterDropdown) return;

    const state = this.stateManager.getState();
    // Use filteredEmployees to show only options from currently rendered list
    const employeesToUse = state.filteredEmployees.length > 0 ? state.filteredEmployees : state.employees;
    
    const isValidValue = (val: string | null | undefined): val is string => {
      return Boolean(val && val.trim() !== '' && val.toLowerCase() !== 'null');
    };
    
    // Update each select dropdown with new options
    const updateSelectOptions = (selectId: string, values: string[], currentValue: string, getDisplayName?: (val: string) => string) => {
      const select = filterDropdown.querySelector(`#${selectId}`) as HTMLSelectElement;
      if (!select) return;
      
      const currentSelected = select.value;
      select.innerHTML = '';
      
      // Add "All" option
      const allOption = document.createElement('option');
      allOption.value = '';
      if (selectId === 'filterGroupBy') {
        allOption.textContent = 'None';
      } else if (selectId === 'filterChannel') {
        allOption.textContent = 'All Channels';
      } else if (selectId === 'filterTeam') {
        allOption.textContent = 'All Teams';
      } else if (selectId === 'filterDepartment') {
        allOption.textContent = 'All Departments';
      } else if (selectId === 'filterCountry') {
        allOption.textContent = 'All Countries';
      } else if (selectId === 'filterQualitySupervisor') {
        allOption.textContent = 'All Quality Mentors';
      } else if (selectId === 'filterTeamSupervisor') {
        allOption.textContent = 'All Team Supervisors';
      }
      select.appendChild(allOption);
      
      // Add options for each value
      values.forEach(val => {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = getDisplayName ? getDisplayName(val) : val;
        if (val === currentValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      
      // Restore selection if it still exists
      if (currentSelected && Array.from(select.options).some(opt => opt.value === currentSelected)) {
        select.value = currentSelected;
      } else if (currentValue) {
        select.value = currentValue;
      }
    };
    
    const channels = [...new Set(employeesToUse.map(e => e.channel).filter(isValidValue))].sort();
    const teams = [...new Set(employeesToUse.map(e => e.team).filter(isValidValue))].sort();
    const departments = [...new Set(employeesToUse.map(e => e.department).filter(isValidValue))].sort();
    const countries = [...new Set(employeesToUse.map(e => e.country).filter(isValidValue))].sort();
    const qualitySupervisors = [...new Set(employeesToUse.map(e => e.quality_mentor).filter(isValidValue))].sort();
    const teamSupervisors = [...new Set(employeesToUse.map(e => e.team_supervisor).filter(isValidValue))].sort();
    
    updateSelectOptions('filterChannel', channels, getFirstFilterValue(state.filters.channel));
    updateSelectOptions('filterTeam', teams, getFirstFilterValue(state.filters.team));
    updateSelectOptions('filterDepartment', departments, getFirstFilterValue(state.filters.department));
    updateSelectOptions('filterCountry', countries, getFirstFilterValue(state.filters.country));
    updateSelectOptions('filterQualitySupervisor', qualitySupervisors, state.filters.qualitySupervisor || '', (val) => {
      const emp = state.employees.find(e => e.email === val);
      return emp?.name || val;
    });
    updateSelectOptions('filterTeamSupervisor', teamSupervisors, state.filters.teamSupervisor || '', (val) => {
      const emp = state.employees.find(e => e.email === val);
      return emp?.name || val;
    });
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
      alert(`Failed to assign audits: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

