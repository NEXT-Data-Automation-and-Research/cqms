/**
 * Assignment Controller
 * Handles assignment loading and stats calculation
 * Migrated from audit-form.html
 */

import { AuditFormService } from '../../application/audit-form-service.js';
import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { AUDIT_ASSIGNMENT_FIELDS, SCORECARD_AUDIT_FORM_FIELDS } from '../../../../core/constants/field-whitelists.js';
import { DatabaseFactory } from '../../../../infrastructure/database-factory.js';
import type { Scorecard } from '../../domain/entities.js';

interface AssignmentStats {
  totalAssigned: number;
  completed: number;
  inProgress: number;
  pending: number;
  remaining: number;
  percentage: number;
  avgDuration: number;
  avgDurationText: string;
  reversalCount: number;
}

export class AssignmentController {
  constructor(private service: AuditFormService) {}

  /**
   * Update user stats (assignment progress)
   */
  async updateYourStats(): Promise<void> {
    try {
      // Get current user info
      const userInfoStr = localStorage.getItem('userInfo');
      if (!userInfoStr) {
        logWarn('No user info found in localStorage');
        return;
      }

      const userInfo = JSON.parse(userInfoStr);
      const currentUserEmail = (userInfo.email || '').toLowerCase().trim();
      const currentUserRole = userInfo.role || '';
      const isAgent = currentUserRole === 'Employee';

      if (!currentUserEmail) {
        logWarn('No user email found');
        return;
      }

      // Load assignments using repository (via service)
      const stats = await this.calculateStats(currentUserEmail, isAgent);
      
      // Update UI with stats
      this.updateStatsUI(stats);
    } catch (error) {
      logError('Error updating stats:', error);
    }
  }

  /**
   * Calculate assignment stats
   */
  private async calculateStats(userEmail: string, isAgent: boolean): Promise<AssignmentStats> {
    // Note: This uses DatabaseFactory directly because we need to query audit_assignments
    // which is not part of the audit form repository. In a full migration, this would
    // be moved to a separate AssignmentRepository/Service.
    const db = DatabaseFactory.createClient();
    const filterField = isAgent ? 'employee_email' : 'auditor_email';
    
    // Use field whitelist instead of select('*')
    const fields = AUDIT_ASSIGNMENT_FIELDS;
    const { data: assignments, error } = await db
      .from('audit_assignments')
      .select(fields)
      .eq(filterField, userEmail)
      .order('created_at', { ascending: false })
      .execute();

    if (error) {
      logError('Error loading assignments for stats:', error);
      throw error;
    }

    // Additional client-side filtering to ensure exact match (case-insensitive)
    const filteredAssignments = (assignments || []).filter((assignment: any) => {
      const emailToCheck = isAgent 
        ? assignment.employee_email 
        : assignment.auditor_email;
      return emailToCheck && emailToCheck.toLowerCase().trim() === userEmail;
    });

    const totalAssigned = filteredAssignments.length;
    const completed = filteredAssignments.filter((a: any) => a.status === 'completed').length;
    const inProgress = filteredAssignments.filter((a: any) => a.status === 'in_progress').length;
    const pending = filteredAssignments.filter((a: any) => a.status === 'pending').length;
    const remaining = pending + inProgress;
    const percentage = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    // Calculate average duration
    const { avgDuration, avgDurationText } = await this.calculateAverageDuration(
      userEmail,
      isAgent
    );

    // Calculate reversal count
    const reversalCount = await this.calculateReversalCount(userEmail, isAgent);

    return {
      totalAssigned,
      completed,
      inProgress,
      pending,
      remaining,
      percentage,
      avgDuration,
      avgDurationText,
      reversalCount
    };
  }

  /**
   * Calculate average audit duration
   */
  private async calculateAverageDuration(
    userEmail: string,
    isAgent: boolean
  ): Promise<{ avgDuration: number; avgDurationText: string }> {
    try {
      const db = DatabaseFactory.createClient();
      const auditFilterField = isAgent ? 'employee_email' : 'auditor_email';

      // Get all active scorecards
      const { data: scorecards, error: scError } = await db
        .from('scorecards')
        .select(SCORECARD_AUDIT_FORM_FIELDS)
        .eq('is_active', true)
        .execute<Scorecard[]>();

      if (scError || !scorecards) {
        logWarn('Error loading scorecards for duration calculation:', scError);
        return { avgDuration: 0, avgDurationText: '-' };
      }

      let totalDuration = 0;
      let auditCount = 0;

      // Query each scorecard table for audits by this user
      for (const scorecard of scorecards) {
        try {
          const { data: audits, error } = await db
            .from(scorecard.tableName)
            .select(`audit_duration, ${auditFilterField}`)
            .not('audit_duration', 'is', null)
            .execute();

          if (!error && audits) {
            // Filter by email (case-insensitive) on client side
            const filteredAudits = audits.filter((audit: any) => {
              const emailToCheck = audit[auditFilterField];
              return emailToCheck && emailToCheck.toLowerCase().trim() === userEmail;
            });

            filteredAudits.forEach((audit: any) => {
              const durationInMinutes = this.parseDuration(audit.audit_duration);
              if (durationInMinutes > 0) {
                totalDuration += durationInMinutes;
                auditCount++;
              }
            });
          }
        } catch (err) {
          logWarn(`Error getting duration from ${scorecard.tableName}:`, err);
        }
      }

      if (auditCount === 0) {
        return { avgDuration: 0, avgDurationText: '-' };
      }

      const avgDuration = totalDuration / auditCount;

      // Format duration (avgDuration is in minutes)
      let avgDurationText = '-';
      if (avgDuration >= 60) {
        const hours = Math.floor(avgDuration / 60);
        const minutes = Math.round(avgDuration % 60);
        avgDurationText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
      } else {
        avgDurationText = `${Math.round(avgDuration)}m`;
      }

      return { avgDuration, avgDurationText };
    } catch (error) {
      logError('Error calculating average duration:', error);
      return { avgDuration: 0, avgDurationText: '-' };
    }
  }

