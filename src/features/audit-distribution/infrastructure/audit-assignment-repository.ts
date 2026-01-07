/**
 * Audit Assignment Repository
 * Handles database operations for audit assignments
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { AUDIT_ASSIGNMENT_FIELDS } from '../../../core/constants/field-whitelists.js';
import type { AuditAssignment } from '../domain/types.js';

interface AuditAssignmentRow {
  id: string;
  employee_email: string | null;
  employee_name: string | null;
  auditor_email: string | null;
  scorecard_id: string | null;
  status: string | null;
  scheduled_date: string | null;
  week: number | null;
  created_at: string | null;
  assigned_by: string | null;
  completed_at: string | null;
  audit_id: string | null;
}

interface CreateAssignmentData {
  employee_email: string;
  employee_name: string;
  auditor_email: string;
  scorecard_id: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_date: string | null;
  week: number | null;
  assigned_by: string;
}

export class AuditAssignmentRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'audit_assignments');
  }

  /**
   * Create multiple audit assignments
   */
  async createAssignments(assignments: CreateAssignmentData[]): Promise<AuditAssignment[]> {
    const result = await this.executeQuery<AuditAssignmentRow[]>(
      async () => {
        // Generate IDs for assignments if not provided
        const assignmentsWithIds = assignments.map(assignment => ({
          ...assignment,
          id: crypto.randomUUID()
        }));

        return await this.db
          .from(this.getTableName())
          .insert(assignmentsWithIds)
          .select(AUDIT_ASSIGNMENT_FIELDS)
          .execute<AuditAssignmentRow[]>();
      },
      'Failed to create audit assignments'
    );

    return this.mapToAssignments(Array.isArray(result) ? result : []);
  }

  /**
   * Find assignments by employee email
   */
  async findByEmployeeEmail(email: string): Promise<AuditAssignment[]> {
    return this.getCachedOrFetch(
      `assignments_employee_${email}`,
      async () => {
        const result = await this.executeQuery<AuditAssignmentRow[]>(
          async () => {
            return await this.db
              .from(this.getTableName())
              .select(AUDIT_ASSIGNMENT_FIELDS)
              .eq('employee_email', email)
              .execute<AuditAssignmentRow[]>();
          },
          `Failed to find assignments for employee ${email}`
        );

        return this.mapToAssignments(Array.isArray(result) ? result : []);
      },
      60000 // 1 minute cache
    );
  }

  /**
   * Find assignments by auditor email
   */
  async findByAuditorEmail(email: string): Promise<AuditAssignment[]> {
    return this.getCachedOrFetch(
      `assignments_auditor_${email}`,
      async () => {
        const result = await this.executeQuery<AuditAssignmentRow[]>(
          async () => {
            return await this.db
              .from(this.getTableName())
              .select(AUDIT_ASSIGNMENT_FIELDS)
              .eq('auditor_email', email)
              .execute<AuditAssignmentRow[]>();
          },
          `Failed to find assignments for auditor ${email}`
        );

        return this.mapToAssignments(Array.isArray(result) ? result : []);
      },
      60000 // 1 minute cache
    );
  }

  /**
   * Find all assignments
   */
  async findAll(): Promise<AuditAssignment[]> {
    return this.getCachedOrFetch(
      'all_assignments',
      async () => {
        const result = await this.executeQuery<AuditAssignmentRow[]>(
          async () => {
            return await this.db
              .from(this.getTableName())
              .select(AUDIT_ASSIGNMENT_FIELDS)
              .execute<AuditAssignmentRow[]>();
          },
          'Failed to find all assignments'
        );

        return this.mapToAssignments(Array.isArray(result) ? result : []);
      },
      60000 // 1 minute cache
    );
  }

  /**
   * Map database rows to AuditAssignment entities
   */
  private mapToAssignments(rows: AuditAssignmentRow[]): AuditAssignment[] {
    return rows
      .filter(row => row.id && row.employee_email && row.auditor_email)
      .map(row => ({
        id: row.id,
        employee_email: row.employee_email!,
        employee_name: row.employee_name || '',
        auditor_email: row.auditor_email!,
        scorecard_id: row.scorecard_id,
        status: (row.status || 'pending') as AuditAssignment['status'],
        scheduled_date: row.scheduled_date,
        week: row.week,
        created_at: row.created_at || new Date().toISOString(),
        assigned_by: row.assigned_by || ''
      }));
  }

  /**
   * Invalidate cache for assignments
   */
  invalidateAssignmentsCache(): void {
    this.invalidateCache('all_assignments');
  }

  /**
   * Invalidate cache for specific employee
   */
  invalidateEmployeeCache(email: string): void {
    this.invalidateCache(`assignments_employee_${email}`);
  }

  /**
   * Invalidate cache for specific auditor
   */
  invalidateAuditorCache(email: string): void {
    this.invalidateCache(`assignments_auditor_${email}`);
  }
}

