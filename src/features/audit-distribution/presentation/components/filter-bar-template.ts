/**
 * Filter Bar Template
 * HTML template generator for filter bar - compact search bar with icon buttons
 */

import { escapeHtml } from './filter-chip-utils.js';
import type { FilterChip } from './filter-chip-utils.js';
import { createPeopleMultiSelectHTML } from './people-multi-select.js';
import { filterValuesToArray } from '../../domain/types.js';

/**
 * Get compact expanded filter HTML: single row search + multi-select dropdowns (same as audit reports)
 */
export function getCompactExpandedFilterHTML(
  searchValue: string,
  activeFilterChips: FilterChip[],
  hasActiveFilters: boolean,
  employees: any[] = [],
  currentFilters: any = {}
): string {
  const isValidValue = (val: string | null | undefined): val is string => {
    return Boolean(val && val.trim() !== '' && val.toLowerCase() !== 'null');
  };
  const channels = [...new Set(employees.map((e: any) => e.channel).filter(isValidValue))].sort();
  const teams = [...new Set(employees.map((e: any) => e.team).filter(isValidValue))].sort();
  const departments = [...new Set(employees.map((e: any) => e.department).filter(isValidValue))].sort();
  const countries = [...new Set(employees.map((e: any) => e.country).filter(isValidValue))].sort();
  const roles = [...new Set(employees.map((e: any) => e.designation || e.role).filter(isValidValue))].sort();
  const roleSelected = filterValuesToArray(currentFilters.role);
  const channelSelected = filterValuesToArray(currentFilters.channel);
  const teamSelected = filterValuesToArray(currentFilters.team);
  const departmentSelected = filterValuesToArray(currentFilters.department);
  const countrySelected = filterValuesToArray(currentFilters.country);
  const isActiveValue = (currentFilters.is_active as 'all' | 'active' | 'inactive') || 'all';
  const groupByValue = (currentFilters.groupBy as string) || 'none';
  const qualitySupervisorValue = (currentFilters.qualitySupervisor as string) || '';
  const teamSupervisorValue = (currentFilters.teamSupervisor as string) || '';
  const qualitySupervisors = [...new Set(employees.map((e: any) => e.quality_mentor).filter(isValidValue))].sort();
  const teamSupervisors = [...new Set(employees.map((e: any) => e.team_supervisor).filter(isValidValue))].sort();

  const roleMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleRoleFilter',
    label: 'Role',
    placeholder: 'Role',
    values: roles,
    selectedValues: roleSelected,
    compact: true
  });
  const channelMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleChannelFilter',
    label: 'Channel',
    placeholder: 'Channel',
    values: channels,
    selectedValues: channelSelected,
    compact: true
  });
  const teamMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleTeamFilter',
    label: 'Team',
    placeholder: 'Team',
    values: teams,
    selectedValues: teamSelected,
    compact: true
  });
  const deptMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleDepartmentFilter',
    label: 'Dept',
    placeholder: 'Dept',
    values: departments,
    selectedValues: departmentSelected,
    compact: true
  });
  const countryMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleCountryFilter',
    label: 'Country',
    placeholder: 'Country',
    values: countries,
    selectedValues: countrySelected,
    compact: true
  });

  return `
    <div class="people-filter-block flex flex-col gap-3">
      <div class="people-filter-row flex flex-wrap items-end gap-3">
        <div class="people-search-cell min-w-[180px] max-w-[240px] flex flex-col gap-0.5">
          <label for="employeeSearch" class="block text-xs font-medium text-gray-600">Search</label>
          <div class="relative">
            <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </div>
            <input
              type="text"
              id="employeeSearch"
              class="people-filter-input w-full pl-8 pr-2.5 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search name, email..."
              value="${escapeHtml(searchValue)}"
              autocomplete="off"
            />
          </div>
        </div>
        ${roleMultiSelect}
        ${channelMultiSelect}
        ${teamMultiSelect}
        ${deptMultiSelect}
        ${countryMultiSelect}
        <div class="people-status-cell flex flex-col gap-0.5 min-w-0">
          <label for="filterActive" class="block text-xs font-medium text-gray-600">Status</label>
          <select id="filterActive" class="people-filter-input text-sm border border-gray-300 rounded-lg px-2.5 py-2 h-9 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0">
            <option value="all" ${isActiveValue === 'all' ? 'selected' : ''}>All</option>
            <option value="active" ${isActiveValue === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${isActiveValue === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="people-status-cell flex flex-col gap-0.5 min-w-0">
          <label for="filterGroupBy" class="block text-xs font-medium text-gray-600">Group by</label>
          <select id="filterGroupBy" class="people-filter-input text-sm border border-gray-300 rounded-lg px-2.5 py-2 h-9 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0">
            <option value="none" ${groupByValue === 'none' ? 'selected' : ''}>None</option>
            <option value="channel" ${groupByValue === 'channel' ? 'selected' : ''}>Channel</option>
            <option value="team" ${groupByValue === 'team' ? 'selected' : ''}>Team</option>
            <option value="quality_mentor" ${groupByValue === 'quality_mentor' ? 'selected' : ''}>Quality Mentor</option>
            <option value="team_supervisor" ${groupByValue === 'team_supervisor' ? 'selected' : ''}>Team Supervisor</option>
            <option value="department" ${groupByValue === 'department' ? 'selected' : ''}>Department</option>
            <option value="country" ${groupByValue === 'country' ? 'selected' : ''}>Country</option>
          </select>
        </div>
        <div class="people-status-cell flex flex-col gap-0.5 min-w-0">
          <label for="filterQualitySupervisor" class="block text-xs font-medium text-gray-600">Quality Mentor</label>
          <select id="filterQualitySupervisor" class="people-filter-input text-sm border border-gray-300 rounded-lg px-2.5 py-2 h-9 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0">
            <option value="">All</option>
            ${qualitySupervisors.map((qs: string) => {
              const emp = employees.find((e: any) => e.email === qs);
              const displayName = emp?.name || qs;
              return `<option value="${escapeHtml(qs)}" ${qualitySupervisorValue === qs ? 'selected' : ''}>${escapeHtml(displayName)}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="people-status-cell flex flex-col gap-0.5 min-w-0">
          <label for="filterTeamSupervisor" class="block text-xs font-medium text-gray-600">Team Supervisor</label>
          <select id="filterTeamSupervisor" class="people-filter-input text-sm border border-gray-300 rounded-lg px-2.5 py-2 h-9 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 min-w-0">
            <option value="">All</option>
            ${teamSupervisors.map((ts: string) => {
              const emp = employees.find((e: any) => e.email === ts);
              const displayName = emp?.name || ts;
              return `<option value="${escapeHtml(ts)}" ${teamSupervisorValue === ts ? 'selected' : ''}>${escapeHtml(displayName)}</option>`;
            }).join('')}
          </select>
        </div>
        ${hasActiveFilters ? `
          <button type="button" class="people-filter-clear px-3 py-2 h-9 text-sm bg-red-100 text-red-700 rounded-lg border border-red-200 font-medium hover:bg-red-200/80" data-action="clear-filters" title="Clear all">Clear</button>
        ` : ''}
      </div>
      ${hasActiveFilters ? `
        <div class="flex items-center gap-2 flex-wrap">
          ${activeFilterChips.map(chip => `
            <div class="filter-chip inline-flex items-center gap-1 px-2 py-0.5 h-5 bg-primary/10 border border-primary/30 rounded text-[10px] text-gray-900">
              <span class="font-medium whitespace-nowrap">${escapeHtml(chip.label)}:</span>
              <span class="whitespace-nowrap">${escapeHtml(chip.value || '')}</span>
              <button class="remove-filter-btn w-3 h-3 rounded hover:bg-gray-200 flex items-center justify-center flex-shrink-0 text-gray-700" data-filter-key="${escapeHtml(chip.key)}" data-action="remove-filter" title="Remove">×</button>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Get expanded filter HTML matching AI Audit style
 * Full-width search bar and grid of filter dropdowns
 */
export function getExpandedFilterHTML(
  searchValue: string,
  activeFilterChips: FilterChip[],
  hasActiveFilters: boolean,
  employees: any[] = [],
  currentFilters: any = {}
): string {
  const isValidValue = (val: string | null | undefined): val is string => {
    return Boolean(val && val.trim() !== '' && val.toLowerCase() !== 'null');
  };
  
  const channels = [...new Set(employees.map((e: any) => e.channel).filter(isValidValue))].sort();
  const teams = [...new Set(employees.map((e: any) => e.team).filter(isValidValue))].sort();
  const departments = [...new Set(employees.map((e: any) => e.department).filter(isValidValue))].sort();
  const countries = [...new Set(employees.map((e: any) => e.country).filter(isValidValue))].sort();
  const roles = [...new Set(employees.map((e: any) => e.designation || e.role).filter(isValidValue))].sort();
  const qualitySupervisors = [...new Set(employees.map((e: any) => e.quality_mentor).filter(isValidValue))].sort();
  const teamSupervisors = [...new Set(employees.map((e: any) => e.team_supervisor).filter(isValidValue))].sort();

  const roleSelected = filterValuesToArray(currentFilters.role);
  const channelSelected = filterValuesToArray(currentFilters.channel);
  const teamSelected = filterValuesToArray(currentFilters.team);
  const departmentSelected = filterValuesToArray(currentFilters.department);
  const countrySelected = filterValuesToArray(currentFilters.country);
  const isActiveValue = (currentFilters.is_active as 'all' | 'active' | 'inactive') || 'all';
  const groupByValue = currentFilters.groupBy || 'none';
  const qualitySupervisorValue = currentFilters.qualitySupervisor || '';
  const teamSupervisorValue = currentFilters.teamSupervisor || '';

  const roleMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleRoleFilter',
    label: 'Role',
    placeholder: 'All Roles',
    values: roles,
    selectedValues: roleSelected,
    compact: false
  });
  const channelMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleChannelFilter',
    label: 'Channel',
    placeholder: 'All Channels',
    values: channels,
    selectedValues: channelSelected,
    compact: false
  });
  const teamMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleTeamFilter',
    label: 'Team',
    placeholder: 'All Teams',
    values: teams,
    selectedValues: teamSelected,
    compact: false
  });
  const deptMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleDepartmentFilter',
    label: 'Department',
    placeholder: 'All Departments',
    values: departments,
    selectedValues: departmentSelected,
    compact: false
  });
  const countryMultiSelect = createPeopleMultiSelectHTML({
    id: 'peopleCountryFilter',
    label: 'Country',
    placeholder: 'All Countries',
    values: countries,
    selectedValues: countrySelected,
    compact: false
  });

  return `
    <!-- Search and Filters -->
    <div class="space-y-4">
      <!-- Search Bar -->
      <div class="relative">
        <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <input
          type="text"
          id="employeeSearch"
          class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          placeholder="Search by name, email, department, team, channel..."
          value="${escapeHtml(searchValue)}"
          autocomplete="off"
        />
      </div>

      <!-- Filter Row - multi-select same as audit reports -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        ${roleMultiSelect}
        ${channelMultiSelect}
        ${teamMultiSelect}
        ${deptMultiSelect}
        ${countryMultiSelect}
        <div>
          <label for="filterActive" class="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            id="filterActive"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          >
            <option value="all" ${isActiveValue === 'all' ? 'selected' : ''}>All Status</option>
            <option value="active" ${isActiveValue === 'active' ? 'selected' : ''}>Active Only</option>
            <option value="inactive" ${isActiveValue === 'inactive' ? 'selected' : ''}>Inactive Only</option>
          </select>
        </div>
      </div>

      <!-- Additional Filter Row -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <!-- Group By Filter -->
        <select
          id="filterGroupBy"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="none" ${groupByValue === 'none' ? 'selected' : ''}>No Grouping</option>
          <option value="channel" ${groupByValue === 'channel' ? 'selected' : ''}>Group by Channel</option>
          <option value="team" ${groupByValue === 'team' ? 'selected' : ''}>Group by Team</option>
          <option value="quality_mentor" ${groupByValue === 'quality_mentor' ? 'selected' : ''}>Group by Quality Mentor</option>
          <option value="team_supervisor" ${groupByValue === 'team_supervisor' ? 'selected' : ''}>Group by Team Supervisor</option>
          <option value="department" ${groupByValue === 'department' ? 'selected' : ''}>Group by Department</option>
          <option value="country" ${groupByValue === 'country' ? 'selected' : ''}>Group by Country</option>
        </select>

        <!-- Quality Supervisor Filter -->
        <select
          id="filterQualitySupervisor"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All Quality Supervisors</option>
          ${qualitySupervisors.map(supervisor => `
            <option value="${escapeHtml(supervisor)}" ${qualitySupervisorValue === supervisor ? 'selected' : ''}>${escapeHtml(supervisor)}</option>
          `).join('')}
        </select>

        <!-- Team Supervisor Filter -->
        <select
          id="filterTeamSupervisor"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All Team Supervisors</option>
          ${teamSupervisors.map(supervisor => `
            <option value="${escapeHtml(supervisor)}" ${teamSupervisorValue === supervisor ? 'selected' : ''}>${escapeHtml(supervisor)}</option>
          `).join('')}
        </select>
      </div>

      <!-- Active Filter Chips -->
      ${hasActiveFilters ? `
        <div class="bg-primary/10 border border-primary/20 rounded-md px-4 py-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm font-medium text-primary">Active Filters:</span>
            ${activeFilterChips.map(chip => `
              <div class="filter-chip inline-flex items-center gap-1 px-2 py-1 bg-white border border-primary/30 rounded-full text-xs text-gray-900">
                <span class="font-medium text-xs leading-none whitespace-nowrap">${escapeHtml(chip.label)}:</span>
                <span class="text-gray-900 font-medium text-xs leading-none whitespace-nowrap">${escapeHtml(chip.value || '')}</span>
                <button
                  class="remove-filter-btn ml-0.5 w-4 h-4 rounded-full hover:bg-gray-200 flex items-center justify-center transition-all flex-shrink-0 text-gray-700"
                  data-filter-key="${escapeHtml(chip.key)}"
                  data-filter-type="${chip.type}"
                  title="Remove filter"
                  data-action="remove-filter"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            `).join('')}
            <button
              id="clearAllFilters"
              class="clear-filter-btn inline-flex items-center justify-center px-3 py-1 bg-white border border-primary/30 rounded-md text-xs text-gray-900 font-medium leading-none hover:bg-gray-50 transition-colors"
              title="Clear all filters"
              data-action="clear-filters"
            >
              Clear All
            </button>
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

