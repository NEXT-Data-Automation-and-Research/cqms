/**
 * Pending Audits Controller
 * Handles loading and displaying pending audit assignments
 * Migrated from audit-form.html loadPendingAudits() and displayPendingAudits()
 */

import { AuditFormService } from '../../application/audit-form-service.js';
import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { DatabaseFactory } from '../../../../infrastructure/database-factory.js';
import { AUDIT_ASSIGNMENT_FIELDS } from '../../../../core/constants/field-whitelists.js';
import { PendingAuditsRenderer } from '../renderers/pending-audits-renderer.js';
import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';

interface PendingAudit {
  id: string;
  audit_id?: string;
  scorecard_id: string;
  employee_email: string;
  employee_name?: string;
  auditor_email: string;
  status: string;
  completed_at?: string;
  created_at?: string;
  priority?: number;
  scorecards?: {
    id: string;
    name: string;
    table_name: string;
  };
}

interface ActiveFilters {
  startDate: string | null;
  endDate: string | null;
  status: string;
  scorecard: string;
  search: string;
}

export class PendingAuditsController {
  private allPendingAudits: PendingAudit[] = [];
  private pendingAudits: PendingAudit[] = [];
  private pendingCurrentPage = 1;
  private pendingItemsPerPage = 5;
  private pendingTotalPages = 1;
  private showAllAudits = false;
  private currentSortOrder = 'name_asc';
  private activeFilters: ActiveFilters = {
    startDate: null,
    endDate: null,
    status: '',
    scorecard: '',
    search: ''
  };
  private renderer: PendingAuditsRenderer;

  constructor(private service: AuditFormService) {
    this.renderer = new PendingAuditsRenderer();
  }

