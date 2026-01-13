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
  private showAllAudits: boolean = true;

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
    // Render filter panel initially (hidden) so elements exist for event listeners
    this.renderer.renderFilterPanel();
    this.eventHandlers.setupEventListeners();
  }

  /**
   * Load initial data
   */
  async loadInitialData(): Promise<void> {
    try {
      this.isLoading = true;
      this.renderer.showLoading();

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
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      this.currentUserEmail = (userInfo.email || '').toLowerCase().trim();
      this.currentUserRole = userInfo.role || '';
      this.showAllAudits = this.currentUserRole !== 'Employee';
      
      // Show "View All" button for employees
      this.renderer.toggleViewAllButton(this.currentUserRole === 'Employee');
    } catch (error) {
      logError('Error initializing user info:', error);
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
      
      const employeeEmail = this.currentUserRole === 'Employee' && !this.showAllAudits
        ? this.currentUserEmail
        : undefined;

      this.audits = await this.service.loadAudits(
        this.currentScorecardId,
        employeeEmail,
        this.showAllAudits
      );

      // Calculate stats
      this.stats = this.service.calculateStats(this.audits);

      // Apply filters
      this.applyFilters();

      // Update pagination
      this.updatePagination();

      // Render
      this.renderer.renderStats(this.stats);
      this.renderer.renderAudits(this.filteredAudits, this.pagination);
      this.renderer.renderPagination(this.pagination);

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
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination);
  }

  /**
   * Set date range
   */
  setDateRange(dateRange: DateRange | null): void {
    this.dateRange = dateRange;
    this.applyFilters();
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination);
  }

  /**
   * Set search query
   */
  setSearchQuery(query: string): void {
    this.filters.searchQuery = query || undefined;
    this.applyFilters();
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination);
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
    this.renderer.renderAudits(this.getPaginatedAudits(), this.pagination);
    this.renderer.renderPagination(this.pagination);
  }

  /**
   * Toggle view all audits (for employees)
   */
  toggleViewAll(): void {
    if (this.currentUserRole !== 'Employee') return;
    
    this.showAllAudits = !this.showAllAudits;
    this.pagination.currentPage = 1;
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
  exportToCSV(): void {
    const csv = this.service.exportToCSV(this.filteredAudits);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
}

