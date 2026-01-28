/**
 * Permission Management - Improved UI & Logic
 * Handles user permissions, role defaults, and access testing
 */

import { apiClient } from '../../../../utils/api-client.js';
import { createLogger } from '../../../../utils/logger.js';
import { initSupabase, isSupabaseInitialized } from '../../../../utils/supabase-init.js';

const logger = createLogger('PermissionManagement');

// Types
interface UserRule {
  id: string;
  user_email: string;
  rule_type: string;
  resource_name: string;
  access_type: 'allow' | 'deny';
  is_active: boolean;
}

interface RoleRule {
  id: string;
  rule_type: string;
  resource_name: string;
  allowed_roles: string[] | null;
  min_role_level: number | null;
  is_active: boolean;
}

interface Resource {
  value: string;
  label: string;
  type: string;
}

interface FeatureAccess {
  resource: string;
  label: string;
  type: string;
  hasAccess: boolean;
  source: 'role' | 'individual_allow' | 'individual_deny' | 'default_deny';
  ruleId?: string;
}

interface UserData {
  email: string;
  name: string;
  role: string;
  roleLevel: number;
  department?: string;
}

interface UserAccessData {
  user: UserData;
  individualRules: UserRule[];
  featureAccess: FeatureAccess[];
}

interface SearchUser {
  email: string;
  name: string;
  role: string;
  department?: string;
}

// Feature categories for organization
const FEATURE_CATEGORIES: Record<string, { title: string; resources: string[] }> = {
  settings: {
    title: 'Settings & Administration',
    resources: ['settings/impersonation', 'settings/permissions', 'settings/user-management', 'settings/scorecards', 'profile'],
  },
  auditing: {
    title: 'Auditing & Quality',
    resources: ['dashboard', 'create-audit', 'audit-form', 'audit-distribution', 'reversal', 'coaching-remediation'],
  },
  reports: {
    title: 'Reports & Analytics',
    resources: ['audit-reports', 'ai-audit-reports', 'performance'],
  },
  other: {
    title: 'Other Features',
    resources: ['home', 'event-management', 'help', 'notification-test', 'sandbox'],
  },
};

class PermissionManagement {
  private userRules: UserRule[] = [];
  private roleRules: RoleRule[] = [];
  private resources: Resource[] = [];
  private selectedUser: UserAccessData | null = null;
  private allUsers: SearchUser[] = [];
  private deleteContext: { type: 'user' | 'role'; id: string } | null = null;
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // IMPORTANT: Wait for Supabase to be initialized before making API calls
      // This ensures auth tokens are available
      await this.waitForSupabase();
      
