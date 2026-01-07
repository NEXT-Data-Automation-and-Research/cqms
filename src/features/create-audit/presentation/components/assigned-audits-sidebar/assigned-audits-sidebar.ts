/**
 * Assigned Audits Sidebar Component
 * Displays a compact list of employees with their audit counts
 */

import { logInfo, logError, logWarn } from '../../../../../utils/logging-helper.js';
import { getAuthenticatedSupabase } from '../../../../../utils/authenticated-supabase.js';
import { AUDIT_ASSIGNMENT_FIELDS } from '../../../../../core/constants/field-whitelists.js';
import { safeSetHTML, escapeHtml } from '../../../../../utils/html-sanitizer.js';

export interface AssignedAudit {
  id: string;
  employee_email: string;
  employee_name: string;
  employee_id?: string;
  intercom_alias?: string;
  auditor_email: string;
  scorecard_id: string;
  scorecard_name?: string;
  status: 'pending' | 'in_progress' | 'completed';
  scheduled_date?: string;
  created_at: string;
}

export interface EmployeeAuditSummary {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  intercom_alias?: string;
  audit_count: number;
  audits: AssignedAudit[];
}

export class AssignedAuditsSidebar {
  private container: HTMLElement;
  private listContainer!: HTMLElement;
  private searchInput: HTMLInputElement | null = null;
  private statusFilter: HTMLSelectElement | null = null;
  private refreshButton: HTMLButtonElement | null = null;
  private audits: AssignedAudit[] = [];
  private employeeSummaries: EmployeeAuditSummary[] = [];
  private filteredSummaries: EmployeeAuditSummary[] = [];
  private selectedEmployeeId: string | null = null;
  private onEmployeeSelectCallback?: (employee: EmployeeAuditSummary) => void;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
    if (!this.container) {
      logError(`AssignedAuditsSidebar: Container with ID "${containerId}" not found.`);
      return;
    }

    this.render();
    this.listContainer = this.container.querySelector('#assigned-audits-list')!;
    if (!this.listContainer) {
      logError(`AssignedAuditsSidebar: List container with ID "assigned-audits-list" not found.`);
      return;
    }
    
    // Query elements with null safety
    this.searchInput = this.container.querySelector('#audit-search') as HTMLInputElement | null;
    this.statusFilter = this.container.querySelector('#audit-status-filter') as HTMLSelectElement | null;
    this.refreshButton = this.container.querySelector('#refresh-assigned-audits') as HTMLButtonElement | null;

    // Log if filter elements are missing (non-critical, will use defaults in applyFilters)
    if (!this.searchInput) {
      logWarn('Search input element (#audit-search) not found in sidebar HTML - filters will use empty string');
    }
    if (!this.statusFilter) {
      logWarn('Status filter element (#audit-status-filter) not found in sidebar HTML - filters will use empty string');
    }
    if (!this.refreshButton) {
      logWarn('Refresh button element (#refresh-assigned-audits) not found in sidebar HTML');
    }

    // Initialize arrays to prevent null reference errors
    this.audits = [];
    this.employeeSummaries = [];
    this.filteredSummaries = [];

