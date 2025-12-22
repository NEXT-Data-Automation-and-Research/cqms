/**
 * Application Layer - Auditor Dashboard Service
 * Business logic for calculating stats and processing data
 */

import { AuditorDashboardRepository } from '../infrastructure/auditor-dashboard-repository.js';
import { AuditorDashboardState } from './auditor-dashboard-state.js';
import type {
  Auditor,
  AuditorStats,
  TeamStats,
  StandupViewData,
  HourlyBreakdown
} from '../domain/entities.js';

export class AuditorDashboardService {
  private repository: AuditorDashboardRepository;
  private state: AuditorDashboardState;

  constructor(
    repository: AuditorDashboardRepository,
    state: AuditorDashboardState
  ) {
    this.repository = repository;
    this.state = state;
  }

  /**
   * Calculate team stats from assignments and audit data
   */
  async calculateTeamStats(): Promise<TeamStats> {
    const period = this.state.getCurrentPeriodDates();
    const { scheduled, completed } = await this.repository.loadTeamAssignments(period);

    // Get unique auditor emails
    const auditorEmails = [...new Set([
      ...scheduled.map(a => a.auditor_email),
      ...completed.map(a => a.auditor_email)
    ].filter(Boolean))];

    // Get auditor info
    const auditors = auditorEmails.map(email => {
      const user = this.state.allUsers.find(u => u.email === email);
      return user || { email, name: email, role: 'Unknown' };
    });

    if (auditors.length === 0) {
      return this.getEmptyTeamStats();
    }

    // Calculate overall stats
    const totalAssigned = scheduled.length;
    const inProgress = scheduled.filter(a => a.status === 'in_progress').length;
    const pending = scheduled.filter(a => a.status === 'pending').length;
    const completedCount = scheduled.filter(a => a.status === 'completed').length;
    const remaining = pending + inProgress;

    // Calculate team metrics
    const auditData = await this.repository.loadAuditData(period, {
      includeDuration: true,
      includePassing: true,
      includeReversals: true
    });

    const avgDuration = this.calculateAverageDuration(auditData.durations);
    const passingRate = this.calculatePassingRate(auditData.passing);
    const reversalCount = auditData.reversals.length;

    // Calculate auditor stats
    const auditorStats = await Promise.all(
      auditors.map(auditor => this.calculateAuditorStats(auditor, scheduled, completed, period))
    );

    // Sort by assigned count
    auditorStats.sort((a, b) => {
      if (b.assigned !== a.assigned) {
        return b.assigned - a.assigned;
      }
      return a.name.localeCompare(b.name);
    });

    // Calculate workload metrics
    const assignedCounts = auditorStats.map(s => s.assigned || 0);
    const totalAssignedCount = assignedCounts.reduce((sum, count) => sum + count, 0);
    const avgAssigned = auditorStats.length > 0
      ? Math.round((totalAssignedCount / auditorStats.length) * 10) / 10
      : 0;
    const maxAssigned = assignedCounts.length > 0 ? Math.max(...assignedCounts) : 0;
    const minAssigned = assignedCounts.filter(c => c > 0).length > 0
      ? Math.min(...assignedCounts.filter(c => c > 0))
      : 0;

    // Calculate backlog and early counts
    const totalBacklogCount = auditorStats.reduce((sum, auditor) => sum + (auditor.backlogCovered || 0), 0);
    const totalEarlyCount = auditorStats.reduce((sum, auditor) => sum + (auditor.earlyCovered || 0), 0);

    const percentage = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

    return {
      totalAssigned,
      completed: completedCount,
      inProgress,
      pending,
      remaining,
      percentage,
      avgDurationText: this.formatDuration(avgDuration),
      avgDurationSubtitle: 'per audit',
      teamReversalCount: reversalCount,
      teamPassingRate: passingRate.rate,
      teamPassingCount: passingRate.passed,
      teamNotPassingCount: passingRate.notPassed,
      totalBacklogCount,
      totalEarlyCount,
      auditorStats,
      auditorsCount: auditors.length
    };
  }

