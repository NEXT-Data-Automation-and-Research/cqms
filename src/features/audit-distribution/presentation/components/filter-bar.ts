/**
 * Filter Bar Component
 * Compact search bar with icon buttons for filters and selection
 */

import type { Employee, FilterOptions } from '../../domain/types.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { getActiveFilterChips } from './filter-chip-utils.js';
import { getFilterBarHTML, getExpandedFilterHTML, getCompactExpandedFilterHTML } from './filter-bar-template.js';

const PEOPLE_MULTI_SELECT_IDS = [
  { id: 'peopleRoleFilter', key: 'role' as keyof FilterOptions },
  { id: 'peopleChannelFilter', key: 'channel' as keyof FilterOptions },
  { id: 'peopleTeamFilter', key: 'team' as keyof FilterOptions },
  { id: 'peopleDepartmentFilter', key: 'department' as keyof FilterOptions },
  { id: 'peopleCountryFilter', key: 'country' as keyof FilterOptions }
];

export interface FilterBarConfig {
  employees: Employee[];
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  expanded?: boolean; // Use expanded layout (full filter row)
  compact?: boolean;   // Use compact single-row search + filters (like Assigned Audits)
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

    const useCompactExpanded = Boolean(this.config.expanded && this.config.compact);
    const html = useCompactExpanded
      ? getCompactExpandedFilterHTML(
          filters.search || '',
          activeFilterChips,
          hasActiveFilters,
          this.config.employees,
          this.config.filters
        )
      : this.config.expanded
      ? getExpandedFilterHTML(
          filters.search || '',
          activeFilterChips,
          hasActiveFilters,
          this.config.employees,
          this.config.filters
        )
      : getFilterBarHTML(
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
          } else if (key === 'role') {
            delete filters.role;
          } else if (key === 'is_active') {
            delete filters.is_active;
          } else if (key === 'groupBy') {
            delete filters.groupBy;
          } else if (key === 'search') {
            delete filters.search;
          }

