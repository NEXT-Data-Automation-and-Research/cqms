/**
 * Reversal Controller
 * Handles UI interactions for reversal management page
 */

import { ReversalService } from '../application/reversal-service.js';
import { ReversalRepository } from '../infrastructure/reversal-repository.js';
import type { ReversalWithAuditData, ReversalWorkflowStateType } from '../domain/types.js';

interface FilterState {
  search: string;
  status: string;
  type: string;
  dateFrom: string;
  dateTo: string;
  startDate: string;
  endDate: string;
  week: number;
  year: number;
}

/**
 * Controller for reversal management page
 */
export class ReversalController {
  private service: ReversalService | null = null;
  private reversals: ReversalWithAuditData[] = [];
  private filteredReversals: ReversalWithAuditData[] = [];
  private currentUserEmail: string = '';
  private currentUserRole: string = '';
  private isFilterPanelOpen: boolean = false;
  private initialLoadDone: boolean = false;
  private filterState: FilterState = {
    search: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    startDate: '',
    endDate: '',
    week: this.getCurrentWeekNumber(),
    year: new Date().getFullYear()
  };

  constructor() {
    // Service will be initialized in initialize() after Supabase is ready
  }

  /**
   * Get current ISO week number
   */
  private getCurrentWeekNumber(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 604800000; // milliseconds in a week
    return Math.ceil((diff + start.getDay() * 86400000) / oneWeek);
  }

