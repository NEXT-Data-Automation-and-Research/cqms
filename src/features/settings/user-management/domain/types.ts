/**
 * Domain Types
 * Type definitions for user management feature
 */

import type { User, UserStatistics, UserFilters, BulkEditData } from './entities.js';

export type UserRole = 'Super Admin' | 'Admin' | 'Quality Analyst' | 'Employee' | 'General User';

export type UserStatus = 'active' | 'inactive';

export interface CreateUserData {
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  channel?: string;
  team?: string;
  team_supervisor?: string;
  quality_mentor?: string;
  designation?: string;
  employee_id?: string;
  country?: string;
  is_active: boolean;
  intercom_admin_id?: string;
  intercom_admin_alias?: string;
}

export interface UpdateUserData {
  name?: string;
  role?: UserRole;
  department?: string | null | undefined;
  channel?: string | null | undefined;
  team?: string | null | undefined;
  team_supervisor?: string | null | undefined;
  quality_mentor?: string | null | undefined;
  designation?: string | null | undefined;
  employee_id?: string | null | undefined;
  country?: string | null | undefined;
  is_active?: boolean;
  intercom_admin_id?: string | null | undefined;
  intercom_admin_alias?: string | null | undefined;
}

export interface CSVUserRow {
  Name: string;
  Email: string;
  Role: string;
  Department?: string;
  Channel?: string;
  Team?: string;
  Designation?: string;
  'Employee ID'?: string;
  Country?: string;
  'Team Supervisor'?: string;
  'Quality Mentor'?: string;
  Status?: string;
}

export interface BulkUploadResult {
  success: number;
  failed: number;
  errors: string[];
}

export type { User, UserStatistics, UserFilters, BulkEditData };

