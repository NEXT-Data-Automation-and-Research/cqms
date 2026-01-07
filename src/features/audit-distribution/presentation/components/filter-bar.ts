/**
 * Filter Bar Component
 * Compact search bar with icon buttons for filters and selection
 */

import type { Employee, FilterOptions } from '../../domain/types.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { FilterSelectionModal } from './filter-selection-modal.js';
import { getActiveFilterChips } from './filter-chip-utils.js';
import { getFilterBarHTML } from './filter-bar-template.js';

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
  private filterModal: FilterSelectionModal | null = null;
  private searchInputHandler: ((e: Event) => void) | null = null;
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
    const searchInput = this.container.querySelector('#employeeSearch') as HTMLInputElement;
    if (searchInput && this.searchInputHandler) {
      searchInput.removeEventListener('input', this.searchInputHandler);
      this.searchInputHandler = null;
    }

    const { filters, employees } = this.config;
    const activeFilterChips = getActiveFilterChips(filters, employees);
    const hasActiveFilters = activeFilterChips.length > 0;

    const html = getFilterBarHTML(
      filters.search || '',
      activeFilterChips,
      hasActiveFilters,
      !!this.config.onSelectAll,
      !!this.config.onDeselectAll
    );

    safeSetHTML(this.container, html);

    this.attachEventListeners();
    this.initializeFilterModal();
  }

  private initializeFilterModal(): void {
    this.filterModal = new FilterSelectionModal({
      employees: this.config.employees,
      filters: this.config.filters,
      onApply: (filters) => {
        this.config.onFilterChange(filters);
      },
      onClose: () => {
        this.filterModal?.hide();
      }
    });
  }

  private updateFilterModal(): void {
    if (this.filterModal) {
      this.filterModal.update({
        employees: this.config.employees,
        filters: this.config.filters
      });
    }
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
      this.searchInputHandler = () => {
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

      searchInput.addEventListener('input', this.searchInputHandler);
    }

    // Open filter modal
    const addFiltersBtn = this.container.querySelector('[data-action="open-filters"]');
    if (addFiltersBtn) {
      addFiltersBtn.addEventListener('click', () => {
        if (this.filterModal) {
          this.filterModal.update({
            employees: this.config.employees,
            filters: this.config.filters
          });
          this.filterModal.show();
        }
      });
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

    // Select All button
    const selectAllBtn = this.container.querySelector('[data-action="select-all"]');
    if (selectAllBtn && this.config.onSelectAll) {
      selectAllBtn.addEventListener('click', () => {
        if (this.config.onSelectAll) {
          this.config.onSelectAll();
        }
      });
    }

    // Deselect All button
    const deselectAllBtn = this.container.querySelector('[data-action="deselect-all"]');
    if (deselectAllBtn && this.config.onDeselectAll) {
      deselectAllBtn.addEventListener('click', () => {
        if (this.config.onDeselectAll) {
          this.config.onDeselectAll();
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
      // Update filter modal with new config
      this.updateFilterModal();
    } else if (config.filters && onlySearchChanged && !isSearchInputFocused) {
      // Just update filter modal, don't re-render (only if input is not focused)
      this.updateFilterModal();
    }
  }
}
