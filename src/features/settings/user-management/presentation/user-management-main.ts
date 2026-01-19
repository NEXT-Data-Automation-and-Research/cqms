/**
 * User Management Main
 * Main orchestrator for user management feature
 */

import { DatabaseFactory } from '../../../../infrastructure/database-factory.js';
import { UserManagementRepository } from '../infrastructure/user-management-repository.js';
import { UserManagementService } from '../application/user-management-service.js';
import { userManagementState } from './state.js';
import { StatisticsRenderer } from './statistics-renderer.js';
import { TableRenderer } from './table-renderer.js';
import { FilterManager } from './filter-manager.js';
import { ModalManager } from './modal-manager.js';
import { BulkActionsManager } from './bulk-actions.js';
import { CSVHandler } from './csv-handler.js';
import { BulkUploadHandler } from './bulk-upload-handler.js';
import { UserOperationsHandler } from './user-operations.js';
import { BulkEditHandler } from './bulk-edit-handler.js';
import { EventHandlers } from './event-handlers.js';
import { AccessControlHandler } from './access-control-handler.js';
import { setupWindowHandlers } from './window-handlers.js';
import { logError, logInfo, logWarn } from '../../../../utils/logging-helper.js';
import { escapeHtml, safeSetHTML } from '../../../../utils/html-sanitizer.js';

export class UserManagementMain {
  private repository: UserManagementRepository;
  private service: UserManagementService;
  private statisticsRenderer: StatisticsRenderer;
  private tableRenderer: TableRenderer;
  private filterManager: FilterManager;
  private modalManager: ModalManager;
  private bulkActionsManager: BulkActionsManager;
  private csvHandler: CSVHandler;
  private bulkUploadHandler: BulkUploadHandler;
  private userOperationsHandler: UserOperationsHandler;
  private bulkEditHandler: BulkEditHandler;
  private eventHandlers: EventHandlers;
  private accessControlHandler: AccessControlHandler;

  constructor() {
    const db = DatabaseFactory.createClient();
    this.repository = new UserManagementRepository(db);
    this.service = new UserManagementService(this.repository);
    this.statisticsRenderer = new StatisticsRenderer();
    this.tableRenderer = new TableRenderer();
    this.filterManager = new FilterManager();
    this.modalManager = new ModalManager();
    this.bulkActionsManager = new BulkActionsManager();
    this.csvHandler = new CSVHandler();
    this.bulkUploadHandler = new BulkUploadHandler(this.csvHandler, this.service, () => this.loadInitialData());
    this.userOperationsHandler = new UserOperationsHandler(this.service, this.modalManager, () => this.loadInitialData());
    this.bulkEditHandler = new BulkEditHandler(this.service, this.bulkActionsManager, () => this.loadInitialData());
    this.accessControlHandler = new AccessControlHandler();
    this.eventHandlers = new EventHandlers(
      this.filterManager,
      this.modalManager,
      this.bulkActionsManager,
      this.csvHandler,
      this
    );
  }

