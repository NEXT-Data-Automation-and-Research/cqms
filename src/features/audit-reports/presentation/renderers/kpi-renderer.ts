/**
 * KPI Cards Renderer
 * Renders KPI cards with statistics
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import type { AuditStats } from '../../domain/entities.js';
import type { AuditReportsController } from '../audit-reports-controller.js';

/**
 * Render skeleton loaders for KPI cards
 */
export function renderKPISkeletons(container: HTMLElement): void {
  const skeletonHTML = Array(8).fill(0).map(() => `
    <div class="kpi-card skeleton">
      <div class="kpi-header">
        <div class="kpi-label skeleton-line" style="width: 60%; height: 0.75rem; background: #e5e7eb; border-radius: 0.25rem; margin-bottom: 0.5rem;"></div>
      </div>
      <div class="kpi-value skeleton-line" style="width: 40%; height: 1.5rem; background: #e5e7eb; border-radius: 0.25rem; margin-bottom: 0.5rem;"></div>
      <div class="kpi-change skeleton-line" style="width: 50%; height: 0.625rem; background: #e5e7eb; border-radius: 0.25rem;"></div>
    </div>
  `).join('');

  safeSetHTML(container, skeletonHTML);
}

export function renderKPICards(
  container: HTMLElement,
  stats: AuditStats,
  controller: AuditReportsController
): void {
  const html = `
    <div class="kpi-card" id="kpiCardTotal" data-filter-type="total">
      <div class="kpi-header">
        <div class="kpi-label">Total Audits</div>
      </div>
      <div class="kpi-value" style="color: #9333ea;">${stats.total.toLocaleString()}</div>
      <div class="kpi-change">All time</div>
      <div class="kpi-chart-container desktop-only">
        <canvas id="chartTotal"></canvas>
      </div>
    </div>

    <div class="kpi-card" id="kpiCardAvgScore" data-filter-type="avgScore">
      <div class="kpi-header">
        <div class="kpi-label">Avg Quality Score</div>
      </div>
      <div class="kpi-value">${stats.avgScore}%</div>
      <div class="kpi-change">${stats.auditsWithScores} audits</div>
      <div class="kpi-chart-container desktop-only">
        <canvas id="chartAvgScore"></canvas>
      </div>
    </div>

    <div class="kpi-card" id="kpiCardPassRate" data-filter-type="passed">
      <div class="kpi-header">
        <div class="kpi-label">Pass Rate</div>
      </div>
      <div class="kpi-value">${stats.passRate}%</div>
      <div class="kpi-change positive">${stats.passing} passed</div>
      <div class="kpi-chart-container desktop-only">
        <canvas id="chartPassRate"></canvas>
      </div>
    </div>

    <div class="kpi-card" id="kpiCardCritical" data-filter-type="critical">
      <div class="kpi-header">
        <div class="kpi-label">Critical Error Rate</div>
      </div>
      <div class="kpi-value" style="color: #ef4444;">${stats.criticalErrorRate}%</div>
      <div class="kpi-change negative">${stats.totalCriticalErrors} critical</div>
      <div class="kpi-chart-container desktop-only">
        <canvas id="chartCritical"></canvas>
      </div>
    </div>

    <div class="kpi-card" id="kpiCardAvgErrors" data-filter-type="errors">
      <div class="kpi-header">
        <div class="kpi-label">Avg Errors/Audit</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.avgErrorsPerAudit.toFixed(2)}</div>
      <div class="kpi-change negative">${stats.totalErrors} total</div>
      <div class="kpi-chart-container desktop-only">
        <canvas id="chartAvgErrors"></canvas>
      </div>
    </div>

    <div class="kpi-card" id="kpiCardReversal" data-filter-type="reversal">
      <div class="kpi-header">
        <div class="kpi-label">Reversal Rate</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.reversalRate}%</div>
      <div class="kpi-change negative">${stats.reversals} reversals</div>
      <div class="kpi-chart-container desktop-only">
        <canvas id="chartReversal"></canvas>
      </div>
    </div>

    <div class="kpi-card" id="kpiCardAcknowledgment" data-filter-type="acknowledgment">
      <div class="kpi-header">
        <div class="kpi-label">Acknowledgement Pending</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.pendingAcknowledgments}</div>
      <div class="kpi-change positive">${stats.acknowledged} acknowledged</div>
      <div class="kpi-chart-container desktop-only">
        <canvas id="chartAcknowledgment"></canvas>
      </div>
    </div>

    <div class="kpi-card" id="kpiCardNotPassed" data-filter-type="notPassed">
      <div class="kpi-header">
        <div class="kpi-label">Not Passed</div>
      </div>
      <div class="kpi-value" style="color: #ef4444;">${stats.notPassing}</div>
      <div class="kpi-change negative">Needs attention</div>
      <div class="kpi-chart-container desktop-only">
        <canvas id="chartNotPassed"></canvas>
      </div>
    </div>
  `;

  safeSetHTML(container, html);
  
  // Initialize charts for desktop view only
  // Wait for Chart.js to be available and DOM to be ready
  const initCharts = () => {
    if (window.innerWidth >= 1025) {
      const tryInit = () => {
        if ((window as any).Chart) {
          // Use requestAnimationFrame to ensure DOM is ready
          requestAnimationFrame(() => {
            setTimeout(() => initializeKPICarts(), 100);
          });
        } else {
          // Wait for Chart.js to load
          setTimeout(tryInit, 100);
        }
      };
      tryInit();
    }
  };
  
  // Try to initialize immediately, or wait for load
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initCharts, 500);
  } else {
    window.addEventListener('load', () => setTimeout(initCharts, 500));
  }
}