export function getFilterBarHTML(
  searchValue: string,
  activeFilterChips: FilterChip[],
  hasActiveFilters: boolean,
  hasSelectAll: boolean,
  hasDeselectAll: boolean,
  employees: any[] = [],
  currentFilters: any = {}
): string {
  const isValidValue = (val: string | null | undefined): val is string => {
    return Boolean(val && val.trim() !== '' && val.toLowerCase() !== 'null');
  };
  
  const channels = [...new Set(employees.map((e: any) => e.channel).filter(isValidValue))].sort();
  const teams = [...new Set(employees.map((e: any) => e.team).filter(isValidValue))].sort();
  const departments = [...new Set(employees.map((e: any) => e.department).filter(isValidValue))].sort();
  const countries = [...new Set(employees.map((e: any) => e.country).filter(isValidValue))].sort();
  const roles = [...new Set(employees.map((e: any) => e.designation || e.role).filter(isValidValue))].sort();
  const qualitySupervisors = [...new Set(employees.map((e: any) => e.quality_mentor).filter(isValidValue))].sort();
  const teamSupervisors = [...new Set(employees.map((e: any) => e.team_supervisor).filter(isValidValue))].sort();

  const groupByValue = currentFilters.groupBy || 'none';
  const channelValue = currentFilters.channel || '';
  const teamValue = currentFilters.team || '';
  const departmentValue = currentFilters.department || '';
  const countryValue = currentFilters.country || '';
  const qualitySupervisorValue = currentFilters.qualitySupervisor || '';
  const teamSupervisorValue = currentFilters.teamSupervisor || '';

  return `
    <div class="filter-bar">
      <!-- Search Bar -->
      <div class="flex items-center gap-2">
        <!-- Search Bar with Icon -->
        <div class="min-w-[200px] max-w-[300px]">
          <div class="relative">
            <div class="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" style="color: #4b5563;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              id="employeeSearch"
              class="w-full pl-7 pr-3 py-1.5 text-xs h-7 border border-gray-300 rounded-md bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
              placeholder="Search by name, email, department, team, channel..."
              value="${escapeHtml(searchValue)}"
              autocomplete="off"
            />
          </div>
        </div>
      </div>

      <!-- Active Filter Chips -->
      ${hasActiveFilters ? `
        <div class="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-gray-200">
          ${activeFilterChips.map(chip => `
            <div class="filter-chip inline-flex items-center gap-1 px-2 py-0.5 h-6 bg-primary/10 border border-primary/30 rounded-full text-[10px] text-gray-900">
              <span class="font-medium text-[10px] leading-none whitespace-nowrap">${escapeHtml(chip.label)}:</span>
              <span class="text-gray-900 font-medium text-[10px] leading-none whitespace-nowrap">${escapeHtml(chip.value || '')}</span>
              <button
                class="remove-filter-btn ml-0.5 w-3.5 h-3.5 rounded-full hover:bg-gray-200 flex items-center justify-center transition-all flex-shrink-0 text-gray-700"
                data-filter-key="${escapeHtml(chip.key)}"
                data-filter-type="${chip.type}"
                title="Remove filter"
                data-action="remove-filter"
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          `).join('')}
          <button
            id="clearAllFilters"
            class="clear-filter-btn inline-flex items-center justify-center px-2 py-0.5 h-6 bg-primary/10 border border-primary/30 rounded-full text-[10px] text-gray-900 font-medium leading-none hover:bg-primary/20"
            title="Clear all filters"
            data-action="clear-filters"
          >
            Clear
          </button>
        </div>
      ` : ''}
    </div>
  `;
}
