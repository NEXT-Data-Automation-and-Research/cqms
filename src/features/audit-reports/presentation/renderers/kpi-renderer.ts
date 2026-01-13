/**
 * KPI Cards Renderer
 * Renders KPI cards with statistics
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import type { AuditStats } from '../../domain/entities.js';
import type { AuditReportsController } from '../audit-reports-controller.js';

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
    </div>

    <div class="kpi-card" id="kpiCardAvgScore" data-filter-type="avgScore">
      <div class="kpi-header">
        <div class="kpi-label">Avg Quality Score</div>
      </div>
      <div class="kpi-value">${stats.avgScore}%</div>
      <div class="kpi-change">${stats.auditsWithScores} audits</div>
    </div>

    <div class="kpi-card" id="kpiCardPassRate" data-filter-type="passed">
      <div class="kpi-header">
        <div class="kpi-label">Pass Rate</div>
      </div>
      <div class="kpi-value">${stats.passRate}%</div>
      <div class="kpi-change positive">${stats.passing} passed</div>
    </div>

    <div class="kpi-card" id="kpiCardCritical" data-filter-type="critical">
      <div class="kpi-header">
        <div class="kpi-label">Critical Error Rate</div>
      </div>
      <div class="kpi-value" style="color: #ef4444;">${stats.criticalErrorRate}%</div>
      <div class="kpi-change negative">${stats.totalCriticalErrors} critical</div>
    </div>

    <div class="kpi-card" id="kpiCardAvgErrors" data-filter-type="errors">
      <div class="kpi-header">
        <div class="kpi-label">Avg Errors/Audit</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.avgErrorsPerAudit.toFixed(2)}</div>
      <div class="kpi-change negative">${stats.totalErrors} total</div>
    </div>

    <div class="kpi-card" id="kpiCardReversal" data-filter-type="reversal">
      <div class="kpi-header">
        <div class="kpi-label">Reversal Rate</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.reversalRate}%</div>
      <div class="kpi-change negative">${stats.reversals} reversals</div>
    </div>

    <div class="kpi-card" id="kpiCardAcknowledgment" data-filter-type="acknowledgment">
      <div class="kpi-header">
        <div class="kpi-label">Acknowledgement Pending</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.pendingAcknowledgments}</div>
      <div class="kpi-change positive">${stats.acknowledged} acknowledged</div>
    </div>

    <div class="kpi-card" id="kpiCardNotPassed" data-filter-type="notPassed">
      <div class="kpi-header">
        <div class="kpi-label">Not Passed</div>
      </div>
      <div class="kpi-value" style="color: #ef4444;">${stats.notPassing}</div>
      <div class="kpi-change negative">Needs attention</div>
    </div>
  `;

  safeSetHTML(container, html);
}

