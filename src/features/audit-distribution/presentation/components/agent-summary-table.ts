/**
 * Agent Summary Table Component
 * Displays agent-wise audit summary with progress tracking
 */

import type { AgentSummary } from '../../domain/types.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';

export interface AgentSummaryTableConfig {
  summaries: AgentSummary[];
  onTargetUpdate?: (email: string, target: number) => void;
  dateFilter?: { start: string | null; end: string | null };
  onDateFilterChange?: (period: 'today' | 'yesterday' | 'thisMonth' | 'lastMonth') => void;
  onRefresh?: () => void;
}

export class AgentSummaryTable {
  private container: HTMLElement;
  private config: AgentSummaryTableConfig;
  private expandedBreakdowns: Set<string> = new Set();

  constructor(container: HTMLElement, config: AgentSummaryTableConfig) {
    this.container = container;
    this.config = config;
    this.render();
  }

  private render(): void {
    const { summaries, dateFilter } = this.config;

    const rows = summaries.map(summary => this.renderSummaryRow(summary)).join('');

    safeSetHTML(this.container, `
      <div class="glass-card rounded-xl p-5">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-white/10">
          <div class="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="flex-shrink-0 text-primary">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h2 class="text-base font-bold text-white m-0">Agent-wise Audit Summary</h2>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <div class="flex gap-2 items-center flex-wrap">
              <button
                class="date-filter-btn px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium"
                onclick="this.dispatchEvent(new CustomEvent('dateFilter', { detail: 'today' }))"
              >
                Today
              </button>
              <button
                class="date-filter-btn px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium"
                onclick="this.dispatchEvent(new CustomEvent('dateFilter', { detail: 'yesterday' }))"
              >
                Yesterday
              </button>
              <button
                class="date-filter-btn px-3 py-1.5 text-xs border border-primary rounded-lg bg-primary text-white font-medium active"
                onclick="this.dispatchEvent(new CustomEvent('dateFilter', { detail: 'thisMonth' }))"
              >
                This Month
              </button>
              <button
                class="date-filter-btn px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium"
                onclick="this.dispatchEvent(new CustomEvent('dateFilter', { detail: 'lastMonth' }))"
              >
                Last Month
              </button>
            </div>
            <button
              class="px-3 py-1.5 text-xs border border-white/20 rounded-lg bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:border-primary/50 transition-all flex items-center gap-1.5 font-medium"
              onclick="this.dispatchEvent(new CustomEvent('refresh'))"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse text-sm">
            <thead>
              <tr class="bg-white/5 border-b border-white/10">
                <th class="text-left p-2.5 font-semibold text-white">Agent</th>
                <th class="text-left p-2.5 font-semibold text-white/80">Channel</th>
                <th class="text-center p-2.5 font-semibold text-white">Audit Target</th>
                <th class="text-center p-2.5 font-semibold text-white">Total Assigned</th>
                <th class="text-center p-2.5 font-semibold text-white">Completed Audits</th>
                <th class="text-left p-2.5 font-semibold text-white">Progress</th>
                <th class="text-left p-2.5 font-semibold text-white">Breakdown by Auditor</th>
              </tr>
            </thead>
            <tbody>
              ${summaries.length === 0 ? `
                <tr>
                  <td colspan="7" class="text-center py-8 text-white/60">No summaries found</td>
                </tr>
              ` : rows}
            </tbody>
          </table>
        </div>
      </div>
    `);

    this.attachEventListeners();
  }