  /**
   * Parse duration from various formats
   */
  private parseDuration(duration: number | string): number {
    if (typeof duration === 'number') {
      // If value is >= 1440 (24 hours in minutes), assume it's in seconds (new format)
      // Otherwise, assume it's already in minutes (legacy format)
      if (duration >= 1440) {
        return duration / 60; // Convert seconds to minutes
      }
      return duration; // Already in minutes
    }

    if (typeof duration === 'string') {
      // Try parsing as integer first
      const asInt = parseInt(duration);
      if (!isNaN(asInt)) {
        if (asInt >= 1440) {
          return asInt / 60; // Convert seconds to minutes
        }
        return asInt; // Already in minutes
      }

      // Legacy format: time string (MM:SS or HH:MM:SS)
      const timeParts = duration.split(':');
      if (timeParts.length === 2) {
        // MM:SS format
        const minutes = parseInt(timeParts[0]) || 0;
        const seconds = parseInt(timeParts[1]) || 0;
        return minutes + (seconds / 60);
      } else if (timeParts.length === 3) {
        // HH:MM:SS format
        const hours = parseInt(timeParts[0]) || 0;
        const minutes = parseInt(timeParts[1]) || 0;
        const seconds = parseInt(timeParts[2]) || 0;
        return (hours * 60) + minutes + (seconds / 60);
      }
    }

    return 0;
  }

  /**
   * Calculate reversal count
   */
  private async calculateReversalCount(
    userEmail: string,
    isAgent: boolean
  ): Promise<number> {
    try {
      const db = DatabaseFactory.createClient();
      const reversalFilterField = isAgent ? 'employee_email' : 'auditor_email';

      // Get all active scorecards using service
      const scorecards = await this.service.loadScorecards();

      if (!scorecards || scorecards.length === 0) {
        return 0;
      }

      let reversalCount = 0;

      // Query each scorecard table for reversals
      for (const scorecard of scorecards) {
        try {
          const { data, error } = await db
            .from(scorecard.tableName)
            .select(`id, ${reversalFilterField}`)
            .not('reversal_requested_at', 'is', null)
            .execute();

          if (!error && data) {
            // Filter by email (case-insensitive) on client side
            const filteredReversals = data.filter((item: any) => {
              const emailToCheck = item[reversalFilterField];
              return emailToCheck && emailToCheck.toLowerCase().trim() === userEmail;
            });
            reversalCount += filteredReversals.length;
          }
        } catch (err) {
          logWarn(`Error getting reversals from ${scorecard.tableName}:`, err);
        }
      }

      return reversalCount;
    } catch (error) {
      logError('Error calculating reversal count:', error);
      return 0;
    }
  }

  /**
   * Update stats UI
   */
  private updateStatsUI(stats: AssignmentStats): void {
    // Update total assigned
    const totalAssignedEl = document.getElementById('totalAssigned');
    if (totalAssignedEl) {
      totalAssignedEl.textContent = stats.totalAssigned.toString();
    }

    // Update completed
    const completedEl = document.getElementById('completed');
    if (completedEl) {
      completedEl.textContent = stats.completed.toString();
    }

    // Update in progress
    const inProgressEl = document.getElementById('inProgress');
    if (inProgressEl) {
      inProgressEl.textContent = stats.inProgress.toString();
    }

    // Update pending
    const pendingEl = document.getElementById('pending');
    if (pendingEl) {
      pendingEl.textContent = stats.pending.toString();
    }

    // Update remaining
    const remainingEl = document.getElementById('remaining');
    if (remainingEl) {
      remainingEl.textContent = stats.remaining.toString();
    }

    // Update percentage
    const percentageEl = document.getElementById('percentage');
    if (percentageEl) {
      percentageEl.textContent = `${stats.percentage}%`;
    }

    // Update average duration
    const avgDurationEl = document.getElementById('avgDuration');
    if (avgDurationEl) {
      avgDurationEl.textContent = stats.avgDurationText;
    }

    // Update reversal count
    const reversalCountEl = document.getElementById('reversalCount');
    if (reversalCountEl) {
      reversalCountEl.textContent = stats.reversalCount.toString();
    }
  }
}

