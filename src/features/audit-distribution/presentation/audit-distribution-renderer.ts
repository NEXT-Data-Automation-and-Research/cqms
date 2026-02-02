/**
 * Audit Distribution Renderer
 * Main orchestrator for all UI components in the audit distribution feature
 * Delegates to specialized renderers for each view
 */

import type { AuditDistributionStateManager } from '../application/audit-distribution-state.js';
import { AuditDistributionService } from '../application/audit-distribution-service.js';
import { AuditDistributionSidebar, type AuditDistributionView } from './components/audit-distribution-sidebar.js';
import { AIAuditView } from './components/ai-audit-view.js';
import { ManualAuditViewRenderer } from './renderers/manual-audit-view-renderer.js';
import { AssignedAuditsViewRenderer } from './renderers/assigned-audits-view-renderer.js';
import { TabManager, type TabType } from './managers/tab-manager.js';
import { StatisticsTabRenderer } from './renderers/statistics-tab-renderer.js';
import { AssignmentTabRenderer } from './renderers/assignment-tab-renderer.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';

export class AuditDistributionRenderer {
  private stateManager: AuditDistributionStateManager;
  private service: AuditDistributionService | null = null;
  private currentView: AuditDistributionView = 'manual';
  private currentTab: TabType = 'manual';
  private sidebar: AuditDistributionSidebar | null = null;
  private tabManager: TabManager | null = null;
  private manualAuditViewRenderer: ManualAuditViewRenderer | null = null;
  private assignedAuditsViewRenderer: AssignedAuditsViewRenderer | null = null;
  private aiAuditView: AIAuditView | null = null;
  private statisticsTabRenderer: StatisticsTabRenderer | null = null;

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
    // Same structure as Auditors Dashboard: inner wrapper + page heading (no title text)
    const contentWrapperDiv = document.createElement('div');
    contentWrapperDiv.className = 'w-full flex flex-col items-center audit-distribution-page-main';
    
    const innerDiv = document.createElement('div');
    innerDiv.className = 'audit-distribution-inner';
    
    // Page heading - same type as Auditors Dashboard (h1.page-heading-global)
    const headingEl = document.createElement('h1');
    headingEl.className = 'page-heading-global';
    headingEl.textContent = 'Audit Distribution';
    headingEl.style.marginBottom = '0.5rem';
    
    const spacerDiv = document.createElement('div');
    spacerDiv.style.cssText = 'margin-bottom: 0.5rem; width: 100%;';
    
    // Tab Navigation - Below heading area
    const tabNavDiv = document.createElement('div');
    tabNavDiv.className = 'w-full flex justify-center py-4 bg-transparent';
    tabNavDiv.innerHTML = `
      <div class="tab-navigation">
        <div class="tab-slider" id="tabSlider"></div>
        <button class="tab-button active" data-tab="manual" id="manualTab">Manual Assign</button>
        <button class="tab-button" data-tab="assigned" id="assignedTab">Assigned Audits</button>
        <button class="tab-button" data-tab="ai" id="aiTab">AI Audit</button>
        <button class="tab-button" data-tab="statistics" id="statisticsTab">Statistics</button>
      </div>
    `;
    
    const contentDiv = document.createElement('div');
    contentDiv.id = 'auditDistributionContent';
    contentDiv.className = 'w-full';
    
    innerDiv.appendChild(headingEl);
    innerDiv.appendChild(spacerDiv);
    innerDiv.appendChild(tabNavDiv);
    innerDiv.appendChild(contentDiv);
    contentWrapperDiv.appendChild(innerDiv);
    container.appendChild(contentWrapperDiv);

    // Initialize tab manager
    this.tabManager = new TabManager({
      onTabChange: (tab) => {
        this.switchTab(tab);
      }
    });

    // Initialize statistics tab renderer
    this.statisticsTabRenderer = new StatisticsTabRenderer({
      stateManager: this.stateManager
    });

