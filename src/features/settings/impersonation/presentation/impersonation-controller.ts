/**
 * Impersonation Page Controller
 * Handles the dedicated impersonation page for Super Admins
 */

import { getSupabase, initSupabase, isSupabaseInitialized } from '../../../../utils/supabase-init.js';
import { startImpersonation } from '../../../../utils/impersonation-service.js';
import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';

interface User {
  email: string;
  name: string;
  role: string;
  department?: string;
  avatar_url?: string;
}

interface ImpersonationLog {
  id: string;
  admin_email: string;
  target_email: string;
  reason?: string;
  started_at: string;
  ended_at?: string;
}

class ImpersonationController {
  private users: User[] = [];
  private filteredUsers: User[] = [];
  private currentUserEmail: string = '';
  private selectedUser: User | null = null;
  private departments: Set<string> = new Set();

  async init(): Promise<void> {
    logInfo('[Impersonation] Initializing controller');
    
    // IMPORTANT: Wait for Supabase to be initialized FIRST
    // This ensures auth tokens are available for permission checks
    await this.waitForSupabase();
    
    // Now check access (requires Supabase to be ready)
    const hasAccess = await this.checkAccess();
    
    if (!hasAccess) {
      this.showAccessDenied();
      return;
    }

    // Show main content
    this.showMainContent();
    
    // Load data
    await Promise.all([
      this.loadUsers(),
      this.loadLogs()
    ]);
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Wait for Supabase to be initialized
   */
  private async waitForSupabase(maxWait: number = 10000): Promise<void> {
    // If already initialized, return immediately
    if (isSupabaseInitialized()) {
      logInfo('[Impersonation] Supabase already initialized');
      return;
    }

    logInfo('[Impersonation] Waiting for Supabase initialization...');
    
    // Try to initialize
    try {
      await initSupabase();
      if (isSupabaseInitialized()) {
        logInfo('[Impersonation] Supabase initialized successfully');
        return;
      }
    } catch (error) {
      logWarn('[Impersonation] Initial Supabase init failed, waiting...');
    }

    // Poll for initialization
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (isSupabaseInitialized()) {
        logInfo('[Impersonation] Supabase initialized after waiting');
        return;
      }
    }

    logError('[Impersonation] Supabase initialization timeout');
    throw new Error('Supabase initialization timeout');
  }

  /**
   * Check if current user can access impersonation (permission API: role + individual overrides).
   * Accepts either 'page' or 'api_endpoint' so a grant of "User Impersonation" or "User Impersonation (API)" both allow access.
   */
  private async checkAccess(): Promise<boolean> {
    try {
      const userInfoStr = localStorage.getItem('userInfo');
      if (!userInfoStr) {
        logWarn('[Impersonation] No user info found in localStorage');
        this.showAccessDeniedReason('No user info found. Please log in again.');
        return false;
      }
      const userInfo = JSON.parse(userInfoStr);
      this.currentUserEmail = userInfo.email?.toLowerCase() || '';

      logInfo(`[Impersonation] Checking access for: ${this.currentUserEmail}`);

      // Import permission utilities
      const { hasPermissionWithDetails, clearPermissionCache } = await import('../../../../utils/permissions.js');
      
      // Clear frontend cache to ensure fresh check
      clearPermissionCache();

      // Check for page access (primary) with full details
      const pageResult = await hasPermissionWithDetails('settings/impersonation', 'page');
      logInfo(`[Impersonation] Page permission check:`, pageResult);
      
      if (pageResult.hasAccess) {
        return true;
      }

      // Fallback: check for api_endpoint access
      const apiResult = await hasPermissionWithDetails('settings/impersonation', 'api_endpoint');
      logInfo(`[Impersonation] API endpoint permission check:`, apiResult);
      
      if (apiResult.hasAccess) {
        return true;
      }

      // Show detailed reason for denial
      const reason = pageResult.error 
        ? `Error: ${pageResult.error}`
        : `Page: ${pageResult.reason} (Role: ${pageResult.userRole || 'Unknown'})`;
      this.showAccessDeniedReason(reason);
      
      return false;
    } catch (error) {
      logError('[Impersonation] Access check failed:', error);
      this.showAccessDeniedReason(`Access check error: ${error}`);
      return false;
    }
  }

