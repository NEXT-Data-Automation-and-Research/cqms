/**
 * Type definitions for home dashboard
 */

export interface User {
  email?: string;
  name?: string;
  role?: string;
  channel?: string;
  team?: string;
  team_supervisor?: string;
  quality_mentor?: boolean;
  employee_id?: string;
  intercom_admin_alias?: string;
  [key: string]: unknown;
}

export interface Assignment {
  id?: string;
  employee_email?: string;
  employee_name?: string;
  auditor_email?: string;
  status?: string;
  created_at?: string;
  scheduled_date?: string;
  channel?: string;
  scorecard_id?: string;
  scorecards?: {
    id?: string;
    name?: string;
    table_name?: string;
  };
  [key: string]: unknown;
}

export interface Audit {
  id?: string;
  employee_email?: string;
  employee_name?: string;
  auditor_email?: string;
  auditor_name?: string;
  status?: string;
  passing_status?: string;
  passingStatus?: string;
  average_score?: number | string;
  averageScore?: number | string;
  total_errors_count?: number | string;
  totalErrorsCount?: number | string;
  interaction_id?: string;
  channel?: string;
  submitted_at?: string;
  created_at?: string;
  reversal_requested_at?: string;
  reversalRequestedAt?: string;
  reversal_responded_at?: string;
  reversalRespondedAt?: string;
  reversal_approved?: boolean | string | number | null;
  acknowledgement_status?: string;
  acknowledgementStatus?: string;
  audit_duration?: number | string;
  _scorecard_id?: string;
  _scorecard_name?: string;
  _scorecard_table?: string;
  _scoring_type?: string;
  _isAssignment?: boolean;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  type: string;
  title?: string;
  message?: string;
  timestamp?: string;
  status?: string;
  assignmentId?: string;
  auditId?: string;
  tableName?: string;
  scorecardId?: string;
  scorecardTable?: string;
  interactionId?: string;
  displayName?: string | null;
  displayEmail?: string | null;
  statusText?: string;
  [key: string]: unknown;
}

export interface Update {
  id: string;
  type: string;
  timestamp?: string;
  status?: string;
  assignmentId?: string;
  auditId?: string;
  scorecardId?: string;
  scorecardTable?: string;
  interactionId?: string;
  displayName?: string | null;
  displayEmail?: string | null;
  statusText?: string;
  [key: string]: unknown;
}

export interface DateFilter {
  start: Date | null;
  end: Date | null;
}

export interface Filters {
  channel: string;
  status: string;
  agent: string;
}

export interface PeriodDates {
  start: Date;
  end: Date;
}

export interface StatsData {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  remaining: number;
  percentage: number;
  daysRemaining: number;
  avgDuration: number;
  avgDurationText: string;
  totalAuditsConducted: number;
  totalScoreSum: number;
  totalAuditsWithScore: number;
  avgQualityScore: number;
  avgQualityScoreText: string;
  passingCount: number;
  notPassingCount: number;
  activeReversals: number;
  resolvedReversals: number;
  totalReversals: number;
  requiresAcknowledgment: number;
}

export interface FiltersData {
  channels: string[];
  agents: string[];
}

export interface Scorecard {
  id?: string;
  name?: string;
  table_name?: string;
  scoring_type?: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export interface Event {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  type?: string;
  meet_link?: string;
  created_by?: string;
  participants?: string[] | string;
  [key: string]: unknown;
}