      this.setupEventListeners();
      await this.loadResources();
      await Promise.all([
        this.loadUserRules(),
        this.loadRoleRules(),
        this.loadAllUsers(),
      ]);
      this.updateStats();
      this.hideLoading();
    } catch (error) {
      logger.error('Initialization error:', error);
      this.showToast('Failed to load data. Please refresh.', 'error');
      this.hideLoading();
    }
  }

  /**
   * Wait for Supabase to be initialized before making API calls
   */
  private async waitForSupabase(maxWait: number = 10000): Promise<void> {
    // If already initialized, return immediately
    if (isSupabaseInitialized()) {
      logger.info('Supabase already initialized');
      return;
    }

    logger.info('Waiting for Supabase initialization...');
    
    // Try to initialize
    try {
      await initSupabase();
      if (isSupabaseInitialized()) {
        logger.info('Supabase initialized successfully');
        return;
      }
    } catch (error) {
      logger.warn('Initial Supabase init failed, waiting...');
    }

    // Poll for initialization
    const startTime = Date.now();
    while (Date.now() - startTime < maxWait) {
      await new Promise(resolve => setTimeout(resolve, 200));
      if (isSupabaseInitialized()) {
        logger.info('Supabase initialized after waiting');
        return;
      }
    }

    // If we get here, Supabase didn't initialize in time
    logger.warn('Supabase initialization timed out, proceeding anyway');
  }

  private setupEventListeners(): void {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Refresh button
    document.getElementById('refreshAllBtn')?.addEventListener('click', () => this.refreshAll());

    // User search with autocomplete
    const searchInput = document.getElementById('userSearchInput') as HTMLInputElement;
    searchInput?.addEventListener('input', () => this.handleUserSearch());
    searchInput?.addEventListener('focus', () => {
      if (searchInput.value.length >= 2) this.showSearchResults();
    });
    
    // Close search on click outside
    document.addEventListener('click', (e) => {
      const searchWrapper = document.querySelector('.search-input-group');
      if (searchWrapper && !searchWrapper.contains(e.target as Node)) {
        this.hideSearchResults();
      }
    });

    // Add permission button
    document.getElementById('addUserPermissionBtn')?.addEventListener('click', () => this.openUserPermissionModal());
    document.getElementById('addRoleRuleBtn')?.addEventListener('click', () => this.openRoleRuleModal());

    // Clear selected user
    document.getElementById('clearSelectedUser')?.addEventListener('click', () => this.clearSelectedUser());

    // Filter changes
    document.getElementById('filterAccessType')?.addEventListener('change', () => this.renderUserRulesTable());

    // Form submissions
    document.getElementById('userPermissionForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveUserPermission();
    });
    document.getElementById('roleRuleForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveRoleRule();
    });
    document.getElementById('testAccessForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.testAccess();
    });

    // Modal close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => this.closeAllModals());
    });

    // Delete confirmation
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => this.confirmDelete());

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeAllModals();
      });
    });
  }

  // ===================== Tab Management =====================

  private switchTab(tabId: string): void {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
      btn.setAttribute('aria-selected', btn.classList.contains('active').toString());
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `${tabId}-panel`);
    });
  }

  // ===================== Data Loading =====================

  private async loadResources(): Promise<void> {
    try {
      const response = await apiClient.get('/api/permissions/resources');
      this.resources = response?.resources || [];
      this.populateResourceSelects();
    } catch (error) {
      logger.warn('Could not load resources:', error);
    }
  }

  private async loadUserRules(): Promise<void> {
    try {
      const response = await apiClient.get('/api/permissions/user-rules');
      this.userRules = response?.rules || [];
      this.renderUserRulesTable();
    } catch (error) {
      logger.error('Error loading user rules:', error);
      this.userRules = [];
    }
  }

  private async loadRoleRules(): Promise<void> {
    try {
      const response = await apiClient.get('/api/permissions/rules');
      this.roleRules = response?.rules || [];
      this.renderRoleRulesGrid();
    } catch (error) {
      logger.error('Error loading role rules:', error);
      this.roleRules = [];
    }
  }

  private async loadAllUsers(): Promise<void> {
    try {
      const response = await apiClient.get('/api/people');
      this.allUsers = (response?.data || []).map((p: any) => ({
        email: p.email,
        name: p.name || p.email,
        role: p.role || 'Unknown',
        department: p.department,
      }));
    } catch (error) {
      logger.warn('Could not load users for search:', error);
    }
  }

  private async refreshAll(): Promise<void> {
    this.showLoading();
    try {
      await apiClient.post('/api/permissions/clear-cache');
      await Promise.all([
        this.loadUserRules(),
        this.loadRoleRules(),
      ]);
      if (this.selectedUser) {
        await this.loadUserAccess(this.selectedUser.user.email);
      }
      this.updateStats();
      this.showToast('Data refreshed successfully', 'success');
    } catch (error) {
      logger.error('Refresh error:', error);
      this.showToast('Failed to refresh', 'error');
    } finally {
      this.hideLoading();
    }
  }

  // ===================== User Search =====================

  private handleUserSearch(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    
    this.searchTimeout = setTimeout(() => {
      const input = document.getElementById('userSearchInput') as HTMLInputElement;
      const query = input?.value?.trim().toLowerCase() || '';
      
      if (query.length < 2) {
        this.hideSearchResults();
        return;
      }
      
      const filtered = this.allUsers
        .filter(u => 
          u.email.toLowerCase().includes(query) || 
          u.name.toLowerCase().includes(query)
        )
        .slice(0, 10);
      
      this.showSearchResults(filtered);
    }, 200);
  }

  private showSearchResults(results?: SearchUser[]): void {
    const dropdown = document.getElementById('userSearchResults');
    if (!dropdown) return;

    if (!results || results.length === 0) {
      dropdown.innerHTML = '<div class="search-no-results">No users found</div>';
    } else {
      dropdown.innerHTML = results.map(user => `
        <div class="search-result-item" data-email="${this.escapeHtml(user.email)}">
          <div class="search-result-avatar">${this.getInitials(user.name)}</div>
          <div class="search-result-info">
            <div class="search-result-name">${this.escapeHtml(user.name)}</div>
            <div class="search-result-email">${this.escapeHtml(user.email)}</div>
          </div>
        </div>
      `).join('');

      dropdown.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const email = item.getAttribute('data-email');
          if (email) {
            this.selectUser(email);
            this.hideSearchResults();
          }
        });
      });
    }

    dropdown.classList.remove('hidden');
  }

  private hideSearchResults(): void {
    document.getElementById('userSearchResults')?.classList.add('hidden');
  }

  private async selectUser(email: string): Promise<void> {
    const input = document.getElementById('userSearchInput') as HTMLInputElement;
    if (input) input.value = email;
    
    await this.loadUserAccess(email);
  }

  private async loadUserAccess(email: string): Promise<void> {
    this.showLoading();
    try {
      const data = await apiClient.get(`/api/permissions/user-access/${encodeURIComponent(email)}`);
      this.selectedUser = data;
      this.renderSelectedUser();
      
      // Hide the all rules table, show user card
      document.getElementById('allUserRulesSection')?.classList.add('hidden');
      document.getElementById('selectedUserCard')?.classList.remove('hidden');
    } catch (error: any) {
      logger.error('Error loading user access:', error);
      if (error.status === 404) {
        this.showToast('User not found', 'error');
      } else {
        this.showToast('Failed to load user access', 'error');
      }
    } finally {
      this.hideLoading();
    }
  }

  private clearSelectedUser(): void {
    this.selectedUser = null;
    const input = document.getElementById('userSearchInput') as HTMLInputElement;
    if (input) input.value = '';
    
    document.getElementById('selectedUserCard')?.classList.add('hidden');
    document.getElementById('allUserRulesSection')?.classList.remove('hidden');
  }

  // ===================== Rendering =====================

  private renderSelectedUser(): void {
    if (!this.selectedUser) return;

    const { user } = this.selectedUser;

    // Update user card
    const avatar = document.getElementById('selectedUserAvatar');
    const name = document.getElementById('selectedUserName');
    const email = document.getElementById('selectedUserEmail');
    const role = document.getElementById('selectedUserRole');
    const dept = document.getElementById('selectedUserDept');

    if (avatar) avatar.textContent = this.getInitials(user.name);
    if (name) name.textContent = user.name;
    if (email) email.textContent = user.email;
    if (role) role.textContent = `${user.role} (Level ${user.roleLevel})`;
    if (dept) dept.textContent = user.department || 'No Department';

    // Render access categories
    this.renderAccessCategories();
  }

  private renderAccessCategories(): void {
    if (!this.selectedUser) return;

    const container = document.getElementById('accessCategories');
    if (!container) return;

    const { featureAccess } = this.selectedUser;
    
    container.innerHTML = Object.entries(FEATURE_CATEGORIES).map(([key, category]) => {
      const items = featureAccess.filter(f => category.resources.includes(f.resource));
      if (items.length === 0) return '';

      return `
        <div class="access-category">
          <div class="category-header">${category.title}</div>
          <div class="category-items">
            ${items.map(item => this.renderAccessItem(item)).join('')}
          </div>
        </div>
      `;
    }).join('');

    // Add toggle listeners
    container.querySelectorAll('.toggle-switch input').forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        const input = e.target as HTMLInputElement;
        const resource = input.getAttribute('data-resource');
        const type = input.getAttribute('data-type');
        if (resource && type) {
          this.toggleAccess(resource, type, input.checked);
        }
      });
    });
  }

  private renderAccessItem(item: FeatureAccess): string {
    const sourceLabel = this.getSourceLabel(item.source);
    const sourceClass = this.getSourceClass(item.source);
    const isRoleBased = item.source === 'role';

    return `
      <div class="access-item">
        <div class="access-item-info">
          <div class="access-item-name">${this.escapeHtml(item.label)}</div>
          <div class="access-item-source ${sourceClass}">${sourceLabel}</div>
        </div>
        <label class="toggle-switch" ${isRoleBased ? 'title="Access from role - toggle to override"' : ''}>
          <input type="checkbox" 
                 data-resource="${this.escapeHtml(item.resource)}"
                 data-type="${this.escapeHtml(item.type)}"
                 ${item.hasAccess ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  }

  private getSourceLabel(source: string): string {
    switch (source) {
      case 'role': return 'From Role';
      case 'individual_allow': return 'Individual Allow';
      case 'individual_deny': return 'Individual Deny';
      case 'default_deny': return 'No Access (Default)';
      default: return source;
    }
  }

  private getSourceClass(source: string): string {
    switch (source) {
      case 'role': return 'source-role';
      case 'individual_allow': return 'source-allow';
      case 'individual_deny': return 'source-deny';
      default: return 'source-default';
    }
  }

  private renderUserRulesTable(): void {
    const tbody = document.getElementById('userRulesTableBody');
    if (!tbody) return;

    const filterAccess = (document.getElementById('filterAccessType') as HTMLSelectElement)?.value || '';
    
    let filtered = this.userRules.filter(r => r.is_active);
    if (filterAccess) {
      filtered = filtered.filter(r => r.access_type === filterAccess);
    }

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No individual permissions found</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(rule => {
      const resourceLabel = this.resources.find(r => r.value === rule.resource_name)?.label || rule.resource_name;
      const user = this.allUsers.find(u => u.email.toLowerCase() === rule.user_email.toLowerCase());
      const userName = user?.name || rule.user_email;

      return `
        <tr>
          <td>
            <div class="table-user">
              <div class="table-avatar">${this.getInitials(userName)}</div>
              <div class="table-user-info">
                <div class="table-user-name">${this.escapeHtml(userName)}</div>
                <div class="table-user-email">${this.escapeHtml(rule.user_email)}</div>
              </div>
            </div>
          </td>
          <td>${this.escapeHtml(resourceLabel)}</td>
          <td>
            <span class="badge-access ${rule.access_type}">${rule.access_type.toUpperCase()}</span>
          </td>
          <td>
            <span class="badge-status ${rule.is_active ? 'active' : 'inactive'}">
              ${rule.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-table btn-edit" title="Edit" data-action="edit-user-rule" data-id="${rule.id}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button class="btn-table btn-delete" title="Delete" data-action="delete-user-rule" data-id="${rule.id}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Add event listeners for edit/delete buttons
    this.attachUserRuleTableListeners();
  }

  private renderRoleRulesGrid(): void {
    const container = document.getElementById('roleRulesGrid');
    if (!container) return;

    if (this.roleRules.length === 0) {
      container.innerHTML = '<div class="table-empty">No role-based rules found</div>';
      return;
    }

    container.innerHTML = this.roleRules.map(rule => {
      const resourceLabel = this.resources.find(r => r.value === rule.resource_name)?.label || rule.resource_name;
      const roles = rule.allowed_roles || [];

      return `
        <div class="role-rule-card">
          <div class="role-rule-header">
            <div>
              <div class="role-rule-title">${this.escapeHtml(resourceLabel)}</div>
              <div class="role-rule-resource">${this.escapeHtml(rule.resource_name)}</div>
            </div>
            <span class="badge-status ${rule.is_active ? 'active' : 'inactive'}">
              ${rule.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div class="role-rule-roles">
            ${roles.map(r => `<span class="role-chip">${this.escapeHtml(r)}</span>`).join('')}
            ${roles.length === 0 ? '<span class="role-chip">No roles assigned</span>' : ''}
          </div>
          <div class="role-rule-footer">
            <span style="font-size: 0.75rem; color: var(--gray-500);">Type: ${rule.rule_type}</span>
            <div class="table-actions">
              <button class="btn-table btn-edit" title="Edit" data-action="edit-role-rule" data-id="${rule.id}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button class="btn-table btn-delete" title="Delete" data-action="delete-role-rule" data-id="${rule.id}">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Add event listeners for edit/delete buttons
    this.attachRoleRuleCardListeners();
  }

  private attachUserRuleTableListeners(): void {
    const tbody = document.getElementById('userRulesTableBody');
    if (!tbody) return;

    tbody.querySelectorAll('[data-action="edit-user-rule"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.editUserRule(id);
      });
    });

    tbody.querySelectorAll('[data-action="delete-user-rule"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.deleteUserRule(id);
      });
    });
  }

  private attachRoleRuleCardListeners(): void {
    const container = document.getElementById('roleRulesGrid');
    if (!container) return;

    container.querySelectorAll('[data-action="edit-role-rule"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.editRoleRule(id);
      });
    });

    container.querySelectorAll('[data-action="delete-role-rule"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (id) this.deleteRoleRule(id);
      });
    });
  }

  private updateStats(): void {
    // Users with custom rules
    const uniqueEmails = new Set(this.userRules.filter(r => r.is_active).map(r => r.user_email.toLowerCase()));
    const totalUsers = document.getElementById('totalUsersWithRules');
    if (totalUsers) totalUsers.textContent = uniqueEmails.size.toString();

    // Allow rules
    const allowCount = this.userRules.filter(r => r.is_active && r.access_type === 'allow').length;
    const totalAllow = document.getElementById('totalAllowRules');
    if (totalAllow) totalAllow.textContent = allowCount.toString();

    // Deny rules
    const denyCount = this.userRules.filter(r => r.is_active && r.access_type === 'deny').length;
    const totalDeny = document.getElementById('totalDenyRules');
    if (totalDeny) totalDeny.textContent = denyCount.toString();

    // Role rules
    const roleCount = this.roleRules.filter(r => r.is_active).length;
    const totalRole = document.getElementById('totalRoleRules');
    if (totalRole) totalRole.textContent = roleCount.toString();
  }

  private populateResourceSelects(): void {
    const selects = [
      document.getElementById('permResource'),
      document.getElementById('ruleResource'),
      document.getElementById('testResource'),
    ] as HTMLSelectElement[];

    selects.forEach(select => {
      if (!select) return;
      
      // Keep the first option
      const firstOption = select.querySelector('option');
      select.innerHTML = '';
      if (firstOption) select.appendChild(firstOption);

      // Group by type
      const byType = new Map<string, Resource[]>();
      this.resources.forEach(r => {
        if (!byType.has(r.type)) byType.set(r.type, []);
        byType.get(r.type)!.push(r);
      });

      ['page', 'feature', 'api_endpoint'].forEach(type => {
        const opts = byType.get(type);
        if (!opts?.length) return;

        const group = document.createElement('optgroup');
        group.label = type === 'api_endpoint' ? 'API Endpoints' : type.charAt(0).toUpperCase() + type.slice(1) + 's';
        
        opts.forEach(o => {
          const opt = document.createElement('option');
          opt.value = o.value;
          opt.textContent = o.label;
          opt.setAttribute('data-type', o.type);
          group.appendChild(opt);
        });
        
        select.appendChild(group);
      });
    });
  }

  // ===================== Access Toggle =====================

  private async toggleAccess(resource: string, type: string, shouldAllow: boolean): Promise<void> {
    if (!this.selectedUser) return;

    const userEmail = this.selectedUser.user.email;
    
    // Find the current feature access
    const feature = this.selectedUser.featureAccess.find(f => f.resource === resource && f.type === type);
    if (!feature) return;

    // Find existing individual rule
    const existingRule = this.selectedUser.individualRules.find(
      r => r.resource_name === resource && r.rule_type === type
    );

    this.showLoading();

    try {
      if (existingRule) {
        // Update existing rule
        const newAccessType = shouldAllow ? 'allow' : 'deny';
        if (existingRule.access_type !== newAccessType) {
          await apiClient.put(`/api/permissions/user-rules/${existingRule.id}`, {
            accessType: newAccessType,
          });
          this.showToast(`Access ${shouldAllow ? 'granted' : 'revoked'}`, 'success');
        }
      } else {
        // Check for duplicate before creating
        const duplicate = this.userRules.find(
          r => r.user_email.toLowerCase() === userEmail.toLowerCase() &&
               r.resource_name === resource &&
               r.rule_type === type &&
               r.is_active
        );

        if (duplicate) {
          // Update existing instead
          await apiClient.put(`/api/permissions/user-rules/${duplicate.id}`, {
            accessType: shouldAllow ? 'allow' : 'deny',
          });
        } else {
          // Create new rule
          await apiClient.post('/api/permissions/user-rules', {
            userEmail,
            ruleType: type,
            resourceName: resource,
            accessType: shouldAllow ? 'allow' : 'deny',
            isActive: true,
          });
        }
        this.showToast(`Access ${shouldAllow ? 'granted' : 'revoked'}`, 'success');
      }

      // Reload user access to reflect changes
      await this.loadUserAccess(userEmail);
      await this.loadUserRules();
      this.updateStats();
    } catch (error: any) {
      logger.error('Toggle access error:', error);
      this.showToast(error.message || 'Failed to update access', 'error');
      // Reload to reset toggle state
      await this.loadUserAccess(userEmail);
    } finally {
      this.hideLoading();
    }
  }

  // ===================== Modals =====================

  private openUserPermissionModal(ruleId?: string): void {
    const modal = document.getElementById('userPermissionModal');
    const title = document.getElementById('userPermissionModalTitle');
    const form = document.getElementById('userPermissionForm') as HTMLFormElement;

    if (ruleId) {
      const rule = this.userRules.find(r => r.id === ruleId);
      if (rule) {
        (document.getElementById('permUserEmail') as HTMLInputElement).value = rule.user_email;
        (document.getElementById('permResource') as HTMLSelectElement).value = rule.resource_name;
        
        const radioAllow = document.querySelector('input[name="permAccessType"][value="allow"]') as HTMLInputElement;
        const radioDeny = document.querySelector('input[name="permAccessType"][value="deny"]') as HTMLInputElement;
        if (radioAllow) radioAllow.checked = rule.access_type === 'allow';
        if (radioDeny) radioDeny.checked = rule.access_type === 'deny';
        
        (document.getElementById('permRuleId') as HTMLInputElement).value = rule.id;
        if (title) title.textContent = 'Edit Permission';
      }
    } else {
      if (form) form.reset();
      (document.getElementById('permRuleId') as HTMLInputElement).value = '';
      
      // Pre-fill email if user is selected
      if (this.selectedUser) {
        (document.getElementById('permUserEmail') as HTMLInputElement).value = this.selectedUser.user.email;
      }
      
      if (title) title.textContent = 'Add User Permission';
    }

    modal?.classList.add('active');
  }

  private openRoleRuleModal(ruleId?: string): void {
    const modal = document.getElementById('roleRuleModal');
    const title = document.getElementById('roleRuleModalTitle');
    const form = document.getElementById('roleRuleForm') as HTMLFormElement;

    // Reset all checkboxes
    document.querySelectorAll('#roleCheckboxes input[type="checkbox"]').forEach(cb => {
      (cb as HTMLInputElement).checked = false;
    });

    if (ruleId) {
      const rule = this.roleRules.find(r => r.id === ruleId);
      if (rule) {
        (document.getElementById('ruleResource') as HTMLSelectElement).value = rule.resource_name;
        (document.getElementById('ruleActive') as HTMLInputElement).checked = rule.is_active;
        (document.getElementById('ruleId') as HTMLInputElement).value = rule.id;
        
        // Check the appropriate role checkboxes
        if (rule.allowed_roles) {
          rule.allowed_roles.forEach(role => {
            const cb = document.querySelector(`#roleCheckboxes input[value="${role}"]`) as HTMLInputElement;
            if (cb) cb.checked = true;
          });
        }
        
        if (title) title.textContent = 'Edit Role Rule';
      }
    } else {
      if (form) form.reset();
      (document.getElementById('ruleId') as HTMLInputElement).value = '';
      (document.getElementById('ruleActive') as HTMLInputElement).checked = true;
      if (title) title.textContent = 'Add Role Rule';
    }

    modal?.classList.add('active');
  }

  private closeAllModals(): void {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  // ===================== Save Operations =====================

  private async saveUserPermission(): Promise<void> {
    const id = (document.getElementById('permRuleId') as HTMLInputElement).value;
    const userEmail = (document.getElementById('permUserEmail') as HTMLInputElement).value.trim();
    const resourceName = (document.getElementById('permResource') as HTMLSelectElement).value;
    const accessType = (document.querySelector('input[name="permAccessType"]:checked') as HTMLInputElement)?.value;

    if (!userEmail || !resourceName || !accessType) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    // Get the type from the selected resource
    const resource = this.resources.find(r => r.value === resourceName);
    const ruleType = resource?.type || 'page';

    // Check for duplicate (if creating new)
    if (!id) {
      const duplicate = this.userRules.find(
        r => r.user_email.toLowerCase() === userEmail.toLowerCase() &&
             r.resource_name === resourceName &&
             r.rule_type === ruleType &&
             r.is_active
      );
      if (duplicate) {
        this.showToast('A rule for this user and feature already exists', 'error');
        return;
      }
    }

    this.showLoading();

    try {
      const data = {
        userEmail,
        ruleType,
        resourceName,
        accessType,
        isActive: true,
      };

      if (id) {
        await apiClient.put(`/api/permissions/user-rules/${id}`, data);
        this.showToast('Permission updated', 'success');
      } else {
        await apiClient.post('/api/permissions/user-rules', data);
        this.showToast('Permission created', 'success');
      }

      this.closeAllModals();
      await this.loadUserRules();
      this.updateStats();

      // Reload user access if same user
      if (this.selectedUser?.user.email.toLowerCase() === userEmail.toLowerCase()) {
        await this.loadUserAccess(userEmail);
      }
    } catch (error: any) {
      logger.error('Save permission error:', error);
      this.showToast(error.message || 'Failed to save permission', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private async saveRoleRule(): Promise<void> {
    const id = (document.getElementById('ruleId') as HTMLInputElement).value;
    const resourceName = (document.getElementById('ruleResource') as HTMLSelectElement).value;
    const isActive = (document.getElementById('ruleActive') as HTMLInputElement).checked;
    
    // Get selected roles from checkboxes
    const checkedRoles: string[] = [];
    document.querySelectorAll('#roleCheckboxes input[type="checkbox"]:checked').forEach(cb => {
      checkedRoles.push((cb as HTMLInputElement).value);
    });

    if (!resourceName) {
      this.showToast('Please select a feature', 'error');
      return;
    }

    if (checkedRoles.length === 0) {
      this.showToast('Please select at least one role', 'error');
      return;
    }

    // Get the type from the selected resource
    const resource = this.resources.find(r => r.value === resourceName);
    const ruleType = resource?.type || 'page';

    this.showLoading();

    try {
      const data = {
        ruleType,
        resourceName,
        allowedRoles: checkedRoles,
        minRoleLevel: null,
        isActive,
      };

      if (id) {
        await apiClient.put(`/api/permissions/rules/${id}`, data);
        this.showToast('Role rule updated', 'success');
      } else {
        await apiClient.post('/api/permissions/rules', data);
        this.showToast('Role rule created', 'success');
      }

      this.closeAllModals();
      await this.loadRoleRules();
      this.updateStats();
    } catch (error: any) {
      logger.error('Save role rule error:', error);
      this.showToast(error.message || 'Failed to save rule', 'error');
    } finally {
      this.hideLoading();
    }
  }

  // ===================== Delete Operations =====================

  public editUserRule(id: string): void {
    this.openUserPermissionModal(id);
  }

  public editRoleRule(id: string): void {
    this.openRoleRuleModal(id);
  }

  public deleteUserRule(id: string): void {
    const rule = this.userRules.find(r => r.id === id);
    if (!rule) return;

    this.deleteContext = { type: 'user', id };
    const msg = document.getElementById('deleteConfirmMessage');
    if (msg) msg.textContent = `Delete permission for "${rule.user_email}" to access "${rule.resource_name}"?`;
    
    document.getElementById('deleteConfirmModal')?.classList.add('active');
  }

  public deleteRoleRule(id: string): void {
    const rule = this.roleRules.find(r => r.id === id);
    if (!rule) return;

    this.deleteContext = { type: 'role', id };
    const msg = document.getElementById('deleteConfirmMessage');
    if (msg) msg.textContent = `Delete role-based rule for "${rule.resource_name}"?`;
    
    document.getElementById('deleteConfirmModal')?.classList.add('active');
  }

  private async confirmDelete(): Promise<void> {
    if (!this.deleteContext) return;

    const { type, id } = this.deleteContext;

    this.showLoading();

    try {
      const endpoint = type === 'role'
        ? `/api/permissions/rules/${id}`
        : `/api/permissions/user-rules/${id}`;

      await apiClient.delete(endpoint);
      this.showToast('Deleted successfully', 'success');
      this.closeAllModals();

      if (type === 'role') {
        await this.loadRoleRules();
      } else {
        await this.loadUserRules();
        if (this.selectedUser) {
          await this.loadUserAccess(this.selectedUser.user.email);
        }
      }
      this.updateStats();
    } catch (error: any) {
      logger.error('Delete error:', error);
      this.showToast(error.message || 'Failed to delete', 'error');
    } finally {
      this.deleteContext = null;
      this.hideLoading();
    }
  }

  // ===================== Test Access =====================

  private async testAccess(): Promise<void> {
    const email = (document.getElementById('testUserEmail') as HTMLInputElement).value.trim();
    const resource = (document.getElementById('testResource') as HTMLSelectElement).value;

    if (!email || !resource) {
      this.showToast('Please fill in all fields', 'error');
      return;
    }

    const resourceObj = this.resources.find(r => r.value === resource);
    const ruleType = resourceObj?.type || 'page';

    this.showLoading();

    try {
      const result = await apiClient.post('/api/permissions/test', {
        userEmail: email,
        resourceName: resource,
        ruleType,
      });

      this.renderTestResult(result);
    } catch (error: any) {
      logger.error('Test access error:', error);
      this.showToast(error.message || 'Failed to test access', 'error');
    } finally {
      this.hideLoading();
    }
  }

  private renderTestResult(result: any): void {
    const card = document.getElementById('testResultCard');
    const header = document.getElementById('testResultHeader');
    const details = document.getElementById('testResultDetails');

    if (!card || !header || !details) return;

    card.classList.remove('hidden');

    const isSuccess = result.hasAccess;
    header.className = `result-header ${isSuccess ? 'success' : 'failure'}`;
    
    header.innerHTML = `
      <div class="result-icon">
        ${isSuccess 
          ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
          : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>'
        }
      </div>
      <div class="result-status">${isSuccess ? 'Access Granted' : 'Access Denied'}</div>
    `;

    details.innerHTML = `
      <div class="result-detail-row">
        <span class="result-detail-label">User</span>
        <span class="result-detail-value">${this.escapeHtml(result.userName || result.userEmail)}</span>
      </div>
      <div class="result-detail-row">
        <span class="result-detail-label">Email</span>
        <span class="result-detail-value">${this.escapeHtml(result.userEmail)}</span>
      </div>
      <div class="result-detail-row">
        <span class="result-detail-label">Role</span>
        <span class="result-detail-value">${this.escapeHtml(result.userRole || 'None')}</span>
      </div>
      <div class="result-detail-row">
        <span class="result-detail-label">Resource</span>
        <span class="result-detail-value">${this.escapeHtml(result.resourceName)}</span>
      </div>
      <div class="result-detail-row">
        <span class="result-detail-label">Reason</span>
        <span class="result-detail-value">${this.escapeHtml(result.reason)}</span>
      </div>
      <div class="result-detail-row">
        <span class="result-detail-label">Tested At</span>
        <span class="result-detail-value">${new Date(result.testedAt).toLocaleString()}</span>
      </div>
    `;
  }

  // ===================== Utilities =====================

  private showLoading(): void {
    document.getElementById('loadingOverlay')?.classList.add('active');
  }

  private hideLoading(): void {
    document.getElementById('loadingOverlay')?.classList.remove('active');
  }

  private showToast(message: string, type: 'success' | 'error' = 'success'): void {
    const toast = document.getElementById('toast');
    const toastMsg = toast?.querySelector('.toast-message');
    const toastIcon = toast?.querySelector('.toast-icon');

    if (toast && toastMsg) {
      toastMsg.textContent = message;
      toast.className = `toast ${type}`;
      
      if (toastIcon) {
        toastIcon.innerHTML = type === 'success'
          ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>'
          : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
      }

      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    }
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || '--';
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
}

// Initialize
new PermissionManagement();