  /**
   * Initialize the user management feature
   */
  async initialize(): Promise<void> {
    try {
      logInfo('[UserManagementMain] Starting initialization');
      // Wait for access control
      await this.accessControlHandler.waitForAccessControl();
      logInfo('[UserManagementMain] Access control wait complete');

      // Check page access
      const accessAllowed = await this.accessControlHandler.enforcePageAccess('user-management.html');
      logInfo('[UserManagementMain] Access check result:', { accessAllowed });
      if (!accessAllowed) {
        logWarn('[UserManagementMain] Access denied, stopping initialization');
        // B1 FIX: Show clear access denied message
        this.showAccessDeniedMessage();
        return; // Access denied, user will be redirected
      }

      logInfo('[UserManagementMain] Access granted, proceeding with initialization');
      
      // M4 FIX: Load saved filters from sessionStorage
      try {
        const savedFilters = sessionStorage.getItem('userManagementFilters');
        if (savedFilters) {
          const filters = JSON.parse(savedFilters);
          userManagementState.setFilters(filters);
          // Apply saved filters to UI
          const searchInput = document.getElementById('searchInput') as HTMLInputElement;
          const roleFilter = document.getElementById('roleFilter') as HTMLSelectElement;
          const departmentFilter = document.getElementById('departmentFilter') as HTMLSelectElement;
          const statusFilter = document.getElementById('statusFilter') as HTMLSelectElement;
          
          if (searchInput && filters.search) searchInput.value = filters.search;
          if (roleFilter && filters.role) roleFilter.value = filters.role;
          if (departmentFilter && filters.department) departmentFilter.value = filters.department;
          if (statusFilter && filters.status) statusFilter.value = filters.status;
        }
      } catch (error) {
        logWarn('[UserManagementMain] Failed to load saved filters:', error);
      }
      
      // Setup state listener
      userManagementState.subscribe(() => this.onStateChange());

      // Load initial data
      logInfo('[UserManagementMain] Starting to load initial data');
      await this.loadInitialData();
      logInfo('[UserManagementMain] Initial data loaded');

      // Setup event listeners
      this.eventHandlers.setupEventListeners();

      logInfo('[UserManagementMain] Initialization complete');
    } catch (error) {
      logError('[UserManagementMain] Initialization error:', error);
      this.showError('Failed to initialize user management. Please refresh the page.');
    }
  }

  /**
   * Load initial data
   */
  private async loadInitialData(): Promise<void> {
    logInfo('[UserManagementMain] loadInitialData called');
    userManagementState.setLoading(true);

    try {
      // Invalidate cache to ensure we get fresh data
      this.repository.invalidateCacheKey('user_management_all_users');
      logInfo('[UserManagementMain] Cache invalidated, starting data fetch');
      
      // Load users, channels, and Intercom admins in parallel
      const [users, channels, intercomAdmins] = await Promise.all([
        this.service.getAllUsers(),
        this.service.getChannels(),
        this.service.getIntercomAdmins()
      ]);

      logInfo('[UserManagementMain] Data fetched:', { 
        usersCount: users?.length || 0, 
        channelsCount: channels?.length || 0, 
        intercomAdminsCount: intercomAdmins?.length || 0 
      });

      // Calculate statistics
      const statistics = await this.service.calculateStatistics(users);
      logInfo('[UserManagementMain] Statistics calculated');

      // Update state
      userManagementState.setAllUsers(users);
      userManagementState.setFilteredUsers(users);
      userManagementState.setStatistics(statistics);
      userManagementState.setChannels(channels);
      userManagementState.setIntercomAdmins(intercomAdmins);
      userManagementState.setLoading(false);
      logInfo('[UserManagementMain] State updated, loading set to false');
    } catch (error) {
      logError('[UserManagementMain] Error loading initial data:', error);
      userManagementState.setError(error instanceof Error ? error.message : 'Failed to load data');
      userManagementState.setLoading(false);
    }
  }

  /**
   * Handle state changes
   */
  private onStateChange(): void {
    const state = userManagementState.getState();
    logInfo('[UserManagementMain] State changed:', { 
      isLoading: state.isLoading, 
      usersCount: state.filteredUsers.length, 
      hasStatistics: !!state.statistics,
      hasError: !!state.error 
    });

    // Render statistics
    if (state.statistics) {
      this.statisticsRenderer.render(state.statistics);
    }

    // Render table
    logInfo('[UserManagementMain] Rendering table with', { usersCount: state.filteredUsers.length });
    this.tableRenderer.render(state.filteredUsers);

    // Update bulk actions bar
    this.bulkActionsManager.updateBulkActionsBar();

    // Repopulate bulk edit dropdowns when data is available
    if (state.allUsers.length > 0 || state.channels.length > 0) {
      this.bulkActionsManager.populateBulkEditDropdowns();
    }
  }

  /**
   * Refresh users
   */
  async refreshUsers(): Promise<void> {
    await this.loadInitialData();
  }

  /**
   * Open bulk upload modal
   */
  openBulkUploadModal(): void {
    this.bulkUploadHandler.openBulkUploadModal();
  }

  /**
   * Process bulk upload
   */
  async processBulkUpload(): Promise<void> {
    await this.bulkUploadHandler.processBulkUpload();
  }

