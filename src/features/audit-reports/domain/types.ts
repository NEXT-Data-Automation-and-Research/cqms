/**
 * Audit Reports Domain Types
 * Type definitions for audit reports feature
 */

import type { AuditReport, AuditStats, AuditFilters, DateRange, PaginationState } from './entities.js';

export type AuditReportList = AuditReport[];

export type ScorecardId = string | null;

export type FilterType = 
  | 'total'
  | 'avgScore'
  | 'passed'
  | 'critical'
  | 'errors'
  | 'reversal'
  | 'acknowledgment'
  | 'notPassed';

export interface AuditReportsState {
  audits: AuditReport[];
  filteredAudits: AuditReport[];
  stats: AuditStats;
  filters: AuditFilters;
  dateRange: DateRange | null;
  currentScorecardId: ScorecardId;
  pagination: PaginationState;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

export interface ExportOptions {
  format: 'csv' | 'json';
  includeFilters: boolean;
}

export interface KPICardData {
  value: string | number;
  change: string;
  trend: number[];
  date?: string;
}

