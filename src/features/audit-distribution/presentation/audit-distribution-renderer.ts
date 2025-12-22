/**
 * Audit Distribution Renderer
 * Main orchestrator for all UI components in the audit distribution feature
 * Delegates to specialized renderers for each view
 */

import type { AuditDistributionStateManager } from '../application/audit-distribution-state.js';
import { AuditDistributionSidebar, type AuditDistributionView } from './components/audit-distribution-sidebar.js';
import { ScheduleAuditView } from './components/schedule-audit-view.js';
import { AIAuditView } from './components/ai-audit-view.js';
import { ManualAuditViewRenderer } from './renderers/manual-audit-view-renderer.js';

export class AuditDistributionRenderer {
  private stateManager: AuditDistributionStateManager;
  private currentView: AuditDistributionView = 'manual';
  private sidebar: AuditDistributionSidebar | null = null;
  private manualAuditViewRenderer: ManualAuditViewRenderer | null = null;
  private scheduleAuditView: ScheduleAuditView | null = null;
  private aiAuditView: AIAuditView | null = null;

  constructor(stateManager: AuditDistributionStateManager) {
    this.stateManager = stateManager;
  }

  /**
   * Initialize and render all components
   */
  initialize(container: HTMLElement): void {
    console.log('[Renderer] Initializing with container:', container);
    
    container.innerHTML = `
      <div class="flex w-full items-start">
        <!-- Sidebar -->
        <div id="auditDistributionSidebar" class="flex-shrink-0"></div>
        
        <!-- Main Content -->
        <div class="flex-1 min-w-0 overflow-x-hidden pr-4">
          <div id="auditDistributionContent" class="w-full"></div>
        </div>
      </div>
    `;

    // Initialize sidebar
    const sidebarContainer = container.querySelector('#auditDistributionSidebar') as HTMLElement;
    if (sidebarContainer) {
      console.log('[Renderer] Initializing sidebar...');
      this.sidebar = new AuditDistributionSidebar(sidebarContainer, {
        currentView: this.currentView,
        onViewChange: (view) => {
          this.switchView(view);
        }
      });
    } else {
      console.error('[Renderer] Sidebar container not found!');
    }

    // Render initial view - use setTimeout to ensure DOM is ready
    setTimeout(() => {
      console.log('[Renderer] Rendering current view...');
      this.renderCurrentView();
    }, 0);
  }

  /**
   * Switch between different views
   */
  private switchView(view: AuditDistributionView): void {
    this.currentView = view;
    
    // Update sidebar
    if (this.sidebar) {
      this.sidebar.update({ currentView: view });
    }

    // Render the selected view
    this.renderCurrentView();
  }

  /**
   * Render the current view based on selected tab
   */
  private renderCurrentView(): void {
    const contentContainer = document.getElementById('auditDistributionContent');
    if (!contentContainer) {
      console.error('[Renderer] Content container not found: auditDistributionContent');
      return;
    }

    console.log('[Renderer] Rendering view:', this.currentView, 'Container:', contentContainer);

    switch (this.currentView) {
      case 'manual':
        console.log('[Renderer] Rendering manual audit view...');
        this.renderManualAuditView(contentContainer);
        break;
      case 'schedule':
        console.log('[Renderer] Rendering schedule audit view...');
        this.renderScheduleAuditView(contentContainer);
        break;
      case 'ai':
        console.log('[Renderer] Rendering AI audit view...');
        this.renderAIAuditView(contentContainer);
        break;
    }
    
    console.log('[Renderer] View rendered, container innerHTML length:', contentContainer.innerHTML.length);
  }

  /**
   * Render manual audit view
   */
  private renderManualAuditView(container: HTMLElement): void {
    this.manualAuditViewRenderer = new ManualAuditViewRenderer({
      stateManager: this.stateManager
    });
    this.manualAuditViewRenderer.render(container);
  }

  /**
   * Render schedule audit view
   */
  private renderScheduleAuditView(container: HTMLElement): void {
    container.innerHTML = `<div id="scheduleAuditViewContainer"></div>`;
    const viewContainer = container.querySelector('#scheduleAuditViewContainer') as HTMLElement;
    if (viewContainer) {
      this.scheduleAuditView = new ScheduleAuditView(viewContainer);
    }
  }

  /**
   * Render AI audit view
   */
  private renderAIAuditView(container: HTMLElement): void {
    container.innerHTML = `<div id="aiAuditViewContainer"></div>`;
    const viewContainer = container.querySelector('#aiAuditViewContainer') as HTMLElement;
    if (viewContainer) {
      this.aiAuditView = new AIAuditView(viewContainer);
    }
  }



  /**
   * Refresh all components
   */
  refresh(): void {
    if (this.currentView === 'manual' && this.manualAuditViewRenderer) {
      this.manualAuditViewRenderer.refresh();
    }
  }
}

