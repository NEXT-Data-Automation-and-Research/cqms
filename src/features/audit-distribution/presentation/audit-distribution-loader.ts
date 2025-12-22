/**
 * Audit Distribution Loader
 * Initializes the audit distribution feature on page load
 */

import { AuditDistributionService } from '../application/audit-distribution-service.js';
import { AuditDistributionStateManager } from '../application/audit-distribution-state.js';
import { AuditDistributionRenderer } from './audit-distribution-renderer.js';

export class AuditDistributionLoader {
  private service: AuditDistributionService;
  private stateManager: AuditDistributionStateManager;
  private renderer: AuditDistributionRenderer;

  constructor() {
    this.stateManager = new AuditDistributionStateManager();
    this.service = new AuditDistributionService();
    this.renderer = new AuditDistributionRenderer(this.stateManager);
  }

  /**
   * Initialize the feature
   */
  async initialize(): Promise<void> {
    try {
      console.log('[Audit Distribution] Starting initialization...');
      
      // Initialize UI first (before loading data to show structure)
      const container = document.getElementById('audit-distribution-container');
      if (!container) {
        console.error('[Audit Distribution] Container not found: audit-distribution-container');
        // Fallback to main content
        const mainContent = document.querySelector('main.main-content');
        if (mainContent) {
          console.log('[Audit Distribution] Using main-content as fallback');
          this.renderer.initialize(mainContent as HTMLElement);
        } else {
          console.error('[Audit Distribution] No container found!');
          return;
        }
      } else {
        console.log('[Audit Distribution] Container found, initializing renderer...');
        this.renderer.initialize(container);
      }

      // Load all data
      console.log('[Audit Distribution] Loading data...');
      await this.loadData();
      console.log('[Audit Distribution] Data loaded successfully');

      // Attach event listeners
      this.attachEventListeners();
      console.log('[Audit Distribution] Initialization complete');
    } catch (error) {
      console.error('[Audit Distribution] Error initializing:', error);
      console.error('[Audit Distribution] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Show error message to user
      const container = document.getElementById('audit-distribution-container');
      if (container) {
        container.innerHTML = `
          <div class="p-8 text-center">
            <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md mx-auto">
              <h3 class="text-red-400 font-semibold mb-2">Error Loading Audit Distribution</h3>
              <p class="text-red-300 text-sm">${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
              <p class="text-gray-400 text-xs mt-2">Please refresh the page or contact support.</p>
            </div>
          </div>
        `;
      }
    }
  }

  /**
   * Load all required data
   */
  private async loadData(): Promise<void> {
    const [employees, auditors, otherAuditors, scorecards, assignments, summaries] = await Promise.all([
      this.service.loadEmployees(),
      this.service.loadQualityAnalysts(),
      this.service.loadOtherAuditors(),
      this.service.loadScorecards(),
      this.service.loadAssignments(),
      this.service.loadAgentSummaries()
    ]);

    this.stateManager.setEmployees(employees);
    this.stateManager.setAuditors(auditors);
    this.stateManager.setOtherAuditors(otherAuditors);
    this.stateManager.setScorecards(scorecards);
    this.stateManager.setAssignments(assignments);
    this.stateManager.setAgentSummaries(summaries);
  }

  /**
   * Attach global event listeners
   */
  private attachEventListeners(): void {
    const autoAssignBtn = document.getElementById('autoAssignBtn');
    autoAssignBtn?.addEventListener('click', () => {
      // TODO: Implement auto assign
      console.log('Auto assign clicked');
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  const loader = new AuditDistributionLoader();
  loader.initialize();
});