  /**
   * Wait for Supabase client to be initialized
   */
  private async waitForSupabaseClient(maxWaitMs: number = 10000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 100;
    
    while (Date.now() - startTime < maxWaitMs) {
      if ((window as any).supabaseClient) {
        return;
      }
      
      // Try to initialize it if not available
      try {
        const secureWindowModule = await import('/js/utils/secure-window-supabase.js' as any);
        if (secureWindowModule?.initSecureWindowSupabase) {
          await secureWindowModule.initSecureWindowSupabase();
          if ((window as any).supabaseClient) {
            return;
          }
        }
      } catch (importError) {
        // Module might not exist, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    throw new Error('Supabase client not initialized after waiting');
  }

  /**
   * Get current user info
   */
  private async getCurrentUserInfo(): Promise<{ email: string; role: string }> {
    try {
      const { data: { user } } = await (window as any).supabaseClient.auth.getUser();
      if (!user?.email) {
        throw new Error('User not authenticated');
      }
      
      // Get user role from people table
      const { data: person } = await (window as any).supabaseClient
        .from('people')
        .select('role')
        .eq('email', user.email)
        .single();
      
      return {
        email: user.email.toLowerCase().trim(),
        role: person?.role || 'Employee'
      };
    } catch (error) {
      console.error('Error getting current user info:', error);
      throw error;
    }
  }

  /**
   * Initialize service (call after Supabase is ready)
   */
  private initializeService(): void {
    if (!(window as any).supabaseClient) {
      throw new Error('Supabase client not initialized. Ensure (window as any).supabaseClient is set.');
    }
    const repository = new ReversalRepository((window as any).supabaseClient);
    this.service = new ReversalService(repository);
  }

  /**
   * Initialize the reversal management page
   */
  async initialize(): Promise<void> {
    try {
      console.log('[ReversalController] Initializing...');
      
      // Wait for Supabase client to be ready
      await this.waitForSupabaseClient();
      
      // Get current user info
      const userInfo = await this.getCurrentUserInfo();
      this.currentUserEmail = userInfo.email;
      this.currentUserRole = userInfo.role;
      
      console.log('[ReversalController] Current user:', this.currentUserEmail, 'Role:', this.currentUserRole);
      
      // Initialize service
      this.initializeService();
      
      // Set up event listeners
      this.attachEventListeners();
      
      // Update week display
      this.updateWeekDisplay();
      
      // Load reversals first so we never show "no pending" before data has loaded
      await this.loadReversals();
      
      // Apply default date filter (this month) after data is loaded
      this.setThisMonthFilter();
      
      console.log('[ReversalController] Initialization complete');
    } catch (error) {
      console.error('[ReversalController] Failed to initialize:', error);
      this.showError('Failed to load reversals. Please refresh the page.');
    }
  }

  /**
   * Check if user is a reviewer (can see all reversals)
   */
  private isReviewerRole(): boolean {
    const reviewerRoles = ['Team Lead', 'QA Auditor', 'Quality Analyst', 'Quality Champion', 'Admin', 'Super Admin'];
    return reviewerRoles.includes(this.currentUserRole);
  }

  /**
   * Load reversals from database
   */
  private async loadReversals(): Promise<void> {
    if (!this.service) {
      throw new Error('Service not initialized');
    }
    
    this.showLoading(true);
    
    try {
      console.log('[ReversalController] Loading reversals...');
      console.log('[ReversalController] Current role:', this.currentUserRole);
      console.log('[ReversalController] Is reviewer:', this.isReviewerRole());
      
      // Determine if user is an agent (Employee) or auditor/manager
      const isReviewer = this.isReviewerRole();
      
      // Get reversals based on user role
      const options: { requestedByEmail?: string; employeeEmail?: string; onlyPending?: boolean } = {};
      
      if (!isReviewer) {
        // Regular employees see reversals where they are either:
        // 1. The requester (requested_by_email matches), OR
        // 2. The subject of the audit (employee_email in audit data matches)
        // Using employeeEmail option handles both cases after merging with audit data
        options.employeeEmail = this.currentUserEmail;
        console.log('[ReversalController] Employee mode - filtering by employee email:', this.currentUserEmail);
      } else {
        // Reviewers see ALL reversals (RLS will handle access control)
        // No filter means get all
        console.log('[ReversalController] Reviewer mode - loading all accessible reversals');
      }
      
      this.reversals = await this.service.getReversalsWithAuditData(options);
      
      console.log('[ReversalController] Loaded', this.reversals.length, 'reversals');
      
      // Apply filters
      this.applyFilters();
      
      // Update stats
      this.updateStats();
      
      this.initialLoadDone = true;
      // Render list (empty state only shown after initialLoadDone is true)
      this.renderReversalList();
    } catch (error) {
      console.error('[ReversalController] Error loading reversals:', error);
      this.showError('Failed to load reversals. Please try again.');
      this.initialLoadDone = true;
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Apply filters to reversals
   */
  private applyFilters(): void {
    this.filteredReversals = this.reversals.filter(reversal => {
      // Search filter
      if (this.filterState.search) {
        const searchLower = this.filterState.search.toLowerCase();
        const matchesSearch = 
          (reversal.employee_email || '').toLowerCase().includes(searchLower) ||
          (reversal.employee_name || '').toLowerCase().includes(searchLower) ||
          (reversal.interaction_id || '').toLowerCase().includes(searchLower) ||
          (reversal.justification || '').toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (this.filterState.status) {
        const workflowState = this.service?.getReversalWorkflowState(reversal);
        const isPending = this.service?.isPendingReversal(reversal);
        
        if (this.filterState.status === 'pending' && !isPending) return false;
        if (this.filterState.status === 'approved' && workflowState !== 'approved') return false;
        if (this.filterState.status === 'rejected' && workflowState !== 'rejected' && workflowState !== 'team_lead_rejected') return false;
      }
      
      // Type filter
      if (this.filterState.type && reversal.reversal_type !== this.filterState.type) {
        return false;
      }
      
      // Date filters
      const reversalDate = reversal.reversal_requested_at || reversal.requested_at;
      if (reversalDate) {
        const date = new Date(reversalDate);
        
        if (this.filterState.dateFrom) {
          const fromDate = new Date(this.filterState.dateFrom);
          if (date < fromDate) return false;
        }
        
        if (this.filterState.dateTo) {
          const toDate = new Date(this.filterState.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (date > toDate) return false;
        }
        
        if (this.filterState.startDate) {
          const startDate = new Date(this.filterState.startDate);
          if (date < startDate) return false;
        }
        
        if (this.filterState.endDate) {
          const endDate = new Date(this.filterState.endDate);
          endDate.setHours(23, 59, 59, 999);
          if (date > endDate) return false;
        }
      }
      
      return true;
    });
  }

  /**
   * Update stats display
   */
  private updateStats(): void {
    let totalPending = 0;
    let teamLeadReview = 0;
    let qcReview = 0;
    let otherPending = 0;
    
    this.reversals.forEach(reversal => {
      const workflowState = this.service?.getReversalWorkflowState(reversal) || 'submitted';
      const isPending = this.service?.isPendingReversal(reversal);
      
      if (isPending) {
        totalPending++;
        
        // Categorize pending reversals
        // 'submitted' is the initial state, which goes to team lead review
        if (workflowState === 'submitted') {
          teamLeadReview++;
        } else if (workflowState === 'qa_review' || workflowState === 'cqc_review' || workflowState === 'team_lead_approved') {
          qcReview++;
        } else {
          otherPending++;
        }
      }
    });
    
    const totalPendingEl = document.getElementById('totalPending');
    const teamLeadReviewEl = document.getElementById('teamLeadReview');
    const qcReviewEl = document.getElementById('qcReview');
    const otherPendingEl = document.getElementById('otherPending');
    
    if (totalPendingEl) totalPendingEl.textContent = totalPending.toString();
    if (teamLeadReviewEl) teamLeadReviewEl.textContent = teamLeadReview.toString();
    if (qcReviewEl) qcReviewEl.textContent = qcReview.toString();
    if (otherPendingEl) otherPendingEl.textContent = otherPending.toString();
  }

  /**
   * Render the reversal list
   */
  private renderReversalList(): void {
    const container = document.getElementById('reversalList');
    const noMessage = document.getElementById('noReversalsMessage');
    const viewAllContainer = document.getElementById('viewAllContainer');
    
    if (!container) {
      console.error('[ReversalController] Reversal list container not found');
      return;
    }
    
    // Only show empty state after initial load has completed
    const showEmpty = this.initialLoadDone && this.filteredReversals.length === 0;
    
    if (showEmpty) {
      container.innerHTML = '';
      container.style.display = 'none';
      if (noMessage) noMessage.style.display = 'block';
      if (viewAllContainer) viewAllContainer.style.display = 'none';
      return;
    }
    
    if (noMessage) noMessage.style.display = 'none';
    
    // Show list with data
    container.style.display = 'flex';
    container.innerHTML = this.filteredReversals.map(reversal => this.renderReversalCard(reversal)).join('');
    
    // Show View All button if there are results
    if (viewAllContainer) {
      viewAllContainer.style.display = this.filteredReversals.length > 0 ? 'block' : 'none';
    }
    
    // Attach click listeners to cards
    container.querySelectorAll('.reversal-card').forEach((card, index) => {
      card.addEventListener('click', () => {
        const reversal = this.filteredReversals[index];
        this.openReversalDetail(reversal);
      });
    });
  }

  /**
   * Get initials from name
   */
  private getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Get status badge info based on workflow state
   */
  private getStatusBadgeInfo(workflowState: string): { text: string; class: string; icon: string } {
    switch (workflowState) {
      case 'team_lead_review':
      case 'pending':
      case 'submitted':
        return {
          text: 'Under Team Lead Review',
          class: 'status-team-lead-review',
          icon: `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>`
        };
      case 'team_lead_approved':
        return {
          text: 'Approved by Team Lead',
          class: 'status-team-lead-approved',
          icon: `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>`
        };
      case 'team_lead_rejected':
        return {
          text: 'Rejected by Team Lead',
          class: 'status-rejected',
          icon: `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>`
        };
      case 'qa_review':
      case 'cqc_review':
        return {
          text: 'Under QC Review',
          class: 'status-qc-review',
          icon: `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>`
        };
      case 'approved':
      case 'reversal_approved':
        return {
          text: 'Approved',
          class: 'status-approved',
          icon: `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>`
        };
      case 'rejected':
      case 'reversal_rejected':
        return {
          text: 'Rejected',
          class: 'status-rejected',
          icon: `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>`
        };
      default:
        return {
          text: workflowState.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          class: 'status-team-lead-review',
          icon: `<svg class="status-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>`
        };
    }
  }

  /**
   * Get issue type badge class
   */
  private getIssueTypeBadgeClass(issueType: string): string {
    const lower = (issueType || '').toLowerCase();
    if (lower.includes('misinterpret')) return 'badge-misinterpretation';
    if (lower.includes('technical')) return 'badge-technical';
    return 'badge-issue-type';
  }

  /**
   * Format scorecard name for display
   */
  private formatScorecardName(tableName: string): string {
    if (!tableName) return 'Unknown Scorecard';
    // Convert table name like 'fnchat_cfd_v4_0_v2' to 'FN Chat CFD V4.1'
    return tableName
      .replace(/_/g, ' ')
      .replace(/v(\d+)\s*(\d*)/gi, (_, major, minor) => `V${major}${minor ? '.' + minor : ''}`)
      .replace(/\b(fn|cfd|qa|qc)\b/gi, s => s.toUpperCase())
      .replace(/\bchat\b/gi, 'Chat')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Render a single reversal card
   */
  private renderReversalCard(reversal: ReversalWithAuditData): string {
    const workflowState = this.service?.getReversalWorkflowState(reversal) || 'submitted';
    const isPending = this.service?.isPendingReversal(reversal) || false;
    const statusInfo = this.getStatusBadgeInfo(workflowState);
    
    const requestedAt = reversal.reversal_requested_at || reversal.requested_at || '';
    const formattedDate = requestedAt ? new Date(requestedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'N/A';
    
    const employeeName = reversal.employee_name || reversal.employee_email?.split('@')[0] || 'Unknown';
    const initials = this.getInitials(employeeName);
    const auditId = reversal.audit_id || 'N/A';
    const shortAuditId = auditId.length > 20 ? auditId.substring(0, 20) + '...' : auditId;
    const score = reversal.original_score ?? reversal.score_before_appeal ?? 'N/A';
    const auditorName = reversal.auditor_name || reversal.auditor_email?.split('@')[0] || 'Unknown';
    const scorecardName = this.formatScorecardName(reversal.scorecard_table_name || '');
    const issueType = reversal.reversal_type || reversal.justification?.split(' ').slice(0, 3).join(' ') || 'Reversal Request';
    const issueTypeBadgeClass = this.getIssueTypeBadgeClass(issueType);
    
    // Determine action button text
    const actionBtnText = isPending ? 'Review & Process' : 'View Details';
    const actionBtnClass = isPending ? 'btn-review' : 'btn-view';
    
    return `
      <div class="reversal-card" data-id="${reversal.id}">
        <div class="reversal-card-left">
          <!-- Avatar -->
          <div class="reversal-avatar">${initials}</div>
          
          <!-- Info Section -->
          <div class="reversal-card-info">
            <!-- Name Row with Badges -->
            <div class="reversal-name-row">
              <span class="reversal-name">${this.escapeHtml(employeeName)}</span>
              <span class="reversal-badge badge-scorecard">${this.escapeHtml(scorecardName)}</span>
              <span class="reversal-badge ${issueTypeBadgeClass}">${this.escapeHtml(issueType)}</span>
              <span class="reversal-status-badge ${statusInfo.class}">
                ${statusInfo.icon}
                ${statusInfo.text}
              </span>
            </div>
            
            <!-- Meta Row -->
            <div class="reversal-meta-row">
              <span class="reversal-meta-item">${this.escapeHtml(shortAuditId)}</span>
              <span class="reversal-meta-separator">•</span>
              <span class="reversal-meta-item">${score}%</span>
              <span class="reversal-meta-separator">•</span>
              <span class="reversal-meta-item">${this.escapeHtml(auditorName)}</span>
              <span class="reversal-meta-separator">•</span>
              <span class="reversal-meta-item">${formattedDate}</span>
            </div>
          </div>
        </div>
        
        <div class="reversal-card-right">
          <!-- Action Button -->
          <button class="reversal-action-btn ${actionBtnClass}" data-action="open">
            <svg style="width: 0.875rem; height: 0.875rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            ${actionBtnText}
          </button>
          
          <!-- Link Icon -->
          <div class="reversal-link-icon">
            <svg style="width: 1rem; height: 1rem;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Open reversal detail/processing view
   */
  private openReversalDetail(reversal: ReversalWithAuditData): void {
    // Navigate to audit view with reversal context
    const auditId = reversal.audit_id;
    const tableName = reversal.scorecard_table_name;
    const scorecardId = reversal._scorecard_id;
    
    if (auditId && tableName) {
      // Build URL with required and optional parameters
      // Note: Must use .html extension as that's how the route is configured
      const encodedTableName = encodeURIComponent(tableName);
      let url = `/audit-view.html?id=${auditId}&table=${encodedTableName}`;
      
      // Add scorecard ID if available
      if (scorecardId) {
        url += `&scorecard=${encodeURIComponent(scorecardId)}`;
      }
      
      // Add mode parameter to indicate this is a reversal review
      url += '&mode=reversal';
      
      console.log('[ReversalController] Navigating to:', url);
      window.location.href = url;
    } else {
      console.error('[ReversalController] Missing audit_id or scorecard_table_name');
      alert('Unable to open audit. Missing required data.');
    }
  }

  /**
   * Attach event listeners
   */
  private attachEventListeners(): void {
    // Filter toggle button
    const filterToggleBtn = document.getElementById('filterToggleBtn');
    filterToggleBtn?.addEventListener('click', () => this.toggleFilterPanel());
    
    // Search input
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.filterState.search = (e.target as HTMLInputElement).value;
      this.applyFilters();
      this.renderReversalList();
    });
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter') as HTMLSelectElement;
    statusFilter?.addEventListener('change', (e) => {
      this.filterState.status = (e.target as HTMLSelectElement).value;
      this.applyFilters();
      this.renderReversalList();
    });
    
    // Type filter
    const typeFilter = document.getElementById('typeFilter') as HTMLSelectElement;
    typeFilter?.addEventListener('change', (e) => {
      this.filterState.type = (e.target as HTMLSelectElement).value;
      this.applyFilters();
      this.renderReversalList();
    });
    
    // Date filters
    const dateFromFilter = document.getElementById('dateFromFilter') as HTMLInputElement;
    const dateToFilter = document.getElementById('dateToFilter') as HTMLInputElement;
    
    dateFromFilter?.addEventListener('change', (e) => {
      this.filterState.dateFrom = (e.target as HTMLInputElement).value;
      this.applyFilters();
      this.renderReversalList();
    });
    
    dateToFilter?.addEventListener('change', (e) => {
      this.filterState.dateTo = (e.target as HTMLInputElement).value;
      this.applyFilters();
      this.renderReversalList();
    });
    
    // Clear filters button
    const clearFiltersBtn = document.getElementById('clearFilters');
    clearFiltersBtn?.addEventListener('click', () => this.clearFilters());
    
    // Week navigation
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    
    prevWeekBtn?.addEventListener('click', () => this.navigateWeek(-1));
    nextWeekBtn?.addEventListener('click', () => this.navigateWeek(1));
    
    // Quick date filters
    const todayBtn = document.getElementById('todayBtn');
    const yesterdayBtn = document.getElementById('yesterdayBtn');
    const thisMonthBtn = document.getElementById('thisMonthBtn');
    const lastMonthBtn = document.getElementById('lastMonthBtn');
    
    todayBtn?.addEventListener('click', () => this.setTodayFilter());
    yesterdayBtn?.addEventListener('click', () => this.setYesterdayFilter());
    thisMonthBtn?.addEventListener('click', () => this.setThisMonthFilter());
    lastMonthBtn?.addEventListener('click', () => this.setLastMonthFilter());
    
    // Date range picker
    const dateBtn = document.getElementById('dateBtn');
    const dateDropdown = document.getElementById('dateDropdown');
    const applyDateBtn = document.getElementById('applyDateBtn');
    const clearDateBtn = document.getElementById('clearDateBtn');
    
    dateBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      dateDropdown?.classList.toggle('hidden');
    });
    
    applyDateBtn?.addEventListener('click', () => {
      const startDate = (document.getElementById('startDate') as HTMLInputElement)?.value;
      const endDate = (document.getElementById('endDate') as HTMLInputElement)?.value;
      
      this.filterState.startDate = startDate;
      this.filterState.endDate = endDate;
      
      this.applyFilters();
      this.renderReversalList();
      
      dateDropdown?.classList.add('hidden');
      this.updateDateButtonText();
    });
    
    clearDateBtn?.addEventListener('click', () => {
      this.filterState.startDate = '';
      this.filterState.endDate = '';
      
      (document.getElementById('startDate') as HTMLInputElement).value = '';
      (document.getElementById('endDate') as HTMLInputElement).value = '';
      
      this.applyFilters();
      this.renderReversalList();
      
      dateDropdown?.classList.add('hidden');
      this.updateDateButtonText();
    });
    
    // Export button
    const exportBtn = document.getElementById('exportBtn');
    exportBtn?.addEventListener('click', () => this.exportReversals());
    
    // View all button in no reversals message
    const viewAllBtnInMessage = document.getElementById('viewAllBtnInMessage');
    viewAllBtnInMessage?.addEventListener('click', () => {
      this.clearFilters();
      this.loadReversals();
    });
    
    // View all button at bottom
    const viewAllBtn = document.getElementById('viewAllBtn');
    viewAllBtn?.addEventListener('click', () => {
      this.clearFilters();
      this.loadReversals();
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.date-picker-dropdown')) {
        dateDropdown?.classList.add('hidden');
      }
    });
  }

  /**
   * Toggle filter panel
   */
  private toggleFilterPanel(): void {
    const filterPanel = document.getElementById('filterPanel');
    if (filterPanel) {
      this.isFilterPanelOpen = !this.isFilterPanelOpen;
      filterPanel.style.display = this.isFilterPanelOpen ? 'block' : 'none';
    }
  }

  /**
   * Clear all filters
   */
  private clearFilters(): void {
    this.filterState = {
      search: '',
      status: '',
      type: '',
      dateFrom: '',
      dateTo: '',
      startDate: '',
      endDate: '',
      week: this.getCurrentWeekNumber(),
      year: new Date().getFullYear()
    };
    
    // Reset form elements
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const statusFilter = document.getElementById('statusFilter') as HTMLSelectElement;
    const typeFilter = document.getElementById('typeFilter') as HTMLSelectElement;
    const dateFromFilter = document.getElementById('dateFromFilter') as HTMLInputElement;
    const dateToFilter = document.getElementById('dateToFilter') as HTMLInputElement;
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (typeFilter) typeFilter.value = '';
    if (dateFromFilter) dateFromFilter.value = '';
    if (dateToFilter) dateToFilter.value = '';
    
    this.applyFilters();
    this.renderReversalList();
    this.updateQuickDateButtons('');
  }

  /**
   * Navigate week
   */
  private navigateWeek(direction: number): void {
    this.filterState.week += direction;
    
    // Handle year rollover
    if (this.filterState.week > 52) {
      this.filterState.week = 1;
      this.filterState.year++;
    } else if (this.filterState.week < 1) {
      this.filterState.week = 52;
      this.filterState.year--;
    }
    
    this.updateWeekDisplay();
    this.setWeekFilter(this.filterState.week, this.filterState.year);
  }

  /**
   * Update week display
   */
  private updateWeekDisplay(): void {
    const weekText = document.getElementById('weekText');
    if (weekText) {
      weekText.textContent = `Week ${this.filterState.week}`;
    }
  }

  /**
   * Set filter for a specific week
   */
  private setWeekFilter(week: number, year: number): void {
    // Calculate the start and end dates for the week
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = new Date(simple);
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    
    const weekEnd = new Date(ISOweekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    this.filterState.startDate = ISOweekStart.toISOString().split('T')[0];
    this.filterState.endDate = weekEnd.toISOString().split('T')[0];
    
    this.applyFilters();
    this.renderReversalList();
    this.updateQuickDateButtons('');
  }

  /**
   * Set today filter
   */
  private setTodayFilter(): void {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    this.filterState.startDate = todayStr;
    this.filterState.endDate = todayStr;
    
    this.applyFilters();
    this.renderReversalList();
    this.updateQuickDateButtons('today');
  }

  /**
   * Set yesterday filter
   */
  private setYesterdayFilter(): void {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    this.filterState.startDate = yesterdayStr;
    this.filterState.endDate = yesterdayStr;
    
    this.applyFilters();
    this.renderReversalList();
    this.updateQuickDateButtons('yesterday');
  }

  /**
   * Set this month filter
   */
  private setThisMonthFilter(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    this.filterState.startDate = firstDay.toISOString().split('T')[0];
    this.filterState.endDate = lastDay.toISOString().split('T')[0];
    
    this.applyFilters();
    this.renderReversalList();
    this.updateQuickDateButtons('thisMonth');
  }

  /**
   * Set last month filter
   */
  private setLastMonthFilter(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    
    this.filterState.startDate = firstDay.toISOString().split('T')[0];
    this.filterState.endDate = lastDay.toISOString().split('T')[0];
    
    this.applyFilters();
    this.renderReversalList();
    this.updateQuickDateButtons('lastMonth');
  }

  /**
   * Update quick date button states
   */
  private updateQuickDateButtons(activeId: string): void {
    const buttons = ['todayBtn', 'yesterdayBtn', 'thisMonthBtn', 'lastMonthBtn'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        if (btnId === activeId + 'Btn') {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });
  }

  /**
   * Update date button text
   */
  private updateDateButtonText(): void {
    const dateBtnText = document.getElementById('dateBtnText');
    if (dateBtnText) {
      if (this.filterState.startDate && this.filterState.endDate) {
        dateBtnText.textContent = `${this.filterState.startDate} - ${this.filterState.endDate}`;
      } else {
        dateBtnText.textContent = 'Date Range';
      }
    }
  }

  /**
   * Export reversals to CSV
   */
  private exportReversals(): void {
    if (this.filteredReversals.length === 0) {
      alert('No reversals to export.');
      return;
    }
    
    const headers = [
      'Employee Email',
      'Employee Name',
      'Interaction ID',
      'Requested At',
      'Type',
      'Status',
      'Original Score',
      'New Score',
      'Justification'
    ];
    
    const rows = this.filteredReversals.map(r => {
      const workflowState = this.service?.getReversalWorkflowState(r) || 'submitted';
      const isPending = this.service?.isPendingReversal(r) || false;
      const status = isPending ? 'Pending' : workflowState === 'approved' ? 'Approved' : 'Rejected';
      
      return [
        r.employee_email || '',
        r.employee_name || '',
        r.interaction_id || '',
        r.reversal_requested_at || r.requested_at || '',
        r.reversal_type || '',
        status,
        (r.original_score ?? r.score_before_appeal ?? '').toString(),
        (r.new_score ?? r.score_after_appeal ?? '').toString(),
        (r.justification || r.reversal_justification_from_agent || '').replace(/"/g, '""')
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reversals_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  /**
   * Show/hide loading indicator and content areas
   */
  private showLoading(show: boolean): void {
    const loadingIndicator = document.getElementById('loadingIndicator');
    const reversalList = document.getElementById('reversalList');
    const noMessage = document.getElementById('noReversalsMessage');
    
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'block' : 'none';
    }
    if (reversalList) {
      reversalList.style.display = show ? 'none' : (this.filteredReversals.length > 0 ? 'flex' : 'none');
    }
    if (noMessage && show) {
      noMessage.style.display = 'none';
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    const container = document.getElementById('reversalList');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #ef4444; font-family: 'Poppins', sans-serif;">
          <p style="font-size: 0.875rem; font-weight: 600; margin-bottom: 0.5rem;">Error</p>
          <p style="font-size: 0.75rem;">${this.escapeHtml(message)}</p>
        </div>
      `;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const controller = new ReversalController();
    await controller.initialize();
    
    // Make controller available globally
    (window as any).reversalController = controller;
  } catch (error) {
    console.error('Failed to initialize reversal controller:', error);
  }
});
