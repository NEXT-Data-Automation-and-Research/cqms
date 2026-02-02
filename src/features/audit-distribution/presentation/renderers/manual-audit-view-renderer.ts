/**
 * Manual Audit View Renderer
 * Handles rendering of the manual audit view: assign new audits (people list + auditor selection).
 * Managing existing assignments is in the dedicated "Assigned Audits" tab.
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { AuditDistributionService } from '../../application/audit-distribution-service.js';
import { AssignmentTabRenderer } from './assignment-tab-renderer.js';
import { getPeopleSectionHTML } from '../components/people-section-template.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
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
        <div id="assignmentContent" class="tab-content flex flex-row gap-4 items-stretch">
          <div class="flex-1 min-w-0">
            ${getPeopleSectionHTML('People', 'Select team members for audit assignment')}
          </div>
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
      service: this.service,
      onAssignmentComplete: () => {
        // Refresh assignments in state so Assigned Audits tab has latest data when user switches
        this.service.loadAssignments().then(assignments => {
          this.stateManager.setAssignments(assignments);
        }).catch(err => logError('[ManualAuditView] Error refreshing assignments:', err));
      }
    });
    this.assignmentTabRenderer.render();
  }

  refresh(): void {
    this.assignmentTabRenderer?.refresh();
  }
}

