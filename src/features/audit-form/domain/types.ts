/**
 * Audit Form Domain Types
 * Type definitions for audit form feature
 */

import type { AuditFormData, ScorecardParameter, Scorecard } from './entities.js';

export type AuditFormMode = 'edit' | 'view';

export interface AuditFormOptions {
  audit?: Partial<AuditFormData>;
  mode?: AuditFormMode;
  headerTitle?: string;
  headerGradient?: string;
  headerActions?: string;
  interactionIdHtml?: string;
  errorDetailsHtml?: string;
  recommendationsHtml?: string;
  ratingHtml?: string;
  actionButtonsHtml?: string;
  showAuditorName?: boolean;
}

export interface HeaderOptions {
  title?: string;
  headerGradient?: string;
  audit?: Partial<AuditFormData>;
  mode?: AuditFormMode;
  headerActions?: string;
  showAuditorName?: boolean;
}

export interface TranscriptOptions {
  audit?: Partial<AuditFormData>;
  mode?: AuditFormMode;
  interactionIdHtml?: string;
}

export interface ErrorCounts {
  total: number;
  criticalFail: number;
  critical: number;
  significant: number;
  major: number;
  minor: number;
}

export interface ParameterValue {
  parameterId: string;
  value: number;
  feedback?: string[];
  comment?: string;
}

export interface AuditFormState {
  currentScorecard: Scorecard | null;
  currentParameters: ScorecardParameter[];
  parameterValues: Map<string, ParameterValue>;
  errorCounts: ErrorCounts;
  averageScore: number;
  passingStatus: string;
  isDirty: boolean;
}

