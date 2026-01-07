/**
 * Stats Section Component
 * Collapsible stats section reusing glass-card design
 */

import type { AuditStats } from '../../../domain/entities.js';
import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';
import { logError } from '../../../../../utils/logging-helper.js';

export class StatsSection {
  private container: HTMLElement;
  private isExpanded: boolean = false;
  private stats: AuditStats | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.attachEventListeners();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="stats-section-container">
        <div class="stats-section-toggle" id="statsToggle">
          <h2>Your Progress</h2>
          <svg class="stats-toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
        <div class="stats-section-content" id="statsContent">
          <div id="statsCardsContainer"></div>
        </div>
      </div>
    `);
  }

  private attachEventListeners(): void {
    const toggle = this.container.querySelector('#statsToggle');
    if (toggle) {
      toggle.addEventListener('click', () => this.toggle());
    }
  }

  toggle(): void {
    this.isExpanded = !this.isExpanded;
    const content = this.container.querySelector('#statsContent') as HTMLElement;
    const toggle = this.container.querySelector('#statsToggle');
    
    if (content) {
      if (this.isExpanded) {
        content.classList.add('expanded');
      } else {
        content.classList.remove('expanded');
      }
    }
    
    if (toggle) {
      if (this.isExpanded) {
        toggle.classList.add('expanded');
      } else {
        toggle.classList.remove('expanded');
      }
    }
  }

  async loadStats(stats: AuditStats): Promise<void> {
    this.stats = stats;
    const container = this.container.querySelector('#statsCardsContainer');
    if (!container) return;

    // Load stats cards component
    try {
      // @ts-ignore - Runtime import path
      const module = await import('/js/features/home/infrastructure/component-loader.js');
      const loadComponents = module.loadComponents || module.componentLoader?.loadComponents;
      if (loadComponents) {
        await loadComponents([
          { path: '/src/features/home/components/stats-cards/stats-cards.html', target: '#statsCardsContainer' }
        ]);
      }

      // Update stats values
      this.updateStatsValues();
    } catch (error) {
      logError('Error loading stats cards:', error);
    }
  }

  private updateStatsValues(): void {
    if (!this.stats) return;

    const updateElement = (id: string, value: string | number) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    };

    updateElement('statsAuditsConductedCount', this.stats.auditsConducted);
    updateElement('statsAvgQualityScore', this.stats.avgQualityScore.toFixed(1));
    updateElement('statsRemainingCount', this.stats.remaining);
    updateElement('statsReversalTotalCount', this.stats.reversalTotal);
    updateElement('statsReversalActiveCount', this.stats.reversalActive);
    updateElement('statsReversalResolvedCount', this.stats.reversalResolved);
    updateElement('statsInProgressCount', this.stats.inProgress);
    updateElement('statsAvgDuration', this.stats.avgDuration);

    if (this.stats.passRate !== undefined) {
      updateElement('statsPassRate', `${this.stats.passRate}%`);
    }
    if (this.stats.requiresAcknowledgment !== undefined) {
      updateElement('statsRequiresAcknowledgmentCount', this.stats.requiresAcknowledgment);
    }
    if (this.stats.daysRemaining) {
      updateElement('statsDaysRemaining', this.stats.daysRemaining);
    }
  }
}