function initializeKPICarts(): void {
  // Check if Chart.js is available
  const Chart = (window as any).Chart;
  if (!Chart) {
    console.warn('Chart.js is not available');
    return;
  }

  // Simple line/sparkline charts for each KPI card
  const chartConfig = {
    type: 'line' as const,
    data: {
      labels: ['', '', '', '', '', '', ''],
      datasets: [{
        data: [0, 10, 5, 15, 10, 20, 15],
        borderColor: '#1a733e',
        backgroundColor: 'rgba(26, 115, 62, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }
      },
      scales: {
        x: { display: false },
        y: { display: false }
      },
      animation: {
        duration: 0
      }
    }
  };

  const charts = [
    { id: 'chartTotal', color: '#9333ea' },
    { id: 'chartAvgScore', color: '#1a733e' },
    { id: 'chartPassRate', color: '#1a733e' },
    { id: 'chartCritical', color: '#ef4444' },
    { id: 'chartAvgErrors', color: '#f59e0b' },
    { id: 'chartReversal', color: '#f59e0b' },
    { id: 'chartAcknowledgment', color: '#f59e0b' },
    { id: 'chartNotPassed', color: '#ef4444' }
  ];

  charts.forEach(({ id, color }) => {
    const canvas = document.getElementById(id) as HTMLCanvasElement;
    if (!canvas) {
      return;
    }
    
    // Check if container is visible (desktop only)
    const container = canvas.parentElement;
    if (!container || window.getComputedStyle(container).display === 'none') {
      return; // Skip if container is hidden
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    
    const Chart = (window as any).Chart;
    if (!Chart) {
      return;
    }
    
    try {
      // Convert hex to rgba
      const hexToRgba = (hex: string, alpha: number) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      };

      new Chart(ctx, {
        ...chartConfig,
        data: {
          ...chartConfig.data,
          datasets: [{
            ...chartConfig.data.datasets[0],
            borderColor: color,
            backgroundColor: hexToRgba(color, 0.1)
          }]
        }
      });
    } catch (error) {
      console.error(`Chart initialization error for ${id}:`, error);
    }
  });
}