  private showAccessDeniedReason(reason: string): void {
    // Try to show reason in the UI for debugging
    const reasonEl = document.getElementById('accessDeniedReason');
    if (reasonEl) {
      reasonEl.textContent = reason;
      reasonEl.style.display = 'block';
    }
    logWarn(`[Impersonation] Access denied reason: ${reason}`);
  }

  private showAccessDenied(): void {
    const accessCheck = document.getElementById('accessCheck');
    const accessDenied = document.getElementById('accessDenied');
    
    if (accessCheck) accessCheck.style.display = 'none';
    if (accessDenied) accessDenied.style.display = 'flex';

    // Setup debug button
    const debugBtn = document.getElementById('debugAccessBtn');
    if (debugBtn) {
      debugBtn.addEventListener('click', () => this.showDebugInfo());
    }
  }

  private async showDebugInfo(): Promise<void> {
    const output = document.getElementById('debugOutput');
    if (!output) return;

    output.style.display = 'block';
    output.textContent = 'Loading debug info...';

    try {
      const supabase = getSupabase();
      if (!supabase) {
        output.textContent = 'Error: Supabase not initialized';
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        output.textContent = 'Error: No session found. Please log in again.';
        return;
      }

      const response = await fetch('/api/permissions/debug', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      output.textContent = JSON.stringify(data, null, 2);
    } catch (error: any) {
      output.textContent = `Error: ${error.message}`;
    }
  }

  private showMainContent(): void {
    const accessCheck = document.getElementById('accessCheck');
    const mainContent = document.getElementById('mainContent');
    
    if (accessCheck) accessCheck.style.display = 'none';
    if (mainContent) mainContent.style.display = 'flex';
  }

  /**
   * Load all users from the people table
   */
  private async loadUsers(): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      const { data, error } = await supabase
        .from('people')
        .select('email, name, role, department, avatar_url')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        throw error;
      }

      this.users = (data || []).map((user: { email?: string; name?: string; role?: string; department?: string; avatar_url?: string }) => ({
        email: user.email || '',
        name: user.name || user.email || 'Unknown',
        role: user.role || 'Employee',
        department: user.department || undefined,
        avatar_url: user.avatar_url || undefined
      }));

      // Collect unique departments
      this.users.forEach(user => {
        if (user.department) {
          this.departments.add(user.department);
        }
      });

      this.filteredUsers = [...this.users];
      this.renderUsers();
      this.populateDepartmentFilter();
      this.updateStatCounts(this.users.length, undefined);
      