          // Clean up undefined and empty-array values
          Object.keys(filters).forEach(k => {
            const filterKey = k as keyof FilterOptions;
            const v = filters[filterKey];
            if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
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

    // Multi-select dropdowns (same as audit reports) in expanded layout
    if (this.config.expanded) {
      this.setupPeopleMultiSelectHandlers();
    }

    // Single-select dropdowns in expanded layout (Status, Group By, Quality/Team Supervisor)
    if (this.config.expanded) {
      const filterSelects = [
        { id: 'filterActive', key: 'is_active' as keyof FilterOptions },
        { id: 'filterGroupBy', key: 'groupBy' as keyof FilterOptions },
        { id: 'filterQualitySupervisor', key: 'qualitySupervisor' as keyof FilterOptions },
        { id: 'filterTeamSupervisor', key: 'teamSupervisor' as keyof FilterOptions }
      ];

      filterSelects.forEach(({ id, key }) => {
        const select = this.container.querySelector(`#${id}`) as HTMLSelectElement;
        if (select) {
          select.addEventListener('change', () => {
            let value: string | undefined = select.value.trim();
            if (key === 'is_active' && value === 'all') value = undefined;
            else if (key === 'groupBy' && value === 'none') value = undefined;
            const filters: FilterOptions = { ...this.config.filters, [key]: value || undefined };
            if (!value) delete filters[key];
            this.config.onFilterChange(filters);
          });
        }
      });
    }
  }

  private setupPeopleMultiSelectHandlers(): void {
    const container = this.container;

    const getSelectedValues = (filterId: string): string[] => {
      const optionsEl = container.querySelector(`#${filterId}Options`);
      if (!optionsEl) return [];
      const checked = optionsEl.querySelectorAll<HTMLInputElement>('.multi-select-option input[type="checkbox"]:not([disabled])');
      return Array.from(checked).filter(cb => cb.checked).map(cb => cb.value);
    };

    const updateTriggerDisplay = (filterId: string, selectedValues: string[]): void => {
      const trigger = container.querySelector(`#${filterId}Trigger`);
      const placeholder = trigger?.querySelector('.multi-select-placeholder');
      const countEl = trigger?.querySelector('.multi-select-count');
      const placeholderText = trigger?.getAttribute('data-placeholder') || '';
      if (placeholder) {
        (placeholder as HTMLElement).textContent = selectedValues.length > 0 ? `${selectedValues.length} selected` : placeholderText;
      }
      if (countEl) {
        (countEl as HTMLElement).textContent = String(selectedValues.length);
        (countEl as HTMLElement).style.display = selectedValues.length > 0 ? 'inline' : 'none';
      }
      trigger?.classList.toggle('active', selectedValues.length > 0);
    };

    const notifyFilterChange = (filterId: string, selectedValues: string[]): void => {
      const mapping = PEOPLE_MULTI_SELECT_IDS.find(m => m.id === filterId);
      if (!mapping) return;
      const filters: FilterOptions = { ...this.config.filters };
      if (selectedValues.length === 0) {
        delete filters[mapping.key];
      } else {
        (filters as any)[mapping.key] = selectedValues;
      }
      this.config.onFilterChange(filters);
    };

    const closeAllMultiSelect = (): void => {
      container.querySelectorAll('.multi-select-container.multi-select-open').forEach(el => el.classList.remove('multi-select-open'));
      container.querySelectorAll('.multi-select-dropdown').forEach(el => ((el as HTMLElement).style.display = 'none'));
    };

    PEOPLE_MULTI_SELECT_IDS.forEach(({ id: filterId }) => {
      const wrapper = container.querySelector(`[data-people-filter-id="${filterId}"]`);
      if (!wrapper) return;

      const trigger = container.querySelector(`#${filterId}Trigger`);
      const dropdown = container.querySelector(`#${filterId}Dropdown`);
      const optionsEl = container.querySelector(`#${filterId}Options`);
      const searchInput = container.querySelector(`#${filterId}Search`) as HTMLInputElement;

      trigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = (wrapper as HTMLElement).classList.toggle('multi-select-open');
        (dropdown as HTMLElement).style.display = isOpen ? 'flex' : 'none';
        if (isOpen) {
          container.querySelectorAll('.multi-select-container').forEach(c => {
            if (c !== wrapper) {
              c.classList.remove('multi-select-open');
              const dd = c.querySelector('.multi-select-dropdown') as HTMLElement;
              if (dd) dd.style.display = 'none';
            }
          });
          if (searchInput) {
            searchInput.value = '';
            optionsEl?.querySelectorAll('.multi-select-option').forEach(o => o.classList.remove('hidden'));
          }
        }
      });

      optionsEl?.addEventListener('change', (e) => {
        const target = (e.target as HTMLElement).closest('input[type="checkbox"]');
        if (!target || (target as HTMLInputElement).getAttribute('data-multi-select-id') !== filterId) return;
        const selected = getSelectedValues(filterId);
        updateTriggerDisplay(filterId, selected);
        notifyFilterChange(filterId, selected);
      });

      container.querySelectorAll(`[data-action="select-all"][data-multi-select-id="${filterId}"]`).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          optionsEl?.querySelectorAll<HTMLInputElement>('.multi-select-option input[type="checkbox"]').forEach(cb => { cb.checked = true; });
          const selected = getSelectedValues(filterId);
          updateTriggerDisplay(filterId, selected);
          notifyFilterChange(filterId, selected);
        });
      });

      container.querySelectorAll(`[data-action="clear"][data-multi-select-id="${filterId}"]`).forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          optionsEl?.querySelectorAll<HTMLInputElement>('.multi-select-option input[type="checkbox"]').forEach(cb => { cb.checked = false; });
          updateTriggerDisplay(filterId, []);
          notifyFilterChange(filterId, []);
        });
      });

      if (searchInput) {
        searchInput.addEventListener('input', () => {
          const q = searchInput.value.toLowerCase().trim();
          optionsEl?.querySelectorAll('.multi-select-option').forEach(opt => {
            const val = (opt.getAttribute('data-value') || '').toLowerCase();
            (opt as HTMLElement).classList.toggle('hidden', q !== '' && !val.includes(q));
          });
        });
        searchInput.addEventListener('click', (e) => e.stopPropagation());
      }
    });

    document.addEventListener('click', function closeOnOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (container.contains(target)) return;
      closeAllMultiSelect();
    });
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
