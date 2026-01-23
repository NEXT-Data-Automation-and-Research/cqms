/**
 * Schedule Audit View Component
 * Main component for scheduled audit functionality
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import type { AuditDistributionService } from '../../application/audit-distribution-service.js';
import { ScheduleAuditViewRenderer } from '../renderers/schedule-audit-view-renderer.js';

export interface ScheduleAuditViewConfig {
  stateManager: AuditDistributionStateManager;
  service: AuditDistributionService;
}

export class ScheduleAuditView {
  private container: HTMLElement;
  private renderer: ScheduleAuditViewRenderer | null = null;
  private config: ScheduleAuditViewConfig | null = null;

  constructor(container: HTMLElement, config?: ScheduleAuditViewConfig) {
    this.container = container;
    this.config = config || null;
    if (this.config) {
      this.render();
    }
  }

  setConfig(config: ScheduleAuditViewConfig): void {
    this.config = config;
    if (this.config) {
      this.render();
    }
  }

  private render(): void {
    if (!this.config) {
      return;
    }

    this.renderer = new ScheduleAuditViewRenderer({
      stateManager: this.config.stateManager,
      service: this.config.service
    });
    this.renderer.render(this.container);
  }

  update(): void {
    this.renderer?.refresh();
  }
}