      logInfo('[Impersonation] Loaded users:', this.users.length);
      
    } catch (error) {
      logError('[Impersonation] Failed to load users:', error);
      this.renderError('Failed to load users. Please refresh the page.');
    }
  }

  /**
   * Load impersonation logs
   */
  private async loadLogs(): Promise<void> {
    try {
      const supabase = getSupabase();
      if (!supabase) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch('/api/admin/impersonation-logs?limit=10', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }

      const { logs } = await response.json();
      const logList = logs || [];
      this.renderLogs(logList);
      this.updateStatCounts(undefined, logList.length);
      
    } catch (error) {
      logError('[Impersonation] Failed to load logs:', error);
      const logsContainer = document.getElementById('impersonationLogs');
      if (logsContainer) {
        logsContainer.innerHTML = `
          <div class="empty-state">
            <p>Unable to load sessions</p>
          </div>
        `;
      }
    }
  }

  /**
   * Render users list
   */
  private renderUsers(): void {
    const container = document.getElementById('usersList');
    if (!container) return;

    if (this.filteredUsers.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <p>No users found matching your criteria</p>
        </div>
      `;
      return;
    }

    const usersHTML = this.filteredUsers.map(user => this.renderUserCard(user)).join('');
    container.innerHTML = usersHTML;
    
    // Setup click handlers for impersonate buttons
    container.querySelectorAll('.btn-impersonate-user').forEach(btn => {
      const email = btn.getAttribute('data-email');
      if (email && !btn.classList.contains('self-disabled')) {
        btn.addEventListener('click', () => this.openImpersonationModal(email));
      }
    });
  }

  /**
   * Render a single user card
   */
  private renderUserCard(user: User): string {
    const initials = user.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    
    const roleClass = user.role.toLowerCase().replace(/\s+/g, '-');
    const isSelf = user.email.toLowerCase() === this.currentUserEmail;
    
    const avatarContent = user.avatar_url
      ? `<img src="${this.escapeHtml(user.avatar_url)}" alt="${this.escapeHtml(user.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><span style="display:none;">${this.escapeHtml(initials)}</span>`
      : this.escapeHtml(initials);

    return `
      <div class="user-card">
        <div class="user-avatar">${avatarContent}</div>
        <div class="user-info">
          <p class="user-name">${this.escapeHtml(user.name)}</p>
          <p class="user-email">${this.escapeHtml(user.email)}</p>
        </div>
        <div class="user-meta">
          <span class="user-role ${roleClass}">${this.escapeHtml(user.role)}</span>
          ${user.department ? `<span class="user-department">${this.escapeHtml(user.department)}</span>` : ''}
        </div>
        <button class="btn-impersonate-user ${isSelf ? 'self-disabled' : ''}" 
                data-email="${this.escapeHtml(user.email)}"
                ${isSelf ? 'disabled title="Cannot impersonate yourself"' : ''}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
          </svg>
          ${isSelf ? 'You' : 'View as User'}
        </button>
      </div>
    `;
  }

  /**
   * Render impersonation logs
   */
  private renderLogs(logs: ImpersonationLog[]): void {
    const container = document.getElementById('impersonationLogs');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>No sessions recorded yet</p>
        </div>
      `;
      return;
    }

    const logsHTML = logs.map(log => {
      const date = new Date(log.started_at);
      const timeStr = date.toLocaleString();
      
      return `
        <div class="log-entry">
          <span class="log-admin">${this.escapeHtml(log.admin_email)}</span>
          <span class="log-arrow">→</span>
          <span class="log-target">${this.escapeHtml(log.target_email)}</span>
          <span class="log-reason">${log.reason ? this.escapeHtml(log.reason) : 'No reason provided'}</span>
          <span class="log-time">${timeStr}</span>
        </div>
      `;
    }).join('');

    container.innerHTML = logsHTML;
  }

  /**
   * Update statistics strip (DOM only)
   */
  private updateStatCounts(userCount?: number, sessionCount?: number): void {
    if (userCount !== undefined) {
      const el = document.getElementById('statUserCount');
      if (el) el.textContent = String(userCount);
    }
    if (sessionCount !== undefined) {
      const el = document.getElementById('statSessionCount');
      if (el) el.textContent = String(sessionCount);
    }
  }

  /**
   * Populate department filter
   */
  private populateDepartmentFilter(): void {
    const select = document.getElementById('departmentFilter') as HTMLSelectElement;
    if (!select) return;

    const sortedDepts = Array.from(this.departments).sort();
    
    sortedDepts.forEach(dept => {
      const option = document.createElement('option');
      option.value = dept;
      option.textContent = dept;
      select.appendChild(option);
    });
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Search input
    const searchInput = document.getElementById('userSearch') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterUsers());
    }

    // Role filter
    const roleFilter = document.getElementById('roleFilter') as HTMLSelectElement;
    if (roleFilter) {
      roleFilter.addEventListener('change', () => this.filterUsers());
    }

    // Department filter
    const departmentFilter = document.getElementById('departmentFilter') as HTMLSelectElement;
    if (departmentFilter) {
      departmentFilter.addEventListener('change', () => this.filterUsers());
    }

    // Modal close button
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
      closeModal.addEventListener('click', () => this.closeModal());
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelImpersonation');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    // Confirm button
    const confirmBtn = document.getElementById('confirmImpersonation');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.confirmImpersonation());
    }

    // Close modal on overlay click
    const modalOverlay = document.getElementById('impersonationModal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
          this.closeModal();
        }
      });
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  }

  /**
   * Filter users based on search and filters
   */
  private filterUsers(): void {
    const searchInput = document.getElementById('userSearch') as HTMLInputElement;
    const roleFilter = document.getElementById('roleFilter') as HTMLSelectElement;
    const departmentFilter = document.getElementById('departmentFilter') as HTMLSelectElement;

    const searchTerm = (searchInput?.value || '').toLowerCase().trim();
    const selectedRole = roleFilter?.value || '';
    const selectedDepartment = departmentFilter?.value || '';

    this.filteredUsers = this.users.filter(user => {
      // Search filter
      const matchesSearch = !searchTerm || 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm);

      // Role filter
      const matchesRole = !selectedRole || user.role === selectedRole;

      // Department filter
      const matchesDepartment = !selectedDepartment || user.department === selectedDepartment;

      return matchesSearch && matchesRole && matchesDepartment;
    });

    this.renderUsers();
  }

  /**
   * Open impersonation confirmation modal
   */
  private openImpersonationModal(email: string): void {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) return;

    this.selectedUser = user;

    // Populate modal
    const userPreview = document.getElementById('modalUserPreview');
    if (userPreview) {
      const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      const roleClass = user.role.toLowerCase().replace(/\s+/g, '-');
      
      userPreview.innerHTML = `
        <div class="user-avatar">${user.avatar_url ? `<img src="${this.escapeHtml(user.avatar_url)}" alt="${this.escapeHtml(user.name)}" />` : this.escapeHtml(initials)}</div>
        <div class="user-info">
          <p class="user-name">${this.escapeHtml(user.name)}</p>
          <p class="user-email">${this.escapeHtml(user.email)}</p>
          <span class="user-role ${roleClass}">${this.escapeHtml(user.role)}</span>
        </div>
      `;
    }

    // Clear reason textarea
    const reasonTextarea = document.getElementById('impersonationReason') as HTMLTextAreaElement;
    if (reasonTextarea) {
      reasonTextarea.value = '';
    }

    // Show modal
    const modal = document.getElementById('impersonationModal');
    if (modal) {
      modal.style.display = 'flex';
      // Focus on reason textarea
      setTimeout(() => reasonTextarea?.focus(), 100);
    }
  }

  /**
   * Close the modal
   */
  private closeModal(): void {
    const modal = document.getElementById('impersonationModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.selectedUser = null;
  }

  /**
   * Confirm and start impersonation
   */
  private async confirmImpersonation(): Promise<void> {
    if (!this.selectedUser) return;

    const reasonTextarea = document.getElementById('impersonationReason') as HTMLTextAreaElement;
    const reason = reasonTextarea?.value?.trim();

    if (!reason) {
      reasonTextarea?.focus();
      reasonTextarea?.classList.add('error');
      setTimeout(() => reasonTextarea?.classList.remove('error'), 2000);
      alert('Please enter a reason for this impersonation session.');
      return;
    }

    const confirmBtn = document.getElementById('confirmImpersonation') as HTMLButtonElement;
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = `
        <div class="loading-spinner" style="width: 18px; height: 18px; border-width: 2px;"></div>
        Opening session...
      `;
    }

    try {
      await startImpersonation(this.selectedUser.email, reason);
      // startImpersonation will redirect, so we won't reach here normally
    } catch (error: any) {
      logError('[Impersonation] Failed:', error);
      alert(`Impersonation failed: ${error.message || 'Unknown error'}`);
      
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = `
          <svg class="btn-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
          </svg>
          View as User
        `;
      }
    }
  }

  /**
   * Render error state
   */
  private renderError(message: string): void {
    const container = document.getElementById('usersList');
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: #ef4444;">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <p>${this.escapeHtml(message)}</p>
      </div>
    `;
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
document.addEventListener('DOMContentLoaded', () => {
  const controller = new ImpersonationController();
  controller.init();
});
