/**
 * Filter Bar Component
 * Reusable filter controls for employee filtering
 */

import type { Employee, FilterOptions } from '../../domain/types.js';
import { CustomDropdown, type DropdownSection } from './custom-dropdown.js';

export interface FilterBarConfig {
  employees: Employee[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export class FilterBar {
  private container: HTMLElement;
  private config: FilterBarConfig;
  private dropdowns: Map<string, CustomDropdown> = new Map();

  constructor(container: HTMLElement, config: FilterBarConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  private render(): void {
    const { employees, filters } = this.config;
    
    const channels = [...new Set(employees.map(e => e.channel).filter((ch): ch is string => Boolean(ch)))].sort();
    const teams = [...new Set(employees.map(e => e.team).filter((t): t is string => Boolean(t)))].sort();
    const departments = [...new Set(employees.map(e => e.department).filter((d): d is string => Boolean(d)))].sort();
    const countries = [...new Set(employees.map(e => e.country).filter((c): c is string => Boolean(c)))].sort();
    const qualitySupervisors = [...new Set(employees.map(e => e.quality_mentor).filter((q): q is string => Boolean(q)))].sort();
    const teamSupervisors = [...new Set(employees.map(e => e.team_supervisor).filter((t): t is string => Boolean(t)))].sort();

    // Check if any filters are active
    const hasActiveFilters = filters.search || filters.groupBy || filters.channel || 
                             filters.team || filters.department || filters.country || 
                             filters.qualitySupervisor || filters.teamSupervisor;

    this.container.innerHTML = `
      <div class="filter-bar glass-card rounded-lg px-4 py-3 mb-4">
        <div class="flex items-center gap-3 flex-wrap">
          <!-- Search Input -->
          <div class="filter-item flex items-center gap-2 flex-shrink-0">
            <div class="filter-label-icon w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div class="flex flex-col">
              <label class="text-[10px] text-white/60 font-medium mb-0.5">Search</label>
              <input
                type="text"
                id="employeeSearch"
                class="filter-input text-sm px-3 py-2 border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder:text-white/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 focus:bg-white/15 transition-all w-48"
                placeholder="Name, email..."
                value="${filters.search || ''}"
              />
            </div>
          </div>

          <!-- Vertical Divider -->
          <div class="h-10 w-px bg-white/10 flex-shrink-0"></div>

          <!-- Group By -->
          <div class="filter-item flex-shrink-0">
            <label class="text-[10px] text-white/60 font-medium mb-1 block">Group By</label>
            <div id="groupByDropdown"></div>
          </div>

          <!-- Vertical Divider -->
          <div class="h-10 w-px bg-white/10 flex-shrink-0"></div>

          <!-- Channel -->
          <div class="filter-item flex-shrink-0">
            <label class="text-[10px] text-white/60 font-medium mb-1 block">Channel</label>
            <div id="channelDropdown"></div>
          </div>

          <!-- Team -->
          <div class="filter-item flex-shrink-0">
            <label class="text-[10px] text-white/60 font-medium mb-1 block">Team</label>
            <div id="teamDropdown"></div>
          </div>

          <!-- Department -->
          <div class="filter-item flex-shrink-0">
            <label class="text-[10px] text-white/60 font-medium mb-1 block">Department</label>
            <div id="departmentDropdown"></div>
          </div>

          <!-- Country -->
          <div class="filter-item flex-shrink-0">
            <label class="text-[10px] text-white/60 font-medium mb-1 block">Country</label>
            <div id="countryDropdown"></div>
          </div>

          <!-- Vertical Divider -->
          <div class="h-10 w-px bg-white/10 flex-shrink-0"></div>

          <!-- Quality Mentor -->
          <div class="filter-item flex-shrink-0">
            <label class="text-[10px] text-white/60 font-medium mb-1 block">Quality Mentor</label>
            <div id="qualitySupervisorDropdown"></div>
          </div>

          <!-- Team Supervisor -->
          <div class="filter-item flex-shrink-0">
            <label class="text-[10px] text-white/60 font-medium mb-1 block">Team Supervisor</label>
            <div id="teamSupervisorDropdown"></div>
          </div>

          <!-- Clear All Button -->
          ${hasActiveFilters ? `
            <div class="flex-shrink-0 ml-auto">
              <button
                id="clearAllFilters"
                class="px-3 py-2 text-xs border border-white/20 rounded-lg bg-white/5 backdrop-blur-sm text-white/80 hover:bg-white/10 hover:border-red-400/50 hover:text-red-400 transition-all flex items-center gap-1.5 font-medium"
                title="Clear all filters"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Clear All
              </button>
            </div>
          ` : ''}

          <!-- Action Buttons -->
          ${this.config.onSelectAll || this.config.onDeselectAll ? `
            <div class="flex gap-2 flex-shrink-0 ${hasActiveFilters ? '' : 'ml-auto'}" style="margin-top: 1.25rem;">
              ${this.config.onSelectAll ? `
                <button
                  class="filter-action-btn px-3 py-2 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all flex items-center gap-1.5 font-medium"
                  onclick="this.dispatchEvent(new CustomEvent('selectAll'))"
                  title="Select all visible employees"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Select All
                </button>
              ` : ''}
              ${this.config.onDeselectAll ? `
                <button
                  class="filter-action-btn px-3 py-2 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all flex items-center gap-1.5 font-medium"
                  onclick="this.dispatchEvent(new CustomEvent('deselectAll'))"
                  title="Deselect all employees"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Deselect
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;

    this.initializeDropdowns();
    this.attachEventListeners();
  }

  private initializeDropdowns(): void {
    const { filters, employees } = this.config;
    
    const channels = [...new Set(employees.map(e => e.channel).filter((ch): ch is string => Boolean(ch)))].sort();
    const teams = [...new Set(employees.map(e => e.team).filter((t): t is string => Boolean(t)))].sort();
    const departments = [...new Set(employees.map(e => e.department).filter((d): d is string => Boolean(d)))].sort();
    const countries = [...new Set(employees.map(e => e.country).filter((c): c is string => Boolean(c)))].sort();
    const qualitySupervisors = [...new Set(employees.map(e => e.quality_mentor).filter((q): q is string => Boolean(q)))].sort();
    const teamSupervisors = [...new Set(employees.map(e => e.team_supervisor).filter((t): t is string => Boolean(t)))].sort();

    // Group By Dropdown
    const groupByContainer = this.container.querySelector('#groupByDropdown') as HTMLElement;
    if (groupByContainer) {
      const groupBySections: DropdownSection[] = [{
        options: [
          { id: 'none', label: 'None', value: 'none' },
          { id: 'channel', label: 'Channel', value: 'channel' },
          { id: 'team', label: 'Team', value: 'team' },
          { id: 'quality_mentor', label: 'Quality Mentor', value: 'quality_mentor' },
          { id: 'team_supervisor', label: 'Team Supervisor', value: 'team_supervisor' },
          { id: 'department', label: 'Department', value: 'department' },
          { id: 'country', label: 'Country', value: 'country' }
        ]
      }];
      
      const groupByDropdown = new CustomDropdown(groupByContainer, {
        id: 'groupBy',
        label: 'Group',
        placeholder: 'None',
        sections: groupBySections,
        selectedValue: filters.groupBy || 'none',
        onSelect: (value) => this.updateFilter('groupBy', value === 'none' ? undefined : value)
      });
      this.dropdowns.set('groupBy', groupByDropdown);
    }

    // Channel Dropdown
    const channelContainer = this.container.querySelector('#channelDropdown') as HTMLElement;
    if (channelContainer) {
      const channelSections: DropdownSection[] = [{
        options: [
          { id: 'all', label: 'All Channels', value: '' },
          ...channels.map(ch => ({ id: ch, label: ch, value: ch }))
        ]
      }];
      
      const channelDropdown = new CustomDropdown(channelContainer, {
        id: 'channel',
        label: 'Channel',
        placeholder: 'Channel',
        sections: channelSections,
        selectedValue: filters.channel || '',
        onSelect: (value) => this.updateFilter('channel', value || undefined)
      });
      this.dropdowns.set('channel', channelDropdown);
    }

    // Team Dropdown
    const teamContainer = this.container.querySelector('#teamDropdown') as HTMLElement;
    if (teamContainer) {
      const teamSections: DropdownSection[] = [{
        options: [
          { id: 'all', label: 'All Teams', value: '' },
          ...teams.map(team => ({ id: team, label: team, value: team }))
        ]
      }];
      
      const teamDropdown = new CustomDropdown(teamContainer, {
        id: 'team',
        label: 'Team',
        placeholder: 'Team',
        sections: teamSections,
        selectedValue: filters.team || '',
        onSelect: (value) => this.updateFilter('team', value || undefined)
      });
      this.dropdowns.set('team', teamDropdown);
    }

    // Department Dropdown
    const departmentContainer = this.container.querySelector('#departmentDropdown') as HTMLElement;
    if (departmentContainer) {
      const departmentSections: DropdownSection[] = [{
        options: [
          { id: 'all', label: 'All Departments', value: '' },
          ...departments.map(dept => ({ id: dept, label: dept, value: dept }))
        ]
      }];
      
      const departmentDropdown = new CustomDropdown(departmentContainer, {
        id: 'department',
        label: 'Department',
        placeholder: 'Department',
        sections: departmentSections,
        selectedValue: filters.department || '',
        onSelect: (value) => this.updateFilter('department', value || undefined)
      });
      this.dropdowns.set('department', departmentDropdown);
    }

    // Country Dropdown
    const countryContainer = this.container.querySelector('#countryDropdown') as HTMLElement;
    if (countryContainer) {
      const countrySections: DropdownSection[] = [{
        options: [
          { id: 'all', label: 'All Countries', value: '' },
          ...countries.map(country => ({ id: country, label: country, value: country }))
        ]
      }];
      
      const countryDropdown = new CustomDropdown(countryContainer, {
        id: 'country',
        label: 'Country',
        placeholder: 'Country',
        sections: countrySections,
        selectedValue: filters.country || '',
        onSelect: (value) => this.updateFilter('country', value || undefined)
      });
      this.dropdowns.set('country', countryDropdown);
    }

    // Quality Supervisor Dropdown
    const qualitySupervisorContainer = this.container.querySelector('#qualitySupervisorDropdown') as HTMLElement;
    if (qualitySupervisorContainer) {
      const qualitySupervisorSections: DropdownSection[] = [{
        options: [
          { id: 'all', label: 'All Mentors', value: '' },
          ...qualitySupervisors.map(qs => ({ id: qs, label: qs, value: qs }))
        ]
      }];
      
      const qualitySupervisorDropdown = new CustomDropdown(qualitySupervisorContainer, {
        id: 'qualitySupervisor',
        label: 'Quality Mentor',
        placeholder: 'Mentor',
        sections: qualitySupervisorSections,
        selectedValue: filters.qualitySupervisor || '',
        onSelect: (value) => this.updateFilter('qualitySupervisor', value || undefined)
      });
      this.dropdowns.set('qualitySupervisor', qualitySupervisorDropdown);
    }

    // Team Supervisor Dropdown
    const teamSupervisorContainer = this.container.querySelector('#teamSupervisorDropdown') as HTMLElement;
    if (teamSupervisorContainer) {
      const teamSupervisorSections: DropdownSection[] = [{
        options: [
          { id: 'all', label: 'All Team Supervisors', value: '' },
          ...teamSupervisors.map(ts => ({ id: ts, label: ts, value: ts }))
        ]
      }];
      
      const teamSupervisorDropdown = new CustomDropdown(teamSupervisorContainer, {
        id: 'teamSupervisor',
        label: 'Team Supervisor',
        placeholder: 'Supervisor',
        sections: teamSupervisorSections,
        selectedValue: filters.teamSupervisor || '',
        onSelect: (value) => this.updateFilter('teamSupervisor', value || undefined)
      });
      this.dropdowns.set('teamSupervisor', teamSupervisorDropdown);
    }
  }

  private updateFilter(key: keyof FilterOptions, value: any): void {
    const filters: FilterOptions = {
      ...this.config.filters,
      [key]: value
    };

    // Remove undefined values
    Object.keys(filters).forEach(k => {
      if (filters[k as keyof FilterOptions] === undefined) {
        delete filters[k as keyof FilterOptions];
      }
    });

    this.config.onFilterChange(filters);
  }

  private attachEventListeners(): void {
    const searchInput = this.container.querySelector('#employeeSearch') as HTMLInputElement;

    const updateFilters = () => {
      const filters: FilterOptions = {
        ...this.config.filters,
        search: searchInput?.value || undefined
      };

      // Remove undefined values
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof FilterOptions] === undefined) {
          delete filters[key as keyof FilterOptions];
        }
      });

      this.config.onFilterChange(filters);
    };

    searchInput?.addEventListener('input', updateFilters);

    // Clear all filters button
    const clearAllBtn = this.container.querySelector('#clearAllFilters');
    clearAllBtn?.addEventListener('click', () => {
      const emptyFilters: FilterOptions = {};
      this.config.onFilterChange(emptyFilters);
      // Update dropdowns
      this.dropdowns.get('groupBy')?.setValue('none');
      this.dropdowns.get('channel')?.setValue('');
      this.dropdowns.get('team')?.setValue('');
      this.dropdowns.get('department')?.setValue('');
      this.dropdowns.get('country')?.setValue('');
      this.dropdowns.get('qualitySupervisor')?.setValue('');
      this.dropdowns.get('teamSupervisor')?.setValue('');
      if (searchInput) {
        searchInput.value = '';
      }
    });

    const selectAllBtn = this.container.querySelector('[onclick*="selectAll"]');
    const deselectAllBtn = this.container.querySelector('[onclick*="deselectAll"]');

    selectAllBtn?.addEventListener('selectAll', () => {
      if (this.config.onSelectAll) {
        this.config.onSelectAll();
      }
    });

    deselectAllBtn?.addEventListener('deselectAll', () => {
      if (this.config.onDeselectAll) {
        this.config.onDeselectAll();
      }
    });
  }

  update(config: Partial<FilterBarConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update dropdown values if filters changed
    if (config.filters) {
      const filters = config.filters;
      this.dropdowns.get('groupBy')?.setValue(filters.groupBy || 'none');
      this.dropdowns.get('channel')?.setValue(filters.channel || '');
      this.dropdowns.get('team')?.setValue(filters.team || '');
      this.dropdowns.get('department')?.setValue(filters.department || '');
      this.dropdowns.get('country')?.setValue(filters.country || '');
      this.dropdowns.get('qualitySupervisor')?.setValue(filters.qualitySupervisor || '');
      this.dropdowns.get('teamSupervisor')?.setValue(filters.teamSupervisor || '');
      
      // Update search input
      const searchInput = this.container.querySelector('#employeeSearch') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = filters.search || '';
      }
      
      // Update clear button visibility
      this.updateClearButtonVisibility();
    }
    
    // If employees changed, re-render to update dropdown options
    if (config.employees) {
      this.render();
    }
  }

  private updateClearButtonVisibility(): void {
    const { filters } = this.config;
    const hasActiveFilters = filters.search || filters.groupBy || filters.channel || 
                             filters.team || filters.department || filters.country || 
                             filters.qualitySupervisor || filters.teamSupervisor;
    
    const clearBtn = this.container.querySelector('#clearAllFilters') as HTMLElement;
    if (clearBtn) {
      if (hasActiveFilters) {
        clearBtn.classList.remove('hidden');
        clearBtn.style.display = '';
      } else {
        clearBtn.classList.add('hidden');
        clearBtn.style.display = 'none';
      }
    } else if (hasActiveFilters) {
      // Button doesn't exist, need to re-render
      this.render();
    }
  }
}

