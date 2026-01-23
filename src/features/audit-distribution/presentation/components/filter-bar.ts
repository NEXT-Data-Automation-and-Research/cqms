/**
 * Filter Bar Component
 * Compact search bar with icon buttons for filters and selection
 */

import type { Employee, FilterOptions } from '../../domain/types.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { getActiveFilterChips } from './filter-chip-utils.js';
import { getFilterBarHTML } from './filter-bar-template.js';

export interface FilterBarConfig {
  employees: Employee[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export class FilterBar {
  private container: HTMLElement;
  private config: FilterBarConfig;
  private searchInputHandler: ((e: Event) => void) | null = null;
  private searchKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private searchDebounceTimer: number | null = null;

  constructor(container: HTMLElement, config: FilterBarConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  private render(): void {
    // Clean up any pending debounce timer before re-rendering
    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
      this.searchDebounceTimer = null;
    }

    // Remove existing event listeners before replacing HTML
    // Note: safeSetHTML replaces the entire HTML, so old event listeners are automatically removed
    const searchInput = this.container.querySelector('#employeeSearch') as HTMLInputElement;
    if (searchInput) {
      if (this.searchInputHandler) {
        searchInput.removeEventListener('input', this.searchInputHandler);
        this.searchInputHandler = null;
      }
      if (this.searchKeydownHandler) {
        searchInput.removeEventListener('keydown', this.searchKeydownHandler);
        this.searchKeydownHandler = null;
      }
    }

    const { filters, employees } = this.config;
    const activeFilterChips = getActiveFilterChips(filters, employees);
    const hasActiveFilters = activeFilterChips.length > 0;

    const html = getFilterBarHTML(
      filters.search || '',
      activeFilterChips,
      hasActiveFilters,
      false,
      false,
      this.config.employees,
      this.config.filters
    );

    safeSetHTML(this.container, html);

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Search input
    const searchInput = this.container.querySelector('#employeeSearch') as HTMLInputElement;
    if (searchInput) {
      // Remove existing handler if it exists
      if (this.searchInputHandler) {
        searchInput.removeEventListener('input', this.searchInputHandler);
      }

      // Create new handler and store it
      const performSearch = () => {
        // Clear any existing debounce timer
        if (this.searchDebounceTimer !== null) {
          clearTimeout(this.searchDebounceTimer);
        }

        // Debounce the filter update to avoid too many re-renders
        this.searchDebounceTimer = window.setTimeout(() => {
          const searchValue = searchInput.value.trim();
          const filters: FilterOptions = {
            ...this.config.filters,
            search: searchValue || undefined
          };

          // Clean up undefined search value
          if (!searchValue) {
            delete filters.search;
          }

          // Update config immediately to preserve the search value
          this.config.filters = filters;
          
          // Notify parent of filter change
          this.config.onFilterChange(filters);
        }, 150); // 150ms debounce
      };

      this.searchInputHandler = performSearch;
      searchInput.addEventListener('input', this.searchInputHandler);
      
      // Also trigger search on Enter key for immediate results
      this.searchKeydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Clear debounce and perform immediate search
          if (this.searchDebounceTimer !== null) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
          }
          const searchValue = searchInput.value.trim();
          const filters: FilterOptions = {
            ...this.config.filters,
            search: searchValue || undefined
          };
          if (!searchValue) {
            delete filters.search;
          }
          this.config.filters = filters;
          this.config.onFilterChange(filters);
        }
      };
      searchInput.addEventListener('keydown', this.searchKeydownHandler);
    }


    // Remove individual filter chips
    const removeButtons = this.container.querySelectorAll('[data-action="remove-filter"]');
    removeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const key = (btn as HTMLElement).dataset.filterKey;
        
        if (key) {
          // Create new filters object without the removed filter
          const filters: FilterOptions = { ...this.config.filters };
          
          // Explicitly remove the filter by setting to undefined
          if (key === 'groupBy') {
            delete filters.groupBy;
          } else if (key === 'channel') {
            delete filters.channel;
          } else if (key === 'team') {
            delete filters.team;
          } else if (key === 'department') {
            delete filters.department;
          } else if (key === 'country') {
            delete filters.country;
          } else if (key === 'qualitySupervisor') {
            delete filters.qualitySupervisor;
          } else if (key === 'teamSupervisor') {
            delete filters.teamSupervisor;
          }

          // Clean up undefined values
          Object.keys(filters).forEach(k => {
            const filterKey = k as keyof FilterOptions;
            if (filters[filterKey] === undefined || filters[filterKey] === null || filters[filterKey] === '') {
              delete filters[filterKey];
            }
          });

          this.config.onFilterChange(filters);
        }
      });
    });

    // Clear all filters button
    const clearAllBtn = this.container.querySelector('[data-action="clear-filters"]');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        // Preserve search if user wants to keep it, or clear everything
        const emptyFilters: FilterOptions = {
          search: this.config.filters.search // Preserve search
        };
        this.config.onFilterChange(emptyFilters);
        if (searchInput) {
          searchInput.value = this.config.filters.search || '';
        }
      });
    }

  }

  update(config: Partial<FilterBarConfig>): void {
    const previousFilters = { ...this.config.filters };
    const searchInput = this.container.querySelector('#employeeSearch') as HTMLInputElement;
    const isSearchInputFocused = searchInput && document.activeElement === searchInput;
    const currentSearchValue = searchInput?.value || '';
    
    // Update config
    this.config = { ...this.config, ...config };
    
    // Check if only search changed (not other filters)
    const onlySearchChanged = config.filters && 
      JSON.stringify({ ...previousFilters, search: undefined }) === 
      JSON.stringify({ ...config.filters, search: undefined });
    
    // If search input is focused and user is typing, preserve their input
    if (isSearchInputFocused && onlySearchChanged) {
      // Don't update the input value - let the user continue typing
      // Just update the config internally
      if (config.filters && searchInput) {
        // Sync the config with what the user is typing
        this.config.filters.search = currentSearchValue || config.filters.search;
      }
      // Don't re-render or update filter modal when user is actively typing
      return;
    }
    
    // Update search input value if not focused
    if (config.filters && searchInput && !isSearchInputFocused) {
      const newValue = config.filters.search || '';
      if (currentSearchValue !== newValue) {
        searchInput.value = newValue;
      }
    }
    
    // Only re-render if filters changed (not just search) or employees changed
    if (config.employees || (config.filters && !onlySearchChanged)) {
      this.render();
    }
  }
}
