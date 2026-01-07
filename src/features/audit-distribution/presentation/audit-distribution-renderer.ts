/**
 * Audit Distribution Renderer
 * Main orchestrator for all UI components in the audit distribution feature
 * Delegates to specialized renderers for each view
 */

import type { AuditDistributionStateManager } from '../application/audit-distribution-state.js';
import { AuditDistributionService } from '../application/audit-distribution-service.js';
import { AuditDistributionSidebar, type AuditDistributionView } from './components/audit-distribution-sidebar.js';
import { ScheduleAuditView } from './components/schedule-audit-view.js';
import { AIAuditView } from './components/ai-audit-view.js';
import { ManualAuditViewRenderer } from './renderers/manual-audit-view-renderer.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';

export class AuditDistributionRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService | null = null;
  private currentView: AuditDistributionView = 'manual';
  private sidebar: AuditDistributionSidebar | null = null;
  private manualAuditViewRenderer: ManualAuditViewRenderer | null = null;
  private scheduleAuditView: ScheduleAuditView | null = null;
  private aiAuditView: AIAuditView | null = null;

  constructor(stateManager: AuditDistributionStateManager, service?: AuditDistributionService) {
    this.stateManager = stateManager;
    this.service = service || null;
  }

  setService(service: AuditDistributionService): void {
    this.service = service;
    // Re-render current view if it requires the service (e.g., manual audit view)
    if (this.currentView === 'manual') {
      logInfo('[Renderer] Service set, re-rendering manual audit view...');
      this.renderCurrentView();
    }
  }

  /**
   * Initialize and render all components
   */
  initialize(container: HTMLElement): void {
    logInfo('[Renderer] Initializing with container:', { containerId: container.id });
    
    container.textContent = '';
    const wrapperDiv = document.createElement('div');
    wrapperDiv.className = 'flex w-full items-start';
    
    const sidebarDiv = document.createElement('div');
    sidebarDiv.id = 'auditDistributionSidebar';
    sidebarDiv.className = 'flex-shrink-0';
    
    const contentWrapperDiv = document.createElement('div');
    contentWrapperDiv.className = 'flex-1 min-w-0 overflow-x-hidden pr-4';
    
    const contentDiv = document.createElement('div');
    contentDiv.id = 'auditDistributionContent';
    contentDiv.className = 'w-full';
    
    contentWrapperDiv.appendChild(contentDiv);
    wrapperDiv.appendChild(sidebarDiv);
    wrapperDiv.appendChild(contentWrapperDiv);
    container.appendChild(wrapperDiv);

    // Initialize sidebar
    const sidebarContainer = container.querySelector('#auditDistributionSidebar') as HTMLElement;
    if (sidebarContainer) {
      logInfo('[Renderer] Initializing sidebar...');
      this.sidebar = new AuditDistributionSidebar(sidebarContainer, {
        currentView: this.currentView,
        onViewChange: (view) => {
          this.switchView(view);
        }
      });
    } else {
      logError('[Renderer] Sidebar container not found!');
    }

    // Render initial view - use setTimeout to ensure DOM is ready
    // If service is not available yet, it will be rendered when service is set
    setTimeout(() => {
      logInfo('[Renderer] Rendering current view...', { serviceAvailable: !!this.service });
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
      logError('[Renderer] Content container not found: auditDistributionContent');
      return;
    }

    logInfo('[Renderer] Rendering view:', { view: this.currentView });

    switch (this.currentView) {
      case 'manual':
        logInfo('[Renderer] Rendering manual audit view...');
        this.renderManualAuditView(contentContainer);
        break;
      case 'schedule':
        logInfo('[Renderer] Rendering schedule audit view...');
        this.renderScheduleAuditView(contentContainer);
        break;
      case 'ai':
        logInfo('[Renderer] Rendering AI audit view...');
        this.renderAIAuditView(contentContainer);
        break;
    }
    
    logInfo('[Renderer] View rendered', { innerHTMLLength: contentContainer.innerHTML.length });
  }

  /**
   * Render manual audit view
   */
  private renderManualAuditView(container: HTMLElement): void {
    if (!this.service) {
      logError('[Renderer] Service not available for manual audit view');
      return;
    }
    this.manualAuditViewRenderer = new ManualAuditViewRenderer({
      stateManager: this.stateManager,
      service: this.service
    });
    this.manualAuditViewRenderer.render(container);
  }

  /**
   * Render schedule audit view
   */
  private renderScheduleAuditView(container: HTMLElement): void {
    container.textContent = '';
    const viewContainer = document.createElement('div');
    viewContainer.id = 'scheduleAuditViewContainer';
    container.appendChild(viewContainer);
    if (viewContainer) {
      this.scheduleAuditView = new ScheduleAuditView(viewContainer);
    }
  }

  /**
   * Render AI audit view
   */
  private renderAIAuditView(container: HTMLElement): void {
    container.textContent = '';
    const viewContainer = document.createElement('div');
    viewContainer.id = 'aiAuditViewContainer';
    container.appendChild(viewContainer);
    if (viewContainer) {
      this.aiAuditView = new AIAuditView(viewContainer);
    }
  }



  /**
   * Refresh all components
   */
  refresh(): void {
    // If service is available but view isn't rendered yet, render it now
    if (this.currentView === 'manual' && this.service) {
      const contentContainer = document.getElementById('auditDistributionContent');
      if (contentContainer && (!this.manualAuditViewRenderer || contentContainer.children.length === 0)) {
        logInfo('[Renderer] Refreshing: Re-rendering manual audit view...');
        this.renderCurrentView();
      } else if (this.manualAuditViewRenderer) {
        this.manualAuditViewRenderer.refresh();
      }
    }
  }
}