    this.attachEventListeners();
    this.loadAssignedAudits();
  }

  private render(): void {
    // HTML is loaded from assigned-audits-sidebar.html
    // This method can be used for dynamic updates if needed
  }

  private attachEventListeners(): void {
    // Only attach listeners if elements exist
    if (this.searchInput) {
      this.searchInput.addEventListener('input', () => this.applyFilters());
    }
    if (this.statusFilter) {
      this.statusFilter.addEventListener('change', () => this.applyFilters());
    }
    if (this.refreshButton) {
      this.refreshButton.addEventListener('click', () => this.loadAssignedAudits());
    }
  }

  onEmployeeSelect(callback: (employee: EmployeeAuditSummary) => void): void {
    this.onEmployeeSelectCallback = callback;
  }

  async loadAssignedAudits(): Promise<void> {
    try {
      // Show loading state
      this.listContainer.textContent = '';
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'text-center text-white/50 text-xs py-8';
      loadingDiv.textContent = 'Loading assigned audits...';
      this.listContainer.appendChild(loadingDiv);

      // ✅ SECURITY: Use authenticated Supabase client
      let supabase;
      try {
        supabase = await getAuthenticatedSupabase();
      } catch (authError) {
        logError('Failed to get authenticated Supabase client:', authError);
        throw authError;
      }

      // Get current user email
      let currentUserEmail = '';
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (user && !error) {
          currentUserEmail = user.email || '';
        } else {
          // Fallback to localStorage
          const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
          if (userInfo.email) {
            currentUserEmail = userInfo.email;
          }
        }
      } catch (error) {
        logError('Error getting current user:', error);
        // Fallback to localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        if (userInfo.email) {
          currentUserEmail = userInfo.email;
        }
      }

      if (!currentUserEmail) {
        throw new Error('User email not found. Please log in again.');
      }

      // ✅ SECURITY: Use explicit field list to prevent data over-exposure
      const { data: assignments, error: assignError } = await supabase
        .from('audit_assignments')
        .select(AUDIT_ASSIGNMENT_FIELDS)
        .eq('auditor_email', currentUserEmail)
        .order('created_at', { ascending: false });

      if (assignError) {
        logError('Error loading assignments from audit_assignments table:', assignError);
        throw assignError;
      }

      if (!assignments || assignments.length === 0) {
        this.listContainer.textContent = '';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'text-center text-white/50 text-xs py-8';
        emptyDiv.textContent = 'No assigned audits found.';
        this.listContainer.appendChild(emptyDiv);
        return;
      }

      // Fetch scorecards separately and create a map
      const scorecardIds = [...new Set((assignments || []).map((a: any) => a.scorecard_id).filter(Boolean))];
      const scorecardMap = new Map<string, { id: string; name: string; table_name: string }>();

      if (scorecardIds.length > 0) {
        const { data: scorecards, error: scorecardError } = await supabase
          .from('scorecards')
          .select('id, name, table_name')
          .in('id', scorecardIds);

        if (!scorecardError && scorecards) {
          scorecards.forEach((scorecard: any) => {
            scorecardMap.set(scorecard.id, {
              id: scorecard.id,
              name: scorecard.name || 'Unknown Scorecard',
              table_name: scorecard.table_name || ''
            });
          });
        }
      }

      // ✅ SECURITY: RLS policies already filter by auditor_email, but we ensure consistency
      const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
      const filteredAssignments = (assignments || []).filter((assignment: any) => {
        const auditorEmail = (assignment.auditor_email || '').toLowerCase().trim();
        return auditorEmail === normalizedCurrentEmail;
      });
      

      // Fetch employee details (employee_id and intercom_alias) from people/users table
      // NOTE: This is OPTIONAL - we continue even if it fails
      const employeeEmails: string[] = [...new Set(filteredAssignments.map((a: any) => a.employee_email).filter(Boolean) as string[])];
      const employeeDetailsMap = new Map<string, { employee_id?: string; intercom_alias?: string }>();

      if (employeeEmails.length > 0) {
        try {
          // Try to get from people table first (OPTIONAL - continue if fails)
          const { data: peopleData, error: peopleError } = await supabase
            .from('people')
            .select('email, employee_id, intercom_admin_alias')
            .in('email', employeeEmails);

          if (!peopleError && peopleData) {
            peopleData.forEach((person: any) => {
              if (person.email) {
                employeeDetailsMap.set(person.email.toLowerCase(), {
                  employee_id: person.employee_id,
                  intercom_alias: person.intercom_admin_alias
                });
              }
            });
          }

          // Fallback to users table if people table doesn't have all employees
          const missingEmails = employeeEmails.filter((email: string) => !employeeDetailsMap.has(email.toLowerCase()));
          if (missingEmails.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .from('users')
              .select('email, employee_id, intercom_admin_alias')
              .in('email', missingEmails);

            if (!usersError && usersData) {
              usersData.forEach((user: any) => {
                if (user.email && !employeeDetailsMap.has(user.email.toLowerCase())) {
                  employeeDetailsMap.set(user.email.toLowerCase(), {
                    employee_id: user.employee_id,
                    intercom_alias: user.intercom_admin_alias
                  });
                }
              });
            }
          }
        } catch (error) {
          logWarn('Error fetching employee details (non-critical, continuing without enrichment):', error);
          // Continue without employee details - this is optional enrichment
        }
      }

      // Map assignments to AssignedAudit format
      this.audits = filteredAssignments.map((assignment: any) => {
        const employeeEmail = assignment.employee_email?.toLowerCase() || '';
        const employeeDetails = employeeDetailsMap.get(employeeEmail) || {};
        const scorecard = assignment.scorecard_id ? scorecardMap.get(assignment.scorecard_id) : null;

        return {
          id: assignment.id,
          employee_email: assignment.employee_email || '',
          employee_name: assignment.employee_name || '',
          employee_id: employeeDetails.employee_id,
          intercom_alias: employeeDetails.intercom_alias,
          auditor_email: assignment.auditor_email || '',
          scorecard_id: assignment.scorecard_id || '',
          scorecard_name: scorecard?.name || 'Unknown Scorecard',
          status: (assignment.status || 'pending') as 'pending' | 'in_progress' | 'completed',
          scheduled_date: assignment.scheduled_date || undefined,
          created_at: assignment.created_at || new Date().toISOString()
        };
      });

      // Group audits by employee
      this.groupAuditsByEmployee();

      // Apply filters
      this.applyFilters();
    } catch (error) {
      logError('Error loading assigned audits:', error);
      
      this.listContainer.textContent = '';
      const errorDiv = document.createElement('div');
      errorDiv.className = 'text-center text-red-400 text-sm py-8 space-y-2';
      
      // Show detailed error message for debugging
      // ✅ SECURITY: Escape user input to prevent XSS
      const errorMessage = error instanceof Error 
        ? escapeHtml(error.message) 
        : (typeof error === 'object' && error !== null)
          ? escapeHtml(JSON.stringify(error))
          : escapeHtml(String(error));
      const errorCode = escapeHtml((error as any)?.code || 'UNKNOWN');
      
      // ✅ SECURITY: Use safeSetHTML for HTML content
      safeSetHTML(errorDiv, `
        <div class="font-semibold">Error loading audits</div>
        <div class="text-xs text-red-300/70">${errorMessage}</div>
        <div class="text-xs text-red-300/50">Code: ${errorCode}</div>
        <button id="retry-assigned-audits" class="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded text-xs">
          Retry
        </button>
      `);
      
      this.listContainer.appendChild(errorDiv);
      
      // Add retry button handler
      const retryButton = errorDiv.querySelector('#retry-assigned-audits');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.loadAssignedAudits();
        });
      }
    }
  }

  private groupAuditsByEmployee(): void {
    const employeeMap = new Map<string, EmployeeAuditSummary>();

    // Ensure audits array is initialized
    if (!this.audits || this.audits.length === 0) {
      this.employeeSummaries = [];
      return;
    }

    this.audits.forEach(audit => {
      const key = audit.employee_email;
      
      if (!employeeMap.has(key)) {
        employeeMap.set(key, {
          employee_id: audit.employee_id || audit.employee_email,
          employee_name: audit.employee_name || '',
          employee_email: audit.employee_email || '',
          intercom_alias: audit.intercom_alias || undefined,
          audit_count: 0,
          audits: []
        });
      }

      const summary = employeeMap.get(key)!;
      if (summary) {
        summary.audits.push(audit);
        summary.audit_count = summary.audits.length;
      }
    });

    this.employeeSummaries = Array.from(employeeMap.values());
  }

  private applyFilters(): void {
    try {
      // Ensure employeeSummaries is initialized
      if (!this.employeeSummaries || this.employeeSummaries.length === 0) {
        this.filteredSummaries = [];
        this.renderEmployees();
        return;
      }

      // ✅ SECURITY: Always use optional chaining to prevent null reference errors
      const searchInput = this.searchInput;
      const statusFilterEl = this.statusFilter;
      const searchTerm = (searchInput?.value || '').toLowerCase();
      const statusFilter = statusFilterEl?.value || '';

      this.filteredSummaries = this.employeeSummaries.filter(summary => {
        // Safe string checks with null/undefined handling
        const employeeName = summary.employee_name || '';
        const employeeEmail = summary.employee_email || '';
        const intercomAlias = summary.intercom_alias || '';
        
        const matchesSearch = 
          employeeName.toLowerCase().includes(searchTerm) ||
          employeeEmail.toLowerCase().includes(searchTerm) ||
          (intercomAlias && intercomAlias.toLowerCase().includes(searchTerm));
        
        // If status filter is applied, check if employee has audits with that status
        if (statusFilter) {
          const audits = summary.audits || [];
          const hasMatchingStatus = audits.some(audit => audit.status === statusFilter);
          return matchesSearch && hasMatchingStatus;
        }

        return matchesSearch;
      });

      this.renderEmployees();
    } catch (error) {
      logError('Error in applyFilters method:', error);
      // Fallback: show all summaries if filtering fails
      this.filteredSummaries = this.employeeSummaries ? [...this.employeeSummaries] : [];
      this.renderEmployees();
    }
  }

  private renderEmployees(): void {
    if (!this.listContainer) {
      logError('Cannot render employees: listContainer is not initialized');
      return;
    }
    
    logInfo('🎨 Rendering employees', { 
      filteredCount: this.filteredSummaries.length,
      totalCount: this.employeeSummaries.length
    });
    
    if (this.filteredSummaries.length === 0) {
      this.listContainer.textContent = '';
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'text-center text-white/50 text-xs py-12';
      const p1 = document.createElement('p');
      p1.className = 'mb-1';
      p1.textContent = 'No employees found';
      const p2 = document.createElement('p');
      p2.className = 'text-white/30 text-xs';
      p2.textContent = 'Try adjusting your filters';
      emptyDiv.appendChild(p1);
      emptyDiv.appendChild(p2);
      this.listContainer.appendChild(emptyDiv);
      return;
    }

    this.listContainer.textContent = '';
    this.filteredSummaries.forEach((summary, index) => {
      const isActive = summary.employee_email === this.selectedEmployeeId;
      const intercomDisplay = summary.intercom_alias || 'No alias';
      
      const itemDiv = document.createElement('div');
      itemDiv.className = `employee-item ${isActive ? 'active' : ''}`;
      itemDiv.setAttribute('data-employee-email', this.escapeHtml(summary.employee_email));
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'employee-item-content';
      
      const primaryDiv = document.createElement('div');
      primaryDiv.className = 'employee-primary';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'employee-name';
      nameSpan.textContent = summary.employee_name;
      
      const aliasSpan = document.createElement('span');
      aliasSpan.className = 'employee-alias';
      aliasSpan.textContent = intercomDisplay;
      
      primaryDiv.appendChild(nameSpan);
      primaryDiv.appendChild(aliasSpan);
      
      const secondaryDiv = document.createElement('div');
      secondaryDiv.className = 'employee-secondary';
      
      const countSpan = document.createElement('span');
      countSpan.className = 'audit-count-label';
      countSpan.textContent = `${summary.audit_count} ${summary.audit_count === 1 ? 'audit' : 'audits'}`;
      
      secondaryDiv.appendChild(countSpan);
      
      contentDiv.appendChild(primaryDiv);
      contentDiv.appendChild(secondaryDiv);
      itemDiv.appendChild(contentDiv);
      
      this.listContainer.appendChild(itemDiv);
      
      logInfo(`✅ Rendered employee item ${index + 1}`, {
        employeeEmail: summary.employee_email,
        employeeName: summary.employee_name,
        auditCount: summary.audit_count
      });
    });

    // Attach click handlers using event delegation for better reliability
    // Remove any existing click handlers first by using a single delegated handler
    const existingHandler = (this.listContainer as any).__employeeClickHandler;
    if (existingHandler) {
      this.listContainer.removeEventListener('click', existingHandler);
    }
    
    const clickHandler = (e: Event) => {
      const target = e.target as HTMLElement;
      // Find the closest employee-item element (in case click is on child element)
      const employeeItem = target.closest('.employee-item') as HTMLElement;
      
      if (!employeeItem) {
        return; // Click wasn't on an employee item
      }
      
      e.preventDefault();
      e.stopPropagation();
      
      const employeeEmail = employeeItem.getAttribute('data-employee-email');
      logInfo('👆 Employee item clicked', { 
        employeeEmail, 
        hasCallback: !!this.onEmployeeSelectCallback,
        targetElement: target.tagName,
        itemElement: employeeItem
      });
      
      if (employeeEmail) {
        // Decode HTML entities if any
        const decodedEmail = this.decodeHtmlEntities(employeeEmail);
        this.selectEmployee(decodedEmail);
      } else {
        logWarn('Employee item clicked but no email found', { 
          item: employeeItem,
          attributes: Array.from(employeeItem.attributes).map(attr => ({ name: attr.name, value: attr.value }))
        });
      }
    };
    
    // Store handler reference for cleanup
    (this.listContainer as any).__employeeClickHandler = clickHandler;
    
    // Use event delegation on the container
    this.listContainer.addEventListener('click', clickHandler);
    
    logInfo('✅ Click handlers attached using event delegation', { 
      itemCount: this.filteredSummaries.length 
    });
  }

  private selectEmployee(employeeEmail: string): void {
    try {
      logInfo('🔍 Selecting employee', { employeeEmail, summaryCount: this.employeeSummaries.length });
      
      // Use employee_email as the identifier (matches what edge function needs)
      this.selectedEmployeeId = employeeEmail;
      
      // Find by employee_email (this is what the edge function needs)
      const summary = this.employeeSummaries.find(s => s.employee_email === employeeEmail);
      
      if (!summary) {
        logError('Employee summary not found', { employeeEmail, availableEmails: this.employeeSummaries.map(s => s.employee_email) });
        return;
      }
      
      if (!this.onEmployeeSelectCallback) {
        logWarn('No callback registered for employee selection', { employeeEmail });
        return;
      }
      
      logInfo('✅ Calling employee select callback', { 
        employeeEmail: summary.employee_email,
        employeeName: summary.employee_name,
        auditCount: summary.audit_count
      });
      
      try {
        this.onEmployeeSelectCallback(summary);
        logInfo('✅ Employee select callback completed successfully');
      } catch (error) {
        logError('Error calling callback:', error);
        throw error;
      }

      // Re-render to update active state
      this.renderEmployees();
    } catch (error) {
      logError('Error in selectEmployee:', error);
    }
  }

  private formatStatus(status: string): string {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return dateString;
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private decodeHtmlEntities(text: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  getSelectedEmployee(): EmployeeAuditSummary | null {
    if (!this.selectedEmployeeId) return null;
    return this.employeeSummaries.find(s => s.employee_id === this.selectedEmployeeId) || null;
  }
}