  /**
   * Calculate standup view data
   */
  async calculateStandupViewData(): Promise<StandupViewData> {
    const period = this.state.getCurrentPeriodDates();
    const { scheduled } = await this.repository.loadTeamAssignments(period);

    const totalAssigned = scheduled.length;
    const inProgress = scheduled.filter(a => a.status === 'in_progress').length;
    const pending = scheduled.filter(a => a.status === 'pending').length;
    const remaining = pending + inProgress;

    // Load audit data for completed count, passing rate, and reversals
    const auditData = await this.repository.loadAuditData(period, {
      includePassing: true,
      includeReversals: true
    });

    // Count completed audits
    const completed = auditData.passing.length;

    // Calculate passing rate
    const passingRate = this.calculatePassingRate(auditData.passing);

    // Group by channel
    const channelStats: Record<string, any> = {};

    scheduled.forEach(assignment => {
      const emp = this.state.allUsers.find(u => u.email === assignment.employee_email);
      const channel = emp?.channel || 'Unknown';

      if (!channelStats[channel]) {
        channelStats[channel] = {
          assigned: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
          remaining: 0,
          percentage: 0
        };
      }

      channelStats[channel].assigned++;

      if (assignment.status === 'in_progress') {
        channelStats[channel].inProgress++;
      } else if (assignment.status === 'pending') {
        channelStats[channel].pending++;
      }
    });

    // Update completed counts from audit data
    auditData.passing.forEach(audit => {
      if (audit.employee_email) {
        const emp = this.state.allUsers.find(u => u.email === audit.employee_email);
        const channel = emp?.channel || 'Unknown';
        if (channelStats[channel]) {
          channelStats[channel].completed++;
        }
      }
    });

    // Calculate remaining and percentage for each channel
    Object.keys(channelStats).forEach(channel => {
      const stats = channelStats[channel];
      stats.remaining = stats.pending + stats.inProgress;
      stats.percentage = stats.assigned > 0 ? Math.round((stats.completed / stats.assigned) * 100) : 0;
    });

    const percentage = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    return {
      totalAssigned,
      completed,
      percentage,
      coveragePercent: percentage,
      passingRate: passingRate.rate,
      passingCount: passingRate.passed,
      notPassingCount: passingRate.notPassed,
      standupReversalCount: auditData.reversals.length,
      channelStats
    };
  }

  /**
   * Calculate stats for a single auditor
   */
  private async calculateAuditorStats(
    auditor: Auditor,
    scheduled: any[],
    completed: any[],
    period: any
  ): Promise<AuditorStats> {
    const qaScheduled = scheduled.filter(a => a.auditor_email === auditor.email);
    const qaCompleted = qaScheduled.filter(a => a.status === 'completed').length;
    const qaPending = qaScheduled.filter(a => a.status === 'pending').length;
    const qaInProgress = qaScheduled.filter(a => a.status === 'in_progress').length;
    const qaRemaining = qaPending + qaInProgress;

    // Calculate average duration
    const auditData = await this.repository.loadAuditData(period, {
      auditorEmail: auditor.email,
      includeDuration: true
    });

    const avgDuration = this.calculateAverageDuration(auditData.durations);

    // Calculate backlog and early
    const qaCompletedInPeriod = completed.filter(a => a.auditor_email === auditor.email);
    const { backlogCount, earlyCount, backlogDates, earlyDates } = this.calculateBacklogAndEarly(
      qaCompletedInPeriod,
      period
    );

    const percentage = qaScheduled.length > 0 ? Math.round((qaCompleted / qaScheduled.length) * 100) : 0;

    return {
      name: auditor.name || auditor.email,
      email: auditor.email,
      assigned: qaScheduled.length,
      completed: qaCompleted,
      remaining: qaRemaining,
      percentage,
      avgDuration: this.formatDuration(avgDuration),
      backlogCovered: backlogCount,
      backlogDates,
      earlyCovered: earlyCount,
      earlyDates,
      isCurrentUser: auditor.email === this.state.currentUserEmail
    };
  }

