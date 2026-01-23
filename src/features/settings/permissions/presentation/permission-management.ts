/**
 * Permission Management Page Logic
 * Handles CRUD operations for role-based and individual permissions
 */

import { apiClient } from '../../../../utils/api-client.js';
import { createLogger } from '../../../../utils/logger.js';
import { initSupabase, getSupabase } from '../../../../utils/supabase-init.js';

const logger = createLogger('PermissionManagement');

interface RoleRule {
  id: string;
  rule_type: string;
  resource_name: string;
  allowed_roles: string[] | null;
  min_role_level: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserRule {
  id: string;
  user_email: string;
  rule_type: string;
  resource_name: string;
  access_type: 'allow' | 'deny';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  email: string;
  name: string | null;
  role: string | null;
}

interface UserWithPermissions extends User {
  permissions: UserRule[];
}

class PermissionManager {
  private roleRules: RoleRule[] = [];
  private userRules: UserRule[] = [];
  private allUsers: User[] = [];
  private usersWithPermissions: UserWithPermissions[] = [];
  private currentDeleteId: string | null = null;
  private currentDeleteType: 'role' | 'user' | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Setup event listeners first (don't wait for Supabase)
      this.setupEventListeners();
      
      // Try to wait for Supabase, but don't block if it fails
      try {
        await Promise.race([
          this.waitForSupabase(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase init timeout')), 5000))
        ]);
      } catch (error) {
        logger.warn('Supabase initialization timeout or error, proceeding anyway:', error);
        // Continue anyway - API calls will handle auth errors
      }
      
      // Load data in parallel
      await Promise.all([
        this.loadRoleRules(),
        this.loadUserRules()
      ]);
    } catch (error: any) {
      logger.error('Error initializing permission manager:', error);
      this.hideLoading();
      this.showError(`Failed to initialize: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Wait for Supabase to be initialized
   */
  private async waitForSupabase(maxWait: number = 10000): Promise<void> {
    // Check if already initialized
    if (getSupabase()) {
      return;
    }

    // Check if already ready
    if ((window as any).supabaseReady) {
      return;
    }

    // Try to initialize
    try {
      await initSupabase();
      if (getSupabase()) {
        return;
      }
    } catch (error) {
      logger.warn('Failed to initialize Supabase, waiting for event:', error);
    }

    // Wait for supabaseReady event
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for Supabase initialization'));
      }, maxWait);

      const checkReady = () => {
        if (getSupabase() || (window as any).supabaseReady) {
          clearTimeout(timeout);
          window.removeEventListener('supabaseReady', checkReady);
          resolve();
        }
      };

      // Check immediately in case it's already ready
      if (getSupabase() || (window as any).supabaseReady) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      // Listen for supabaseReady event
      window.addEventListener('supabaseReady', checkReady, { once: true });
    });
  }

  private setupEventListeners(): void {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tab = (e.target as HTMLElement).closest('.tab-button')?.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      });
    });

    // Create buttons
    const createRoleBtn = document.getElementById('createRoleRuleBtn');
    if (createRoleBtn) {
      createRoleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        logger.debug('Create role rule button clicked');
        this.openRoleRuleModal();
      });
    } else {
      logger.warn('Create role rule button not found');
    }

    const createUserBtn = document.getElementById('createUserRuleBtn');
    if (createUserBtn) {
      createUserBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        logger.debug('Create user rule button clicked');
        this.openUserRuleModal();
      });
    } else {
      logger.warn('Create user rule button not found');
    }

    // Form submissions
    const roleRuleForm = document.getElementById('roleRuleForm');
    if (roleRuleForm) {
      roleRuleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        logger.debug('Role rule form submitted');
        this.saveRoleRule();
      });
    } else {
      logger.warn('Role rule form not found');
    }

    const userRuleForm = document.getElementById('userRuleForm');
    if (userRuleForm) {
      userRuleForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        logger.debug('User rule form submitted');
        this.saveUserRule();
      });
    } else {
      logger.warn('User rule form not found');
    }

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.closeAllModals();
      });
    });

    document.getElementById('cancelRoleRuleBtn')?.addEventListener('click', () => {
      this.closeAllModals();
    });

    document.getElementById('cancelUserRuleBtn')?.addEventListener('click', () => {
      this.closeAllModals();
    });

    // Delete confirmation
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', () => {
      this.confirmDelete();
    });

    document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => {
      this.closeAllModals();
    });

    // Filters
    document.getElementById('ruleTypeFilter')?.addEventListener('change', () => {
      this.filterRoleRules();
    });

    document.getElementById('activeFilter')?.addEventListener('change', () => {
      this.filterRoleRules();
    });

    document.getElementById('searchRulesInput')?.addEventListener('input', () => {
      this.filterRoleRules();
    });

    document.getElementById('userEmailFilter')?.addEventListener('input', () => {
      this.filterUserRules();
    });

    document.getElementById('userRuleTypeFilter')?.addEventListener('change', () => {
      this.filterUserRules();
    });

    document.getElementById('userAccessTypeFilter')?.addEventListener('change', () => {
      this.filterUserRules();
    });

    // Close modals on outside click
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeAllModals();
        }
      });
    });
  }

  private switchTab(tab: string): void {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach((btn) => {
      if (btn.getAttribute('data-tab') === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update tab content
    document.getElementById('role-based-tab')?.classList.toggle('active', tab === 'role-based');
    document.getElementById('individual-tab')?.classList.toggle('active', tab === 'individual');
  }

  private async loadRoleRules(): Promise<void> {
    try {
      this.showLoading();
      const response = await apiClient.get('/api/permissions/rules');
      logger.debug('Role rules response:', response);
      
      // Handle different response formats
      if (response && typeof response === 'object') {
        if ('rules' in response) {
          this.roleRules = (response as any).rules || [];
        } else if (Array.isArray(response)) {
          this.roleRules = response;
        } else {
          this.roleRules = [];
        }
      } else {
        this.roleRules = [];
      }
      
      this.renderRoleRules();
    } catch (error: any) {
      logger.error('Error loading role rules:', error);
      console.error('Full error object:', error);
      const errorMessage = error?.message || error?.error?.message || error?.details?.message || 'Failed to load role-based rules';
      const statusInfo = error?.status ? ` (Status: ${error.status})` : '';
      this.showError(`Failed to load role-based rules: ${errorMessage}${statusInfo}`);
    } finally {
      this.hideLoading();
    }
  }

  private async loadUserRules(): Promise<void> {
    try {
      logger.debug('Loading user rules...');
      
      // Load all users and all individual permission rules in parallel
      const [usersResponse, rulesResponse] = await Promise.all([
        apiClient.people.getAll(),
        apiClient.get('/api/permissions/user-rules')
      ]);
      
      // Handle users response
      if (usersResponse && usersResponse.data) {
        this.allUsers = usersResponse.data.map((user: any) => ({
          email: user.email || '',
          name: user.name || null,
          role: user.role || null,
        })).filter((user: User) => user.email); // Filter out users without email
      } else {
        this.allUsers = [];
      }
      
      // Handle rules response
      let rules: UserRule[] = [];
      if (rulesResponse && typeof rulesResponse === 'object') {
        if ('rules' in rulesResponse) {
          rules = (rulesResponse as any).rules || [];
        } else if (Array.isArray(rulesResponse)) {
          rules = rulesResponse;
        }
      }
      this.userRules = rules;
      
      // Combine users with their permissions
      this.usersWithPermissions = this.allUsers.map((user) => ({
        ...user,
        permissions: rules.filter((rule) => rule.user_email.toLowerCase() === user.email.toLowerCase()),
      }));
      
      logger.debug(`Loaded ${this.allUsers.length} users with ${rules.length} individual permission rules`);
      
      this.renderUserRules();
    } catch (error: any) {
      logger.error('Error loading user rules:', error);
      console.error('Full error:', error);
      const errorMessage = error?.message || error?.error?.message || 'Failed to load individual permissions';
      this.showError(`Failed to load individual permissions: ${errorMessage}`);
      // Still render empty state even on error
      this.allUsers = [];
      this.userRules = [];
      this.usersWithPermissions = [];
      this.renderUserRules();
    }
  }

  private renderRoleRules(): void {
    const tbody = document.getElementById('roleRulesTableBody');
    if (!tbody) return;

    if (this.roleRules.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No rules found. Create your first rule!</td></tr>';
      return;
    }

    tbody.innerHTML = this.roleRules
      .map(
        (rule) => `
      <tr>
        <td><span class="badge badge-type">${rule.rule_type}</span></td>
        <td><code>${this.escapeHtml(rule.resource_name)}</code></td>
        <td>${this.formatAllowedRoles(rule.allowed_roles)}</td>
        <td>${rule.min_role_level ? `Level ${rule.min_role_level}` : '-'}</td>
        <td><span class="badge ${rule.is_active ? 'badge-active' : 'badge-inactive'}">${rule.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <div class="action-buttons">
            <button class="btn-edit" data-rule-id="${rule.id}" data-action="edit-role" aria-label="Edit rule">
              <svg fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
            </button>
            <button class="btn-delete" data-rule-id="${rule.id}" data-action="delete-role" aria-label="Delete rule">
              <svg fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
    
    // Attach event listeners to dynamically created buttons
    tbody.querySelectorAll('[data-action="edit-role"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ruleId = (btn as HTMLElement).getAttribute('data-rule-id');
        if (ruleId) {
          logger.debug('Edit role rule clicked:', ruleId);
          this.editRoleRule(ruleId);
        }
      });
    });

    tbody.querySelectorAll('[data-action="delete-role"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ruleId = (btn as HTMLElement).getAttribute('data-rule-id');
        if (ruleId) {
          logger.debug('Delete role rule clicked:', ruleId);
          this.deleteRoleRule(ruleId);
        }
      });
    });
  }

  private renderUserRules(): void {
    const tbody = document.getElementById('userRulesTableBody');
    if (!tbody) return;

    if (this.usersWithPermissions.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="empty-cell">No users found. Users will appear here once they are added to the system.</td></tr>';
      return;
    }

    // Filter users based on current filters
    const emailFilter = ((document.getElementById('userEmailFilter') as HTMLInputElement)?.value || '').toLowerCase();
    const typeFilter = (document.getElementById('userRuleTypeFilter') as HTMLSelectElement)?.value || '';
    const accessFilter = (document.getElementById('userAccessTypeFilter') as HTMLSelectElement)?.value || '';

    let filteredUsers = this.usersWithPermissions;

    if (emailFilter) {
      filteredUsers = filteredUsers.filter((u) => 
        u.email.toLowerCase().includes(emailFilter) || 
        (u.name && u.name.toLowerCase().includes(emailFilter))
      );
    }

    // Render each user with their permissions
    if (filteredUsers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No users match the current filters.</td></tr>';
      return;
    }

    tbody.innerHTML = filteredUsers
      .map((user) => {
        // Filter user's permissions based on filters
        let userPermissions = user.permissions;
        
        if (typeFilter) {
          userPermissions = userPermissions.filter((p) => p.rule_type === typeFilter);
        }
        
        if (accessFilter) {
          userPermissions = userPermissions.filter((p) => p.access_type === accessFilter);
        }

        // If user has no permissions matching filters, show user with "No permissions" message
        if (userPermissions.length === 0 && (typeFilter || accessFilter)) {
          return `
            <tr>
              <td>${this.escapeHtml(user.email)}</td>
              <td colspan="5" class="empty-cell" style="text-align: left; padding-left: 1rem; font-style: italic; color: var(--text-secondary, #6b7280);">
                ${user.name ? `${this.escapeHtml(user.name)} - ` : ''}No permissions match the current filters
              </td>
            </tr>
          `;
        }

        // If user has no permissions at all, show them with option to create
        if (userPermissions.length === 0) {
          return `
            <tr>
              <td>${this.escapeHtml(user.email)}</td>
              <td colspan="4" style="color: var(--text-secondary, #6b7280); font-style: italic;">
                ${user.name ? `${this.escapeHtml(user.name)} - ` : ''}No individual permissions
              </td>
              <td>
                <button class="btn-create" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" data-user-email="${this.escapeHtml(user.email)}" data-action="create-user-permission" aria-label="Create permission">
                  <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14" style="margin-right: 0.25rem;">
                    <path clip-rule="evenodd" fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                  </svg>
                  Add
                </button>
              </td>
            </tr>
          `;
        }

        // Render each permission for this user
        return userPermissions
          .map(
            (rule) => `
            <tr>
              <td>${this.escapeHtml(user.email)}${user.name ? `<br><small style="color: var(--text-secondary, #6b7280);">${this.escapeHtml(user.name)}</small>` : ''}</td>
              <td><span class="badge badge-type">${rule.rule_type}</span></td>
              <td><code>${this.escapeHtml(rule.resource_name)}</code></td>
              <td><span class="badge ${rule.access_type === 'allow' ? 'badge-allow' : 'badge-deny'}">${rule.access_type === 'allow' ? 'Allow' : 'Deny'}</span></td>
              <td><span class="badge ${rule.is_active ? 'badge-active' : 'badge-inactive'}">${rule.is_active ? 'Active' : 'Inactive'}</span></td>
              <td>
                <div class="action-buttons">
                  <button class="btn-delete" data-rule-id="${rule.id}" data-action="delete-user" aria-label="Delete permission">
                    <svg fill="currentColor" viewBox="0 0 20 20" width="16" height="16">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          `
          )
          .join('');
      })
      .join('');
    
    // Attach event listeners to dynamically created buttons
    if (tbody) {
      tbody.querySelectorAll('[data-action="delete-user"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const ruleId = (btn as HTMLElement).getAttribute('data-rule-id');
          if (ruleId) {
            this.deleteUserRule(ruleId);
          }
        });
      });

      tbody.querySelectorAll('[data-action="create-user-permission"]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const userEmail = (btn as HTMLElement).getAttribute('data-user-email');
          if (userEmail) {
            this.createPermissionForUser(userEmail);
          }
        });
      });
    }
  }

  private formatAllowedRoles(roles: string[] | null): string {
    if (!roles || roles.length === 0) {
      return '-';
    }
    if (roles.includes('*')) {
      return '<span class="badge badge-wildcard">All Users</span>';
    }
    return roles.map((r) => `<span class="badge badge-role">${this.escapeHtml(r)}</span>`).join(' ');
  }

  private filterRoleRules(): void {
    const typeFilter = (document.getElementById('ruleTypeFilter') as HTMLSelectElement).value;
    const activeFilter = (document.getElementById('activeFilter') as HTMLSelectElement).value;
    const searchTerm = ((document.getElementById('searchRulesInput') as HTMLInputElement).value || '').toLowerCase();

    let filtered = this.roleRules;

    if (typeFilter) {
      filtered = filtered.filter((r) => r.rule_type === typeFilter);
    }

    if (activeFilter) {
      filtered = filtered.filter((r) => r.is_active === (activeFilter === 'true'));
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.resource_name.toLowerCase().includes(searchTerm) ||
          r.rule_type.toLowerCase().includes(searchTerm) ||
          (r.allowed_roles && r.allowed_roles.some((role) => role.toLowerCase().includes(searchTerm)))
      );
    }

    // Temporarily replace rules for filtering
    const originalRules = this.roleRules;
    this.roleRules = filtered;
    this.renderRoleRules();
    this.roleRules = originalRules;
  }

  private filterUserRules(): void {
    // Filters are now handled in renderUserRules() method
    // Just re-render to apply filters
    this.renderUserRules();
  }

  private openRoleRuleModal(ruleId?: string): void {
    const modal = document.getElementById('roleRuleModal');
    if (!modal) {
      logger.error('Role rule modal not found');
      this.showError('Modal not found. Please refresh the page.');
      return;
    }

    const form = document.getElementById('roleRuleForm') as HTMLFormElement;
    const title = document.getElementById('roleRuleModalTitle');

    if (ruleId) {
      const rule = this.roleRules.find((r) => r.id === ruleId);
      if (rule) {
        (document.getElementById('roleRuleId') as HTMLInputElement).value = rule.id;
        (document.getElementById('roleRuleType') as HTMLSelectElement).value = rule.rule_type;
        (document.getElementById('roleResourceName') as HTMLInputElement).value = rule.resource_name;
        (document.getElementById('roleAllowedRoles') as HTMLTextAreaElement).value = rule.allowed_roles
          ? JSON.stringify(rule.allowed_roles)
          : '';
        (document.getElementById('roleMinLevel') as HTMLSelectElement).value = rule.min_role_level || '';
        (document.getElementById('roleRuleActive') as HTMLInputElement).checked = rule.is_active;
        if (title) title.textContent = 'Edit Role-Based Rule';
      }
    } else {
      if (form) form.reset();
      const roleRuleIdInput = document.getElementById('roleRuleId') as HTMLInputElement;
      if (roleRuleIdInput) roleRuleIdInput.value = '';
      if (title) title.textContent = 'Create Role-Based Rule';
    }

    modal.classList.add('active');
    logger.debug('Role rule modal opened');
  }

  private openUserRuleModal(ruleId?: string): void {
    const modal = document.getElementById('userRuleModal');
    if (!modal) {
      logger.error('User rule modal not found');
      this.showError('Modal not found. Please refresh the page.');
      return;
    }

    const form = document.getElementById('userRuleForm') as HTMLFormElement;
    const title = document.getElementById('userRuleModalTitle');

    if (ruleId) {
      const rule = this.userRules.find((r) => r.id === ruleId);
      if (rule) {
        (document.getElementById('userRuleId') as HTMLInputElement).value = rule.id;
        (document.getElementById('userEmail') as HTMLInputElement).value = rule.user_email;
        (document.getElementById('userRuleType') as HTMLSelectElement).value = rule.rule_type;
        (document.getElementById('userResourceName') as HTMLInputElement).value = rule.resource_name;
        (document.getElementById('userAccessType') as HTMLSelectElement).value = rule.access_type;
        (document.getElementById('userRuleActive') as HTMLInputElement).checked = rule.is_active;
        if (title) title.textContent = 'Edit Individual Permission';
      }
    } else {
      if (form) form.reset();
      const userRuleIdInput = document.getElementById('userRuleId') as HTMLInputElement;
      if (userRuleIdInput) userRuleIdInput.value = '';
      if (title) title.textContent = 'Create Individual Permission';
    }

    modal.classList.add('active');
    logger.debug('User rule modal opened');
  }

  private async saveRoleRule(): Promise<void> {
    try {
      this.showLoading();
      const id = (document.getElementById('roleRuleId') as HTMLInputElement).value;
      const ruleType = (document.getElementById('roleRuleType') as HTMLSelectElement).value;
      const resourceName = (document.getElementById('roleResourceName') as HTMLInputElement).value;
      const allowedRolesText = (document.getElementById('roleAllowedRoles') as HTMLTextAreaElement).value.trim();
      const minLevel = (document.getElementById('roleMinLevel') as HTMLSelectElement).value;
      const isActive = (document.getElementById('roleRuleActive') as HTMLInputElement).checked;

      let allowedRoles: string[] | null = null;
      if (allowedRolesText) {
        try {
          allowedRoles = JSON.parse(allowedRolesText);
        } catch (e) {
          throw new Error('Invalid JSON format for allowed roles');
        }
      }

      const data: any = {
        ruleType,
        resourceName,
        allowedRoles,
        minRoleLevel: minLevel || null,
        isActive,
      };

      if (id) {
        // Update
        await apiClient.put(`/api/permissions/rules/${id}`, data);
        this.showSuccess('Rule updated successfully');
      } else {
        // Create
        await apiClient.post('/api/permissions/rules', data);
        this.showSuccess('Rule created successfully');
      }

      this.closeAllModals();
      await this.loadRoleRules();
    } catch (error: any) {
      logger.error('Error saving role rule:', error);
      this.showError(error.message || 'Failed to save rule');
    } finally {
      this.hideLoading();
    }
  }

  private async saveUserRule(): Promise<void> {
    try {
      this.showLoading();
      const id = (document.getElementById('userRuleId') as HTMLInputElement).value;
      const userEmail = (document.getElementById('userEmail') as HTMLInputElement).value;
      const ruleType = (document.getElementById('userRuleType') as HTMLSelectElement).value;
      const resourceName = (document.getElementById('userResourceName') as HTMLInputElement).value;
      const accessType = (document.getElementById('userAccessType') as HTMLSelectElement).value;
      const isActive = (document.getElementById('userRuleActive') as HTMLInputElement).checked;

      const data = {
        userEmail,
        ruleType,
        resourceName,
        accessType,
        isActive,
      };

      if (id) {
        // Update
        await apiClient.put(`/api/permissions/user-rules/${id}`, data);
        this.showSuccess('Permission updated successfully');
      } else {
        // Create
        await apiClient.post('/api/permissions/user-rules', data);
        this.showSuccess('Permission created successfully');
      }

      this.closeAllModals();
      await this.loadUserRules();
    } catch (error: any) {
      logger.error('Error saving user rule:', error);
      this.showError(error.message || 'Failed to save permission');
    } finally {
      this.hideLoading();
    }
  }

  public editRoleRule(id: string): void {
    this.openRoleRuleModal(id);
  }

  public editUserRule(id: string): void {
    this.openUserRuleModal(id);
  }

  public createPermissionForUser(email: string): void {
    const emailInput = document.getElementById('userEmail') as HTMLInputElement;
    if (emailInput) {
      emailInput.value = email;
    }
    this.openUserRuleModal();
  }

  public deleteRoleRule(id: string): void {
    this.currentDeleteId = id;
    this.currentDeleteType = 'role';
    const rule = this.roleRules.find((r) => r.id === id);
    const message = document.getElementById('deleteMessage');
    if (message) {
      message.textContent = `Are you sure you want to delete the rule for "${rule?.resource_name}"?`;
    }
    document.getElementById('deleteModal')?.classList.add('active');
  }

  public deleteUserRule(id: string): void {
    this.currentDeleteId = id;
    this.currentDeleteType = 'user';
    const rule = this.userRules.find((r) => r.id === id);
    const message = document.getElementById('deleteMessage');
    if (message) {
      message.textContent = `Are you sure you want to delete the permission for "${rule?.user_email}"?`;
    }
    document.getElementById('deleteModal')?.classList.add('active');
  }

  private async confirmDelete(): Promise<void> {
    if (!this.currentDeleteId || !this.currentDeleteType) return;

    try {
      this.showLoading();
      if (this.currentDeleteType === 'role') {
        await apiClient.delete(`/api/permissions/rules/${this.currentDeleteId}`);
        this.showSuccess('Rule deleted successfully');
        await this.loadRoleRules();
      } else {
        await apiClient.delete(`/api/permissions/user-rules/${this.currentDeleteId}`);
        this.showSuccess('Permission deleted successfully');
        await this.loadUserRules();
      }
      this.closeAllModals();
      this.currentDeleteId = null;
      this.currentDeleteType = null;
    } catch (error: any) {
      logger.error('Error deleting:', error);
      this.showError(error.message || 'Failed to delete');
    } finally {
      this.hideLoading();
    }
  }

  private closeAllModals(): void {
    document.querySelectorAll('.modal').forEach((modal) => {
      modal.classList.remove('active');
    });
  }

  private showLoading(): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  private hideLoading(): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
    // Also clear any loading messages in tables
    const roleTableBody = document.getElementById('roleRulesTableBody');
    const userTableBody = document.getElementById('userRulesTableBody');
    if (roleTableBody && roleTableBody.innerHTML.includes('Loading rules')) {
      // Don't clear if it's already been rendered with data
      if (this.roleRules.length === 0) {
        roleTableBody.innerHTML = '<tr><td colspan="6" class="empty-cell">No rules found. Create your first rule!</td></tr>';
      }
    }
    if (userTableBody && userTableBody.innerHTML.includes('Loading permissions')) {
      if (this.usersWithPermissions.length === 0) {
        userTableBody.innerHTML = '<tr><td colspan="6" class="empty-cell">No users found. Users will appear here once they are added to the system.</td></tr>';
      }
    }
  }

  private showSuccess(message: string): void {
    // Simple alert for now - can be enhanced with toast notifications
    alert(message);
  }

  private showError(message: string): void {
    alert(`Error: ${message}`);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
let permissionManager: PermissionManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    permissionManager = new PermissionManager();
    (window as any).permissionManager = permissionManager;
  });
} else {
  permissionManager = new PermissionManager();
  (window as any).permissionManager = permissionManager;
}

export default PermissionManager;
