/**
 * Filter Bar Template
 * HTML template generator for filter bar - compact search bar with icon buttons
 */

import { escapeHtml } from './filter-chip-utils.js';
import type { FilterChip } from './filter-chip-utils.js';

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

  const channelValue = currentFilters.channel || '';
  const teamValue = currentFilters.team || '';
  const departmentValue = currentFilters.department || '';
  const countryValue = currentFilters.country || '';
  const roleValue = currentFilters.role || '';
  const isActiveValue = (currentFilters.is_active as 'all' | 'active' | 'inactive') || 'all';
  const groupByValue = currentFilters.groupBy || 'none';
  const qualitySupervisorValue = currentFilters.qualitySupervisor || '';
  const teamSupervisorValue = currentFilters.teamSupervisor || '';

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

      <!-- Filter Row -->
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <!-- Role Filter -->
        <select
          id="filterRole"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All Roles</option>
          ${roles.map(role => `
            <option value="${escapeHtml(role)}" ${roleValue === role ? 'selected' : ''}>${escapeHtml(role)}</option>
          `).join('')}
        </select>

        <!-- Channel Filter -->
        <select
          id="filterChannel"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All Channels</option>
          ${channels.map(channel => `
            <option value="${escapeHtml(channel)}" ${channelValue === channel ? 'selected' : ''}>${escapeHtml(channel)}</option>
          `).join('')}
        </select>

        <!-- Team Filter -->
        <select
          id="filterTeam"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All Teams</option>
          ${teams.map(team => `
            <option value="${escapeHtml(team)}" ${teamValue === team ? 'selected' : ''}>${escapeHtml(team)}</option>
          `).join('')}
        </select>

        <!-- Department Filter -->
        <select
          id="filterDepartment"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All Departments</option>
          ${departments.map(dept => `
            <option value="${escapeHtml(dept)}" ${departmentValue === dept ? 'selected' : ''}>${escapeHtml(dept)}</option>
          `).join('')}
        </select>

        <!-- Country Filter -->
        <select
          id="filterCountry"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="">All Countries</option>
          ${countries.map(country => `
            <option value="${escapeHtml(country)}" ${countryValue === country ? 'selected' : ''}>${escapeHtml(country)}</option>
          `).join('')}
        </select>

        <!-- Active Status Filter -->
        <select
          id="filterActive"
          class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
        >
          <option value="all" ${isActiveValue === 'all' ? 'selected' : ''}>All Status</option>
          <option value="active" ${isActiveValue === 'active' ? 'selected' : ''}>Active Only</option>
          <option value="inactive" ${isActiveValue === 'inactive' ? 'selected' : ''}>Inactive Only</option>
        </select>
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
