/**
 * Audit Distribution Sidebar Component
 * Left sidebar navigation for audit distribution feature
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export type AuditDistributionView = 'manual' | 'ai';

export interface AuditDistributionSidebarConfig {
  currentView: AuditDistributionView;
  onViewChange: (view: AuditDistributionView) => void;
}

export class AuditDistributionSidebar {
  private container: HTMLElement;
  private config: AuditDistributionSidebarConfig;

  constructor(container: HTMLElement, config: AuditDistributionSidebarConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="audit-distribution-sidebar border-r border-gray-200 w-64 flex flex-col h-full">
        <!-- Sidebar content removed - heading moved to content area -->
      </div>
    `);
  }

  update(config: Partial<AuditDistributionSidebarConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }
}

