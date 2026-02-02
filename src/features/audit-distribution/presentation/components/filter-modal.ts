/**
 * Filter Modal Component
 * Modal for selecting multiple filters - redesigned to match design system
 */

import type { Employee, FilterOptions } from '../../domain/types.js';
import { getFirstFilterValue } from '../../domain/types.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import {
  createGroupByDropdown,
  createSimpleDropdown,
  createSupervisorDropdown
} from './filter-modal-dropdowns.js';
import { getFilterModalHTML } from './filter-modal-template.js';

export interface FilterModalConfig {
  employees: Employee[];
  filters: FilterOptions;
  onApply: (filters: FilterOptions) => void;
  onClose: () => void;
}

export class FilterModal {
  private modal: HTMLElement | null = null;
  private dropdowns: Map<string, any> = new Map();
  private config: FilterModalConfig;
  private isOpen: boolean = false;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(config: FilterModalConfig) {
    this.config = config;
    this.create();
  }

  private create(): void {
    const existingModal = document.getElementById('filterModal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'filterModal';
    modal.className = `fixed inset-0 z-50 flex items-center justify-center ${this.isOpen ? '' : 'hidden'} transition-opacity duration-300`;
    modal.setAttribute('style', 'background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px);');
    
    // ✅ SECURITY: Use safeSetHTML instead of innerHTML
    safeSetHTML(modal, getFilterModalHTML());

    document.body.appendChild(modal);
    this.modal = modal;

    this.initializeDropdowns();
    this.attachEventListeners();
  }

  private initializeDropdowns(): void {
    const { employees, filters } = this.config;
    
    const isValidValue = (val: string | null | undefined): val is string => {
      return Boolean(val && val.trim() !== '' && val.toLowerCase() !== 'null');
    };
    
    const channels = [...new Set(employees.map(e => e.channel).filter(isValidValue))].sort();
    const teams = [...new Set(employees.map(e => e.team).filter(isValidValue))].sort();
    const departments = [...new Set(employees.map(e => e.department).filter(isValidValue))].sort();
    const countries = [...new Set(employees.map(e => e.country).filter(isValidValue))].sort();
    const qualitySupervisors = [...new Set(employees.map(e => e.quality_mentor).filter(isValidValue))].sort();
    const teamSupervisors = [...new Set(employees.map(e => e.team_supervisor).filter(isValidValue))].sort();

    const groupByContainer = this.modal?.querySelector('#modalGroupByDropdown') as HTMLElement;
    if (groupByContainer) {
      this.dropdowns.set('modalGroupBy', createGroupByDropdown(groupByContainer, filters.groupBy));
    }

    const channelContainer = this.modal?.querySelector('#modalChannelDropdown') as HTMLElement;
    if (channelContainer) {
      this.dropdowns.set('modalChannel', createSimpleDropdown(channelContainer, 'modalChannel', 'Channel', 'Select Channel', channels, getFirstFilterValue(filters.channel)));
    }

    const teamContainer = this.modal?.querySelector('#modalTeamDropdown') as HTMLElement;
    if (teamContainer) {
      this.dropdowns.set('modalTeam', createSimpleDropdown(teamContainer, 'modalTeam', 'Team', 'Select Team', teams, getFirstFilterValue(filters.team)));
    }

    const departmentContainer = this.modal?.querySelector('#modalDepartmentDropdown') as HTMLElement;
    if (departmentContainer) {
      this.dropdowns.set('modalDepartment', createSimpleDropdown(departmentContainer, 'modalDepartment', 'Department', 'Select Department', departments, getFirstFilterValue(filters.department)));
    }

    const countryContainer = this.modal?.querySelector('#modalCountryDropdown') as HTMLElement;
    if (countryContainer) {
      this.dropdowns.set('modalCountry', createSimpleDropdown(countryContainer, 'modalCountry', 'Country', 'Select Country', countries, getFirstFilterValue(filters.country)));
    }

    const qualitySupervisorContainer = this.modal?.querySelector('#modalQualitySupervisorDropdown') as HTMLElement;
    if (qualitySupervisorContainer) {
      this.dropdowns.set('modalQualitySupervisor', createSupervisorDropdown(qualitySupervisorContainer, 'modalQualitySupervisor', 'Quality Mentor', 'Select Mentor', qualitySupervisors, employees, filters.qualitySupervisor));
    }

    const teamSupervisorContainer = this.modal?.querySelector('#modalTeamSupervisorDropdown') as HTMLElement;
    if (teamSupervisorContainer) {
      this.dropdowns.set('modalTeamSupervisor', createSupervisorDropdown(teamSupervisorContainer, 'modalTeamSupervisor', 'Team Supervisor', 'Select Supervisor', teamSupervisors, employees, filters.teamSupervisor));
    }
  }

  private attachEventListeners(): void {
    // Close modal buttons
    const closeButtons = this.modal?.querySelectorAll('[data-action="close-modal"]');
    closeButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        this.hide();
      });
    });

    // Apply filters button - ✅ FIXED: Use data-action instead of id
    const applyBtn = this.modal?.querySelector('[data-action="apply-filters"]');
    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.applyFilters();
      });
    }

    // Close on escape key
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.hide();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  private applyFilters(): void {
    const filters: FilterOptions = { ...this.config.filters };

    // Get values from modal dropdowns
    const groupByValue = this.dropdowns.get('modalGroupBy')?.getValue();
    filters.groupBy = groupByValue === 'none' ? undefined : (groupByValue as any);

    const channelValue = this.dropdowns.get('modalChannel')?.getValue();
    filters.channel = channelValue === '' ? undefined : channelValue;

    const teamValue = this.dropdowns.get('modalTeam')?.getValue();
    filters.team = teamValue === '' ? undefined : teamValue;

    const departmentValue = this.dropdowns.get('modalDepartment')?.getValue();
    filters.department = departmentValue === '' ? undefined : departmentValue;

    const countryValue = this.dropdowns.get('modalCountry')?.getValue();
    filters.country = countryValue === '' ? undefined : countryValue;

    const qualitySupervisorValue = this.dropdowns.get('modalQualitySupervisor')?.getValue();
    filters.qualitySupervisor = qualitySupervisorValue === '' ? undefined : qualitySupervisorValue;

    const teamSupervisorValue = this.dropdowns.get('modalTeamSupervisor')?.getValue();
    filters.teamSupervisor = teamSupervisorValue === '' ? undefined : teamSupervisorValue;

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof FilterOptions] === undefined) {
        delete filters[key as keyof FilterOptions];
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

  isVisible(): boolean {
    return this.isOpen;
  }

  update(config: Partial<FilterModalConfig>): void {
    this.config = { ...this.config, ...config };
    this.create();
    if (this.isOpen) {
      this.show();
    }
  }
}
