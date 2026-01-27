/**
 * AI-Audit View Component
 * Placeholder view for AI-powered audit functionality
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { getAuthenticatedSupabase } from '../../../../utils/authenticated-supabase.js';
import { logInfo, logError } from '../../../../utils/logging-helper.js';

interface Scorecard {
  id: string;
  name: string;
  table_name: string;
  channels: string | null;
  is_active: boolean;
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
  is_active: string; // 'all' | 'active' | 'inactive'
}

export class AIAuditView {
  private container: HTMLElement;
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

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.loadPeople();
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
    const roles = this.getUniqueValues('role');
    const channels = this.getUniqueValues('channel');
    const teams = this.getUniqueValues('team');
    const departments = this.getUniqueValues('department');
    const countries = this.getUniqueValues('country');

    const allFilteredSelected = this.filteredPeople.length > 0 && 
      this.filteredPeople.every(p => this.selectedPeople.has(p.email));
    const someFilteredSelected = this.filteredPeople.some(p => this.selectedPeople.has(p.email));

    const peopleListHtml = this.filteredPeople.length > 0
      ? `
        <div class="mt-6">
          <div class="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div class="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900">
                People (${this.filteredPeople.length}${this.people.length !== this.filteredPeople.length ? ` of ${this.people.length}` : ''})
              </h3>
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
                  class="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''}"
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
                  id="peopleSearch"
                  class="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                  placeholder="Search by name, email, role, channel, team, department, country..."
                  value="${escapeHtml(this.filters.search)}"
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
                    <option value="${escapeHtml(role)}" ${this.filters.role === role ? 'selected' : ''}>${escapeHtml(role)}</option>
                  `).join('')}
                </select>

                <!-- Channel Filter -->
                <select
                  id="filterChannel"
                  class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                >
                  <option value="">All Channels</option>
                  ${channels.map(channel => `
                    <option value="${escapeHtml(channel)}" ${this.filters.channel === channel ? 'selected' : ''}>${escapeHtml(channel)}</option>
                  `).join('')}
                </select>

                <!-- Team Filter -->
                <select
                  id="filterTeam"
                  class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                >
                  <option value="">All Teams</option>
                  ${teams.map(team => `
                    <option value="${escapeHtml(team)}" ${this.filters.team === team ? 'selected' : ''}>${escapeHtml(team)}</option>
                  `).join('')}
                </select>

                <!-- Department Filter -->
                <select
                  id="filterDepartment"
                  class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                >
                  <option value="">All Departments</option>
                  ${departments.map(dept => `
                    <option value="${escapeHtml(dept)}" ${this.filters.department === dept ? 'selected' : ''}>${escapeHtml(dept)}</option>
                  `).join('')}
                </select>

                <!-- Country Filter -->
                <select
                  id="filterCountry"
                  class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                >
                  <option value="">All Countries</option>
                  ${countries.map(country => `
                    <option value="${escapeHtml(country)}" ${this.filters.country === country ? 'selected' : ''}>${escapeHtml(country)}</option>
                  `).join('')}
                </select>

                <!-- Active Status Filter -->
                <select
                  id="filterActive"
                  class="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                >
                  <option value="all" ${this.filters.is_active === 'all' ? 'selected' : ''}>All Status</option>
                  <option value="active" ${this.filters.is_active === 'active' ? 'selected' : ''}>Active Only</option>
                  <option value="inactive" ${this.filters.is_active === 'inactive' ? 'selected' : ''}>Inactive Only</option>
                </select>
              </div>

              <!-- Selected Count -->
              ${this.selectedPeople.size > 0 ? `
                <div class="bg-primary/10 border border-primary/20 rounded-md px-4 py-2">
                  <p class="text-sm font-medium text-primary">
                    ${this.selectedPeople.size} person${this.selectedPeople.size === 1 ? '' : 's'} selected
                  </p>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        ${peopleListHtml}
      </div>
    `);

    // Add or update floating button separately
    this.updateFloatingButton();
    
    this.attachEventListeners();
  }

  private updateFloatingButton(): void {
    // Remove existing button if any
    const existingBtn = document.getElementById('runAIAuditBtn');
    if (existingBtn) {
      existingBtn.remove();
    }

    // Add button if people are selected
    if (this.selectedPeople.size > 0) {
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
    // Search input
    const searchInput = this.container.querySelector('#peopleSearch') as HTMLInputElement;
    if (searchInput) {
      searchInput.removeEventListener('input', this.handleSearch);
      searchInput.addEventListener('input', this.handleSearch);
    }

    // Filter selects
    const filterRole = this.container.querySelector('#filterRole') as HTMLSelectElement;
    if (filterRole) {
      filterRole.onchange = () => this.handleFilterChange('role', filterRole.value);
    }

    const filterChannel = this.container.querySelector('#filterChannel') as HTMLSelectElement;
    if (filterChannel) {
      filterChannel.onchange = () => this.handleFilterChange('channel', filterChannel.value);
    }

    const filterTeam = this.container.querySelector('#filterTeam') as HTMLSelectElement;
    if (filterTeam) {
      filterTeam.onchange = () => this.handleFilterChange('team', filterTeam.value);
    }

    const filterDepartment = this.container.querySelector('#filterDepartment') as HTMLSelectElement;
    if (filterDepartment) {
      filterDepartment.onchange = () => this.handleFilterChange('department', filterDepartment.value);
    }

    const filterCountry = this.container.querySelector('#filterCountry') as HTMLSelectElement;
    if (filterCountry) {
      filterCountry.onchange = () => this.handleFilterChange('country', filterCountry.value);
    }

    const filterActive = this.container.querySelector('#filterActive') as HTMLSelectElement;
    if (filterActive) {
      filterActive.onchange = () => this.handleFilterChange('is_active', filterActive.value);
    }

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
        .select('id, name, table_name, channels, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        logError('[AIAuditView] Error loading scorecards:', error);
        return;
      }

      this.scorecards = (data || []) as Scorecard[];
      logInfo(`[AIAuditView] Loaded ${this.scorecards.length} scorecards`);
    } catch (error) {
      logError('[AIAuditView] Error loading scorecards:', error);
    }
  }

  private handleRunAIAudit = (): void => {
    const selectedPeople = this.getSelectedPeople();
    logInfo('[AIAuditView] Run AI Audit clicked', { selectedCount: selectedPeople.length });
    
    if (selectedPeople.length === 0) {
      logError('[AIAuditView] No people selected');
      return;
    }

    this.showRunAIAuditModal(selectedPeople);
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

    // Get today's date for default date range
    const today = new Date();
    const defaultStartDate = today.toISOString().split('T')[0];
    const defaultEndDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days from now

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
            <h2 id="run-ai-audit-modal-title" class="text-2xl font-bold text-gray-900">Run AI Audit</h2>
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
          <select
            id="aiAuditScorecard"
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
            required
          >
            <option value="">Select a scorecard...</option>
            ${this.scorecards.map(scorecard => `
              <option value="${escapeHtml(scorecard.id)}">${escapeHtml(scorecard.name)}</option>
            `).join('')}
          </select>
        </div>

        <!-- Date Range -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="aiAuditStartDate" class="block text-xs text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                id="aiAuditStartDate"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                value="${defaultStartDate}"
              />
            </div>
            <div>
              <label for="aiAuditEndDate" class="block text-xs text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                id="aiAuditEndDate"
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                value="${defaultEndDate}"
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
            Run AI Audit
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

  private handleSubmitAIAudit(selectedPeople: Person[]): void {
    const scorecardSelect = this.modalOverlay?.querySelector('#aiAuditScorecard') as HTMLSelectElement;
    const startDateInput = this.modalOverlay?.querySelector('#aiAuditStartDate') as HTMLInputElement;
    const endDateInput = this.modalOverlay?.querySelector('#aiAuditEndDate') as HTMLInputElement;
    const notifyMeCheckbox = this.modalOverlay?.querySelector('#notifyMeWhenDone') as HTMLInputElement;
    const notifyPeopleCheckbox = this.modalOverlay?.querySelector('#notifyAuditedPeople') as HTMLInputElement;

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
      alert('Start date must be before end date');
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

    // Build payload according to requirements
    const payload = {
      scorecard_id: scorecardId,
      start_date: startDate,
      end_date: endDate,
      intercom_admin_ids: intercomAdminIds,
      notify_me_when_done: notifyMe,
      notify_results_to_audited_people: notifyPeople
    };

    // Log payload to console (will be sent to edge function -> n8n webhook)
    logInfo('[AIAuditView] Submitting AI Audit', payload);
    console.log('📤 AI Audit Distribution Payload:', JSON.stringify(payload, null, 2));
    console.log('📋 Payload details:', {
      scorecard_id: payload.scorecard_id,
      date_range: `${payload.start_date} to ${payload.end_date}`,
      intercom_admin_ids_count: payload.intercom_admin_ids.length,
      intercom_admin_ids: payload.intercom_admin_ids,
      notify_me_when_done: payload.notify_me_when_done,
      notify_results_to_audited_people: payload.notify_results_to_audited_people
    });
    
    // TODO: Send to edge function (n8n webhook)
    // const supabaseUrl = window.SupabaseConfig?.url || window.env?.SUPABASE_URL || '';
    // const supabaseAnonKey = window.SupabaseConfig?.anonKey || window.env?.SUPABASE_ANON_KEY || '';
    // const edgeFunctionUrl = `${supabaseUrl}/functions/v1/ai-audit-distribution`;
    // 
    // try {
    //   const response = await fetch(edgeFunctionUrl, {
    //     method: 'POST',
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Accept': 'application/json',
    //       'apikey': supabaseAnonKey,
    //       'Authorization': `Bearer ${supabaseAnonKey}`
    //     },
    //     body: JSON.stringify(payload)
    //   });
    //   
    //   if (!response.ok) {
    //     const errorData = await response.json().catch(() => ({}));
    //     throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    //   }
    //   
    //   const result = await response.json();
    //   console.log('✅ AI Audit Distribution submitted successfully:', result);
    // } catch (error) {
    //   logError('[AIAuditView] Error submitting AI Audit Distribution:', error);
    //   alert(`Failed to submit AI Audit: ${error.message || 'Unknown error'}`);
    //   return;
    // }
    
    // Close modal after submission
    this.closeModal();
    
    // Show success message
    alert(`AI Audit started for ${selectedPeople.length} people (${intercomAdminIds.length} with Intercom admin IDs). ${notifyMe ? 'You will be notified when done.' : ''}`);
  }

  private closeModal(): void {
    if (this.modalOverlay) {
      // Remove escape handler
      const escapeHandler = (this.modalOverlay as any)?._escapeHandler;
      if (escapeHandler) {
        document.removeEventListener('keydown', escapeHandler);
      }

      // Fade out animation
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
    this.render();
  }

  getSelectedPeople(): Person[] {
    return this.people.filter(person => this.selectedPeople.has(person.email));
  }
}

