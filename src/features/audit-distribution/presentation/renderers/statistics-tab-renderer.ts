/**
 * Statistics Tab Renderer
 * Handles rendering and updates for the statistics tab
 */

import type { AuditDistributionStateManager } from '../../application/audit-distribution-state.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export interface StatisticsTabRendererConfig {
  stateManager: AuditDistributionStateManager;
}

export class StatisticsTabRenderer {
  private stateManager: AuditDistributionStateManager;

  constructor(config: StatisticsTabRendererConfig) {
    this.stateManager = config.stateManager;
  }

  render(): void {
    this.renderComingSoon();
  }

  private renderComingSoon(): void {
    const container = document.getElementById('statisticsContent');
    if (!container) return;

    const html = `
      <div class="flex flex-col items-center justify-center min-h-[500px] py-20">
        <div class="text-center">
          <div class="mb-6">
            <svg class="mx-auto w-24 h-24 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 class="text-3xl font-bold text-white mb-3">Coming Soon</h2>
          <p class="text-lg text-white/70 max-w-md mx-auto">
            Statistics and analytics features are under development. Check back soon!
          </p>
        </div>
      </div>
    `;

    safeSetHTML(container, html);
  }

  refresh(): void {
    this.render();
  }
}

