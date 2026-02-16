/**
 * AI-Audit View Component
 * Uses shared People section + AssignmentTabRenderer when stateManager/service provided.
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { getAuthenticatedSupabase } from '../../../../utils/authenticated-supabase.js';
import { logInfo, logError } from '../../../../utils/logging-helper.js';
import { apiClient } from '../../../../utils/api-client.js';
import { FilterBar } from './filter-bar.js';
import { getPeopleSectionHTML } from './people-section-template.js';
import { AssignmentTabRenderer } from '../renderers/assignment-tab-renderer.js';
import type { FilterOptions, Employee } from '../../domain/types.js';
import { getFirstFilterValue } from '../../domain/types.js';
import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import type { AuditDistributionService } from '../../application/audit-distribution-service.js';

interface Scorecard {
  id: string;
  name: string;
  table_name: string;
  channels: string | null;
  is_active: boolean;
  use_for_massive_ai_audit: boolean;
  description?: string | null;
  scoring_type?: string | null;
  passing_threshold?: number | null;
}

interface ScorecardParameter {
  id: string;
  scorecard_id: string;
  error_name: string;
  penalty_points: number;
  error_category: string;
  parameter_type: string;
  field_id: string;
  field_type: string;
  description: string | null;
  prompt: string | null;
  enable_ai_audit: boolean;
  is_fail_all: boolean;
  is_active: boolean;
  display_order: number;
}

interface Person {
  email: string;
  name: string;
  role?: string | null;
  channel?: string | null;
  team?: string | null;
  department?: string | null;
  country?: string | null;
  is_active?: boolean | null;
  intercom_admin_id?: string | null;
}

interface Filters {
  search: string;
  role: string;
  channel: string;
  team: string;
  department: string;
  country: string;
  is_active: string;
}

export interface AIAuditViewConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
}

export class AIAuditView {
  private container: HTMLElement;
  private stateManager: AuditDistributionStateManager | null = null;
  private service: AuditDistributionService | null = null;
  private assignmentTabRenderer: AssignmentTabRenderer | null = null;
  private people: Person[] = [];
  private filteredPeople: Person[] = [];
  private selectedPeople: Set<string> = new Set();
  private scorecards: Scorecard[] = [];
  private filters: Filters = {
    search: '',
    role: '',
    channel: '',
    team: '',
    department: '',
    country: '',
    is_active: 'all'
  };
  private searchDebounceTimer: number | null = null;
  private modalOverlay: HTMLDivElement | null = null;
  private filterBar: FilterBar | null = null;

  constructor(container: HTMLElement, config?: AIAuditViewConfig) {
    this.container = container;
    if (config) {
      this.stateManager = config.stateManager;
      this.service = config.service;
      this.renderShared();
    } else {
      this.render();
      this.loadPeople();
    }
    this.loadScorecards();
  }

  private async loadPeople(): Promise<void> {
    try {
      logInfo('[AIAuditView] Loading people from database...');
      const supabase = await getAuthenticatedSupabase();
      
      const { data, error } = await supabase
        .from('people')
        .select('email, name, role, channel, team, department, country, is_active, intercom_admin_id')
        .order('name', { ascending: true });

      if (error) {
        logError('[AIAuditView] Error loading people:', error);
        this.showError('Failed to load people from database');
        return;
      }

      this.people = (data || []).filter((person: any): person is Person => 
        person.email !== null && person.name !== null
      );
      
      logInfo(`[AIAuditView] Loaded ${this.people.length} people`);
      this.applyFilters();
      this.render();
      // Initialize or update filter bar after render
      setTimeout(() => {
        this.updateFilterBar();
      }, 0);
    } catch (error) {
      logError('[AIAuditView] Error loading people:', error);
      this.showError('Failed to load people from database');
    }
  }

  private applyFilters(): void {
    let filtered = [...this.people];

    // Search filter
    if (this.filters.search.trim()) {
      const searchLower = this.filters.search.toLowerCase().trim();
      filtered = filtered.filter(person => {
        const nameMatch = person.name?.toLowerCase().includes(searchLower) || false;
        const emailMatch = person.email?.toLowerCase().includes(searchLower) || false;
        const roleMatch = person.role?.toLowerCase().includes(searchLower) || false;
        const channelMatch = person.channel?.toLowerCase().includes(searchLower) || false;
        const teamMatch = person.team?.toLowerCase().includes(searchLower) || false;
        const departmentMatch = person.department?.toLowerCase().includes(searchLower) || false;
        const countryMatch = person.country?.toLowerCase().includes(searchLower) || false;
        return nameMatch || emailMatch || roleMatch || channelMatch || teamMatch || departmentMatch || countryMatch;
      });
    }

    // Role filter
    if (this.filters.role) {
      filtered = filtered.filter(person => person.role === this.filters.role);
    }

    // Channel filter
    if (this.filters.channel) {
      filtered = filtered.filter(person => person.channel === this.filters.channel);
    }

    // Team filter
    if (this.filters.team) {
      filtered = filtered.filter(person => person.team === this.filters.team);
    }

    // Department filter
    if (this.filters.department) {
      filtered = filtered.filter(person => person.department === this.filters.department);
    }

    // Country filter
    if (this.filters.country) {
      filtered = filtered.filter(person => person.country === this.filters.country);
    }

    // Active status filter
    if (this.filters.is_active === 'active') {
      filtered = filtered.filter(person => person.is_active !== false);
    } else if (this.filters.is_active === 'inactive') {
      filtered = filtered.filter(person => person.is_active === false);
    }

    this.filteredPeople = filtered;
  }

  private getUniqueValues(field: keyof Person): string[] {
    const values = new Set<string>();
    this.people.forEach(person => {
      const value = person[field];
      if (value && typeof value === 'string') {
        values.add(value);
      }
    });
    return Array.from(values).sort();
  }

  private renderShared(): void {
    if (!this.stateManager || !this.service) return;
    safeSetHTML(this.container, `
      <div class="px-4 py-6 max-w-7xl mx-auto w-full">
        <div class="mb-6">
          ${getPeopleSectionHTML('People', 'Select team members for AI audit')}
        </div>
      </div>
    `);
    this.assignmentTabRenderer = new AssignmentTabRenderer({
      stateManager: this.stateManager,
      service: this.service,
      showAuditorModal: false,
      onEmployeeListUpdate: () => this.updateFloatingButton()
    });
    this.assignmentTabRenderer.render();
    this.updateFloatingButton();
  }

  private handleSearch = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const value = input.value;

    if (this.searchDebounceTimer !== null) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = window.setTimeout(() => {
      this.filters.search = value;
      this.applyFilters();
      this.render();
    }, 150);
  };

  private handleFilterChange = (field: keyof Filters, value: string): void => {
    this.filters[field] = value;
    this.applyFilters();
    this.render();
  };

  private handleSelectAll = (): void => {
    this.filteredPeople.forEach(person => {
      this.selectedPeople.add(person.email);
    });
    this.render();
  };

  private handleDeselectAll = (): void => {
    this.filteredPeople.forEach(person => {
      this.selectedPeople.delete(person.email);
    });
    this.render();
  };

  private handlePersonSelect = (email: string, checked: boolean): void => {
    if (checked) {
      this.selectedPeople.add(email);
    } else {
      this.selectedPeople.delete(email);
    }
    this.render();
  };

  private showError(message: string): void {
    const errorContainer = document.createElement('div');
    errorContainer.className = 'px-4 py-6 max-w-7xl mx-auto w-full';
    safeSetHTML(errorContainer, `
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <p class="text-red-800 text-sm">${escapeHtml(message)}</p>
      </div>
    `);
    this.container.appendChild(errorContainer);
  }

  private render(): void {
    // Filters are now handled by FilterBar component, no need to get unique values here

    const allFilteredSelected = this.filteredPeople.length > 0 && 
      this.filteredPeople.every(p => this.selectedPeople.has(p.email));
    const someFilteredSelected = this.filteredPeople.some(p => this.selectedPeople.has(p.email));

    const peopleListHtml = this.filteredPeople.length > 0
      ? `
        <div class="mt-6">
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 class="text-lg font-semibold text-gray-900">
                  People (${this.filteredPeople.length}${this.people.length !== this.filteredPeople.length ? ` of ${this.people.length}` : ''})
                </h3>
                <p class="text-xs text-gray-600 mt-1">Select team members for AI audit</p>
              </div>
              <div class="flex items-center gap-2">
                ${someFilteredSelected ? `
                  <button 
                    id="deselectAllBtn"
                    class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Deselect All
                  </button>
                ` : ''}
                <button 
                  id="selectAllBtn"
                  class="px-3 py-1.5 text-xs font-medium text-white bg-primary border border-primary rounded-md hover:bg-primary/90 transition-colors"
                >
                  Select All
                </button>
              </div>
            </div>
            <div class="max-h-[60vh] overflow-y-auto divide-y divide-gray-200">
              ${this.filteredPeople.map(person => {
                const isSelected = this.selectedPeople.has(person.email);
                return `
                <div 
                  class="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  data-email="${escapeHtml(person.email)}"
                  data-action="person-select"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        class="person-checkbox w-4 h-4 cursor-pointer accent-primary rounded border-2 border-gray-300 checked:bg-primary checked:border-primary transition-all"
                        data-email="${escapeHtml(person.email)}"
                        ${isSelected ? 'checked' : ''}
                        onclick="event.stopPropagation()"
                      />
                      <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span class="text-primary font-semibold text-sm">
                          ${escapeHtml(person.name.charAt(0).toUpperCase())}
                        </span>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="font-medium text-gray-900 truncate">${escapeHtml(person.name)}</p>
                        <p class="text-sm text-gray-500 truncate">${escapeHtml(person.email)}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap text-sm text-gray-600 ml-4">
                      ${person.role ? `<span class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">${escapeHtml(person.role)}</span>` : ''}
                      ${person.channel ? `<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">${escapeHtml(person.channel)}</span>` : ''}
                      ${person.team ? `<span class="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">${escapeHtml(person.team)}</span>` : ''}
                      ${person.department ? `<span class="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">${escapeHtml(person.department)}</span>` : ''}
                      ${person.country ? `<span class="px-2 py-1 bg-pink-100 text-pink-800 rounded text-xs">${escapeHtml(person.country)}</span>` : ''}
                      ${person.is_active === false ? '<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">Inactive</span>' : ''}
                    </div>
                  </div>
                </div>
              `;
              }).join('')}
            </div>
          </div>
        </div>
      `
      : `
        <div class="mt-6 text-center py-8">
          <p class="text-gray-500">${this.people.length === 0 ? 'Loading people...' : 'No people match your filters'}</p>
        </div>
      `;

    safeSetHTML(this.container, `
      <div class="px-4 py-6 max-w-7xl mx-auto w-full">
        <div class="mb-6">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
            <div class="flex items-center gap-4 mb-6">
              <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <h2 class="text-2xl font-bold text-gray-900">Massive Ai Audit</h2>
                <p class="text-sm text-gray-600 mt-1">
                  AI-powered audit distribution system
                </p>
              </div>
            </div>
            
            <!-- Search and Filters - Using shared FilterBar component -->
            <div id="expandedFilterContainer"></div>
            
            <!-- Selected Count -->
            ${this.selectedPeople.size > 0 ? `
              <div class="bg-primary/10 border border-primary/20 rounded-md px-4 py-2 mt-4">
                <p class="text-sm font-medium text-primary">
                  ${this.selectedPeople.size} person${this.selectedPeople.size === 1 ? '' : 's'} selected
                </p>
              </div>
            ` : ''}
          </div>
        </div>
        ${peopleListHtml}
      </div>
    `);

    // Add or update floating button separately
    this.updateFloatingButton();
    
    this.attachEventListeners();
  }

  private updateFilterBar(): void {
    const expandedFilterContainer = document.getElementById('expandedFilterContainer');
    if (!expandedFilterContainer) return;

    // Convert Person[] to Employee[] format for FilterBar
    const employees: Employee[] = this.people.map(p => ({
      id: p.email,
      email: p.email,
      name: p.name,
      avatar_url: null,
      channel: p.channel || null,
      team: p.team || null,
      department: p.department || null,
      country: p.country || null,
      designation: p.role || null,
      quality_mentor: null,
      team_supervisor: null,
      is_active: p.is_active ?? true
    }));

    // Convert Filters to FilterOptions
    const filterOptions: FilterOptions = {
      search: this.filters.search || undefined,
      role: this.filters.role || undefined,
      channel: this.filters.channel || undefined,
      team: this.filters.team || undefined,
      department: this.filters.department || undefined,
      country: this.filters.country || undefined,
      is_active: this.filters.is_active !== 'all' ? this.filters.is_active as 'active' | 'inactive' : undefined
    };

    if (this.filterBar) {
      // Update existing filter bar
      this.filterBar.update({
        employees,
        filters: filterOptions
      });
    } else {
      // Create new filter bar
      this.filterBar = new FilterBar(expandedFilterContainer, {
        employees,
        filters: filterOptions,
        expanded: true,
        onFilterChange: (filters) => {
          // Update local filters from FilterOptions (multi-select normalized to first value for AI view)
          this.filters.search = filters.search || '';
          this.filters.role = getFirstFilterValue(filters.role);
          this.filters.channel = getFirstFilterValue(filters.channel);
          this.filters.team = getFirstFilterValue(filters.team);
          this.filters.department = getFirstFilterValue(filters.department);
          this.filters.country = getFirstFilterValue(filters.country);
          this.filters.is_active = filters.is_active || 'all';
          
          // Apply filters and re-render
          this.applyFilters();
          this.render();
        }
      });
    }
  }

  private updateFloatingButton(): void {
    const existingBtn = document.getElementById('runAIAuditBtn');
    if (existingBtn) existingBtn.remove();

    const selectedCount = this.stateManager
      ? this.stateManager.getState().selectedEmployees.size
      : this.selectedPeople.size;

    if (selectedCount > 0) {
      const button = document.createElement('button');
      button.id = 'runAIAuditBtn';
      button.className = 'px-6 py-3 bg-black text-white font-semibold rounded-lg shadow-lg hover:bg-gray-800 transition-all transform hover:scale-105 flex items-center gap-2';
      
      // Use inline styles to ensure fixed positioning relative to viewport
      button.style.position = 'fixed';
      button.style.bottom = '24px';
      button.style.right = '24px';
      button.style.zIndex = '9999';
      button.style.cursor = 'pointer';
      
      button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
        <span>Run AI Audit</span>
      `;
      button.onclick = () => this.handleRunAIAudit();
      document.body.appendChild(button);
    }
  }

  private attachEventListeners(): void {
    // Filter bar handles all filter inputs now, so we don't need individual listeners
    // The FilterBar component handles all the event listeners

    // Select All / Deselect All buttons
    const selectAllBtn = this.container.querySelector('#selectAllBtn') as HTMLButtonElement;
    if (selectAllBtn) {
      selectAllBtn.onclick = () => this.handleSelectAll();
    }

    const deselectAllBtn = this.container.querySelector('#deselectAllBtn') as HTMLButtonElement;
    if (deselectAllBtn) {
      deselectAllBtn.onclick = () => this.handleDeselectAll();
    }

    // Person selection checkboxes and rows
    this.container.querySelectorAll('.person-checkbox').forEach(checkbox => {
      const email = checkbox.getAttribute('data-email');
      if (email) {
        checkbox.removeEventListener('change', () => {});
        checkbox.addEventListener('change', (e) => {
          e.stopPropagation();
          const checked = (e.target as HTMLInputElement).checked;
          this.handlePersonSelect(email, checked);
        });
      }
    });

    // Person row clicks
    this.container.querySelectorAll('[data-action="person-select"]').forEach(row => {
      const email = row.getAttribute('data-email');
      if (email) {
        row.removeEventListener('click', () => {});
        row.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.person-checkbox')) {
            return;
          }
          const checkbox = row.querySelector('.person-checkbox') as HTMLInputElement;
          if (checkbox) {
            checkbox.checked = !checkbox.checked;
            this.handlePersonSelect(email, checkbox.checked);
          }
        });
      }
    });
  }

  private async loadScorecards(): Promise<void> {
    try {
      const supabase = await getAuthenticatedSupabase();
      const { data, error } = await supabase
        .from('scorecards')
        .select('id, name, table_name, channels, is_active, use_for_massive_ai_audit, description, scoring_type, passing_threshold')
        .eq('use_for_massive_ai_audit', true)
        .order('name', { ascending: true });

      if (error) {
        logError('[AIAuditView] Error loading scorecards:', error);
        return;
      }

      this.scorecards = (data || []) as Scorecard[];
      logInfo(`[AIAuditView] Loaded ${this.scorecards.length} scorecards marked for Massive AI Audit`);
    } catch (error) {
      logError('[AIAuditView] Error loading scorecards:', error);
    }
  }

  /** Load parameters for a specific scorecard */
  private async loadScorecardParameters(scorecardId: string): Promise<ScorecardParameter[]> {
    try {
      const supabase = await getAuthenticatedSupabase();
      const { data, error } = await supabase
        .from('scorecard_perameters')
        .select('*')
        .eq('scorecard_id', scorecardId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        logError('[AIAuditView] Error loading scorecard parameters:', error);
        return [];
      }

      return (data || []) as ScorecardParameter[];
    } catch (error) {
      logError('[AIAuditView] Error loading scorecard parameters:', error);
      return [];
    }
  }

  /** Save updated parameters back to the database */
  private async saveScorecardParameters(parameters: ScorecardParameter[]): Promise<boolean> {
    try {
      const supabase = await getAuthenticatedSupabase();
      for (const param of parameters) {
        const { error } = await supabase
          .from('scorecard_perameters')
          .update({
            prompt: param.prompt,
            description: param.description,
            enable_ai_audit: param.enable_ai_audit,
          })
          .eq('id', param.id);
        if (error) {
          logError('[AIAuditView] Error saving parameter:', error);
          return false;
        }
      }
      return true;
    } catch (error) {
      logError('[AIAuditView] Error saving parameters:', error);
      return false;
    }
  }

  private handleRunAIAudit = async (): Promise<void> => {
    const selectedPeople = await this.getSelectedPeopleForModal();
    logInfo('[AIAuditView] Run AI Audit clicked', { selectedCount: selectedPeople.length });

    if (selectedPeople.length === 0) {
      logError('[AIAuditView] No people selected');
      return;
    }

    this.showRunAIAuditModal(selectedPeople);
  }

  /** Resolve selected people (from stateManager or local); when using shared flow, fetch intercom_admin_id. */
  private async getSelectedPeopleForModal(): Promise<Person[]> {
    if (this.stateManager) {
      const state = this.stateManager.getState();
      const emails = Array.from(state.selectedEmployees.keys());
      if (emails.length === 0) return [];
      const supabase = await getAuthenticatedSupabase();
      const { data } = await supabase
        .from('people')
        .select('email, name, intercom_admin_id')
        .in('email', emails);
      const rows = (data || []).filter((r: any) => r?.email && r?.name);
      return rows.map((r: any) => ({
        email: r.email,
        name: r.name,
        intercom_admin_id: r.intercom_admin_id ?? null
      }));
    }
    return this.getSelectedPeople();
  }

  private showRunAIAuditModal(selectedPeople: Person[]): void {
    // Remove existing modal if any
    this.closeModal();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'runAIAuditModalOverlay';
    overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
    overlay.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 99999 !important; display: flex !important; align-items: center !important; justify-content: center !important; overflow-y: auto !important; padding: 1rem;';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'run-ai-audit-modal-title');

    // Date constraints: audit past conversations only (up to yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const maxDate = yesterday.toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(yesterday);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const defaultStartDate = thirtyDaysAgo.toISOString().split('T')[0];
    const defaultEndDate = maxDate;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto';
    modalContent.style.cssText = 'background: white; border-radius: 0.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); min-width: 320px; max-width: 672px; width: calc(100% - 2rem);';

    modalContent.innerHTML = `
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h2 id="run-ai-audit-modal-title" class="text-2xl font-bold text-gray-900">Run Massive AI Audit</h2>
          </div>
          <button id="closeRunAIAuditModal" class="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close modal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Selected People Section -->
        <div class="mb-6">
          <h3 class="text-lg font-semibold text-gray-900 mb-3">Selected People (${selectedPeople.length})</h3>
          <div class="bg-gray-50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto p-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              ${selectedPeople.map(person => `
                <div class="flex items-center gap-2 p-2 bg-white rounded border border-gray-200">
                  <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span class="text-primary font-semibold text-xs">
                      ${escapeHtml(person.name.charAt(0).toUpperCase())}
                    </span>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(person.name)}</p>
                    <p class="text-xs text-gray-500 truncate">${escapeHtml(person.email)}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Scorecard Selection -->
        <div class="mb-6">
          <label for="aiAuditScorecard" class="block text-sm font-medium text-gray-700 mb-2">
            Scorecard <span class="text-red-500">*</span>
          </label>
          <div class="flex items-center gap-2">
            <select
              id="aiAuditScorecard"
              class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              required
            >
              <option value="">Select a scorecard...</option>
              ${this.scorecards.map(scorecard => `
                <option value="${escapeHtml(scorecard.id)}">${escapeHtml(scorecard.name)}${scorecard.is_active === false ? ' (inactive)' : ''}</option>
              `).join('')}
            </select>
            <button
              id="viewScorecardDetailsBtn"
              type="button"
              class="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 hover:text-gray-800 transition-colors whitespace-nowrap"
              style="display: none;"
              title="View scorecard parameters and prompts"
            >
              <svg class="inline w-3.5 h-3.5 mr-1 -mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/></svg>
              Details
            </button>
          </div>
          <!-- Compact scorecard summary (shown after selection) -->
          <div id="scorecardSummaryLine" class="mt-2" style="display: none;">
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <span id="scorecardSummaryScoringType" class="px-1.5 py-0.5 rounded font-medium"></span>
              <span>&#183;</span>
              <span id="scorecardSummaryParamCount"></span>
              <span>&#183;</span>
              <span>Threshold: <strong id="scorecardSummaryThreshold"></strong></span>
            </div>
          </div>
          ${this.scorecards.length === 0 ? `
            <p class="mt-1.5 text-xs text-amber-600">
              <svg class="inline w-3.5 h-3.5 mr-0.5 -mt-0.5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"/></svg>
              No scorecards are configured for Massive AI Audit. Go to <strong>Settings &rarr; Scorecards</strong> and enable "Use for Massive AI Audit".
            </p>
          ` : `
            <p class="mt-1.5 text-xs text-gray-500">Only scorecards enabled for <strong>Massive AI Audit</strong> are shown.</p>
          `}
        </div>

        <!-- Date Range -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="aiAuditStartDate" class="block text-xs text-gray-600 mb-1">From</label>
              <input
                type="date"
                id="aiAuditStartDate"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                value="${defaultStartDate}"
                max="${maxDate}"
              />
            </div>
            <div>
              <label for="aiAuditEndDate" class="block text-xs text-gray-600 mb-1">To</label>
              <input
                type="date"
                id="aiAuditEndDate"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                value="${defaultEndDate}"
                max="${maxDate}"
              />
            </div>
          </div>
        </div>

        <!-- Notification Options -->
        <div class="mb-6 space-y-3">
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              id="notifyMeWhenDone"
              class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
              checked
            />
            <label for="notifyMeWhenDone" class="text-sm font-medium text-gray-700 cursor-pointer">
              Notify me when done
            </label>
          </div>
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              id="notifyAuditedPeople"
              class="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label for="notifyAuditedPeople" class="text-sm font-medium text-gray-700 cursor-pointer">
              Notify results to audited people
            </label>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            id="cancelRunAIAudit"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            id="submitRunAIAudit"
            class="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition-colors"
          >
            Run Massive AI Audit
          </button>
        </div>
      </div>
    `;

    overlay.appendChild(modalContent);
    document.body.appendChild(overlay);
    this.modalOverlay = overlay;

    // Fade in animation
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });

    // Attach event listeners
    this.attachModalEventListeners(selectedPeople);
  }

  private attachModalEventListeners(selectedPeople: Person[]): void {
    if (!this.modalOverlay) return;

    // Close button
    const closeBtn = this.modalOverlay.querySelector('#closeRunAIAuditModal') as HTMLButtonElement;
    if (closeBtn) {
      closeBtn.onclick = () => this.closeModal();
    }

    // Cancel button
    const cancelBtn = this.modalOverlay.querySelector('#cancelRunAIAudit') as HTMLButtonElement;
    if (cancelBtn) {
      cancelBtn.onclick = () => this.closeModal();
    }

    // Submit button
    const submitBtn = this.modalOverlay.querySelector('#submitRunAIAudit') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.onclick = () => this.handleSubmitAIAudit(selectedPeople);
    }

    // Scorecard selection change — show summary + details button
    const scorecardSelect = this.modalOverlay.querySelector('#aiAuditScorecard') as HTMLSelectElement;
    if (scorecardSelect) {
      scorecardSelect.addEventListener('change', () => this.onScorecardSelected(scorecardSelect.value));
    }

    // View Details button — opens separate scorecard detail modal
    const viewDetailsBtn = this.modalOverlay.querySelector('#viewScorecardDetailsBtn') as HTMLButtonElement;
    if (viewDetailsBtn) {
      viewDetailsBtn.addEventListener('click', () => {
        const selectedId = scorecardSelect?.value;
        if (selectedId) this.openScorecardDetailModal(selectedId);
      });
    }

    // Date cross-validation: start must be <= end
    const startDateInput = this.modalOverlay.querySelector('#aiAuditStartDate') as HTMLInputElement;
    const endDateInput = this.modalOverlay.querySelector('#aiAuditEndDate') as HTMLInputElement;
    if (startDateInput && endDateInput) {
      startDateInput.addEventListener('change', () => {
        if (startDateInput.value) endDateInput.min = startDateInput.value;
      });
      endDateInput.addEventListener('change', () => {
        if (endDateInput.value) startDateInput.max = endDateInput.value;
      });
      // Set initial cross-constraints
      endDateInput.min = startDateInput.value;
    }

    // Close on overlay click
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) {
        this.closeModal();
      }
    });

    // Close on Escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.modalOverlay) {
        this.closeModal();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    (this.modalOverlay as any)._escapeHandler = escapeHandler;
  }

  // ── Scorecard helpers ──────────────────────────────────────────

  private _currentParameters: ScorecardParameter[] = [];
  private _editMode = false;
  private _detailOverlay: HTMLElement | null = null;

  /** When scorecard dropdown changes: show compact summary + "Details" button */
  private async onScorecardSelected(scorecardId: string): Promise<void> {
    const summaryLine = this.modalOverlay?.querySelector('#scorecardSummaryLine') as HTMLElement;
    const detailsBtn = this.modalOverlay?.querySelector('#viewScorecardDetailsBtn') as HTMLElement;

    if (!scorecardId) {
      if (summaryLine) summaryLine.style.display = 'none';
      if (detailsBtn) detailsBtn.style.display = 'none';
      this._currentParameters = [];
      return;
    }

    const scorecard = this.scorecards.find(s => s.id === scorecardId);
    if (!scorecard) return;

    // Load params in background for the summary count
    this._currentParameters = await this.loadScorecardParameters(scorecardId);

    // Populate the compact summary line
    const stBadge = this.modalOverlay?.querySelector('#scorecardSummaryScoringType') as HTMLElement;
    const countEl = this.modalOverlay?.querySelector('#scorecardSummaryParamCount') as HTMLElement;
    const threshEl = this.modalOverlay?.querySelector('#scorecardSummaryThreshold') as HTMLElement;

    if (stBadge) {
      const st = scorecard.scoring_type || 'deductive';
      const bgMap: Record<string, string> = { deductive: '#fef2f2;color:#dc2626', additive: '#ecfdf5;color:#059669', hybrid: '#eff6ff;color:#3b82f6' };
      stBadge.style.cssText = `background:${(bgMap[st] || bgMap.deductive).split(';')[0]};${(bgMap[st] || bgMap.deductive).split(';')[1] || ''};font-size:0.65rem;padding:1px 6px;border-radius:4px;`;
      stBadge.textContent = st.charAt(0).toUpperCase() + st.slice(1);
    }
    if (countEl) countEl.textContent = `${this._currentParameters.length} parameters`;
    if (threshEl) threshEl.textContent = scorecard.passing_threshold != null ? `${scorecard.passing_threshold}%` : '—';

    if (summaryLine) summaryLine.style.display = 'block';
    if (detailsBtn) detailsBtn.style.display = 'inline-flex';
  }

  // ── Separate Scorecard Detail Modal ─────────────────────────────

  private async openScorecardDetailModal(scorecardId: string): Promise<void> {
    const scorecard = this.scorecards.find(s => s.id === scorecardId);
    if (!scorecard) return;

    if (this._currentParameters.length === 0 || this._currentParameters[0]?.scorecard_id !== scorecardId) {
      this._currentParameters = await this.loadScorecardParameters(scorecardId);
    }
    this._editMode = false;

    const overlay = document.createElement('div');
    overlay.id = 'scorecardDetailOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);padding:1rem;';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const st = scorecard.scoring_type || 'deductive';
    const stBg: Record<string, string> = { deductive: '#fef2f2', additive: '#ecfdf5', hybrid: '#eff6ff' };
    const stFg: Record<string, string> = { deductive: '#dc2626', additive: '#059669', hybrid: '#3b82f6' };

    // Group parameters by category for a cleaner layout
    const categories = new Map<string, ScorecardParameter[]>();
    this._currentParameters.forEach(p => {
      const cat = p.error_category || 'Other';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(p);
    });

    const modal = document.createElement('div');
    modal.style.cssText = 'background:#fff;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);width:calc(100% - 2rem);max-width:680px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden;';

    modal.innerHTML = `
      <div style="padding:20px 24px 16px;flex-shrink:0;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <h3 style="font-size:1.05rem;font-weight:700;color:#111827;margin:0;">${escapeHtml(scorecard.name)}</h3>
              <span style="background:${stBg[st] || stBg.deductive};color:${stFg[st] || stFg.deductive};font-size:0.65rem;padding:2px 8px;border-radius:9999px;font-weight:600;white-space:nowrap;">${st.charAt(0).toUpperCase() + st.slice(1)}</span>
            </div>
            ${scorecard.description ? `<p style="font-size:0.75rem;color:#6b7280;margin:6px 0 0;line-height:1.4;">${escapeHtml(scorecard.description)}</p>` : ''}
          </div>
          <button id="closeScorecardDetail" style="background:none;border:none;cursor:pointer;padding:4px;color:#9ca3af;flex-shrink:0;" title="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap;">
          <span style="display:inline-flex;align-items:center;gap:4px;background:#f3f4f6;color:#374151;font-size:0.7rem;padding:4px 10px;border-radius:6px;font-weight:500;">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="#9ca3af"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/></svg>
            Threshold ${scorecard.passing_threshold != null ? scorecard.passing_threshold + '%' : '—'}
          </span>
          <span style="display:inline-flex;align-items:center;gap:4px;background:#f3f4f6;color:#374151;font-size:0.7rem;padding:4px 10px;border-radius:6px;font-weight:500;">
            <svg width="12" height="12" viewBox="0 0 20 20" fill="#9ca3af"><path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z"/><path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z"/></svg>
            ${escapeHtml(scorecard.channels || 'All channels')}
          </span>
          <span style="display:inline-flex;align-items:center;gap:4px;background:#f3f4f6;color:#374151;font-size:0.7rem;padding:4px 10px;border-radius:6px;font-weight:500;">
            ${this._currentParameters.length} parameters
          </span>
          <span style="display:inline-flex;align-items:center;gap:4px;background:${scorecard.is_active ? '#ecfdf5' : '#fef2f2'};color:${scorecard.is_active ? '#059669' : '#dc2626'};font-size:0.7rem;padding:4px 10px;border-radius:6px;font-weight:600;">
            ${scorecard.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      <div style="padding:8px 24px;border-top:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:#fafafa;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:0.7rem;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Parameters</span>
          <button id="detailExpandAll" style="font-size:0.65rem;padding:2px 8px;border-radius:4px;border:1px solid #e5e7eb;background:#fff;color:#6b7280;cursor:pointer;" title="Expand all prompts">Expand All</button>
        </div>
        <div style="display:flex;gap:6px;">
          <button id="detailToggleEdit" style="font-size:0.7rem;padding:5px 14px;border-radius:6px;border:1px solid #d1d5db;background:#fff;color:#374151;cursor:pointer;font-weight:500;">Edit Prompts</button>
          <button id="detailSaveBtn" style="font-size:0.7rem;padding:5px 14px;border-radius:6px;border:none;background:#111827;color:#fff;cursor:pointer;font-weight:500;display:none;">Save Changes</button>
        </div>
      </div>
      <div id="detailParamsList" style="flex:1;overflow-y:auto;padding:8px 0;"></div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    this._detailOverlay = overlay;

    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s ease';
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    this.renderDetailParams();

    // Events
    overlay.querySelector('#closeScorecardDetail')?.addEventListener('click', () => this.closeScorecardDetailModal());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.closeScorecardDetailModal(); });

    overlay.querySelector('#detailToggleEdit')?.addEventListener('click', () => {
      this._editMode = !this._editMode;
      const eb = overlay.querySelector('#detailToggleEdit') as HTMLButtonElement;
      const sb = overlay.querySelector('#detailSaveBtn') as HTMLButtonElement;
      if (eb) { eb.textContent = this._editMode ? 'Cancel' : 'Edit Prompts'; eb.style.borderColor = this._editMode ? '#f87171' : '#d1d5db'; eb.style.color = this._editMode ? '#dc2626' : '#374151'; }
      if (sb) sb.style.display = this._editMode ? 'inline-block' : 'none';
      this.renderDetailParams();
    });

    overlay.querySelector('#detailSaveBtn')?.addEventListener('click', () => this.handleDetailSave());

    overlay.querySelector('#detailExpandAll')?.addEventListener('click', () => {
      const rows = overlay.querySelectorAll('[data-prompt-body]');
      const allOpen = Array.from(rows).every(r => (r as HTMLElement).style.display !== 'none');
      rows.forEach(r => { (r as HTMLElement).style.display = allOpen ? 'none' : 'block'; });
      const chevrons = overlay.querySelectorAll('[data-chevron]');
      chevrons.forEach(c => { (c as HTMLElement).style.transform = allOpen ? '' : 'rotate(90deg)'; });
      const btn = overlay.querySelector('#detailExpandAll') as HTMLButtonElement;
      if (btn) btn.textContent = allOpen ? 'Expand All' : 'Collapse All';
    });

    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') this.closeScorecardDetailModal(); };
    document.addEventListener('keydown', esc);
    (overlay as any)._esc = esc;
  }

  private closeScorecardDetailModal(): void {
    if (!this._detailOverlay) return;
    const esc = (this._detailOverlay as any)._esc;
    if (esc) document.removeEventListener('keydown', esc);
    this._detailOverlay.style.opacity = '0';
    setTimeout(() => { this._detailOverlay?.remove(); this._detailOverlay = null; }, 150);
    this._editMode = false;
  }

  private renderDetailParams(): void {
    const list = this._detailOverlay?.querySelector('#detailParamsList') as HTMLElement;
    if (!list) return;

    if (this._currentParameters.length === 0) {
      list.innerHTML = '<div style="padding:2.5rem;text-align:center;font-size:0.8rem;color:#9ca3af;">No parameters defined for this scorecard.</div>';
      return;
    }

    const catColors: Record<string, string> = {
      'critical': '#dc2626', 'critical fail': '#7f1d1d', 'significant': '#ea580c', 'major': '#d97706', 'minor': '#2563eb',
    };
    const catBg: Record<string, string> = {
      'critical': '#fef2f2', 'critical fail': '#fef2f2', 'significant': '#fff7ed', 'major': '#fffbeb', 'minor': '#eff6ff',
    };

    list.innerHTML = this._currentParameters.map((p, idx) => {
      const catKey = p.error_category?.toLowerCase() || '';
      const cc = catColors[catKey] || '#6b7280';
      const cb = catBg[catKey] || '#f9fafb';
      const hasPrompt = !!p.prompt;

      const badges = [
        p.is_fail_all ? '<span style="background:#fef2f2;color:#dc2626;font-size:0.6rem;padding:1px 6px;border-radius:4px;font-weight:600;">Fail All</span>' : '',
        p.enable_ai_audit ? '<span style="background:#f0fdf4;color:#16a34a;font-size:0.6rem;padding:1px 6px;border-radius:4px;font-weight:600;">AI</span>' : '',
      ].filter(Boolean).join('');

      const aiCb = this._editMode
        ? `<label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;margin-left:auto;"><input type="checkbox" data-idx="${idx}" data-f="enable_ai_audit" ${p.enable_ai_audit ? 'checked' : ''} style="width:13px;height:13px;accent-color:#16a34a;"/><span style="font-size:0.65rem;color:#6b7280;">AI Enabled</span></label>`
        : '';

      // In edit mode: always show fields. In view mode: accordion — click to expand prompt.
      const promptSection = this._editMode
        ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f3f4f6;">
            <div style="margin-bottom:8px;">
              <label style="font-size:0.65rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.03em;display:block;margin-bottom:3px;">Description</label>
              <input type="text" data-idx="${idx}" data-f="description" value="${escapeHtml(p.description || '')}" style="width:100%;font-size:0.75rem;border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-family:inherit;color:#374151;background:#fafafa;" placeholder="Brief description..."/>
            </div>
            <div>
              <label style="font-size:0.65rem;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.03em;display:block;margin-bottom:3px;">AI Prompt</label>
              <textarea data-idx="${idx}" data-f="prompt" style="width:100%;font-size:0.75rem;border:1px solid #e5e7eb;border-radius:6px;padding:8px 10px;resize:vertical;font-family:inherit;min-height:60px;color:#374151;background:#fafafa;line-height:1.5;" placeholder="Detailed prompt for AI evaluation...">${escapeHtml(p.prompt || '')}</textarea>
            </div>
          </div>`
        : (hasPrompt || p.description
          ? `<div data-prompt-body style="display:none;margin-top:10px;padding-top:10px;border-top:1px dashed #e5e7eb;">
              ${p.description ? `<p style="font-size:0.72rem;color:#6b7280;margin:0 0 6px;line-height:1.4;">${escapeHtml(p.description)}</p>` : ''}
              ${p.prompt ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;"><p style="font-size:0.72rem;color:#475569;margin:0;line-height:1.5;white-space:pre-wrap;word-break:break-word;">${escapeHtml(p.prompt)}</p></div>` : ''}
            </div>`
          : '');

      const expandBtn = !this._editMode && (hasPrompt || p.description)
        ? `<span style="color:#9ca3af;display:flex;align-items:center;flex-shrink:0;pointer-events:none;">
            <svg data-chevron width="14" height="14" viewBox="0 0 20 20" fill="currentColor" style="transition:transform 0.15s ease;"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          </span>`
        : '<div style="width:18px;flex-shrink:0;"></div>';

      return `
        <div style="margin:0 16px 6px;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;background:#fff;">
          <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;${!this._editMode && (hasPrompt || p.description) ? 'cursor:pointer;' : ''}" ${!this._editMode ? `data-row-toggle="${idx}"` : ''}>
            ${expandBtn}
            <span style="background:${cb};color:${cc};font-size:0.6rem;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;letter-spacing:0.03em;white-space:nowrap;">${escapeHtml(p.error_category)}</span>
            <span style="color:#1f2937;font-weight:500;font-size:0.8rem;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(p.error_name)}</span>
            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">${badges}</div>
            ${aiCb}
            <span style="color:#374151;font-weight:700;font-size:0.78rem;white-space:nowrap;flex-shrink:0;">${p.parameter_type === 'bonus' ? '+' : '\u2212'}${Math.abs(p.penalty_points)}</span>
          </div>
          ${promptSection ? `<div style="padding:0 12px 10px;">${promptSection}</div>` : ''}
        </div>`;
    }).join('');

    // Attach row toggle listeners for accordion behavior (view mode only)
    if (!this._editMode) {
      list.querySelectorAll('[data-row-toggle]').forEach(row => {
        row.addEventListener('click', (e) => {
          // Don't toggle if clicking inside a button/link/input
          if ((e.target as HTMLElement).closest('input, a')) return;

          // The card is the row's parentElement (the outer wrapper div)
          const card = row.parentElement;
          if (!card) return;
          const body = card.querySelector('[data-prompt-body]') as HTMLElement;
          const chevron = row.querySelector('[data-chevron]') as HTMLElement;
          if (body) {
            const open = body.style.display !== 'none';
            body.style.display = open ? 'none' : 'block';
            if (chevron) chevron.style.transform = open ? '' : 'rotate(90deg)';
          }
        });
      });
    }
  }

  private async handleDetailSave(): Promise<void> {
    if (!this._detailOverlay) return;
    const list = this._detailOverlay.querySelector('#detailParamsList') as HTMLElement;

    // Collect textarea/input values
    list.querySelectorAll('textarea[data-idx], input[type="text"][data-idx]').forEach((el: Element) => {
      const idx = parseInt(el.getAttribute('data-idx') || '-1', 10);
      const f = el.getAttribute('data-f') as 'prompt' | 'description';
      if (idx >= 0 && idx < this._currentParameters.length && f) {
        (this._currentParameters[idx] as any)[f] = (el as HTMLTextAreaElement | HTMLInputElement).value.trim() || null;
      }
    });
    list.querySelectorAll('input[type="checkbox"][data-idx]').forEach((el: Element) => {
      const idx = parseInt(el.getAttribute('data-idx') || '-1', 10);
      if (idx >= 0 && idx < this._currentParameters.length) {
        this._currentParameters[idx].enable_ai_audit = (el as HTMLInputElement).checked;
      }
    });

    const saveBtn = this._detailOverlay.querySelector('#detailSaveBtn') as HTMLButtonElement;
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

    const ok = await this.saveScorecardParameters(this._currentParameters);
    if (ok) {
      logInfo('[AIAuditView] Parameters saved');
      this._editMode = false;
      const eb = this._detailOverlay.querySelector('#detailToggleEdit') as HTMLButtonElement;
      if (eb) eb.textContent = 'Edit Prompts';
      if (saveBtn) { saveBtn.style.display = 'none'; saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }
      this.renderDetailParams();
    } else {
      alert('Failed to save. Please try again.');
      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }
    }
  }

  private async handleSubmitAIAudit(selectedPeople: Person[]): Promise<void> {
    const scorecardSelect = this.modalOverlay?.querySelector('#aiAuditScorecard') as HTMLSelectElement;
    const startDateInput = this.modalOverlay?.querySelector('#aiAuditStartDate') as HTMLInputElement;
    const endDateInput = this.modalOverlay?.querySelector('#aiAuditEndDate') as HTMLInputElement;
    const notifyMeCheckbox = this.modalOverlay?.querySelector('#notifyMeWhenDone') as HTMLInputElement;
    const notifyPeopleCheckbox = this.modalOverlay?.querySelector('#notifyAuditedPeople') as HTMLInputElement;
    const submitBtn = this.modalOverlay?.querySelector('#submitRunAIAudit') as HTMLButtonElement;

    if (!scorecardSelect || !startDateInput || !endDateInput) {
      logError('[AIAuditView] Modal elements not found');
      return;
    }

    const scorecardId = scorecardSelect.value;
    if (!scorecardId) {
      alert('Please select a scorecard');
      return;
    }

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before or equal to end date');
      return;
    }

    // Ensure dates are not in the future (only past conversations can be audited)
    const todayStr = new Date().toISOString().split('T')[0];
    if (endDate >= todayStr) {
      alert('End date must be before today — only past conversations can be audited.');
      return;
    }

    const notifyMe = notifyMeCheckbox?.checked || false;
    const notifyPeople = notifyPeopleCheckbox?.checked || false;

    // Extract Intercom admin IDs from selected people (filter out null/undefined values)
    const intercomAdminIds = selectedPeople
      .map(p => p.intercom_admin_id)
      .filter((id): id is string => id !== null && id !== undefined && id !== '');

    // Validate that at least one person has an Intercom admin ID
    if (intercomAdminIds.length === 0) {
      alert('None of the selected people have an Intercom admin ID. Please select people with valid Intercom admin IDs.');
      return;
    }

    // Build payload for Massive AI Audit API (one request per agent with 2s delay server-side)
    const payload = {
      scorecard_id: scorecardId,
      start_date: startDate,
      end_date: endDate,
      intercom_admin_ids: intercomAdminIds,
      notify_me_when_done: notifyMe,
      notify_results_to_audited_people: notifyPeople,
      agents: selectedPeople.map(p => ({
        intercom_admin_id: p.intercom_admin_id ?? undefined,
        email: p.email,
        name: p.name
      }))
    };

    logInfo('[AIAuditView] Submitting Massive AI Audit', payload);

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Starting…';
    }

    try {
      const { data, error } = await apiClient.postWithResult<{ success?: boolean; job_id?: string; status?: string; total_agents?: number }>(
        '/api/massive-ai-audit/start',
        payload
      );

      if (error) {
        const msg = typeof error.message === 'string' ? error.message : 'Failed to start audit';
        logError('[AIAuditView] Start API error:', error);
        alert(msg);
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Run Massive AI Audit';
        }
        return;
      }

      const jobId = data?.job_id ?? (data as any)?.job_id;
      if (jobId) {
        this.closeModal();
        const resultUrl = `/src/features/massive-ai-audit/presentation/massive-ai-audit-result.html?id=${encodeURIComponent(jobId)}`;
        window.location.href = resultUrl;
      } else {
        this.closeModal();
        alert(`AI Audit started for ${selectedPeople.length} people. ${notifyMe ? 'You will be notified when done.' : ''}`);
      }
    } catch (err) {
      logError('[AIAuditView] Error submitting Massive AI Audit:', err);
      alert(`Failed to start audit: ${err instanceof Error ? err.message : 'Unknown error'}`);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Run AI Audit';
      }
    }
  }

  private closeModal(): void {
    // Close detail modal first if open
    if (this._detailOverlay) {
      this.closeScorecardDetailModal();
    }

    if (this.modalOverlay) {
      const escapeHandler = (this.modalOverlay as any)?._escapeHandler;
      if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
      }

      this.modalOverlay.style.opacity = '0';
      this.modalOverlay.style.transition = 'opacity 0.2s ease';
      
      setTimeout(() => {
        if (this.modalOverlay) {
          this.modalOverlay.remove();
          this.modalOverlay = null;
        }
      }, 200);
    }
  }

  update(): void {
    if (this.stateManager && this.assignmentTabRenderer) {
      this.assignmentTabRenderer.refresh();
      this.updateFloatingButton();
    } else {
      this.render();
    }
  }

  getSelectedPeople(): Person[] {
    if (this.stateManager) {
      const state = this.stateManager.getState();
      return state.employees.filter(emp => state.selectedEmployees.has(emp.email)).map(emp => ({
        email: emp.email,
        name: emp.name,
        role: emp.designation ?? null,
        channel: emp.channel ?? null,
        team: emp.team ?? null,
        department: emp.department ?? null,
        country: emp.country ?? null,
        is_active: emp.is_active,
        intercom_admin_id: undefined
      }));
    }
    return this.people.filter(person => this.selectedPeople.has(person.email));
  }
}

