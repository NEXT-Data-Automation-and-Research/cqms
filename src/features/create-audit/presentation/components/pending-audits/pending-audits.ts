/**
 * Pending Audits Component
 * List of pending audits with filters and sorting
 */

import type { PendingAudit } from '../../../domain/entities.js';
import { safeSetHTML, escapeHtml } from '../../../../../utils/html-sanitizer.js';

export class PendingAudits {
  private container: HTMLElement;
  private audits: PendingAudit[] = [];
  private selectedAuditId: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  private render(): void {
    safeSetHTML(this.container, `
      <div class="glass-card rounded-xl p-4">
        <h3 class="text-base font-bold text-white mb-4">Pending Audits</h3>
        <div class="space-y-2" id="pendingAuditsList">
          <!-- Audits will be loaded here -->
        </div>
        <div class="mt-4 text-center text-sm text-white/60" id="pendingAuditsEmpty" style="display: none;">
          No pending audits
        </div>
      </div>
    `);
  }

  loadAudits(audits: PendingAudit[]): void {
    this.audits = audits;
    this.updateList();
  }

  private updateList(): void {
    const list = this.container.querySelector('#pendingAuditsList') as HTMLElement;
    const empty = this.container.querySelector('#pendingAuditsEmpty') as HTMLElement;
    
    if (!list || !empty) return;

    if (this.audits.length === 0) {
      list.style.display = 'none';
      empty.style.display = 'block';
      return;
    }

    list.style.display = 'block';
    empty.style.display = 'none';

    const htmlContent = this.audits.map(audit => `
      <div class="pending-audit-item ${this.selectedAuditId === audit.id ? 'selected' : ''}" 
           data-audit-id="${audit.id}">
        <div class="flex items-center justify-between">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-white truncate">${this.escapeHtml(audit.employeeName)}</div>
            <div class="text-xs text-white/60 mt-1">${this.escapeHtml(audit.scorecardName)}</div>
            <div class="text-xs text-white/50 mt-1">${this.formatDate(audit.interactionDate)}</div>
          </div>
          <div class="ml-2">
            <span class="text-xs px-2 py-1 rounded ${this.getStatusClass(audit.status)}">
              ${this.escapeHtml(audit.status)}
            </span>
          </div>
        </div>
      </div>
    `).join('');

    safeSetHTML(list, htmlContent);

    // Attach click handlers
    list.querySelectorAll('.pending-audit-item').forEach(item => {
      item.addEventListener('click', () => {
        const auditId = item.getAttribute('data-audit-id');
        if (auditId) {
          this.selectAudit(auditId);
        }
      });
    });
  }

  private selectAudit(auditId: string): void {
    this.selectedAuditId = auditId;
    this.updateList();
    
    // Dispatch event for parent component
    this.container.dispatchEvent(new CustomEvent('audit-selected', {
      detail: { auditId }
    }));
  }

  private getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-300';
      case 'completed':
        return 'bg-green-500/20 text-green-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

