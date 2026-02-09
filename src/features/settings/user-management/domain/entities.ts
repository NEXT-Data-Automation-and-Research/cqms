/**
 * Domain Entities
 * User management domain entities and interfaces
 */

export interface User {
  email: string;
  name: string;
  role: string;
  department: string | null;
  channel: string | null;
  team: string | null;
  designation: string | null;
  employee_id: string | null;
  country: string | null;
  team_supervisor: string | null;
  quality_mentor: string | null;
  is_active: boolean;
  intercom_admin_id: string | null;
  intercom_admin_alias: string | null;
  last_login: string | null;
  login_count: number;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  password_hash?: string | null; // Unused: auth is Google OAuth only; kept for legacy schema compatibility
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
}

export interface IntercomAdmin {
  id: string; // Stored as bigint in DB, converted to string
  email: string;
  name: string;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  superAdmins: number;
  admins: number;
  qualityAnalysts: number;
  employees: number;
  recentLogins: number;
  qptUsers: number;
  cexUsers: number;
}

export interface UserFilters {
  search: string;
  role: string;
  department: string;
  status: string;
}

export interface BulkEditData {
  team?: string;
  department?: string;
  channel?: string;
  teamSupervisor?: string;
  qualitySupervisor?: string;
  role?: string;
}

