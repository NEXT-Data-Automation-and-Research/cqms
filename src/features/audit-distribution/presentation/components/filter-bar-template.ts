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
  hasDeselectAll: boolean
): string {
  return `
    <div class="filter-bar glass-card rounded-lg px-3 py-2.5 mb-3">
      <!-- First Row: Search and Action Buttons -->
      <div class="flex items-center gap-2 mb-2">
        <!-- Search Bar with Icon -->
        <div class="flex-1 min-w-[300px] max-w-[600px]">
          <div class="relative">
            <div class="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-white/60 pointer-events-none">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              id="employeeSearch"
              class="w-full pl-7 pr-3 py-1.5 text-xs h-7 border border-white/20 rounded-md bg-white/10 backdrop-blur-sm text-white placeholder:text-white/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 focus:bg-white/15 transition-all"
              placeholder="Search by name, email, or department..."
              value="${escapeHtml(searchValue)}"
              autocomplete="off"
            />
          </div>
        </div>

        <!-- Filter Button Icon -->
        <button
          id="addFiltersButton"
          class="relative flex-shrink-0 w-7 h-7 rounded-md border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all flex items-center justify-center"
          title="Add filters"
          data-action="open-filters"
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
          ${hasActiveFilters ? `<span class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full text-[8px] flex items-center justify-center text-white font-bold leading-none">${activeFilterChips.length}</span>` : ''}
        </button>

        <!-- Selection Buttons as Icons -->
        ${hasSelectAll || hasDeselectAll ? `
          <div class="flex gap-1.5 flex-shrink-0">
            ${hasSelectAll ? `
              <button
                id="selectAllButton"
                class="w-7 h-7 rounded-md border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all flex items-center justify-center"
                title="Select all visible employees"
                data-action="select-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
            ` : ''}
            ${hasDeselectAll ? `
              <button
                id="deselectAllButton"
                class="w-7 h-7 rounded-md border border-white/20 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all flex items-center justify-center"
                title="Deselect all employees"
                data-action="deselect-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Second Row: Active Filter Chips -->
      ${hasActiveFilters ? `
        <div class="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-white/10">
          ${activeFilterChips.map(chip => `
            <div class="filter-chip inline-flex items-center gap-1 px-2 py-0.5 h-6 bg-primary/20 border border-primary/30 rounded-full text-[10px] text-white">
              <span class="font-medium text-[10px] leading-none whitespace-nowrap text-white/90">${escapeHtml(chip.label)}:</span>
              <span class="text-white font-medium text-[10px] leading-none whitespace-nowrap">${escapeHtml(chip.value || '')}</span>
              <button
                class="remove-filter-btn ml-0.5 w-3.5 h-3.5 rounded-full hover:bg-white/20 flex items-center justify-center transition-all flex-shrink-0"
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
            class="clear-filter-btn inline-flex items-center justify-center px-2 py-0.5 h-6 bg-primary/20 border border-primary/30 rounded-full text-[10px] text-white font-medium leading-none"
            title="Clear all filters"
            data-action="clear-filters"
          >
            Clear
          </button>
          <style>
            .clear-filter-btn:hover {
              background-color: rgba(99, 91, 255, 0.2) !important;
              border-color: rgba(99, 91, 255, 0.3) !important;
            }
          </style>
        </div>
      ` : ''}
    </div>
  `;
}
