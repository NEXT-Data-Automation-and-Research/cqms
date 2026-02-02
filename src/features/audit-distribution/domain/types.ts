/**
 * Audit Distribution Domain Types
 */

export interface Employee {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  channel: string | null;
  team: string | null;
  department: string | null;
  country: string | null;
  designation: string | null;
  quality_mentor: string | null;
  team_supervisor: string | null;
  is_active: boolean;
}

export interface Auditor {
  id: string;
  email: string;
  name: string;
  role: 'Quality Analyst' | 'Admin' | 'Super Admin' | 'Quality Supervisor' | 'Auditor' | 'Manager';
  is_active: boolean;
}

export interface Scorecard {
  id: string;
  name: string;
  table_name: string;
  channels: string | null;
  is_active: boolean;
}

export interface AuditAssignment {
  id: string;
  employee_email: string;
  employee_name: string;
  auditor_email: string;
  scorecard_id: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string | null;
  week: number | null;
  created_at: string;
  assigned_by: string;
  scorecard?: Scorecard;
}

export interface EmployeeAuditStats {
  assigned: number;
  completed: number;
}

export interface AgentSummary {
  email: string;
  name: string;
  channel: string;
  target: number;
  totalAudits: number;
  completedAudits: number;
  auditorBreakdown: Map<string, { name: string; count: number }>;
}

export interface FilterOptions {
  /** Single value (legacy) or array for multi-select (same as audit reports) */
  channel?: string | string[];
  team?: string | string[];
  department?: string | string[];
  country?: string | string[];
  qualitySupervisor?: string;
  teamSupervisor?: string;
  search?: string;
  role?: string | string[];
  is_active?: 'all' | 'active' | 'inactive';
  groupBy?: 'none' | 'channel' | 'team' | 'quality_mentor' | 'team_supervisor' | 'department' | 'country';
}

/** Normalize a filter value to an array (empty = no filter) */
export function filterValuesToArray(value: string | string[] | undefined): string[] {
  if (value == null) return [];
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

/** Get single value for UIs that only support one selection (e.g. legacy dropdowns) */
export function getFirstFilterValue(value: string | string[] | undefined): string {
  const arr = filterValuesToArray(value);
  return arr[0] ?? '';
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}
