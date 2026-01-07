/**
 * Manual Audit View Renderer
 * Handles rendering of the manual audit view with tabs
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { AuditDistributionService } from '../../application/audit-distribution-service.js';
import { TabManager, type TabType } from '../managers/tab-manager.js';
import { AssignmentTabRenderer } from './assignment-tab-renderer.js';
import { StatisticsTabRenderer } from './statistics-tab-renderer.js';
import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError } from '../../../../utils/logging-helper.js';

export interface ManualAuditViewRendererConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
}

export class ManualAuditViewRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService;
  private tabManager: TabManager | null = null;
  private assignmentTabRenderer: AssignmentTabRenderer | null = null;
  private statisticsTabRenderer: StatisticsTabRenderer | null = null;

  constructor(config: ManualAuditViewRendererConfig) {
    this.stateManager = config.stateManager;
    this.service = config.service;
  }

  render(container: HTMLElement): void {
    try {
      const state = this.stateManager.getState();
      logInfo('[ManualAuditView] Rendering', { hasState: !!state });
      
      safeSetHTML(container, this.getViewHTML());

      this.initializeTabs();
      this.initializeTabRenderers();
      
      logInfo('[ManualAuditView] Rendering complete');
    } catch (error) {
      logError('[ManualAuditView] Error rendering:', error);
      safeSetHTML(container, this.getErrorHTML(error));
    }
  }

  private getViewHTML(): string {
    return `
      <div class="px-4 py-3 pr-6 max-w-7xl mx-auto w-full">
        <!-- Header -->
        <div class="mb-4">
          <h1 class="text-2xl font-bold text-white mb-2">Manual Assignment</h1>
          <div class="h-px bg-white/10"></div>
        </div>

        <!-- Tab Navigation -->
        <div class="tab-navigation mb-4">
          <div class="tab-slider" id="tabSlider"></div>
          <button class="tab-button active" data-tab="assignment" id="assignmentTab">Assignment</button>
          <button class="tab-button" data-tab="statistics" id="statisticsTab">Statistics</button>
        </div>

        <!-- Tab Content -->
        <div id="tabContent">
          <!-- Assignment Tab Content -->
          <div id="assignmentContent" class="tab-content">
            <!-- Filter Bar -->
            <div id="filterBarContainer" class="mb-4"></div>
            
            <!-- Main Content -->
            <div class="flex flex-col gap-4 min-h-[500px] max-h-[calc(100vh-200px)]">
              <!-- Employee List -->
              <div class="flex flex-col flex-1 min-w-0 glass-card rounded-xl flex flex-col overflow-visible">
                <!-- Header -->
                <div class="px-4 pt-4 pb-3 border-b border-white/10 flex-shrink-0 flex items-center justify-between">
                  <div>
                    <h2 class="text-lg font-bold text-white m-0 mb-0.5">NEXT People</h2>
                    <p class="text-xs text-white/60 m-0 font-medium">Select team members for audit assignment</p>
                  </div>
                  <button 
                    id="assignAuditsButton" 
                    class="px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg text-sm font-bold hover:from-primary-dark hover:to-primary transition-all flex items-center gap-2 shadow-lg disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed hidden"
                    title="Create audit"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Create audit</span>
                  </button>
                </div>
                <div class="px-4 py-3 flex-1 min-h-0 flex flex-col overflow-hidden">
                  <div id="employeeListContent" class="flex-1 min-h-0 overflow-y-auto overflow-x-visible"></div>
                  <div id="paginationBottomContainer" class="flex-shrink-0 mt-3 pt-3 border-t border-white/10"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Statistics Tab Content -->
          <div id="statisticsContent" class="tab-content hidden">
            <div class="flex flex-col gap-4">
              <!-- Agent Summary Section -->
              <div id="agentSummarySection"></div>
              
              <!-- Assigned Audits Section -->
              <div id="assignedAuditsSection"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getErrorHTML(error: unknown): string {
    return `
      <div class="p-8 text-center">
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md mx-auto">
          <h3 class="text-red-400 font-semibold mb-2">Error Rendering Manual Audit View</h3>
          <p class="text-red-300 text-sm">${error instanceof Error ? error.message : 'Unknown error occurred'}</p>
        </div>
      </div>
    `;
  }

  private initializeTabs(): void {
    this.tabManager = new TabManager({
      onTabChange: (tab) => {
        if (tab === 'assignment' && this.assignmentTabRenderer) {
          this.assignmentTabRenderer.render();
        } else if (tab === 'statistics' && this.statisticsTabRenderer) {
          this.statisticsTabRenderer.render();
        }
      }
    });
  }

  private initializeTabRenderers(): void {
    this.assignmentTabRenderer = new AssignmentTabRenderer({
      stateManager: this.stateManager,
      service: this.service
    });
    this.assignmentTabRenderer.render();

    this.statisticsTabRenderer = new StatisticsTabRenderer({
      stateManager: this.stateManager
    });
    this.statisticsTabRenderer.render();
  }

  refresh(): void {
    this.assignmentTabRenderer?.refresh();
    this.statisticsTabRenderer?.refresh();
  }
}