  /**
   * Calculate backlog and early completions
   */
  private calculateBacklogAndEarly(
    completedAssignments: any[],
    period: any
  ): {
    backlogCount: number;
    earlyCount: number;
    backlogDates: string[];
    earlyDates: string[];
  } {
    const earlyItems: any[] = [];
    const backlogItems: any[] = [];

    completedAssignments.forEach(a => {
      if (!a.completed_at) return;

      const completedDate = window.toDhakaTime?.(a.completed_at) || new Date(a.completed_at);
      const inPeriod = (!period.start || completedDate >= period.start) &&
        (!period.end || completedDate <= period.end);
      if (!inPeriod) return;

      let scheduledDate: Date | null = null;
      if (a.scheduled_date) {
        scheduledDate = window.getDhakaStartOfDay?.(window.parseDhakaDate?.(a.scheduled_date) || new Date()) || null;
      } else if (a.created_at) {
        scheduledDate = window.getDhakaStartOfDay?.(a.created_at) || null;
      }

      if (!scheduledDate) return;

      const completedDay = window.getDhakaStartOfDay?.(completedDate) || completedDate;
      const scheduledDay = window.getDhakaStartOfDay?.(scheduledDate) || scheduledDate;

      if (completedDay.getTime() !== scheduledDay.getTime()) {
        if (completedDay.getTime() < scheduledDay.getTime()) {
          earlyItems.push(a);
        } else {
          backlogItems.push(a);
        }
      }
    });

    const backlogDates = [...new Set(backlogItems.map(a => {
      const date = a.scheduled_date
        ? window.parseDhakaDate?.(a.scheduled_date)
        : a.created_at;
      return date ? window.formatDhakaDate?.(window.getDhakaStartOfDay?.(date) || date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) || '' : '';
    }).filter(Boolean))].sort();

    const earlyDates = [...new Set(earlyItems.map(a => {
      const date = a.scheduled_date
        ? window.parseDhakaDate?.(a.scheduled_date)
        : a.created_at;
      return date ? window.formatDhakaDate?.(window.getDhakaStartOfDay?.(date) || date, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }) || '' : '';
    }).filter(Boolean))].sort();

    return {
      backlogCount: backlogItems.length,
      earlyCount: earlyItems.length,
      backlogDates,
      earlyDates
    };
  }

  /**
   * Calculate average duration from audit data
   */
  private calculateAverageDuration(durations: any[]): number {
    let totalMinutes = 0;
    let count = 0;

    durations.forEach(audit => {
      const duration = this.convertDurationToMinutes(audit.audit_duration);
      if (duration > 0) {
        totalMinutes += duration;
        count++;
      }
    });

    return count > 0 ? totalMinutes / count : 0;
  }

  /**
   * Convert duration to minutes
   */
  private convertDurationToMinutes(duration: any): number {
    if (!duration) return 0;

    if (typeof duration === 'number') {
      return duration / 60; // Assume seconds
    }

    if (typeof duration === 'string') {
      const asInt = parseInt(duration);
      if (!isNaN(asInt)) {
        return asInt / 60; // Assume seconds
      }

      // Try parsing as time string (MM:SS or HH:MM:SS)
      const timeParts = duration.split(':');
      if (timeParts.length === 2) {
        const minutes = parseInt(timeParts[0]) || 0;
        const seconds = parseInt(timeParts[1]) || 0;
        return minutes + (seconds / 60);
      } else if (timeParts.length === 3) {
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        const seconds = parseInt(timeParts[2]) || 0;
        return (hours * 60) + minutes + (seconds / 60);
      }
    }

    return 0;
  }

  /**
   * Format duration text
   */
  private formatDuration(avgDurationMinutes: number): string {
    if (avgDurationMinutes <= 0) return '-';

    if (avgDurationMinutes >= 60) {
      const hours = Math.floor(avgDurationMinutes / 60);
      const minutes = Math.round(avgDurationMinutes % 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      return `${Math.round(avgDurationMinutes)}m`;
    }
  }

  /**
   * Calculate passing rate
   */
  private calculatePassingRate(passingData: any[]): {
    rate: number;
    passed: number;
    notPassed: number;
  } {
    let total = 0;
    let passed = 0;

    passingData.forEach(audit => {
      total++;
      const status = audit.passing_status || audit.passingStatus;
      const normalized = this.normalizePassingStatus(status);
      if (normalized === 'Passed') {
        passed++;
      }
    });

    return {
      rate: total > 0 ? Math.round((passed / total) * 100) : 0,
      passed,
      notPassed: total - passed
    };
  }

  /**
   * Normalize passing status
   */
  private normalizePassingStatus(status: any): string {
    if (!status) return status;

    const statusStr = String(status).trim();

    if (statusStr === 'Passing' || statusStr === 'Pass' || statusStr.toLowerCase() === 'passed') {
      return 'Passed';
    }
    if (statusStr === 'Not Passing' || statusStr === 'Not Pass' || statusStr.toLowerCase() === 'not passed') {
      return 'Not Passed';
    }

    return statusStr;
  }

  /**
   * Get empty team stats
   */
  private getEmptyTeamStats(): TeamStats {
    return {
      totalAssigned: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      remaining: 0,
      percentage: 0,
      avgDurationText: '-',
      avgDurationSubtitle: 'per audit',
      teamReversalCount: 0,
      teamPassingRate: 0,
      teamPassingCount: 0,
      teamNotPassingCount: 0,
      totalBacklogCount: 0,
      totalEarlyCount: 0,
      auditorStats: [],
      auditorsCount: 0
    };
  }
}

