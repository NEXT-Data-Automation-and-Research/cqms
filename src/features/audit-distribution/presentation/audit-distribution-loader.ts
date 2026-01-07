/**
 * Audit Distribution Loader
 * Initializes the audit distribution feature on page load
 */

import { AuditDistributionService } from '../application/audit-distribution-service.js';
import { AuditDistributionStateManager } from '../application/audit-distribution-state.js';
import { AuditDistributionRenderer } from './audit-distribution-renderer.js';
import { PeopleRepository } from '../infrastructure/people-repository.js';
import { AuditAssignmentRepository } from '../infrastructure/audit-assignment-repository.js';
import { SupabaseClientAdapter } from '../../../infrastructure/database/supabase/supabase-client.adapter.js';
import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import { getSupabase } from '../../../utils/supabase-init.js';
import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';

export class AuditDistributionLoader {
  private service: AuditDistributionService | null = null;
  private stateManager: AuditDistributionStateManager;
  private renderer: AuditDistributionRenderer;

  constructor() {
    this.stateManager = new AuditDistributionStateManager();
    this.renderer = new AuditDistributionRenderer(this.stateManager);
  }

  /**
   * Get or create the service (lazy initialization)
   * ✅ SECURITY: Verifies authentication before creating service
   */
  private async getService(): Promise<AuditDistributionService> {
    if (!this.service) {
      try {
        // ✅ SECURITY: Verify authentication first (this ensures user is authenticated)
        await getAuthenticatedSupabase(); // This will throw if not authenticated
        
        // Get base Supabase client (authentication already verified above)
        // The adapter needs the raw client, not the authenticated wrapper
        const baseClient = getSupabase();
        if (!baseClient) {
          throw new Error('Supabase client not initialized');
        }
        
        // Create adapter from base client (auth already verified)
        const db = new SupabaseClientAdapter(baseClient);
        const peopleRepository = new PeopleRepository(db);
        const assignmentRepository = new AuditAssignmentRepository(db);
        this.service = new AuditDistributionService(peopleRepository, assignmentRepository);
        
        logInfo('[AuditDistributionLoader] Service initialized with base client');
      } catch (error) {
        throw error;
      }
    }
    return this.service;
  }

  /**
   * Initialize the feature
   */
  async initialize(): Promise<void> {
    try {
      logInfo('[Audit Distribution] Starting initialization...');
      
      // Initialize UI first (before loading data to show structure)
      const container = document.getElementById('audit-distribution-container');
      if (!container) {
        logError('[Audit Distribution] Container not found: audit-distribution-container');
        // Fallback to main content
        const mainContent = document.querySelector('main.main-content');
        if (mainContent) {
          logInfo('[Audit Distribution] Using main-content as fallback');
          this.renderer.initialize(mainContent as HTMLElement);
        } else {
          logError('[Audit Distribution] No container found!');
          return;
        }
      } else {
        logInfo('[Audit Distribution] Container found, initializing renderer...');
        this.renderer.initialize(container);
      }

      // Get service first to pass to renderer
      const service = await this.getService();
      this.renderer.setService(service);

      // Load all data
      logInfo('[Audit Distribution] Loading data...');
      await this.loadData();
      logInfo('[Audit Distribution] Data loaded successfully');

      // Attach event listeners
      this.attachEventListeners();
      logInfo('[Audit Distribution] Initialization complete');
    } catch (error) {
      logError('[Audit Distribution] Error initializing:', error);
      logError('[Audit Distribution] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Show error message to user
      const container = document.getElementById('audit-distribution-container');
      if (container) {
        const errorMessage = error instanceof Error ? escapeHtml(error.message) : 'Unknown error occurred';
        safeSetHTML(container, `
          <div class="p-8 text-center">
            <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md mx-auto">
              <h3 class="text-red-400 font-semibold mb-2">Error Loading Audit Distribution</h3>
              <p class="text-red-300 text-sm">${errorMessage}</p>
              <p class="text-gray-400 text-xs mt-2">Please refresh the page or contact support.</p>
            </div>
          </div>
        `);
      }
    }
  }

  /**
   * Load all required data
   */
  private async loadData(): Promise<void> {
    try {
      const service = await this.getService();
      logInfo('[AuditDistributionLoader] Starting to load data...');
      
      const [employees, auditors, otherAuditors, scorecards, assignments, summaries] = await Promise.all([
        service.loadEmployees().catch(err => {
          logError('[AuditDistributionLoader] Error loading employees:', err);
          return [];
        }),
        service.loadQualityAnalysts().catch(err => {
          logError('[AuditDistributionLoader] Error loading quality analysts:', err);
          return [];
        }),
        service.loadOtherAuditors().catch(err => {
          logError('[AuditDistributionLoader] Error loading other auditors:', err);
          return [];
        }),
        service.loadScorecards().catch(err => {
          logError('[AuditDistributionLoader] Error loading scorecards:', err);
          return [];
        }),
        service.loadAssignments().catch(err => {
          logError('[AuditDistributionLoader] Error loading assignments:', err);
          return [];
        }),
        service.loadAgentSummaries().catch(err => {
          logError('[AuditDistributionLoader] Error loading agent summaries:', err);
          return [];
        })
      ]);

      logInfo('[AuditDistributionLoader] Data loaded:', {
        employees: employees.length,
        auditors: auditors.length,
        otherAuditors: otherAuditors.length,
        scorecards: scorecards.length,
        assignments: assignments.length,
        summaries: summaries.length
      });

      this.stateManager.setEmployees(employees);
      this.stateManager.setAuditors(auditors);
      this.stateManager.setOtherAuditors(otherAuditors);
      this.stateManager.setScorecards(scorecards);
      this.stateManager.setAssignments(assignments);
      this.stateManager.setAgentSummaries(summaries);
      
      // Refresh renderer to update UI with loaded data
      this.renderer.refresh();
    } catch (error) {
      logError('[AuditDistributionLoader] Fatal error loading data:', error);
      throw error;
    }
  }

  /**
   * Attach global event listeners
   */
  private attachEventListeners(): void {
    const autoAssignBtn = document.getElementById('autoAssignBtn');
    autoAssignBtn?.addEventListener('click', () => {
      // TODO: Implement auto assign
      logInfo('Auto assign clicked');
    });
  }
}

// Initialize on page load
// Handle both cases: DOM already loaded or still loading
function initializeLoader() {
  const loader = new AuditDistributionLoader();
  loader.initialize().catch(error => {
    logError('[AuditDistributionLoader] Failed to initialize:', error);
  });
}

if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
  document.addEventListener('DOMContentLoaded', initializeLoader);
} else {
  // DOM is already loaded, initialize immediately
  initializeLoader();
}

