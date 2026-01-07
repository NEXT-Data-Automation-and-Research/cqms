/**
 * Filter Selection Modal Component
 * Simple, working filter modal with native select elements
 */

import type { Employee, FilterOptions } from '../../domain/types.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { getFilterSelectionModalHTML } from './filter-selection-modal-template.js';

export interface FilterSelectionModalConfig {
  employees: Employee[];
  filters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
  onClose: () => void;
}

export class FilterSelectionModal {
  private modal: HTMLElement | null = null;
  private config: FilterSelectionModalConfig;
  private isOpen: boolean = false;
  private currentFilters: FilterOptions = {};

  constructor(config: FilterSelectionModalConfig) {
    this.config = config;
    this.currentFilters = { ...config.filters };
    this.create();
  }

  private create(): void {
    const existingModal = document.getElementById('filterSelectionModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'filterSelectionModal';
    modal.className = `fixed inset-0 z-50 flex items-center justify-center ${this.isOpen ? '' : 'hidden'} transition-opacity duration-300 pointer-events-none`;
    
    const html = getFilterSelectionModalHTML(this.config.employees, this.currentFilters);
    
    safeSetHTML(modal, html);

    document.body.appendChild(modal);
    this.modal = modal;

    // Add styles for select elements in modal
    this.addSelectStyles();

    this.initializeSelects();
    this.attachEventListeners();
  }

  private addSelectStyles(): void {
    if (!this.modal) return;
    
    const styleId = 'filterModalSelectStyles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #filterSelectionModal .filter-modal-content {
        background: rgba(40, 35, 62, 0.95) !important;
        backdrop-filter: blur(20px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      }
      #filterSelectionModal .apply-filters-btn {
        background: linear-gradient(to right, #635BFF, #5a4fe8) !important;
      }
      #filterSelectionModal .apply-filters-btn:hover {
        background: linear-gradient(to right, #5a4fe8, #635BFF) !important;
      }
      #filterSelectionModal .cancel-filter-btn {
        background: rgba(255, 255, 255, 0.05) !important;
      }
      #filterSelectionModal .cancel-filter-btn:hover {
        background: rgba(255, 255, 255, 0.1) !important;
      }
      #filterSelectionModal select {
        background-color: rgba(255, 255, 255, 0.1) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
      }
      #filterSelectionModal select:focus {
        background-color: rgba(255, 255, 255, 0.15) !important;
        border-color: #635BFF !important;
        box-shadow: 0 0 0 2px rgba(99, 91, 255, 0.3) !important;
      }
      #filterSelectionModal select option {
        background-color: rgba(40, 35, 62, 0.95) !important;
        color: white !important;
      }
    `;
    document.head.appendChild(style);
  }

  private initializeSelects(): void {
    const selects = this.modal?.querySelectorAll('select');
    
    selects?.forEach(select => {
      const selectElement = select as HTMLSelectElement;
      const id = selectElement.id;
      
      // Set initial value from currentFilters
      if (id === 'filterGroupBy') {
        selectElement.value = this.currentFilters.groupBy || 'none';
      } else if (id === 'filterChannel') {
        selectElement.value = this.currentFilters.channel || '';
      } else if (id === 'filterTeam') {
        selectElement.value = this.currentFilters.team || '';
      } else if (id === 'filterDepartment') {
        selectElement.value = this.currentFilters.department || '';
      } else if (id === 'filterCountry') {
        selectElement.value = this.currentFilters.country || '';
      } else if (id === 'filterQualitySupervisor') {
        selectElement.value = this.currentFilters.qualitySupervisor || '';
      } else if (id === 'filterTeamSupervisor') {
        selectElement.value = this.currentFilters.teamSupervisor || '';
      }
      
      // Add change listener
      selectElement.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const value = target.value;

        if (id === 'filterGroupBy') {
          this.currentFilters.groupBy = value === 'none' ? undefined : (value as any);
        } else if (id === 'filterChannel') {
          this.currentFilters.channel = value === '' ? undefined : value;
        } else if (id === 'filterTeam') {
          this.currentFilters.team = value === '' ? undefined : value;
        } else if (id === 'filterDepartment') {
          this.currentFilters.department = value === '' ? undefined : value;
        } else if (id === 'filterCountry') {
          this.currentFilters.country = value === '' ? undefined : value;
        } else if (id === 'filterQualitySupervisor') {
          this.currentFilters.qualitySupervisor = value === '' ? undefined : value;
        } else if (id === 'filterTeamSupervisor') {
          this.currentFilters.teamSupervisor = value === '' ? undefined : value;
        }
      });
    });
  }

  private attachEventListeners(): void {
    const closeButtons = this.modal?.querySelectorAll('[data-action="close-modal"]');
    closeButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hide();
      });
    });

    // Backdrop click to close
    const backdrop = this.modal?.querySelector('.filter-modal-backdrop');
    backdrop?.addEventListener('click', () => {
      this.hide();
    });

    const applyBtn = this.modal?.querySelector('[data-action="apply-filters"]');
    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.applyFilters();
      });
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
      }
    };
    document.addEventListener('keydown', handleEscape);
    (this.modal as any).__escapeHandler = handleEscape;
  }

  private applyFilters(): void {
    // Start with existing filters to preserve search
    const filters: FilterOptions = {
      search: this.config.filters.search
    };
    
    // Add all current filter selections (only if they have values)
    if (this.currentFilters.groupBy && this.currentFilters.groupBy !== 'none') {
      filters.groupBy = this.currentFilters.groupBy;
    }
    
    if (this.currentFilters.channel) {
      filters.channel = this.currentFilters.channel;
    }
    
    if (this.currentFilters.team) {
      filters.team = this.currentFilters.team;
    }
    
    if (this.currentFilters.department) {
      filters.department = this.currentFilters.department;
    }
    
    if (this.currentFilters.country) {
      filters.country = this.currentFilters.country;
    }
    
    if (this.currentFilters.qualitySupervisor) {
      filters.qualitySupervisor = this.currentFilters.qualitySupervisor;
    }
    
    if (this.currentFilters.teamSupervisor) {
      filters.teamSupervisor = this.currentFilters.teamSupervisor;
    }

    // Clean up undefined/null/empty values
    Object.keys(filters).forEach(key => {
      const filterKey = key as keyof FilterOptions;
      const value = filters[filterKey];
      if (value === undefined || value === null || value === '') {
        delete filters[filterKey];
      }
    });

    this.config.onApply(filters);
    this.hide();
  }

  show(): void {
    if (!this.modal) {
      this.create();
    }
    if (this.modal) {
      this.currentFilters = { ...this.config.filters };
      this.create();
      
      this.modal.classList.remove('hidden');
      setTimeout(() => {
        this.modal?.classList.add('opacity-100');
        this.modal?.classList.remove('opacity-0');
      }, 10);
      this.isOpen = true;
      document.body.style.overflow = 'hidden';
    }
  }

  hide(): void {
    if (!this.modal) return;
    this.modal.classList.add('opacity-0');
    this.modal.classList.remove('opacity-100');
    setTimeout(() => {
      this.modal?.classList.add('hidden');
      this.isOpen = false;
      document.body.style.overflow = '';
    }, 300);
  }

  update(config: Partial<FilterSelectionModalConfig>): void {
    this.config = { ...this.config, ...config };
    this.currentFilters = { ...this.config.filters };
    this.create();
    if (this.isOpen) {
      this.show();
    }
  }
}
