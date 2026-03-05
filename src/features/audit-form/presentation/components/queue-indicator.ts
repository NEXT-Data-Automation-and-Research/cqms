/**
 * Queue Indicator Component
 * Displays the audit queue count, item list, and submit-all button.
 * Programmatically injected above the form actions bar.
 */

import { AuditQueueService } from '../../application/audit-queue-service.js';
import type { QueuedAudit } from '../../domain/queue-types.js';

export interface QueueIndicatorConfig {
  queueService: AuditQueueService;
  onSubmitAll: () => Promise<void>;
}

export class QueueIndicator {
  private container: HTMLElement | null = null;
  private config: QueueIndicatorConfig;
  private expanded = false;

  constructor(config: QueueIndicatorConfig) {
    this.config = config;
    this.handleQueueUpdate = this.handleQueueUpdate.bind(this);
  }

  /**
   * Mount the queue indicator before the given anchor element
   */
  mount(anchorElement: HTMLElement): void {
    this.container = document.createElement('div');
    this.container.id = 'auditQueueIndicator';
    anchorElement.parentElement?.insertBefore(this.container, anchorElement);

    document.addEventListener('auditQueueUpdated', this.handleQueueUpdate);
    this.render();
  }

  /**
   * Re-render when queue changes
   */
  private handleQueueUpdate(): void {
    this.render();
  }

  /**
   * Render the queue indicator based on current queue state
   */
  render(): void {
    if (!this.container) return;

    const queue = this.config.queueService.getQueue();
    const count = queue.length;

    if (count === 0) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'block';
    this.container.innerHTML = this.getHTML(queue, count);
    this.attachListeners(queue);
  }

  private getHTML(queue: QueuedAudit[], count: number): string {
    const itemsHTML = queue.map((item, index) => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.3234rem 0.4852rem; background: white; border-radius: 0.1617rem; border: 0.0304rem solid #e5e7eb; font-size: 0.4447rem; font-family: 'Poppins', sans-serif;">
        <div style="display: flex; align-items: center; gap: 0.4852rem; flex: 1; min-width: 0;">
          <span style="color: #6b7280; font-weight: 600; min-width: 1rem;">${index + 1}.</span>
          <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(item.displayData.employeeName || 'Unknown')}</span>
          <span style="color: #6b7280;">|</span>
          <span style="color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.escapeHtml(item.displayData.interactionId || 'N/A')}</span>
          <span style="color: #6b7280;">|</span>
          <span style="color: #6b7280; white-space: nowrap;">${this.escapeHtml(item.scorecardName || '')}</span>
          <span style="color: #6b7280;">|</span>
          <span style="font-weight: 500;">${item.displayData.averageScore != null ? item.displayData.averageScore + '%' : 'N/A'}</span>
          <span style="padding: 0.0809rem 0.2425rem; border-radius: 0.1213rem; font-size: 0.3639rem; font-weight: 600; ${item.displayData.passingStatus === 'Pass' ? 'background: #dcfce7; color: #166534;' : 'background: #fef2f2; color: #991b1b;'}">${this.escapeHtml(item.displayData.passingStatus || 'N/A')}</span>
        </div>
        <button data-remove-queue-id="${item.queueId}" type="button" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0.1617rem; font-size: 0.5659rem; line-height: 1; border-radius: 0.1213rem; transition: background 0.15s;" title="Remove from queue">&times;</button>
      </div>
    `).join('');

    return `
      <div style="margin: 0 0.9704rem; padding: 0.4852rem; background: #eff6ff; border: 0.0405rem solid #bfdbfe; border-radius: 0.2425rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;" id="queueHeaderToggle">
          <div style="display: flex; align-items: center; gap: 0.3234rem;">
            <span style="background: #2563eb; color: white; padding: 0.0809rem 0.3234rem; border-radius: 0.6469rem; font-size: 0.4447rem; font-weight: 600; font-family: 'Poppins', sans-serif;">${count}</span>
            <span style="font-size: 0.4852rem; font-weight: 600; color: #1e40af; font-family: 'Poppins', sans-serif;">Audit${count !== 1 ? 's' : ''} in Queue</span>
            <span style="font-size: 0.3639rem; color: #6b7280; font-family: 'Poppins', sans-serif;">${this.expanded ? '(click to collapse)' : '(click to expand)'}</span>
          </div>
          <div style="display: flex; gap: 0.3234rem;">
            <button type="button" id="clearQueueBtn" style="padding: 0.2425rem 0.4852rem; background: white; color: #ef4444; border: 0.0304rem solid #fecaca; border-radius: 0.1617rem; font-size: 0.4042rem; font-family: 'Poppins', sans-serif; font-weight: 500; cursor: pointer; transition: all 0.15s;">Clear All</button>
            <button type="button" id="submitAllQueuedBtn" style="padding: 0.2425rem 0.6469rem; background: linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%); color: white; border: none; border-radius: 0.1617rem; font-size: 0.4042rem; font-family: 'Poppins', sans-serif; font-weight: 600; cursor: pointer; transition: all 0.15s; box-shadow: 0 0.0304rem 0.0606rem rgba(26, 115, 62, 0.2);">Submit All (${count})</button>
          </div>
        </div>
        <div id="queueItemsList" style="display: ${this.expanded ? 'flex' : 'none'}; flex-direction: column; gap: 0.2425rem; margin-top: 0.3234rem; max-height: 12rem; overflow-y: auto;">
          ${itemsHTML}
        </div>
      </div>
    `;
  }

  private attachListeners(queue: QueuedAudit[]): void {
    // Toggle expand/collapse
    const header = document.getElementById('queueHeaderToggle');
    header?.addEventListener('click', (e) => {
      // Don't toggle if clicking a button inside header
      if ((e.target as HTMLElement).closest('button')) return;
      this.expanded = !this.expanded;
      this.render();
    });

    // Clear all
    const clearBtn = document.getElementById('clearQueueBtn');
    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.config.queueService.clearQueue();
      document.dispatchEvent(new CustomEvent('auditQueueUpdated', { detail: { count: 0 } }));
      this.render();
    });

    // Submit all
    const submitAllBtn = document.getElementById('submitAllQueuedBtn') as HTMLButtonElement;
    submitAllBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (submitAllBtn) {
        submitAllBtn.disabled = true;
        submitAllBtn.textContent = 'Submitting...';
        submitAllBtn.style.opacity = '0.6';
      }
      this.config.onSubmitAll().catch(() => {
        if (submitAllBtn) {
          submitAllBtn.disabled = false;
          submitAllBtn.textContent = `Submit All (${this.config.queueService.getQueueCount()})`;
          submitAllBtn.style.opacity = '1';
        }
      });
    });

    // Remove individual items
    queue.forEach(item => {
      const removeBtn = this.container?.querySelector(`[data-remove-queue-id="${item.queueId}"]`) as HTMLButtonElement;
      removeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.config.queueService.removeFromQueue(item.queueId);
        const count = this.config.queueService.getQueueCount();
        document.dispatchEvent(new CustomEvent('auditQueueUpdated', { detail: { count } }));
        this.render();
      });
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy(): void {
    document.removeEventListener('auditQueueUpdated', this.handleQueueUpdate);
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