  /**
   * Close bulk upload modal
   */
  closeBulkUploadModal(): void {
    this.bulkUploadHandler.closeBulkUploadModal();
  }

  /**
   * Apply bulk edit
   */
  async applyBulkEdit(): Promise<void> {
    await this.bulkEditHandler.applyBulkEdit();
  }

  /**
   * Show access denied message
   */
  private showAccessDeniedMessage(): void {
    const container = document.querySelector('.main-content') as HTMLElement;
    if (container) {
      safeSetHTML(container, `
        <div style="text-align: center; padding: 3rem; max-width: 600px; margin: 0 auto;">
          <div style="margin-bottom: 2rem;">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444; margin: 0 auto;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 600; color: #1f2937; margin-bottom: 1rem;">Access Denied</h2>
          <p style="font-size: 1rem; color: #6b7280; margin-bottom: 0.5rem;">You don't have permission to access this page.</p>
          <p style="font-size: 0.875rem; color: #9ca3af; margin-bottom: 2rem;">Required role: Admin, Manager, or Super Admin</p>
          <a href="/src/features/home/presentation/home-page.html" 
             style="display: inline-block; padding: 0.75rem 1.5rem; background-color: #1A733E; color: white; text-decoration: none; border-radius: 0.375rem; font-weight: 500; transition: background-color 0.2s;">
            Return to Home
          </a>
        </div>
      `);
    }
  }

  /**
   * Show error message
   * M2 FIX: Add retry button to error states
   */
  private showError(message: string): void {
    const container = document.getElementById('usersTableContent');
    if (container) {
      safeSetHTML(container, `
        <div class="error-state" style="text-align: center; padding: 2rem; max-width: 600px; margin: 0 auto;">
          <div style="margin-bottom: 1.5rem;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444; margin: 0 auto;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem;">Error</h3>
          <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">${escapeHtml(message)}</p>
          <button onclick="window.refreshUsers()" 
                  style="padding: 0.75rem 1.5rem; background-color: #1A733E; color: white; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer;">
            Retry
          </button>
        </div>
      `);
    }
  }

  /**
   * Save user changes (edit)
   */
  async saveUserChanges(): Promise<void> {
    await this.userOperationsHandler.saveUserChanges();
  }

  /**
   * Create new user
   */
  async createNewUser(): Promise<void> {
    await this.userOperationsHandler.createNewUser();
  }
}

// Initialize when DOM is ready and Supabase is ready
let mainInstance: UserManagementMain | null = null;

async function waitForSupabaseClient(maxWait: number = 10000): Promise<void> {
  const startTime = Date.now();
  while (!(window as any).supabaseClient && (Date.now() - startTime) < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  // B2 FIX: Show error message if Supabase client fails to initialize
  if (!(window as any).supabaseClient) {
    const container = document.getElementById('usersTableContent');
    if (container) {
      container.innerHTML = `
        <div class="error" style="padding: 2rem; text-align: center; max-width: 600px; margin: 0 auto;">
          <div style="margin-bottom: 1.5rem;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444; margin: 0 auto;">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 style="font-size: 1.25rem; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem;">Failed to Initialize</h3>
          <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">Unable to connect to the database. Please refresh the page.</p>
          <button onclick="window.location.reload()" 
                  style="padding: 0.75rem 1.5rem; background-color: #1A733E; color: white; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; transition: background-color 0.2s;">
            Refresh Page
          </button>
        </div>
      `;
    }
    throw new Error('Supabase client not initialized after waiting');
  }
}

async function initializeUserManagement(): Promise<void> {
  if (!mainInstance) {
    // Wait for Supabase client to be ready before creating UserManagementMain
    await waitForSupabaseClient();
    
    mainInstance = new UserManagementMain();
    setupWindowHandlers(mainInstance);
    mainInstance.initialize().catch((error) => {
      logError('[UserManagementMain] Failed to initialize:', error);
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeUserManagement().catch((error) => {
      logError('[UserManagementMain] Failed to initialize:', error);
    });
  });
} else {
  initializeUserManagement().catch((error) => {
    logError('[UserManagementMain] Failed to initialize:', error);
  });
}

