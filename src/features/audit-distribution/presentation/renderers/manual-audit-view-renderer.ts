/**
 * Manual Audit View Renderer
 * Handles rendering of the manual audit view with tabs
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { AuditDistributionService } from '../../application/audit-distribution-service.js';
import { AssignmentTabRenderer } from './assignment-tab-renderer.js';
import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError } from '../../../../utils/logging-helper.js';

export interface ManualAuditViewRendererConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
}

export class ManualAuditViewRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService;
  private assignmentTabRenderer: AssignmentTabRenderer | null = null;

  constructor(config: ManualAuditViewRendererConfig) {
    this.stateManager = config.stateManager;
    this.service = config.service;
  }

  render(container: HTMLElement): void {
    try {
      const state = this.stateManager.getState();
      logInfo('[ManualAuditView] Rendering', { hasState: !!state });
      
      safeSetHTML(container, this.getViewHTML());

      this.initializeTabRenderers();
      
      logInfo('[ManualAuditView] Rendering complete');
    } catch (error) {
      logError('[ManualAuditView] Error rendering:', error);
      safeSetHTML(container, this.getErrorHTML(error));
    }
  }

  private getViewHTML(): string {
    return `
      <div class="px-4 py-6 max-w-7xl mx-auto w-full">
        <!-- Assignment Content -->
        <div id="assignmentContent" class="tab-content">
          <!-- Header Section -->
          <div class="mb-6">
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
              <div class="flex items-center gap-4 mb-6">
                <div class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-primary">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <polyline points="17 11 19 13 23 9"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-2xl font-bold text-gray-900">Manual Assign</h2>
                  <p class="text-sm text-gray-600 mt-1">
                    Manually assign audits to team members and auditors
                  </p>
                </div>
              </div>
              <!-- Search and Filters -->
              <div id="expandedFilterContainer"></div>
            </div>
          </div>
          
          <!-- People List Section - Below Filters -->
          <div class="mb-6">
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <!-- Header -->
              <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 class="text-lg font-semibold text-gray-900">People</h3>
                <p class="text-xs text-gray-600 mt-1">Select team members for audit assignment</p>
              </div>
              <!-- Selection Actions -->
              <div id="selectionActionsContainer" class="px-6 py-3 border-b border-gray-200 flex items-center gap-2 flex-shrink-0"></div>
              <!-- Employee List Content -->
              <div id="employeeListContent" class="max-h-[60vh] overflow-y-auto"></div>
              <!-- Pagination -->
              <div id="paginationBottomContainer" class="px-6 py-3 border-t border-gray-200 flex-shrink-0"></div>
            </div>
          </div>
          
          <!-- Auditor Selection Pane -->
          <div id="auditorModalContainer" class="flex-shrink-0 w-0 transition-all duration-300 overflow-hidden"></div>
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

  private initializeTabRenderers(): void {
    this.assignmentTabRenderer = new AssignmentTabRenderer({
      stateManager: this.stateManager,
      service: this.service
    });
    this.assignmentTabRenderer.render();
  }

  refresh(): void {
    this.assignmentTabRenderer?.refresh();
  }
}

