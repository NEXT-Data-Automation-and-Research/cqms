/**
 * Audit Reports Domain Entities
 * Core domain entities for audit reports feature
 */

export interface AuditReport {
  id: string;
  employeeEmail: string;
  employeeName: string;
  auditorEmail: string;
  auditorName?: string;
  interactionId: string;
  interactionDate?: string;
  auditType?: string;
  channel?: string;
  channelName?: string;
  quarter?: string;
  week?: number;
  countryOfEmployee?: string;
  clientEmail?: string;
  employeeType?: string;
  agentPreStatus?: string;
  agentPostStatus?: string;
  passingStatus: string;
  validationStatus?: string;
  averageScore?: number | string;
  criticalErrors?: number | string;
  totalErrorsCount?: number | string;
  transcript?: string;
  errorDescription?: string;
  criticalFailError?: number | string;
  criticalError?: number | string;
  significantError?: number | string;
  recommendations?: string;
  reversalRequestedAt?: string;
  reversalRespondedAt?: string;
  reversalApproved?: boolean | string | number | null;
  acknowledgementStatus?: string;
  acknowledgementStatusUpdatedAt?: string;
  auditDuration?: number | string;
  submittedAt?: string;
  auditTimestamp?: string;
  auditStartTime?: string;
  auditEndTime?: string;
  created_at?: string;
  // Scorecard metadata
  _scorecard_id?: string;
  _scorecard_name?: string;
  _scorecard_table?: string;
  _scoring_type?: string;
  // Dynamic parameter fields (will vary by scorecard)
  [key: string]: unknown;
}

export interface AuditStats {
  total: number;
  totalScores: number;
  auditsWithScores: number;
  avgScore: number;
  passing: number;
  passRate: number;
  totalCriticalErrors: number;
  totalErrors: number;
  criticalErrorRate: number;
  avgErrorsPerAudit: number;
  reversals: number;
  reversalRate: number;
  acknowledged: number;
  pendingAcknowledgments: number;
  notPassing: number;
}

export interface AuditFilters {
  auditorNames?: string[];
  employeeNames?: string[];
  auditTypes?: string[];
  statuses?: string[];
  quarters?: string[];
  channels?: string[];
  employeeTypes?: string[];
  countries?: string[];
  validationStatuses?: string[];
  acknowledgementStatuses?: string[];
  agentPreStatuses?: string[];
  agentPostStatuses?: string[];
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  auditId?: string;
  interactionId?: string;
  week?: number;
  minScore?: number;
  maxScore?: number;
  minErrors?: number;
  maxErrors?: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}

