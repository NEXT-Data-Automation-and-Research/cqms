/**
 * Audit Form Domain Types
 * Type definitions for audit form feature
 */

import type { AuditFormData, ScorecardParameter, Scorecard } from './entities.js';

/**
 * Audit form mode
 * - 'create': New audit with empty form
 * - 'edit': Editing an existing audit (pre-populated, editable)
 * - 'view': Read-only view of an existing audit
 */
export type AuditFormMode = 'create' | 'edit' | 'view';

/**
 * Check if mode allows editing
 */
export function isEditableMode(mode: AuditFormMode): boolean {
  return mode === 'create' || mode === 'edit';
}

/**
 * Get default header title for mode
 */
export function getDefaultHeaderTitle(mode: AuditFormMode): string {
  switch (mode) {
    case 'create': return 'Create New Audit';
    case 'edit': return 'Edit Audit';
    case 'view': return 'Audit Details';
    default: return 'Audit';
  }
}

/**
 * Get header gradient color for mode/status
 */
export function getHeaderGradient(mode: AuditFormMode, passingStatus?: string): string {
  // In view mode, color based on passing status
  if (mode === 'view' && passingStatus) {
    if (passingStatus.toUpperCase() === 'FAIL') {
      return 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)';
    }
  }
  // Default green gradient
  return 'linear-gradient(135deg, #1A733E 0%, #2d9a5a 100%)';
}

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

