/**
 * Audit Distribution Service
 * Business logic for audit distribution feature
 */

import { BaseService } from '../../../core/service/base-service.js';
import { createValidationError } from '../../../core/errors/app-error.js';
import { PeopleRepository } from '../infrastructure/people-repository.js';
import { AuditAssignmentRepository } from '../infrastructure/audit-assignment-repository.js';
import { AuditDistributionDummyData } from '../infrastructure/audit-distribution-dummy-data.js';
import { logWarn } from '../../../utils/logging-helper.js';
import type {
  Employee,
  Auditor,
  Scorecard,
  AuditAssignment,
  AgentSummary,
  EmployeeAuditStats
} from '../domain/types.js';

export interface BulkAssignmentRequest {
  employeeEmails: string[];
  auditorEmails: string[];
  auditsPerEmployee: number;
  scorecardId: string | null;
  scheduledDate: Date | null;
  assignedBy: string;
}

export class AuditDistributionService extends BaseService {
  constructor(
    private peopleRepository: PeopleRepository,
    private assignmentRepository: AuditAssignmentRepository
  ) {
    super();
  }

  /**
   * Load all employees (team members excluding Quality Analysts)
   */
  async loadEmployees(): Promise<Employee[]> {
    return this.executeBusinessLogic(
      async () => {
        return await this.peopleRepository.findTeamMembers();
      },
      'Failed to load employees'
    );
  }

  /**
   * Load quality analysts
   */
  async loadQualityAnalysts(): Promise<Auditor[]> {
    return this.executeBusinessLogic(
      async () => {
        return await this.peopleRepository.findQualityAnalysts();
      },
      'Failed to load quality analysts'
    );
  }

  /**
   * Load other auditors (Admin, Super Admin, Quality Supervisor)
   * Note: Currently returns empty array as we only show Quality Analysts as auditors
   * and team members separately. This can be extended if needed.
   */
  async loadOtherAuditors(): Promise<Auditor[]> {
    // Return empty array - we only use Quality Analysts as auditors
    // Team members are shown separately
    return [];
  }

  /**
   * Load all scorecards
   */
  async loadScorecards(): Promise<Scorecard[]> {
    // TODO: Replace with actual repository call
    return AuditDistributionDummyData.getDummyScorecards();
  }

  /**
   * Load audit assignments
   */
  async loadAssignments(): Promise<AuditAssignment[]> {
    return this.executeBusinessLogic(
      async () => {
        return await this.assignmentRepository.findAll();
      },
      'Failed to load audit assignments'
    );
  }

  /**
   * Load agent summaries
   */
  async loadAgentSummaries(): Promise<AgentSummary[]> {
    // TODO: Replace with actual repository call
    return AuditDistributionDummyData.getDummyAgentSummaries();
  }

  /**
   * Get applicable scorecards for an employee based on their channel
   */
  getApplicableScorecards(employee: Employee, scorecards: Scorecard[]): Scorecard[] {
    if (!employee.channel) {
      return [];
    }

    return scorecards.filter(scorecard => {
      if (!scorecard.channels) return false;
      const scorecardChannels = scorecard.channels.split(',').map(c => c.trim());
      return scorecardChannels.includes(employee.channel!);
    });
  }

  /**
   * Calculate audit stats for an employee
   */
  getEmployeeAuditStats(
    employeeEmail: string,
    assignments: AuditAssignment[]
  ): EmployeeAuditStats {
    const assigned = assignments.filter(a =>
      a.employee_email === employeeEmail && a.status !== 'cancelled'
    ).length;

    // TODO: Calculate completed from actual audit tables
    const completed = assignments.filter(a =>
      a.employee_email === employeeEmail && a.status === 'completed'
    ).length;

    return { assigned, completed };
  }

