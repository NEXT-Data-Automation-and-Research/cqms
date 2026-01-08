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
        return; // Access denied, user will be redirected
      }

      logInfo('[UserManagementMain] Access granted, proceeding with initialization');
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
   * Show error message
   */
  private showError(message: string): void {
    const container = document.getElementById('usersTableContent');
    if (container) {
      safeSetHTML(container, `<div class="error">${escapeHtml(message)}</div>`);
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
  if (!(window as any).supabaseClient) {
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

