/**
 * Queue Types
 * Type definitions for the batch audit queue feature
 */

export interface QueuedAuditDisplayData {
  employeeName: string;
  employeeEmail: string;
  interactionId: string;
  channel: string;
  averageScore: number | null;
  passingStatus: string;
  totalErrorsCount: number;
}

export interface QueuedAudit {
  queueId: string;
  queuedAt: string;
  scorecardTableName: string;
  scorecardName: string;
  scorecardId: string;
  payload: Record<string, any>;
  displayData: QueuedAuditDisplayData;
}

export interface BatchItemResult {
  queueId: string;
  displayData: QueuedAuditDisplayData;
  scorecardName: string;
  success: boolean;
  error?: string;
  savedAudit?: any;
}

export interface BatchSubmissionResult {
  results: BatchItemResult[];
  successCount: number;
  failureCount: number;
  totalCount: number;
}
