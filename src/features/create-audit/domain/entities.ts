/**
 * Create Audit Domain Entities
 */

export interface Employee {
  id: string;
  name: string;
  email: string;
  type: string;
  department: string;
}

export interface Interaction {
  id: string;
  date: string;
  channel: string;
  clientEmail: string;
  status?: string;
}

export interface Scorecard {
  id: string;
  name: string;
  scoringType: 'percentage' | 'points';
  parameters: ScorecardParameter[];
}

export interface ScorecardParameter {
  id: string;
  name: string;
  type: 'counter' | 'radio' | 'feedback';
  weight?: number;
  options?: string[];
}

export interface AuditFormData {
  employee: Employee | null;
  interaction: Interaction | null;
  scorecard: Scorecard | null;
  parameters: ParameterValue[];
  transcript: string;
  recommendations: string;
}

export interface ParameterValue {
  parameterId: string;
  value: number | string;
  feedback?: string;
}

export interface PendingAudit {
  id: string;
  employeeName: string;
  employeeEmail: string;
  interactionId: string;
  interactionDate: string;
  scorecardName: string;
  status: 'pending' | 'in-progress' | 'completed';
}

export interface Conversation {
  id: string;
  clientName: string;
  clientEmail: string;
  subject: string;
  csatRating?: number;
  cxScore?: number;
  length: number;
  errorsDetected?: number;
  tags: string[];
  created: string;
  aiStatus?: 'processing' | 'completed' | 'failed';
}

export interface AuditStats {
  auditsConducted: number;
  avgQualityScore: number;
  remaining: number;
  passRate?: number;
  requiresAcknowledgment?: number;
  reversalTotal: number;
  reversalActive: number;
  reversalResolved: number;
  inProgress: number;
  daysRemaining?: string;
  avgDuration: string;
}