  private renderSummaryRow(summary: AgentSummary): string {
    const progressPercentage = summary.target > 0
      ? Math.min(100, Math.round((summary.completedAudits / summary.target) * 100))
      : 0;

    const sanitizedEmail = this.sanitizeEmailForId(summary.email);
    const isExpanded = this.expandedBreakdowns.has(summary.email);

    const auditorBreakdown = Array.from(summary.auditorBreakdown.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .map(([auditorEmail, data]) => `
        <div class="flex items-center gap-2 py-1.5 border-b border-white/10 last:border-b-0">
          <span class="font-semibold text-white min-w-[6rem]">${this.escapeHtml(data.name)}:</span>
          <span class="text-white/80 font-medium">${data.count}</span>
        </div>
      `).join('');

    return `
      <tr class="border-b border-white/10 hover:bg-white/5 transition-colors" data-email="${this.escapeHtml(summary.email)}" data-completed="${summary.completedAudits}">
        <td class="p-2.5 text-sm font-semibold text-white">${this.escapeHtml(summary.name)}</td>
        <td class="p-2.5 text-sm text-white/75">${this.escapeHtml(summary.channel)}</td>
        <td class="p-2.5 text-center">
          <input
            type="number"
            class="audit-target-input w-12 px-2 py-1 border border-white/20 rounded-lg text-sm font-semibold text-center bg-white/10 backdrop-blur-sm text-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
            data-email="${this.escapeHtml(summary.email)}"
            value="${summary.target}"
            min="0"
            max="100"
          />
        </td>
        <td class="p-2.5 text-center text-sm font-medium text-white">${summary.totalAudits}</td>
        <td class="p-2.5 text-center text-sm font-medium text-white">${summary.completedAudits}</td>
        <td class="p-2.5 text-sm">
          <div class="flex items-center gap-3">
            <span id="progress-text-${sanitizedEmail}" class="text-sm font-semibold text-white min-w-[35px]">${progressPercentage}%</span>
            <div class="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden relative">
              <div
                id="progress-bar-${sanitizedEmail}"
                class="h-full bg-gradient-to-r from-primary to-primary-dark transition-all rounded-full"
                style="width: ${progressPercentage}%"
              ></div>
            </div>
          </div>
        </td>
        <td class="p-2.5 text-sm">
          <button
            class="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg cursor-pointer text-xs text-white hover:bg-white/20 hover:border-primary/50 transition-all font-medium toggle-breakdown-btn"
            data-email="${this.escapeHtml(summary.email)}"
            data-action="toggle-breakdown"
          >
            <svg
              id="breakdown-icon-${sanitizedEmail}"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              class="transition-transform ${isExpanded ? 'rotate-90' : ''}"
            >
              <path d="M9 18l6-6-6-6"/>
            </svg>
            <span>${isExpanded ? 'Hide' : 'Show'}</span>
          </button>
          <div
            id="breakdown-content-${sanitizedEmail}"
            class="mt-2 p-2.5 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 ${isExpanded ? '' : 'hidden'}"
          >
            <div class="flex flex-col gap-1.5">
              ${auditorBreakdown || '<span class="text-white/60 text-xs">No auditors assigned</span>'}
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  private attachEventListeners(): void {
    const targetInputs = this.container.querySelectorAll('.audit-target-input');
    targetInputs.forEach(input => {
      input.addEventListener('change', () => {
        const email = (input as HTMLInputElement).getAttribute('data-email');
        const value = parseInt((input as HTMLInputElement).value);
        if (email && this.config.onTargetUpdate) {
          this.config.onTargetUpdate(email, value);
        }
      });
    });

    // ✅ SECURITY: Set up event listeners for toggle breakdown buttons (prevents XSS)
    this.container.querySelectorAll('.toggle-breakdown-btn').forEach(btn => {
      if (btn.hasAttribute('data-listener-attached')) return;
      btn.setAttribute('data-listener-attached', 'true');
      
      btn.addEventListener('click', (e) => {
        const email = btn.getAttribute('data-email');
        if (email) {
          btn.dispatchEvent(new CustomEvent('toggleBreakdown', { detail: email }));
        }
      });
    });
    
    // Keep existing event listeners for CustomEvents
    const toggleBreakdowns = this.container.querySelectorAll('[data-action="toggle-breakdown"]');
    toggleBreakdowns.forEach(btn => {
      btn.addEventListener('toggleBreakdown', ((e: CustomEvent) => {
        const email = e.detail;
        this.toggleBreakdown(email);
      }) as EventListener);
    });

    const dateFilterBtns = this.container.querySelectorAll('[onclick*="dateFilter"]');
    dateFilterBtns.forEach(btn => {
      btn.addEventListener('dateFilter', ((e: CustomEvent) => {
        const period = e.detail;
        
        // Update active state
        dateFilterBtns.forEach(b => {
          b.classList.remove('active');
          if (b.getAttribute('onclick')?.includes(`'${period}'`)) {
            b.classList.add('active');
          }
        });
        
        if (this.config.onDateFilterChange) {
          this.config.onDateFilterChange(period);
        }
      }) as EventListener);
    });

    const refreshBtn = this.container.querySelector('[onclick*="refresh"]');
    refreshBtn?.addEventListener('refresh', () => {
      if (this.config.onRefresh) {
        this.config.onRefresh();
      }
    });
  }

  private toggleBreakdown(email: string): void {
    const sanitizedEmail = this.sanitizeEmailForId(email);
    const content = this.container.querySelector(`#breakdown-content-${sanitizedEmail}`);
    const icon = this.container.querySelector(`#breakdown-icon-${sanitizedEmail}`);
    const button = icon?.closest('button');

    if (!content || !icon || !button) return;

    const isHidden = content.classList.contains('hidden');

    if (isHidden) {
      content.classList.remove('hidden');
      icon.classList.add('rotate-90');
      const span = button.querySelector('span');
      if (span) span.textContent = 'Hide';
      this.expandedBreakdowns.add(email);
    } else {
      content.classList.add('hidden');
      icon.classList.remove('rotate-90');
      const span = button.querySelector('span');
      if (span) span.textContent = 'Show';
      this.expandedBreakdowns.delete(email);
    }
  }

  private sanitizeEmailForId(email: string): string {
    return (email || '').replace(/[^a-zA-Z0-9]/g, '_');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  update(config: Partial<AgentSummaryTableConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }
}

