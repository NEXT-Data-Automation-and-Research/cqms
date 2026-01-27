/**
 * Audit Reports Controller
 * Main orchestrator for audit reports feature
 */

import { AuditReportsService } from '../application/audit-reports-service.js';
import { AuditReportsRenderer } from './audit-reports-renderer.js';
import { AuditReportsEventHandlers } from './audit-reports-events.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';
import type { 
  AuditReport, 
  AuditStats, 
  AuditFilters,
  DateRange,
  PaginationState
} from '../domain/entities.js';
import type { AuditReportsState } from '../domain/types.js';
import type { ScorecardInfo } from '../infrastructure/audit-reports-repository.js';

export class AuditReportsController {
  private service: AuditReportsService;
  private renderer: AuditReportsRenderer;
  private eventHandlers: AuditReportsEventHandlers;
  
  // State
  private audits: AuditReport[] = [];
  private filteredAudits: AuditReport[] = [];
  private stats: AuditStats | null = null;
  private filters: AuditFilters = {};
  private dateRange: DateRange | null = null;
  private currentScorecardId: string | null = null;
  private pagination: PaginationState = {
    currentPage: 1,
    itemsPerPage: 20,
    totalItems: 0,
    totalPages: 0
  };
  private isLoading = false;
  private isSyncing = false;
  private lastSyncTime: Date | null = null;
  private scorecards: ScorecardInfo[] = [];
  private currentUserEmail: string = '';
  private currentUserRole: string = '';
  private showAllAudits: boolean = false; // Default to false (safer - will be set correctly by applyRoleBasedSettings)

  constructor(service: AuditReportsService) {
    this.service = service;
    this.renderer = new AuditReportsRenderer(this);
    this.eventHandlers = new AuditReportsEventHandlers(this);
  }

  /**
   * Initialize the controller
   */
  initialize(): void {
    logInfo('Initializing audit reports controller...');
    this.initializeUserInfo();
    this.renderer.initializeUI();
    // Render filter panel (visible by default to match live site)
    // All filters are now rendered directly in HTML (no dynamic insertion needed)
    this.renderer.renderFilterPanel();
    // Filter panel is visible by default (matching live site behavior)
    this.eventHandlers.setupEventListeners();
    
    // Setup multi-select handlers (filters are already in HTML)
    this.setupMultiSelectHandlers();
    // Ensure header actions are visible
    const headerActions = document.getElementById('headerActions');
    if (headerActions && headerActions.children.length === 0) {
      this.renderer.renderHeaderActions();
    }
    
    // IMPORTANT: Apply role-based settings AFTER header is rendered
    // This ensures the "View All" button exists before we try to show/hide it
    this.applyRoleBasedSettings();
  }
  

