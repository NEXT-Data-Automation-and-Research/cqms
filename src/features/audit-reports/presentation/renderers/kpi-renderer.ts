/**
 * KPI Cards Renderer
 * Renders KPI cards with statistics and actual trend graphs from audit data
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import type { AuditReport, AuditStats } from '../../domain/entities.js';
import type { AuditReportsController } from '../audit-reports-controller.js';

const NUM_TREND_POINTS = 7;

function getAuditDate(audit: AuditReport): string | null {
  const d = audit.submittedAt || (audit as any).submitted_at || audit.auditTimestamp || (audit as any).audit_timestamp || (audit as any).created_at;
  if (!d || typeof d !== 'string') return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function isPassed(status: string | undefined): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return s === 'passed' || s === 'pass' || s === 'passing';
}

function hasCriticalError(audit: AuditReport): boolean {
  const n = audit.criticalErrors ?? audit.criticalError ?? audit.criticalFailError ?? 0;
  return Number(n) > 0;
}

function isReversal(audit: AuditReport): boolean {
  const v = audit.reversalApproved;
  if (v === true || v === 1 || v === '1') return true;
  if (audit.reversalRequestedAt && typeof audit.reversalRequestedAt === 'string') return true;
  return false;
}

function isPendingAck(audit: AuditReport): boolean {
  const s = (audit.acknowledgementStatus || (audit as any).acknowledgement_status || '').toLowerCase();
  return !s || s === 'pending' || s === 'not acknowledged' || s.includes('pending');
}

/** Return last 7 calendar days (YYYY-MM-DD) ending on endDate, oldest first */
function getLastSevenDays(endDateStr: string): string[] {
  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return [];
  const out: string[] = [];
  for (let i = NUM_TREND_POINTS - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Build trend series using fixed "last 7 days" buckets (oldest to newest, left to right).
 * Uses the filter's end date so the graph shows real day-by-day trend.
 */
function buildTrendSeries(
  audits: AuditReport[],
  dateRange: { startDate: string; endDate: string } | null
): {
  total: number[];
  avgScore: number[];
  passRate: number[];
  criticalErrorRate: number[];
  avgErrors: number[];
  reversalRate: number[];
  ackPending: number[];
  notPassed: number[];
} {
  const empty = (): number[] => Array(NUM_TREND_POINTS).fill(0);
  const total = empty();
  const avgScore = empty();
  const passRate = empty();
  const criticalErrorRate = empty();
  const avgErrors = empty();
  const reversalRate = empty();
  const ackPending = empty();
  const notPassed = empty();

  const endDate = dateRange?.endDate ?? new Date().toISOString().slice(0, 10);
  const bucketDates = getLastSevenDays(endDate);
  if (bucketDates.length !== NUM_TREND_POINTS) {
    return { total, avgScore, passRate, criticalErrorRate, avgErrors, reversalRate, ackPending, notPassed };
  }

  const withDate = audits.map(a => ({ audit: a, date: getAuditDate(a) })).filter((x): x is { audit: AuditReport; date: string } => x.date !== null);

  const bucketIndex = (dateStr: string): number => {
    const i = bucketDates.indexOf(dateStr);
    return i >= 0 ? i : -1;
  };

  const buckets: {
    count: number;
    scoreSum: number;
    scoreCount: number;
    passed: number;
    critical: number;
    errorsSum: number;
    reversals: number;
    pendingAck: number;
    notPassed: number;
  }[] = Array(NUM_TREND_POINTS).fill(null).map(() => ({
    count: 0, scoreSum: 0, scoreCount: 0, passed: 0, critical: 0, errorsSum: 0, reversals: 0, pendingAck: 0, notPassed: 0
  }));

  withDate.forEach(({ audit, date }) => {
    const i = bucketIndex(date);
    if (i < 0) return;
    const b = buckets[i];
    b.count += 1;
    const score = typeof audit.averageScore === 'number' ? audit.averageScore : parseFloat(String(audit.averageScore ?? 0)) || 0;
    if (score > 0) {
      b.scoreSum += score;
      b.scoreCount += 1;
    }
    if (isPassed(audit.passingStatus)) b.passed += 1;
    if (hasCriticalError(audit)) b.critical += 1;
    b.errorsSum += Number(audit.totalErrorsCount ?? 0) || 0;
    if (isReversal(audit)) b.reversals += 1;
    if (isPendingAck(audit)) b.pendingAck += 1;
    if (!isPassed(audit.passingStatus)) b.notPassed += 1;
  });

  for (let i = 0; i < NUM_TREND_POINTS; i++) {
    const b = buckets[i];
    total[i] = b.count;
    avgScore[i] = b.scoreCount > 0 ? b.scoreSum / b.scoreCount : 0;
    passRate[i] = b.count > 0 ? (b.passed / b.count) * 100 : 0;
    criticalErrorRate[i] = b.count > 0 ? (b.critical / b.count) * 100 : 0;
    avgErrors[i] = b.count > 0 ? b.errorsSum / b.count : 0;
    reversalRate[i] = b.count > 0 ? (b.reversals / b.count) * 100 : 0;
    ackPending[i] = b.pendingAck;
    notPassed[i] = b.notPassed;
  }

  return { total, avgScore, passRate, criticalErrorRate, avgErrors, reversalRate, ackPending, notPassed };
}

/** Normalize values to 0–1 for SVG (0 = bottom, 1 = top). If all same, return 0.5 so line is visible. */
function normalizeToZeroOne(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  if (range === 0) return values.map(() => 0.5);
  return values.map(v => (v - min) / range);
}

/** Hex to rgba for SVG fill */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, '');
  if (h.length !== 6) return `rgba(26,115,62,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Build sparkline SVG via DOM so sanitizer cannot strip or alter it */
function injectSparkline(container: HTMLElement, hexColor: string, dataValues: number[]): void {
  const values = dataValues.length >= 2 ? dataValues : [0.5, 0.5];
  const n = values.length;
  const points = values.map((y, i) => {
    const x = (i / Math.max(1, n - 1)) * 100;
    const yPct = Math.max(0, Math.min(100, 100 - y * 100));
    return `${x},${yPct}`;
  });
  const polylinePoints = points.join(' ');
  const areaPoints = `0,100 ${polylinePoints} 100,100`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'kpi-sparkline');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.display = 'block';
  svg.style.verticalAlign = 'top';

  const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  polygon.setAttribute('fill', hexToRgba(hexColor, 0.2));
  polygon.setAttribute('points', areaPoints);

  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('fill', 'none');
  polyline.setAttribute('stroke', hexColor);
  polyline.setAttribute('stroke-width', '2.5');
  polyline.setAttribute('stroke-linecap', 'round');
  polyline.setAttribute('stroke-linejoin', 'round');
  polyline.setAttribute('vector-effect', 'non-scaling-stroke');
  polyline.setAttribute('points', polylinePoints);

  svg.appendChild(polygon);
  svg.appendChild(polyline);
  container.appendChild(svg);
}

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
  const state = controller.getState();
  const filteredAudits = state.filteredAudits ?? [];
  const dateRange = state.dateRange ?? null;
  const series = buildTrendSeries(filteredAudits, dateRange);

  const nTotal = normalizeToZeroOne(series.total);
  const nAvgScore = series.avgScore.every(s => s === 0) ? series.avgScore.map(() => 0.5) : series.avgScore.map(s => s / 100);
  const nPassRate = series.passRate.map(p => p / 100);
  const nCritical = series.criticalErrorRate.map(c => c / 100);
  const nAvgErrors = normalizeToZeroOne(series.avgErrors);
  const nReversal = series.reversalRate.map(r => r / 100);
  const nAckPending = normalizeToZeroOne(series.ackPending);
  const nNotPassed = normalizeToZeroOne(series.notPassed);

  const chartConfigs: { color: string; values: number[] }[] = [
    { color: '#9333ea', values: nTotal },
    { color: '#1a733e', values: nAvgScore },
    { color: '#1a733e', values: nPassRate },
    { color: '#ef4444', values: nCritical },
    { color: '#f59e0b', values: nAvgErrors },
    { color: '#f59e0b', values: nReversal },
    { color: '#f59e0b', values: nAckPending },
    { color: '#ef4444', values: nNotPassed }
  ];

  const html = `
    <div class="kpi-card" id="kpiCardTotal" data-filter-type="total">
      <div class="kpi-header">
        <div class="kpi-label">Total Audits</div>
      </div>
      <div class="kpi-value" style="color: #9333ea;">${stats.total.toLocaleString()}</div>
      <div class="kpi-change">All time</div>
      <div class="kpi-chart-container kpi-trend-visible"></div>
    </div>

    <div class="kpi-card" id="kpiCardAvgScore" data-filter-type="avgScore">
      <div class="kpi-header">
        <div class="kpi-label">Avg Quality Score</div>
      </div>
      <div class="kpi-value">${stats.avgScore}%</div>
      <div class="kpi-change">${stats.auditsWithScores} audits</div>
      <div class="kpi-chart-container kpi-trend-visible"></div>
    </div>

    <div class="kpi-card" id="kpiCardPassRate" data-filter-type="passed">
      <div class="kpi-header">
        <div class="kpi-label">Pass Rate</div>
      </div>
      <div class="kpi-value">${stats.passRate}%</div>
      <div class="kpi-change positive">${stats.passing} passed</div>
      <div class="kpi-chart-container kpi-trend-visible"></div>
    </div>

    <div class="kpi-card" id="kpiCardCritical" data-filter-type="critical">
      <div class="kpi-header">
        <div class="kpi-label">Critical Error Rate</div>
      </div>
      <div class="kpi-value" style="color: #ef4444;">${stats.criticalErrorRate}%</div>
      <div class="kpi-change negative">${stats.totalCriticalErrors} critical</div>
      <div class="kpi-chart-container kpi-trend-visible"></div>
    </div>

    <div class="kpi-card" id="kpiCardAvgErrors" data-filter-type="errors">
      <div class="kpi-header">
        <div class="kpi-label">Avg Errors/Audit</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.avgErrorsPerAudit.toFixed(2)}</div>
      <div class="kpi-change negative">${stats.totalErrors} total</div>
      <div class="kpi-chart-container kpi-trend-visible"></div>
    </div>

    <div class="kpi-card" id="kpiCardReversal" data-filter-type="reversal">
      <div class="kpi-header">
        <div class="kpi-label">Reversal Rate</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.reversalRate}%</div>
      <div class="kpi-change negative">${stats.reversals} reversals</div>
      <div class="kpi-chart-container kpi-trend-visible"></div>
    </div>

    <div class="kpi-card" id="kpiCardAcknowledgment" data-filter-type="acknowledgment">
      <div class="kpi-header">
        <div class="kpi-label">Acknowledgement Pending</div>
      </div>
      <div class="kpi-value" style="color: #f59e0b;">${stats.pendingAcknowledgments}</div>
      <div class="kpi-change positive">${stats.acknowledged} acknowledged</div>
      <div class="kpi-chart-container kpi-trend-visible"></div>
    </div>

    <div class="kpi-card" id="kpiCardNotPassed" data-filter-type="notPassed">
      <div class="kpi-header">
        <div class="kpi-label">Not Passed</div>
      </div>
      <div class="kpi-value" style="color: #ef4444;">${stats.notPassing}</div>
      <div class="kpi-change negative">Needs attention</div>
      <div class="kpi-chart-container kpi-trend-visible"></div>
    </div>
  `;

  safeSetHTML(container, html);

  const chartContainers = container.querySelectorAll<HTMLElement>('.kpi-chart-container.kpi-trend-visible');
  chartConfigs.forEach((config, i) => {
    const el = chartContainers[i];
    if (el) injectSparkline(el, config.color, config.values);
  });
}
