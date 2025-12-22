/**
 * Domain Entities for Auditor Dashboard
 * Pure domain models without infrastructure dependencies
 */

export interface Auditor {
  email: string;
  name: string;
  role: string;
  channel?: string;
  isCurrentUser?: boolean;
  isOnline?: boolean;
}

export interface AuditorStats {
  name: string;
  email: string;
  assigned: number;
  completed: number;
  remaining: number;
  percentage: number;
  avgDuration: string;
  backlogCovered: number;
  backlogDates: string[];
  earlyCovered: number;
  earlyDates: string[];
  isCurrentUser: boolean;
}

export interface TeamStats {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  remaining: number;
  percentage: number;
  avgDurationText: string;
  avgDurationSubtitle: string;
  teamReversalCount: number;
  teamPassingRate: number;
  teamPassingCount: number;
  teamNotPassingCount: number;
  totalBacklogCount: number;
  totalEarlyCount: number;
  auditorStats: AuditorStats[];
  auditorsCount: number;
}

export interface ChannelStats {
  assigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  remaining: number;
  percentage: number;
}

export interface StandupViewData {
  totalAssigned: number;
  completed: number;
  percentage: number;
  coveragePercent: number;
  passingRate: number;
  passingCount: number;
  notPassingCount: number;
  standupReversalCount: number;
  channelStats: Record<string, ChannelStats>;
}

export interface HourlyBreakdown {
  hour: string;
  total: number;
  byAuditor: Record<string, number>;
  target?: number;
  targetMet?: boolean;
  isLunchBreak?: boolean;
}

export interface DynamicHourlyTarget {
  hour: string;
  target: number;
  deficiency?: number;
  isPastHour?: boolean;
}

export interface PeriodDates {
  start: Date | null;
  end: Date | null;
}

export interface Filters {
  status: string;
  channel: string;
  auditor: string;
  employee: string;
  scorecard: string;
}

export interface Scorecard {
  id: string;
  name: string;
  table_name: string;
  is_active: boolean;
}

export interface Assignment {
  id: string;
  employee_email: string;
  auditor_email: string;
  status: 'pending' | 'in_progress' | 'completed';
  created_at: string;
  scheduled_date?: string;
  completed_at?: string;
  scorecard_id?: string;
  channel?: string;
}

export interface AuditData {
  id: string;
  auditor_email?: string;
  employee_email?: string;
  submitted_at: string;
  audit_duration?: number | string;
  passing_status?: string;
  reversal_requested_at?: string;
}

