/**
 * Performance Analytics domain types
 */

export interface AuditRow {
  employee_email: string | null;
  employee_name: string | null;
  average_score: number | null;
  passing_status: string | null;
  total_errors_count: number | null;
  critical_errors?: number | string | null;
  significant_error?: number | string | null;
  submitted_at: string | null;
  week: number | null;
  channel: string | null;
  [key: string]: unknown;
}

export interface PersonRow {
  email: string | null;
  name: string | null;
  role: string | null;
  department: string | null;
  designation: string | null;
  team: string | null;
  team_supervisor: string | null;
  quality_mentor: string | null;
  channel: string | null;
  is_active: boolean | null;
}

export interface AggregationBucket {
  key: string;
  label: string;
  count: number;
  avgScore: number;
  passCount: number;
  totalCount: number;
  passRate: number;
  totalErrors: number;
}

export interface ErrorBucket {
  name: string;
  count: number;
  category?: string;
}

export interface PerformanceFilters {
  startDate?: string;
  endDate?: string;
  channel?: string;
  scorecardTable?: string;
}

export interface PerformanceAnalyticsData {
  isSuperAdmin: boolean;
  userEmail: string | null;
  userRole: string | null;
  byIndividual: AggregationBucket[];
  byTeam: AggregationBucket[];
  byRole: AggregationBucket[];
  byDesignation: AggregationBucket[];
  bySupervisor: AggregationBucket[];
  byQualityMentor: AggregationBucket[];
  errorBreakdown: ErrorBucket[];
  scoreTrend: { period: string; avgScore: number; count: number; passRate: number }[];
  rawAudits: AuditRow[];
  people: PersonRow[];
}