  /**
   * Load initial data
   */
  async loadInitialData(): Promise<void> {
    try {
      this.isLoading = true;
      this.renderer.showLoading();
      // Show skeleton loaders for KPI cards
      this.renderer.showStatsLoading();

      // Load scorecards first
      await this.loadScorecards();

      // Load audits
      await this.loadAudits();

      this.renderer.hideLoading();
    } catch (error) {
      logError('Error loading initial data:', error);
      this.renderer.showError('Failed to load data. Please refresh the page.');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Initialize user info
   */
  private initializeUserInfo(): void {
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      console.log('[AuditReports] 📋 Raw localStorage userInfo:', userInfoStr);
      
      const userInfo = JSON.parse(userInfoStr || '{}');
      console.log('[AuditReports] 📋 Parsed userInfo:', userInfo);
      
      this.currentUserEmail = (userInfo.email || '').toLowerCase().trim();
      this.currentUserRole = userInfo.role || '';
      
      console.log('[AuditReports] 👤 User info extracted:', {
        email: this.currentUserEmail,
        role: this.currentUserRole
      });
      
      // If role is missing, assume restricted user (Employee) for safety
      // This ensures employees don't see all audits by default
      // The role will be fetched and updated asynchronously
      if (!this.currentUserRole && this.currentUserEmail) {
        // Temporarily set to empty string (which is treated as restricted)
        // This will be updated when we fetch the actual role
        logInfo('[AuditReports] Role missing, assuming restricted user until role is fetched');
      }
      
      // Apply initial role-based settings
      this.applyRoleBasedSettings();
      
      // If role is missing, try to fetch it from the database
      if (!this.currentUserRole && this.currentUserEmail) {
        this.fetchAndApplyUserRole();
      }
    } catch (error) {
      logError('Error initializing user info:', error);
      // On error, assume restricted user for safety
      this.currentUserRole = '';
      this.applyRoleBasedSettings();
    }
  }

  /**
   * Apply role-based settings for visibility and controls
   */
  private applyRoleBasedSettings(): void {
    // Roles that can only see their own audits (not all)
    // Based on access_control_rules: view_all_audits requires min_role_level: 2
    // Level 0: General User, Level 1: Employee -> cannot view all audits
    // IMPORTANT: If role is missing/undefined, treat as restricted for safety
    const restrictedRoles = ['Employee', 'General User', ''];
    const isRestrictedUser = !this.currentUserRole || restrictedRoles.includes(this.currentUserRole);
    
    // Restricted users start with their own audits only
    // Non-restricted users (Quality Analyst, Auditor, Manager, Admin, Super Admin) see all by default
    this.showAllAudits = !isRestrictedUser;
    
    console.log('[AuditReports] 🎭 Applied role-based settings:', {
      role: this.currentUserRole || '(missing)',
      isRestrictedUser,
      showAllAudits: this.showAllAudits,
      currentUserEmail: this.currentUserEmail
    });
    logInfo('[AuditReports] Applied role-based settings:', {
      role: this.currentUserRole || '(missing)',
      isRestrictedUser,
      showAllAudits: this.showAllAudits,
      currentUserEmail: this.currentUserEmail
    });
    
    // Show "View All" button for restricted users (they can toggle to see all)
    this.renderer.toggleViewAllButton(isRestrictedUser);
    
    // Update button state and show mode indicator for restricted users
    if (isRestrictedUser) {
      this.renderer.updateViewAllButtonState(this.showAllAudits);
      this.renderer.showEmployeeModeIndicator(this.showAllAudits, this.currentUserEmail);
    } else {
      this.renderer.hideEmployeeModeIndicator();
    }
  }

  /**
   * Fetch user role from database if not available in localStorage
   */
  private async fetchAndApplyUserRole(): Promise<void> {
    try {
      const { getSecureSupabase } = await import('../../../utils/secure-supabase.js');
      const supabase = await getSecureSupabase(false);
      
      const { data: peopleData, error } = await supabase
        .from('people')
        .select('role, department, designation')
        .eq('email', this.currentUserEmail)
        .maybeSingle();
      
      if (!error && peopleData?.role) {
        this.currentUserRole = peopleData.role;
        
        // Update localStorage with the role
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        userInfo.role = peopleData.role;
        if (peopleData.department) userInfo.department = peopleData.department;
        if (peopleData.designation) userInfo.designation = peopleData.designation;
        localStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        logInfo('[AuditReports] Fetched user role from database:', peopleData.role);
        
        // Re-apply role-based settings with the new role
        this.applyRoleBasedSettings();
        
        // Reload audits with the correct filter
        this.loadAudits();
      }
    } catch (error) {
      logError('Error fetching user role:', error);
    }
  }

  /**
   * Load scorecards
   */
  async loadScorecards(): Promise<void> {
    try {
      this.scorecards = await this.service.loadScorecards();
      this.renderer.renderScorecardSelector(this.scorecards);
    } catch (error) {
      logError('Error loading scorecards:', error);
    }
  }

  /**
   * Load audits
   */
  async loadAudits(): Promise<void> {
    try {
      this.isLoading = true;
      this.renderer.showLoading();
      
      // Determine if we should filter by employee email
      // Restricted roles (Employee, General User, or empty) should only see their own audits
      // unless they've toggled "View All"
      const restrictedRoles = ['Employee', 'General User', ''];
      const isRestrictedUser = !this.currentUserRole || restrictedRoles.includes(this.currentUserRole);
      
      // For restricted users, filter by their email unless they've toggled "View All"
      // CRITICAL: If restricted user has no email, don't show any audits (safer than showing all)
      let employeeEmail: string | undefined = undefined;
      if (isRestrictedUser && !this.showAllAudits) {
        if (this.currentUserEmail) {
          employeeEmail = this.currentUserEmail.toLowerCase().trim();
        } else {
          // Restricted user with no email - show no audits for safety
          logInfo('[AuditReports] Restricted user has no email - showing no audits');
          this.audits = [];
          this.filteredAudits = [];
          this.stats = this.service.calculateStats([]);
          this.renderer.renderStats(this.stats);
          this.renderer.renderAudits([], this.pagination, false);
          this.renderer.renderPagination(this.pagination);
          this.renderer.hideLoading();
          return;
        }
      }

      // Debug logging - use console.log to ensure it shows in browser
      console.log('[AuditReports] 🔍 Loading audits with params:', {
        role: this.currentUserRole || '(missing)',
        isRestrictedUser,
        currentUserEmail: this.currentUserEmail || '(missing)',
        employeeEmail: employeeEmail || '(not filtering)',
        showAllAudits: this.showAllAudits
      });
      logInfo('[AuditReports] Loading audits:', {
        role: this.currentUserRole || '(missing)',
        isRestrictedUser,
        currentUserEmail: this.currentUserEmail || '(missing)',
        employeeEmail: employeeEmail || '(not filtering)',
        showAllAudits: this.showAllAudits
      });

      this.audits = await this.service.loadAudits(
        this.currentScorecardId,
        employeeEmail,
        this.showAllAudits
      );

      // Apply filters first
      this.applyFilters();

      // Calculate stats from filtered audits
      this.stats = this.service.calculateStats(this.filteredAudits);

      // Update pagination
      this.updatePagination();

      // Render
      this.renderer.renderStats(this.stats);
      this.renderer.renderAudits(this.filteredAudits, this.pagination, this.hasActiveFilters());
      this.renderer.renderPagination(this.pagination);
      
      // Re-render filter panel to update multi-select options with new audit data
      // All filters are rendered directly in HTML, so just re-render the panel
      this.renderer.renderFilterPanel();
      this.setupMultiSelectHandlers();

      this.lastSyncTime = new Date();
      this.renderer.updateSyncTime(this.lastSyncTime);
      
      // Hide loading after successful render
      this.renderer.hideLoading();
    } catch (error) {
      logError('Error loading audits:', error);
      this.renderer.hideLoading();
      this.renderer.showError('Failed to load audits. Please try again.');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Apply filters to audits
   */
  applyFilters(): void {
    this.filteredAudits = this.service.filterAudits(
      this.audits,
      this.filters,
      this.dateRange
    );
    this.updatePagination();
  }

  /**
   * Update pagination state
   */
  private updatePagination(): void {
    this.pagination.totalItems = this.filteredAudits.length;
    this.pagination.totalPages = Math.ceil(
      this.pagination.totalItems / this.pagination.itemsPerPage
    );
    this.pagination.currentPage = Math.min(
      this.pagination.currentPage,
      Math.max(1, this.pagination.totalPages)
    );
  }

  /**
   * Get paginated audits
   */
  getPaginatedAudits(): AuditReport[] {
    const start = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
    const end = start + this.pagination.itemsPerPage;
    return this.filteredAudits.slice(start, end);
  }

  /**
   * Set filters
   */
  setFilters(filters: AuditFilters): void {
    this.filters = { ...this.filters, ...filters };
    this.applyFilters();
    this.renderer.renderStats(this.stats);
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination, this.hasActiveFilters());
  }

  /**
   * Clear all filters
   */
  clearAllFilters(): void {
    this.filters = {};
    this.dateRange = null;
    // Clear all filter input fields (support both old and new IDs)
    const inputs = [
      'searchInput', 'auditIdSearch', 
      'interactionIdFilter', 'interactionIdSearch',
      'weekFilter', 'weekSearch',
      'minScoreFilter', 'minScore', 'maxScoreFilter', 'maxScore',
      'minErrorsFilter', 'minErrors', 'maxErrorsFilter', 'maxErrors',
      'dateFromFilter', 'fromDate', 'dateToFilter', 'toDate'
    ];
    inputs.forEach(id => {
      const el = document.getElementById(id) as HTMLInputElement;
      if (el) el.value = '';
    });
    
    // Clear all multi-select filters
    const multiSelectFilters = [
      'auditorNameFilter', 'employeeNameFilter', 'auditTypeFilter', 'statusFilter',
      'quarterFilter', 'channelFilter', 'employeeTypeFilter', 'countryFilter',
      'validationStatusFilter', 'acknowledgementStatusFilter',
      'agentPreStatusFilter', 'agentPostStatusFilter'
    ];
    multiSelectFilters.forEach(filterId => {
      const checkboxes = document.querySelectorAll(`#${filterId}Options input[type="checkbox"]`) as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(cb => cb.checked = false);
      const hiddenInput = document.getElementById(filterId) as HTMLInputElement;
      if (hiddenInput) hiddenInput.value = '';
      const trigger = document.getElementById(`${filterId}Trigger`);
      if (trigger) {
        const placeholder = trigger.querySelector('.multi-select-placeholder') as HTMLElement;
        const countBadge = trigger.querySelector('.multi-select-count') as HTMLElement;
        if (placeholder) {
          const originalPlaceholder = placeholder.getAttribute('data-original') || 
                                      trigger.getAttribute('data-placeholder') || 
                                      'Select...';
          placeholder.textContent = originalPlaceholder;
        }
        if (countBadge) {
          countBadge.style.display = 'none';
          countBadge.textContent = '';
        }
        trigger.classList.remove('active');
      }
    });
    
    this.applyFilters();
    this.renderer.renderStats(this.stats);
    this.renderer.renderFilterPanel();
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination, false);
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(): boolean {
    const hasFilterValues = Object.values(this.filters).some(value => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== undefined && value !== null;
    });
    return hasFilterValues || this.dateRange !== null;
  }

  /**
   * Format date to YYYY-MM-DD in local timezone (not UTC)
   */
  private formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Format date as "15 Jan 2026"
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  /**
   * Format date range for display
   */
  private formatDateRange(startDate: string, endDate: string): string {
    const start = this.formatDate(startDate);
    const end = this.formatDate(endDate);
    
    // If same date, show only once
    if (startDate === endDate) {
      return start;
    }
    
    return `${start} to ${end}`;
  }

  /**
   * Set date range
   */
  setDateRange(dateRange: DateRange | null): void {
    this.dateRange = dateRange;
    
    // Update date input fields if date range is set
    if (dateRange) {
      const startDateInput = document.getElementById('startDate') as HTMLInputElement;
      const endDateInput = document.getElementById('endDate') as HTMLInputElement;
      if (startDateInput) startDateInput.value = dateRange.startDate;
      if (endDateInput) endDateInput.value = dateRange.endDate;
      
      // Update date button text with formatted date
      const dateBtnText = document.getElementById('dateBtnText');
      if (dateBtnText) {
        dateBtnText.textContent = this.formatDateRange(dateRange.startDate, dateRange.endDate);
      }
    } else {
      // Clear date inputs if date range is cleared
      const startDateInput = document.getElementById('startDate') as HTMLInputElement;
      const endDateInput = document.getElementById('endDate') as HTMLInputElement;
      if (startDateInput) startDateInput.value = '';
      if (endDateInput) endDateInput.value = '';
      
      // Reset date button text
      const dateBtnText = document.getElementById('dateBtnText');
      if (dateBtnText) dateBtnText.textContent = 'Date Range';
    }
    
    this.applyFilters();
    this.renderer.renderStats(this.stats);
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination, this.hasActiveFilters());
  }

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    this.filters.searchQuery = query || undefined;
    this.applyFilters();
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination, this.hasActiveFilters());
  }

  /**
   * Set current scorecard
   */
  setScorecard(scorecardId: string | null): void {
    this.currentScorecardId = scorecardId;
    this.pagination.currentPage = 1;
    this.loadAudits();
  }

  /**
   * Set current page
   */
  setPage(page: number): void {
    this.pagination.currentPage = page;
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination, this.hasActiveFilters());
    this.renderer.renderPagination(this.pagination);
    // Scroll to top of audit list to maintain consistent position
    this.scrollToAuditList();
  }

  /**
   * Scroll to audit list (for pagination)
   */
  private scrollToAuditList(): void {
    const auditList = document.getElementById('auditList');
    if (auditList) {
      const listTop = auditList.offsetTop - 20; // 20px offset for better visibility
      window.scrollTo({ top: listTop, behavior: 'smooth' });
    }
  }

  /**
   * Toggle view all audits (for restricted users like Employees and General Users)
   */
  toggleViewAll(): void {
    // Only allow toggle for restricted roles
    const restrictedRoles = ['Employee', 'General User', ''];
    if (!restrictedRoles.includes(this.currentUserRole)) return;
    
    this.showAllAudits = !this.showAllAudits;
    this.pagination.currentPage = 1;
    
    // Update button state and mode indicator
    this.renderer.updateViewAllButtonState(this.showAllAudits);
    this.renderer.showEmployeeModeIndicator(this.showAllAudits, this.currentUserEmail);
    
    this.loadAudits();
  }

  /**
   * Delete audit
   */
  async deleteAudit(audit: AuditReport): Promise<void> {
    if (!audit._scorecard_table || !audit.id) {
      throw new Error('Invalid audit data');
    }

    const auditorEmail = audit.auditorEmail || audit.auditor_email;
    if (typeof auditorEmail !== 'string') {
      throw new Error('Invalid auditor email');
    }
    await this.service.deleteAudit(
      audit._scorecard_table,
      audit.id,
      auditorEmail,
      this.currentUserEmail
    );

    // Reload audits
    await this.loadAudits();
  }

  /**
   * Export audits to CSV
   */
  async exportToCSV(): Promise<void> {
    const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    const originalText = exportBtn?.textContent || 'Export';
    
    try {
      // Show progress
      if (exportBtn) {
        exportBtn.disabled = true;
        exportBtn.textContent = 'Exporting...';
        exportBtn.style.opacity = '0.7';
      }

      // Small delay to show progress state
      await new Promise(resolve => setTimeout(resolve, 100));

      const csv = this.service.exportToCSV(this.filteredAudits);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-reports-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      // Show success feedback
      const { showToast } = await import('../../../utils/toast.js');
      showToast({ message: 'Export completed successfully', type: 'success', duration: 2000 });
    } catch (error) {
      logError('Error exporting CSV:', error);
      const { showToast } = await import('../../../utils/toast.js');
      showToast({ message: 'Export failed. Please try again.', type: 'error' });
    } finally {
      // Re-enable button
      if (exportBtn) {
        exportBtn.disabled = false;
        exportBtn.textContent = originalText;
        exportBtn.style.opacity = '1';
      }
    }
  }

  /**
   * Force sync
   */
  async forceSync(): Promise<void> {
    if (this.isSyncing) return;
    
    try {
      this.isSyncing = true;
      this.renderer.setSyncState(true);
      await this.loadAudits();
    } finally {
      this.isSyncing = false;
      this.renderer.setSyncState(false);
    }
  }

  // Getters for renderer/event handlers
  getState(): AuditReportsState {
    return {
      audits: this.audits,
      filteredAudits: this.filteredAudits,
      stats: this.stats || {
        total: 0,
        totalScores: 0,
        auditsWithScores: 0,
        avgScore: 0,
        passing: 0,
        passRate: 0,
        totalCriticalErrors: 0,
        totalErrors: 0,
        criticalErrorRate: 0,
        avgErrorsPerAudit: 0,
        reversals: 0,
        reversalRate: 0,
        acknowledged: 0,
        pendingAcknowledgments: 0,
        notPassing: 0
      },
      filters: this.filters,
      dateRange: this.dateRange,
      currentScorecardId: this.currentScorecardId,
      pagination: this.pagination,
      isLoading: this.isLoading,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime
    };
  }

  getService(): AuditReportsService {
    return this.service;
  }

  getCurrentUserEmail(): string {
    return this.currentUserEmail;
  }

  getCurrentUserRole(): string {
    return this.currentUserRole;
  }

  getScorecards(): ScorecardInfo[] {
    return this.scorecards;
  }

  /**
   * Get repository (for modal to load parameters)
   */
  getRepository(): any {
    return (this.service as any).repository;
  }

  /**
   * Render filter panel (public accessor for event handlers)
   */
  renderFilterPanel(): void {
    this.renderer.renderFilterPanel();
  }

  /**
   * Populate multi-select filters if needed (public method for event handlers)
   */
  async populateMultiSelectFiltersIfNeeded(): Promise<void> {
    const multiSelectContainer = document.getElementById('multiSelectFilters');
    if (!multiSelectContainer) {
      console.warn('multiSelectFilters container not found when trying to populate');
      return;
    }

    // Always populate filters (even if no audits) to show all filter fields
    // This ensures all filters appear as the user requested
    logInfo('Populating multi-select filters (showing all fields)...');
    await this.populateMultiSelectFilters();
  }

  /**
   * Populate multi-select filters with unique values from audits
   */
  private async populateMultiSelectFilters(): Promise<void> {
    const multiSelectContainer = document.getElementById('multiSelectFilters');
    const allFiltersGrid = document.getElementById('allFiltersGrid');
    
    if (!multiSelectContainer || !allFiltersGrid) {
      logError('multiSelectFilters container or allFiltersGrid not found');
      return;
    }

    try {
      const { renderMultiSelectFilters } = await import('./renderers/multi-select-filter-renderer.js');
      
      // Clear any existing multi-select filters from grid
      allFiltersGrid.querySelectorAll('.multi-select-container').forEach(el => {
        const filterGroup = el.closest('.filter-group');
        if (filterGroup) filterGroup.remove();
      });
      
      // Render multi-select filters - always show all filters even if no audits/data
      // This ensures all filter fields appear as the user requested
      renderMultiSelectFilters(multiSelectContainer, this.audits, this.filters);
      
      // Setup multi-select event handlers
      this.setupMultiSelectHandlers();
      
      const filterCount = allFiltersGrid.querySelectorAll('.multi-select-container').length;
      logInfo(`Populated ${filterCount} multi-select filter dropdowns into grid (all fields shown)`);
    } catch (error) {
      logError('Error populating multi-select filters:', error);
    }
  }

  /**
   * Setup multi-select filter event handlers
   */
  private setupMultiSelectHandlers(): void {
    // Make functions available globally for onclick handlers
    (window as any).toggleMultiSelect = (filterId: string) => {
      const dropdown = document.getElementById(`${filterId}Dropdown`);
      const trigger = document.getElementById(`${filterId}Trigger`) as HTMLButtonElement;
      
      if (!dropdown || !trigger) return;

      // Allow toggling even if disabled (to show "No options" message)
      const isOpen = dropdown.style.display !== 'none';
      
      // Close all other dropdowns
      document.querySelectorAll('.multi-select-dropdown').forEach((el: any) => {
        if (el.id !== `${filterId}Dropdown`) {
          el.style.display = 'none';
        }
      });
      
      // Toggle this dropdown (works even if button is disabled)
      dropdown.style.display = isOpen ? 'none' : 'block';
      trigger.classList.toggle('active', !isOpen);
    };

    (window as any).updateMultiSelect = (filterId: string) => {
      const checkboxes = document.querySelectorAll(`#${filterId}Options input[type="checkbox"]:checked`) as NodeListOf<HTMLInputElement>;
      const selectedValues = Array.from(checkboxes).map(cb => cb.value);
      const hiddenInput = document.getElementById(filterId) as HTMLInputElement;
      const trigger = document.getElementById(`${filterId}Trigger`);
      
      if (hiddenInput) {
        hiddenInput.value = selectedValues.join(',');
      }
      
      if (trigger) {
        const count = selectedValues.length;
        const placeholder = trigger.querySelector('.multi-select-placeholder');
        const countBadge = trigger.querySelector('.multi-select-count');
        
        // Get original placeholder from the placeholder element or trigger's data attribute
        const originalPlaceholder = placeholder?.getAttribute('data-original') || 
                                    trigger.getAttribute('data-placeholder') || 
                                    (placeholder?.textContent && count === 0 ? placeholder.textContent : 'Select...');
        
        if (placeholder) {
          placeholder.textContent = count > 0 ? `${count} selected` : originalPlaceholder;
        }
        
        if (count > 0) {
          // Show count badge
          const existingBadge = trigger.querySelector('.multi-select-count');
          if (!existingBadge) {
            const badge = document.createElement('span');
            badge.className = 'multi-select-count';
            badge.id = `${filterId}Count`;
            badge.textContent = count.toString();
            badge.style.display = 'inline';
            const svg = trigger.querySelector('svg');
            if (svg) {
              trigger.insertBefore(badge, svg);
            } else {
              trigger.appendChild(badge);
            }
          } else {
            existingBadge.textContent = count.toString();
            (existingBadge as HTMLElement).style.display = 'inline';
          }
          trigger.classList.add('active');
        } else {
          // Hide count badge
          if (countBadge) {
            (countBadge as HTMLElement).style.display = 'none';
            countBadge.textContent = '';
          }
          trigger.classList.remove('active');
        }
      }
      
      // Update filters in controller
      this.updateFiltersFromMultiSelect(filterId, selectedValues);
    };

    (window as any).selectAllMultiSelect = (filterId: string) => {
      const checkboxes = document.querySelectorAll(`#${filterId}Options input[type="checkbox"]`) as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(cb => cb.checked = true);
      (window as any).updateMultiSelect(filterId);
    };

    (window as any).clearMultiSelect = (filterId: string) => {
      const checkboxes = document.querySelectorAll(`#${filterId}Options input[type="checkbox"]`) as NodeListOf<HTMLInputElement>;
      checkboxes.forEach(cb => cb.checked = false);
      (window as any).updateMultiSelect(filterId);
    };

    (window as any).filterMultiSelectOptions = (filterId: string) => {
      const searchInput = document.getElementById(`${filterId}Search`) as HTMLInputElement;
      const options = document.querySelectorAll(`#${filterId}Options .multi-select-option`);
      const searchTerm = searchInput?.value.toLowerCase() || '';
      
      options.forEach((option: Element) => {
        const label = option.querySelector('label')?.textContent?.toLowerCase() || '';
        const shouldShow = label.includes(searchTerm);
        option.classList.toggle('hidden', !shouldShow);
      });
    };

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.multi-select-container') && !target.closest('.multi-select-dropdown')) {
        document.querySelectorAll('.multi-select-dropdown').forEach((el: any) => {
          el.style.display = 'none';
        });
        document.querySelectorAll('.multi-select-trigger').forEach((el: any) => {
          el.classList.remove('active');
        });
      }
    });
  }

  /**
   * Update filters from multi-select values
   */
  private updateFiltersFromMultiSelect(filterId: string, selectedValues: string[]): void {
    const filterMap: Record<string, keyof typeof this.filters> = {
      'auditorNameFilter': 'auditorNames',
      'employeeNameFilter': 'employeeNames',
      'channelFilter': 'channels',
      'auditTypeFilter': 'auditTypes',
      'statusFilter': 'statuses',
      'quarterFilter': 'quarters',
      'employeeTypeFilter': 'employeeTypes',
      'countryFilter': 'countries',
      'validationStatusFilter': 'validationStatuses',
      'acknowledgementStatusFilter': 'acknowledgementStatuses',
      'agentPreStatusFilter': 'agentPreStatuses',
      'agentPostStatusFilter': 'agentPostStatuses'
    };

    const filterKey = filterMap[filterId];
    if (filterKey) {
      if (selectedValues.length > 0) {
        this.filters[filterKey] = selectedValues as any;
      } else {
        delete this.filters[filterKey];
      }
      this.applyFilters();
      this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination, this.hasActiveFilters());
    }
  }
}

