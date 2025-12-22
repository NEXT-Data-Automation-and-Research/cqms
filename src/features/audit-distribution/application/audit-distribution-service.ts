/**
 * Audit Distribution Service
 * Business logic for audit distribution feature
 */

import { AuditDistributionDummyData } from '../infrastructure/audit-distribution-dummy-data.js';
import type {
  Employee,
  Auditor,
  Scorecard,
  AuditAssignment,
  AgentSummary,
  EmployeeAuditStats
} from '../domain/types.js';

export class AuditDistributionService {
  /**
   * Load all employees
   */
  async loadEmployees(): Promise<Employee[]> {
    // TODO: Replace with actual repository call
    return AuditDistributionDummyData.getDummyEmployees();
  }

  /**
   * Load quality analysts
   */
  async loadQualityAnalysts(): Promise<Auditor[]> {
    // TODO: Replace with actual repository call
    return AuditDistributionDummyData.getDummyAuditors()
      .filter(a => a.role === 'Quality Analyst');
  }

  /**
   * Load other auditors (Admin, Super Admin, Quality Supervisor)
   */
  async loadOtherAuditors(): Promise<Auditor[]> {
    // TODO: Replace with actual repository call
    return AuditDistributionDummyData.getDummyAuditors()
      .filter(a => ['Admin', 'Super Admin', 'Quality Supervisor'].includes(a.role));
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
    // TODO: Replace with actual repository call
    return AuditDistributionDummyData.getDummyAssignments();
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
}
