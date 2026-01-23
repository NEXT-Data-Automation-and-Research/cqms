/**
 * Filter Bar Template
 * HTML template generator for filter bar - compact search bar with icon buttons
 */

import { escapeHtml } from './filter-chip-utils.js';
import type { FilterChip } from './filter-chip-utils.js';

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
