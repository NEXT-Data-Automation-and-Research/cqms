/**
 * Audit Queue Service
 * Manages a client-side queue of audits in sessionStorage for batch submission
 */

import type { AuditFormService } from './audit-form-service.js';
import type {
  QueuedAudit,
  QueuedAuditDisplayData,
  BatchSubmissionResult,
  BatchItemResult
} from '../domain/queue-types.js';

export class AuditQueueService {
  private static STORAGE_KEY = 'cqms_audit_queue';
  private static RESULTS_KEY = 'cqms_batch_results';

  /**
   * Get all queued audits from sessionStorage
   */
  getQueue(): QueuedAudit[] {
    try {
      const raw = sessionStorage.getItem(AuditQueueService.STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Add a prepared audit to the queue
   */
  addToQueue(item: {
    scorecardTableName: string;
    scorecardName: string;
    scorecardId: string;
    payload: Record<string, any>;
    displayData: QueuedAuditDisplayData;
  }): QueuedAudit {
    const queue = this.getQueue();
    const queuedAudit: QueuedAudit = {
      queueId: this.generateId(),
      queuedAt: new Date().toISOString(),
      ...item
    };
    queue.push(queuedAudit);
    this.saveQueue(queue);
    return queuedAudit;
  }

  /**
   * Remove a single item from the queue by queueId
   */
  removeFromQueue(queueId: string): void {
    const queue = this.getQueue().filter(item => item.queueId !== queueId);
    this.saveQueue(queue);
  }

  /**
   * Clear the entire queue
   */
  clearQueue(): void {
    sessionStorage.removeItem(AuditQueueService.STORAGE_KEY);
  }

  /**
   * Get the number of items in the queue
   */
  getQueueCount(): number {
    return this.getQueue().length;
  }

  /**
   * Submit all queued audits to the database sequentially.
   * Successfully saved items are removed from the queue.
   * Failed items remain in the queue for retry.
   * Returns a BatchSubmissionResult.
   */
  async submitAll(service: AuditFormService): Promise<BatchSubmissionResult> {
    const queue = this.getQueue();
    const results: BatchItemResult[] = [];

    for (const item of queue) {
      try {
        const savedAudit = await service.saveAudit(item.scorecardTableName, item.payload);
        results.push({
          queueId: item.queueId,
          displayData: item.displayData,
          scorecardName: item.scorecardName,
          success: true,
          savedAudit
        });
      } catch (error: any) {
        results.push({
          queueId: item.queueId,
          displayData: item.displayData,
          scorecardName: item.scorecardName,
          success: false,
          error: error?.message || 'Unknown error'
        });
      }
    }

    // Keep only failed items in the queue
    const failedIds = new Set(results.filter(r => !r.success).map(r => r.queueId));
    if (failedIds.size === 0) {
      this.clearQueue();
    } else {
      const remaining = queue.filter(q => failedIds.has(q.queueId));
      this.saveQueue(remaining);
    }

    const result: BatchSubmissionResult = {
      results,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      totalCount: results.length
    };

    // Store results for the summary page
    this.storeResults(result);

    return result;
  }

  /**
   * Store batch results in sessionStorage for the summary page
   */
  storeResults(result: BatchSubmissionResult): void {
    sessionStorage.setItem(AuditQueueService.RESULTS_KEY, JSON.stringify(result));
  }

  /**
   * Read batch results from sessionStorage (used by summary page)
   */
  static getResults(): BatchSubmissionResult | null {
    try {
      const raw = sessionStorage.getItem(AuditQueueService.RESULTS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear stored batch results
   */
  static clearResults(): void {
    sessionStorage.removeItem(AuditQueueService.RESULTS_KEY);
  }

  private saveQueue(queue: QueuedAudit[]): void {
    sessionStorage.setItem(AuditQueueService.STORAGE_KEY, JSON.stringify(queue));
  }

  private generateId(): string {
    return Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
  }
}