  /**
   * Load pending audits for current user
   */
  async loadPendingAudits(): Promise<void> {
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const currentUserEmail = (userInfo.email || '').toLowerCase().trim();
      const currentUserRole = userInfo.role || '';
      const isAgent = currentUserRole === 'Employee';
      
      if (!currentUserEmail) {
        logWarn('No user email found');
        return;
      }
      
      const statusFilter = this.showAllAudits ? ['completed'] : ['pending', 'in_progress'];
      const filterField = isAgent ? 'employee_email' : 'auditor_email';
      
      const db = DatabaseFactory.createClient();
      let query = db
        .from('audit_assignments')
        .select(`${AUDIT_ASSIGNMENT_FIELDS}, scorecards:scorecard_id (id, name, table_name)`)
        .eq(filterField, currentUserEmail)
        .order('created_at', { ascending: false });
      
      if (this.showAllAudits) {
        query = query.eq('status', 'completed');
      } else {
        query = query.in('status', statusFilter);
      }
      
      const result = await query.execute();
      const data = (result?.data || []) as PendingAudit[];
      
      // Normalize and filter client-side for exact match
      const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
      const finalFiltered = data.filter((assignment: PendingAudit) => {
        const emailToCheck = isAgent ? assignment.employee_email : assignment.auditor_email;
        if (!emailToCheck) return false;
        return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
      });
      
      this.allPendingAudits = finalFiltered;
      
      // Apply filters
      this.applyFiltersToAudits();
      
      // Apply sorting
      this.sortPendingAudits();
      
      // Reset pagination
      this.pendingCurrentPage = 1;
      
      // Display audits
      this.displayPendingAudits();
      
      // Update stats if function exists
      if (typeof (window as any).updateYourStats === 'function') {
        await (window as any).updateYourStats();
      }
      
      logInfo(`Loaded ${finalFiltered.length} pending audits`);
    } catch (error) {
      logError('Error loading pending audits:', error);
    }
  }

  /**
   * Display pending audits in UI
   */
  displayPendingAudits(): void {
    this.calculatePendingPagination();
    this.renderer.displayPendingAudits(
      this.pendingAudits,
      this.showAllAudits,
      this.pendingCurrentPage,
      this.pendingItemsPerPage
    );
    this.updatePendingPaginationUI();
  }

  /**
   * Apply filters to audits
   */
  private applyFiltersToAudits(): void {
    let filtered = [...this.allPendingAudits];
    
    // Date range filter
    if (this.activeFilters.startDate) {
      const startDate = new Date(this.activeFilters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(audit => {
        if (!audit.created_at) return false;
        const auditDate = new Date(audit.created_at);
        auditDate.setHours(0, 0, 0, 0);
        return auditDate >= startDate;
      });
    }
    
    if (this.activeFilters.endDate) {
      const endDate = new Date(this.activeFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(audit => {
        if (!audit.created_at) return false;
        const auditDate = new Date(audit.created_at);
        return auditDate <= endDate;
      });
    }
    
    // Status filter
    if (this.activeFilters.status) {
      filtered = filtered.filter(audit => audit.status === this.activeFilters.status);
    }
    
    // Scorecard filter
    if (this.activeFilters.scorecard) {
      filtered = filtered.filter(audit => audit.scorecard_id === this.activeFilters.scorecard);
    }
    
    // Search filter
    if (this.activeFilters.search) {
      const searchTerm = this.activeFilters.search.toLowerCase().trim();
      filtered = filtered.filter(audit => {
        const employeeName = (audit.employee_name || '').toLowerCase();
        const employeeEmail = (audit.employee_email || '').toLowerCase();
        const auditorEmail = (audit.auditor_email || '').toLowerCase();
        const scorecardName = (audit.scorecards?.name || '').toLowerCase();
        return employeeName.includes(searchTerm) || 
               employeeEmail.includes(searchTerm) || 
               auditorEmail.includes(searchTerm) ||
               scorecardName.includes(searchTerm);
      });
    }
    
    this.pendingAudits = filtered;
  }

  /**
   * Sort pending audits
   */
  sortPendingAudits(): void {
    const sortBy = document.getElementById('auditSortBy') as HTMLSelectElement;
    if (sortBy) {
      this.currentSortOrder = sortBy.value;
    }
    
    if (!this.pendingAudits || this.pendingAudits.length === 0) {
      return;
    }
    
    const sorted = [...this.pendingAudits];
    const [field, direction] = this.currentSortOrder.split('_');
    
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch(field) {
        case 'name':
          const nameA = (a.employee_name || '').toLowerCase();
          const nameB = (b.employee_name || '').toLowerCase();
          comparison = nameA.localeCompare(nameB);
          break;
          
        case 'status':
          const statusA = a.status === 'pending' ? 1 : (a.status === 'in_progress' ? 2 : 0);
          const statusB = b.status === 'pending' ? 1 : (b.status === 'in_progress' ? 2 : 0);
          comparison = statusA - statusB;
          break;
          
        case 'priority':
          const priorityA = a.priority || 0;
          const priorityB = b.priority || 0;
          comparison = priorityA - priorityB;
          break;
          
        default:
          return 0;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
    
    this.pendingAudits = sorted;
    this.pendingCurrentPage = 1;
  }

  /**
   * Calculate pagination
   */
  private calculatePendingPagination(): void {
    this.pendingTotalPages = Math.ceil(this.pendingAudits.length / this.pendingItemsPerPage);
    if (this.pendingCurrentPage > this.pendingTotalPages && this.pendingTotalPages > 0) {
      this.pendingCurrentPage = this.pendingTotalPages;
    }
    if (this.pendingCurrentPage < 1) {
      this.pendingCurrentPage = 1;
    }
  }

  /**
   * Update pagination UI
   */
  updatePendingPaginationUI(): void {
    const paginationContainer = document.getElementById('pendingAuditsPagination');
    const paginationInfo = document.getElementById('pendingPaginationInfo');
    const pageNumbers = document.getElementById('pendingPageNumbers');
    const firstPageBtn = document.getElementById('pendingFirstPageBtn') as HTMLButtonElement;
    const prevPageBtn = document.getElementById('pendingPrevPageBtn') as HTMLButtonElement;
    const nextPageBtn = document.getElementById('pendingNextPageBtn') as HTMLButtonElement;
    const lastPageBtn = document.getElementById('pendingLastPageBtn') as HTMLButtonElement;
    
    if (this.pendingAudits.length === 0 || this.pendingTotalPages <= 1) {
      if (paginationContainer) paginationContainer.style.display = 'none';
      return;
    }
    
    if (paginationContainer) {
      paginationContainer.style.display = 'block';
    }
    
    // Update pagination info
    const startIndex = (this.pendingCurrentPage - 1) * this.pendingItemsPerPage + 1;
    const endIndex = Math.min(this.pendingCurrentPage * this.pendingItemsPerPage, this.pendingAudits.length);
    if (paginationInfo) {
      paginationInfo.textContent = `Page ${this.pendingCurrentPage} of ${this.pendingTotalPages} (Showing ${startIndex}-${endIndex} of ${this.pendingAudits.length})`;
    }
    
    // Update button states
    if (firstPageBtn) {
      firstPageBtn.disabled = this.pendingCurrentPage === 1;
      firstPageBtn.style.opacity = this.pendingCurrentPage === 1 ? '0.5' : '1';
      firstPageBtn.style.cursor = this.pendingCurrentPage === 1 ? 'not-allowed' : 'pointer';
    }
    if (prevPageBtn) {
      prevPageBtn.disabled = this.pendingCurrentPage === 1;
      prevPageBtn.style.opacity = this.pendingCurrentPage === 1 ? '0.5' : '1';
      prevPageBtn.style.cursor = this.pendingCurrentPage === 1 ? 'not-allowed' : 'pointer';
    }
    if (nextPageBtn) {
      nextPageBtn.disabled = this.pendingCurrentPage === this.pendingTotalPages;
      nextPageBtn.style.opacity = this.pendingCurrentPage === this.pendingTotalPages ? '0.5' : '1';
      nextPageBtn.style.cursor = this.pendingCurrentPage === this.pendingTotalPages ? 'not-allowed' : 'pointer';
    }
    if (lastPageBtn) {
      lastPageBtn.disabled = this.pendingCurrentPage === this.pendingTotalPages;
      lastPageBtn.style.opacity = this.pendingCurrentPage === this.pendingTotalPages ? '0.5' : '1';
      lastPageBtn.style.cursor = this.pendingCurrentPage === this.pendingTotalPages ? 'not-allowed' : 'pointer';
    }
    
    // Generate page numbers
    if (pageNumbers) {
      safeSetHTML(pageNumbers, '');
      const maxVisiblePages = 5;
      let startPage = Math.max(1, this.pendingCurrentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(this.pendingTotalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      // First page
      if (startPage > 1) {
        const firstBtn = document.createElement('button');
        firstBtn.textContent = '1';
        firstBtn.onclick = () => this.goToPendingPage(1);
        firstBtn.style.cssText = 'padding: 0.3234rem 0.4852rem; background-color: #ffffff; color: #374151; border: 0.0405rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.5659rem; font-family: \'Poppins\', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease;';
        pageNumbers.appendChild(firstBtn);
        
        if (startPage > 2) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.cssText = 'padding: 0.3234rem 0.1617rem; color: #000000; font-size: 0.5659rem;';
          pageNumbers.appendChild(ellipsis);
        }
      }
      
      // Page numbers
      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i.toString();
        pageBtn.onclick = () => this.goToPendingPage(i);
        if (i === this.pendingCurrentPage) {
          pageBtn.style.cssText = 'padding: 0.3234rem 0.4852rem; background-color: #1A733E; color: #ffffff; border: 0.0405rem solid #1A733E; border-radius: 0.1617rem; font-size: 0.5659rem; font-family: \'Poppins\', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease;';
        } else {
          pageBtn.style.cssText = 'padding: 0.3234rem 0.4852rem; background-color: #ffffff; color: #374151; border: 0.0405rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.5659rem; font-family: \'Poppins\', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease;';
        }
        pageBtn.onmouseover = () => {
          if (i !== this.pendingCurrentPage) {
            pageBtn.style.backgroundColor = '#f3f4f6';
          }
        };
        pageBtn.onmouseout = () => {
          if (i !== this.pendingCurrentPage) {
            pageBtn.style.backgroundColor = '#ffffff';
          }
        };
        pageNumbers.appendChild(pageBtn);
      }
      
      // Last page
      if (endPage < this.pendingTotalPages) {
        if (endPage < this.pendingTotalPages - 1) {
          const ellipsis = document.createElement('span');
          ellipsis.textContent = '...';
          ellipsis.style.cssText = 'padding: 0.3234rem 0.1617rem; color: #000000; font-size: 0.5659rem;';
          pageNumbers.appendChild(ellipsis);
        }
        
        const lastBtn = document.createElement('button');
        lastBtn.textContent = this.pendingTotalPages.toString();
        lastBtn.onclick = () => this.goToPendingPage(this.pendingTotalPages);
        lastBtn.style.cssText = 'padding: 0.3234rem 0.4852rem; background-color: #ffffff; color: #374151; border: 0.0405rem solid #d1d5db; border-radius: 0.1617rem; font-size: 0.5659rem; font-family: \'Poppins\', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.2s ease;';
        pageNumbers.appendChild(lastBtn);
      }
    }
  }

  /**
   * Go to specific page
   */
  goToPendingPage(page: number): void {
    if (page < 1 || page > this.pendingTotalPages) return;
    this.pendingCurrentPage = page;
    this.displayPendingAudits();
  }

  /**
   * Apply filters from UI
   */
  applyFilters(): void {
    const startDateInput = document.getElementById('filterStartDate') as HTMLInputElement;
    const endDateInput = document.getElementById('filterEndDate') as HTMLInputElement;
    const statusSelect = document.getElementById('filterStatus') as HTMLSelectElement;
    const scorecardSelect = document.getElementById('filterScorecard') as HTMLSelectElement;
    const searchInput = document.getElementById('filterSearch') as HTMLInputElement;
    
    this.activeFilters.startDate = startDateInput?.value || null;
    this.activeFilters.endDate = endDateInput?.value || null;
    this.activeFilters.status = statusSelect?.value || '';
    this.activeFilters.scorecard = scorecardSelect?.value || '';
    this.activeFilters.search = searchInput?.value || '';
    
    this.applyFiltersToAudits();
    this.pendingCurrentPage = 1;
    this.sortPendingAudits();
    this.displayPendingAudits();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    const startDateInput = document.getElementById('filterStartDate') as HTMLInputElement;
    const endDateInput = document.getElementById('filterEndDate') as HTMLInputElement;
    const statusSelect = document.getElementById('filterStatus') as HTMLSelectElement;
    const scorecardSelect = document.getElementById('filterScorecard') as HTMLSelectElement;
    const searchInput = document.getElementById('filterSearch') as HTMLInputElement;
    
    if (startDateInput) startDateInput.value = '';
    if (endDateInput) endDateInput.value = '';
    if (statusSelect) statusSelect.value = '';
    if (scorecardSelect) scorecardSelect.value = '';
    if (searchInput) searchInput.value = '';
    
    this.activeFilters = {
      startDate: null,
      endDate: null,
      status: '',
      scorecard: '',
      search: ''
    };
    
    this.applyFiltersToAudits();
    this.pendingCurrentPage = 1;
    this.sortPendingAudits();
    this.displayPendingAudits();
  }

  /**
   * Toggle filters visibility
   */
  toggleFilters(): void {
    const filtersSection = document.getElementById('filtersSection');
    const showFiltersBtn = document.getElementById('showFiltersBtn');
    
    if (filtersSection && showFiltersBtn) {
      const isCurrentlyHidden = filtersSection.style.display === 'none';
      filtersSection.style.display = isCurrentlyHidden ? 'block' : 'none';
      
      if (isCurrentlyHidden) {
        showFiltersBtn.style.opacity = '1';
        showFiltersBtn.title = 'Hide Filters';
      } else {
        showFiltersBtn.style.opacity = '0.7';
        showFiltersBtn.title = 'Show Filters';
      }
    }
  }

  /**
   * Populate scorecard filter dropdown
   */
  async populateScorecardFilter(): Promise<void> {
    const scorecardSelect = document.getElementById('filterScorecard') as HTMLSelectElement;
    if (!scorecardSelect) return;
    
    try {
      const db = DatabaseFactory.createClient();
      const result = await db
        .from('scorecards')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .execute();
      
      const scorecards = (result?.data || []) as Array<{ id: string; name: string }>;
      
      safeSetHTML(scorecardSelect, '<option value="">All Scorecards</option>');
      
      scorecards.forEach(scorecard => {
        const option = document.createElement('option');
        option.value = scorecard.id;
        option.textContent = scorecard.name;
        scorecardSelect.appendChild(option);
      });
    } catch (error) {
      logError('Error populating scorecard filter:', error);
    }
  }

  /**
   * Toggle show all audits
   */
  toggleAllAuditsView(): void {
    this.showAllAudits = !this.showAllAudits;
    this.loadPendingAudits();
  }

  /**
   * Set show all audits flag
   */
  setShowAllAudits(value: boolean): void {
    this.showAllAudits = value;
  }

  /**
   * Get show all audits flag
   */
  getShowAllAudits(): boolean {
    return this.showAllAudits;
  }
}