    // Render initial view - use setTimeout to ensure DOM is ready
    // If service is not available yet, it will be rendered when service is set
    setTimeout(() => {
      logInfo('[Renderer] Rendering current view...', { serviceAvailable: !!this.service });
      this.renderCurrentView();
    }, 0);
  }


  /**
   * Switch between different tabs
   */
  private switchTab(tab: TabType): void {
    this.currentTab = tab;
    
    // Map tab to view (assigned has no sidebar view)
    if (tab === 'manual' || tab === 'ai') {
      this.currentView = tab as AuditDistributionView;
      if (this.sidebar) this.sidebar.update({ currentView: this.currentView });
    }

    // Render the selected view
    this.renderCurrentView();
  }

  /**
   * Switch between different views (legacy - kept for compatibility)
   */
  private switchView(view: AuditDistributionView): void {
    this.currentView = view;
    this.currentTab = view === 'manual' ? 'manual' : 'ai';
    
    // Update tab manager
    if (this.tabManager) {
      this.tabManager.switchToTab(this.currentTab);
    }
    
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


    logInfo('[Renderer] Rendering view:', { tab: this.currentTab, view: this.currentView });

    switch (this.currentTab) {
      case 'manual':
        logInfo('[Renderer] Rendering manual audit view...');
        this.renderManualAuditView(contentContainer);
        break;
      case 'assigned':
        logInfo('[Renderer] Rendering assigned audits view...');
        this.renderAssignedAuditsView(contentContainer);
        break;
      case 'ai':
        logInfo('[Renderer] Rendering AI audit view...');
        this.renderAIAuditView(contentContainer);
        break;
      case 'statistics':
        logInfo('[Renderer] Rendering statistics view...');
        this.renderStatisticsView(contentContainer);
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
   * Render assigned audits view (dedicated tab for manage assignments)
   */
  private renderAssignedAuditsView(container: HTMLElement): void {
    if (!this.service) {
      logError('[Renderer] Service not available for assigned audits view');
      return;
    }
    this.assignedAuditsViewRenderer = new AssignedAuditsViewRenderer({
      stateManager: this.stateManager,
      service: this.service
    });
    this.assignedAuditsViewRenderer.render(container);
  }

  /**
   * Render AI audit view
   */
  private renderAIAuditView(container: HTMLElement): void {
    if (!this.service) {
      logError('[Renderer] Service not available for AI audit view');
      return;
    }
    container.textContent = '';
    const viewContainer = document.createElement('div');
    viewContainer.id = 'aiAuditViewContainer';
    container.appendChild(viewContainer);
    if (viewContainer) {
      this.aiAuditView = new AIAuditView(viewContainer, {
        stateManager: this.stateManager,
        service: this.service
      });
    }
  }

  /**
   * Render statistics view
   */
  private renderStatisticsView(container: HTMLElement): void {
    container.textContent = '';
    const viewContainer = document.createElement('div');
    viewContainer.id = 'statisticsContent';
    viewContainer.className = 'px-4 py-4 max-w-7xl mx-auto w-full';
    container.appendChild(viewContainer);
    // Use setTimeout to ensure DOM is ready before rendering
    setTimeout(() => {
      if (this.statisticsTabRenderer) {
        this.statisticsTabRenderer.render();
      }
    }, 0);
  }



  /**
   * Refresh all components
   */
  refresh(): void {
    const contentContainer = document.getElementById('auditDistributionContent');
    if (!contentContainer) return;

    if (this.currentTab === 'manual' && this.service) {
      if (!this.manualAuditViewRenderer || contentContainer.children.length === 0) {
        logInfo('[Renderer] Refreshing: Re-rendering manual audit view...');
        this.renderCurrentView();
      } else {
        this.manualAuditViewRenderer.refresh();
      }
    } else if (this.currentTab === 'assigned' && this.service && this.assignedAuditsViewRenderer) {
      this.assignedAuditsViewRenderer.refresh();
    }
  }
}

