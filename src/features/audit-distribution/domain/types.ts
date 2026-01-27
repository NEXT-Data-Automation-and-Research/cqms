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
  channel?: string;
  team?: string;
  department?: string;
  country?: string;
  qualitySupervisor?: string;
  teamSupervisor?: string;
  search?: string;
  groupBy?: 'none' | 'channel' | 'team' | 'quality_mentor' | 'team_supervisor' | 'department' | 'country';
}

export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}