  /**
   * Distribute audits evenly among selected auditors
   */
  distributeAudits(
    employeeCount: number,
    auditsPerEmployee: number,
    auditorCount: number
  ): number {
    if (auditorCount === 0) return 0;
    const totalAudits = employeeCount * auditsPerEmployee;
    return Math.ceil(totalAudits / auditorCount);
  }

  /**
   * Calculate week number from date
   */
  getWeekNumber(date: Date): number {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const dayOfWeek = startOfYear.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayOfWeek1 = new Date(startOfYear);
    mondayOfWeek1.setDate(startOfYear.getDate() + daysToMonday);
    mondayOfWeek1.setHours(0, 0, 0, 0);

    const dateDay = date.getDay();
    const dateDaysToMonday = dateDay === 0 ? -6 : 1 - dateDay;
    const mondayOfDateWeek = new Date(date);
    mondayOfDateWeek.setDate(date.getDate() + dateDaysToMonday);
    mondayOfDateWeek.setHours(0, 0, 0, 0);

    const daysSinceWeek1 = Math.floor(
      (mondayOfDateWeek.getTime() - mondayOfWeek1.getTime()) / (24 * 60 * 60 * 1000)
    );

    return Math.floor(daysSinceWeek1 / 7) + 1;
  }

  /**
   * Create bulk audit assignments
   * Distributes audits evenly among selected auditors using round-robin
   */
  async createBulkAssignments(request: BulkAssignmentRequest): Promise<AuditAssignment[]> {
    return this.executeBusinessLogic(
      async () => {
        const { employeeEmails, auditorEmails, auditsPerEmployee, scorecardId, scheduledDate, assignedBy } = request;

        if (employeeEmails.length === 0) {
          throw createValidationError('At least one employee must be selected');
        }

        if (auditorEmails.length === 0) {
          throw createValidationError('At least one auditor must be selected');
        }

        if (auditsPerEmployee <= 0) {
          throw createValidationError('Audits per employee must be greater than 0');
        }

        // Get employee details
        const employees = await this.loadEmployees();
        const employeeMap = new Map(employees.map(e => [e.email, e]));

        // Create all audit assignments
        const assignmentsToCreate: Array<{
          employee_email: string;
          employee_name: string;
          auditor_email: string;
          scorecard_id: string | null;
          status: 'pending';
          scheduled_date: string | null;
          week: number | null;
          assigned_by: string;
        }> = [];

        // Determine scheduled date and week
        const scheduledDateStr = scheduledDate 
          ? scheduledDate.toISOString().split('T')[0] 
          : new Date().toISOString().split('T')[0];
        const dateForWeek = scheduledDate || new Date();
        const week = this.getWeekNumber(dateForWeek);

        // Create assignments for each employee
        employeeEmails.forEach(employeeEmail => {
          const employee = employeeMap.get(employeeEmail);
          if (!employee) {
            logWarn(`Employee not found: ${employeeEmail}`);
            return;
          }

          // Create auditsPerEmployee assignments for this employee
          for (let i = 0; i < auditsPerEmployee; i++) {
            // Round-robin: cycle through auditors
            const auditorIndex = assignmentsToCreate.length % auditorEmails.length;
            const auditorEmail = auditorEmails[auditorIndex];

            assignmentsToCreate.push({
              employee_email: employee.email,
              employee_name: employee.name,
              auditor_email: auditorEmail,
              scorecard_id: scorecardId,
              status: 'pending',
              scheduled_date: scheduledDateStr,
              week: week,
              assigned_by: assignedBy
            });
          }
        });

        // Create assignments in database
        const createdAssignments = await this.assignmentRepository.createAssignments(assignmentsToCreate);

        // Invalidate caches
        employeeEmails.forEach(email => {
          this.assignmentRepository.invalidateEmployeeCache(email);
        });
        auditorEmails.forEach(email => {
          this.assignmentRepository.invalidateAuditorCache(email);
        });
        this.assignmentRepository.invalidateAssignmentsCache();

        return createdAssignments;
      },
      'Failed to create bulk audit assignments'
    );
  }
}
