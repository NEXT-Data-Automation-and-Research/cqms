/**
 * Stats Calculator Module
 * Handles all statistics calculation logic for the dashboard
 */

import type { StatsData, PeriodDates, Assignment, Audit, Scorecard } from '../types.js';
import { homeState } from '../state.js';
import { normalizePassingStatus } from '../utils.js';
import { DateFilterManager } from '../date-filter-manager.js';
import { logError, logWarn } from '../../../../utils/logging-helper.js';

export class StatsCalculator {
  constructor(
    private dateFilterManager: DateFilterManager
  ) {}

  async calculate(period: PeriodDates): Promise<StatsData> {
    const { currentUserEmail, isAgent } = homeState;
    
    if (!currentUserEmail) {
      throw new Error('No user email found for stats');
    }

    // Calculate assignment-based stats
    const assignmentStats = await this.calculateAssignmentStats(period, currentUserEmail, isAgent);
    
    // Calculate completed audits count
    const completed = await this.calculateCompletedCount(period, currentUserEmail, isAgent);
    
    // Calculate average duration
    const durationStats = await this.calculateDurationStats(period, currentUserEmail, isAgent);
    
    // Calculate quality score stats
    const qualityStats = await this.calculateQualityStats(period, currentUserEmail, isAgent);
    
    // Calculate reversal stats
    const reversalStats = await this.calculateReversalStats(period, currentUserEmail, isAgent);
    
    // Calculate acknowledgment requirement
    const requiresAcknowledgment = await this.calculateAcknowledgmentRequirement(period, currentUserEmail, isAgent);
    
    const remaining = assignmentStats.pending + assignmentStats.inProgress;
    const percentage = assignmentStats.totalAssigned > 0 
      ? Math.round((completed / assignmentStats.totalAssigned) * 100) 
      : 0;
    
    const daysRemaining = this.calculateDaysRemaining();

    return {
      totalAssigned: assignmentStats.totalAssigned,
      completed,
      inProgress: assignmentStats.inProgress,
      pending: assignmentStats.pending,
      remaining,
      percentage,
      daysRemaining,
      avgDuration: durationStats.avgDuration,
      avgDurationText: durationStats.avgDurationText,
      totalAuditsConducted: qualityStats.totalAuditsConducted,
      totalScoreSum: qualityStats.totalScoreSum,
      totalAuditsWithScore: qualityStats.totalAuditsWithScore,
      avgQualityScore: qualityStats.avgQualityScore,
      avgQualityScoreText: qualityStats.avgQualityScoreText,
      passingCount: qualityStats.passingCount,
      notPassingCount: qualityStats.notPassingCount,
      activeReversals: reversalStats.activeReversals,
      resolvedReversals: reversalStats.resolvedReversals,
      totalReversals: reversalStats.totalReversals,
      requiresAcknowledgment
    };
  }

  private async calculateAssignmentStats(
    period: PeriodDates,
    currentUserEmail: string,
    isAgent: boolean
  ): Promise<{ totalAssigned: number; inProgress: number; pending: number }> {
    const filterField = isAgent ? 'employee_email' : 'auditor_email';
    const { data: assignments, error } = await (window.supabaseClient as any)
      .from('audit_assignments')
      .select('id, employee_email, auditor_email, scorecard_id, status, created_at, scheduled_date, completed_at')
      .eq(filterField, currentUserEmail)
      .order('created_at', { ascending: false });
    
    if (error) {
      logError('Error loading assignments for stats:', error);
      return { totalAssigned: 0, inProgress: 0, pending: 0 };
    }
    
    let allAssignments = (assignments || []).filter((assignment: Assignment) => {
      const assignmentDate = assignment.scheduled_date 
        ? new Date(assignment.scheduled_date + 'T00:00:00')
        : assignment.created_at;
      if (!assignmentDate) return false;
      return this.dateFilterManager.isDateInRange(assignmentDate, period.start, period.end);
    });
    
    return {
      totalAssigned: allAssignments.length,
      inProgress: allAssignments.filter((a: Assignment) => a.status === 'in_progress').length,
      pending: allAssignments.filter((a: Assignment) => a.status === 'pending').length
    };
  }

  private async calculateCompletedCount(
    period: PeriodDates,
    currentUserEmail: string,
    isAgent: boolean
  ): Promise<number> {
    try {
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const auditFilterField = isAgent ? 'employee_email' : 'auditor_email';
        const completedPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            let completedQuery = (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('id, submitted_at')
              .eq(auditFilterField, currentUserEmail)
              .not('submitted_at', 'is', null);
            
            if (period.start && window.dhakaDateToUTCISO) {
              completedQuery = completedQuery.gte('submitted_at', window.dhakaDateToUTCISO(period.start));
            }
            if (period.end && window.dhakaDateToUTCISO) {
              completedQuery = completedQuery.lte('submitted_at', window.dhakaDateToUTCISO(period.end));
            }
            
            const completedResult = await completedQuery;
            
            if (completedResult.error) {
              const retryQuery = await (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('id, submitted_at')
                .eq(auditFilterField, currentUserEmail)
                .not('submitted_at', 'is', null);
              
              if (retryQuery.data) {
                const filteredCompleted = retryQuery.data.filter((audit: Audit) => {
                  if (!audit.submitted_at) return false;
                  const auditDate = window.toDhakaTime ? window.toDhakaTime(audit.submitted_at) : new Date(audit.submitted_at);
                  return (!period.start || auditDate >= period.start) && 
                         (!period.end || auditDate <= period.end);
                });
                return filteredCompleted.length;
              }
              return 0;
            }
            
            return (completedResult.data || []).length;
          } catch (err) {
            logWarn(`Error counting completed audits from ${scorecard.table_name}:`, err);
            return 0;
          }
        });
        
        const completedCounts = await Promise.all(completedPromises);
        return completedCounts.reduce((sum: number, count: number) => sum + count, 0);
      }
      return 0;
    } catch (error) {
      logError('Error calculating completed count:', error);
      return 0;
    }
  }

  private calculateDaysRemaining(): number {
    const today = new Date();
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (5 - today.getDay()));
    return Math.max(0, Math.ceil((endOfWeek.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }

  private async calculateDurationStats(
    period: PeriodDates,
    currentUserEmail: string,
    isAgent: boolean
  ): Promise<{ avgDuration: number; avgDurationText: string }> {
    let avgDuration = 0;
    let avgDurationText = '-';
    
    try {
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const auditFilterField = isAgent ? 'employee_email' : 'auditor_email';
        const durationPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            let durationQuery = (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('audit_duration, submitted_at')
              .eq(auditFilterField, currentUserEmail)
              .not('audit_duration', 'is', null);
            
            if (period.start && window.dhakaDateToUTCISO) {
              durationQuery = durationQuery.gte('submitted_at', window.dhakaDateToUTCISO(period.start));
            }
            if (period.end && window.dhakaDateToUTCISO) {
              durationQuery = durationQuery.lte('submitted_at', window.dhakaDateToUTCISO(period.end));
            }
            
            let result = await durationQuery;
            let audits = result.data;
            let error = result.error;
            
            if (error && period && (period.start || period.end)) {
              const retryQuery = (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('audit_duration, submitted_at')
                .eq(auditFilterField, currentUserEmail)
                .not('audit_duration', 'is', null);
              
              const retryResult = await retryQuery;
              if (retryResult.data && period.start) {
                retryResult.data = retryResult.data.filter((audit: Audit) => {
                  if (!audit.submitted_at) return false;
                  const auditDate = window.toDhakaTime ? window.toDhakaTime(audit.submitted_at) : new Date(audit.submitted_at);
                  return (!period.start || auditDate >= period.start) && 
                         (!period.end || auditDate <= period.end);
                });
                audits = retryResult.data;
                error = null;
              } else if (retryResult.error) {
                return [];
              }
            }
            
            if (error) {
              let retryQuery = (window.supabaseClient as any)
                .from(scorecard.table_name)
                .select('audit_duration, submitted_at')
                .eq(auditFilterField, currentUserEmail);
              
              if (period.start && window.dhakaDateToUTCISO) {
                retryQuery = retryQuery.gte('submitted_at', window.dhakaDateToUTCISO(period.start));
              }
              if (period.end && window.dhakaDateToUTCISO) {
                retryQuery = retryQuery.lte('submitted_at', window.dhakaDateToUTCISO(period.end));
              }
              
              const retryResult = await retryQuery;
              if (!retryResult.error && retryResult.data) {
                audits = retryResult.data.filter((a: Audit) => a.audit_duration != null);
                if (period.start && audits) {
                  audits = audits.filter((audit: Audit) => {
                    if (!audit.submitted_at) return false;
                    const auditDate = window.toDhakaTime ? window.toDhakaTime(audit.submitted_at) : new Date(audit.submitted_at);
                    return (!period.start || auditDate >= period.start) && 
                           (!period.end || auditDate <= period.end);
                  });
                }
                error = null;
              } else {
                return [];
              }
            }
            
            if (!error && audits && audits.length > 0) {
              if (period.start) {
                audits = audits.filter((audit: Audit) => {
                  if (!audit.submitted_at) return false;
                  const auditDate = window.toDhakaTime ? window.toDhakaTime(audit.submitted_at) : new Date(audit.submitted_at);
                  return (!period.start || auditDate >= period.start) && 
                         (!period.end || auditDate <= period.end);
                });
              }
              
              return audits.map((audit: Audit) => {
                let durationInMinutes = 0;
                if (typeof audit.audit_duration === 'number') {
                  durationInMinutes = audit.audit_duration / 60;
                } else if (typeof audit.audit_duration === 'string') {
                  const asInt = parseInt(audit.audit_duration);
                  if (!isNaN(asInt)) {
                    durationInMinutes = asInt / 60;
                  } else {
                    const timeParts = audit.audit_duration.split(':');
                    if (timeParts.length === 2) {
                      const minutes = parseInt(timeParts[0]) || 0;
                      const seconds = parseInt(timeParts[1]) || 0;
                      durationInMinutes = minutes + (seconds / 60);
                    } else if (timeParts.length === 3) {
                      const hours = parseInt(timeParts[0]) || 0;
                      const minutes = parseInt(timeParts[1]) || 0;
                      const seconds = parseInt(timeParts[2]) || 0;
                      durationInMinutes = (hours * 60) + minutes + (seconds / 60);
                    }
                  }
                }
                return durationInMinutes > 0 ? durationInMinutes : null;
              }).filter(Boolean);
            }
            return [];
          } catch (err) {
            logWarn(`Error getting duration from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const durationResults = await Promise.all(durationPromises);
        const allDurations = durationResults.flat();
        const totalDuration = allDurations.reduce((sum: number, d: number) => sum + d, 0);
        const auditCount = allDurations.length;
        
        if (auditCount > 0) {
          avgDuration = totalDuration / auditCount;
          if (avgDuration >= 60) {
            const hours = Math.floor(avgDuration / 60);
            const minutes = Math.round(avgDuration % 60);
            avgDurationText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
          } else {
            avgDurationText = `${Math.round(avgDuration)}m`;
          }
        }
      }
    } catch (error) {
      logError('Error calculating average duration:', error);
    }
    
    return { avgDuration, avgDurationText };
  }

  private async calculateQualityStats(
    period: PeriodDates,
    currentUserEmail: string,
    isAgent: boolean
  ): Promise<{
    totalAuditsConducted: number;
    totalScoreSum: number;
    totalAuditsWithScore: number;
    avgQualityScore: number;
    avgQualityScoreText: string;
    passingCount: number;
    notPassingCount: number;
  }> {
    let totalAuditsConducted = 0;
    let totalScoreSum = 0;
    let totalAuditsWithScore = 0;
    let avgQualityScore = 0;
    let avgQualityScoreText = '-';
    let passingCount = 0;
    let notPassingCount = 0;
    
    try {
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('id, name, table_name, scoring_type')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const auditFilterField = isAgent ? 'employee_email' : 'auditor_email';
        const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
        
        const auditPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            const { data: audits, error } = await (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('id, employee_email, employee_name, auditor_email, interaction_id, created_at, submitted_at, status, passing_status')
              .order('submitted_at', { ascending: false })
              .limit(500);
            
            if (!error && audits && audits.length > 0) {
              let filteredAudits = audits.filter((audit: Audit) => {
                const emailToCheck = audit[auditFilterField];
                if (!emailToCheck) return false;
                return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
              });
              
              filteredAudits = filteredAudits.filter((audit: Audit) => {
                const auditDate = audit.submitted_at;
                if (!auditDate) return false;
                return this.dateFilterManager.isDateInRange(auditDate, period.start, period.end);
              });
              
              return filteredAudits.map((audit: Audit) => {
                const score = parseFloat(String(audit.average_score || audit.averageScore || 0));
                const passingStatus = audit.passing_status || audit.passingStatus || '';
                const normalizedStatus = normalizePassingStatus(passingStatus);
                
                return { 
                  score: !isNaN(score) ? score : null,
                  passingStatus: normalizedStatus
                };
              });
            }
            return [];
          } catch (err) {
            logWarn(`Error getting audits from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const auditResults = await Promise.all(auditPromises);
        const allAudits = auditResults.flat();
        totalAuditsConducted = allAudits.length;
        
        allAudits.forEach((audit: { score: number | null; passingStatus: string }) => {
          if (audit.score !== null) {
            totalScoreSum += audit.score;
            totalAuditsWithScore++;
          }
          const normalizedStatus = normalizePassingStatus(audit.passingStatus);
          if (normalizedStatus === 'Passed') {
            passingCount++;
          } else {
            notPassingCount++;
          }
        });
        
        if (totalAuditsWithScore > 0) {
          avgQualityScore = totalScoreSum / totalAuditsWithScore;
          avgQualityScoreText = `${Math.round(avgQualityScore)}%`;
        }
      }
    } catch (error) {
      logError('Error calculating quality stats:', error);
    }
    
    return {
      totalAuditsConducted,
      totalScoreSum,
      totalAuditsWithScore,
      avgQualityScore,
      avgQualityScoreText,
      passingCount,
      notPassingCount
    };
  }

  private async calculateReversalStats(
    period: PeriodDates,
    currentUserEmail: string,
    isAgent: boolean
  ): Promise<{ activeReversals: number; resolvedReversals: number; totalReversals: number }> {
    let activeReversals = 0;
    let resolvedReversals = 0;
    let totalReversals = 0;
    
    try {
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const reversalFilterField = isAgent ? 'employee_email' : 'auditor_email';
        const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
        
        const reversalPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            let { data: allReversals, error: allError } = await (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('reversal_requested_at, reversal_responded_at, ' + reversalFilterField)
              .not('reversal_requested_at', 'is', null)
              .limit(500);
            
            if (allError) {
              return [];
            }
            
            if (!allError && allReversals) {
              let filteredReversals = allReversals.filter((reversal: Audit) => {
                const emailToCheck = reversal[reversalFilterField];
                if (!emailToCheck) return false;
                return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
              });
              
              filteredReversals = filteredReversals.filter((reversal: Audit) => {
                const reversalDate = reversal.reversal_requested_at;
                if (!reversalDate) return false;
                return this.dateFilterManager.isDateInRange(reversalDate, period.start, period.end);
              });
              
              return filteredReversals.map((reversal: Audit) => {
                const active = reversal.reversal_requested_at && !reversal.reversal_responded_at;
                const resolved = !!reversal.reversal_responded_at;
                return { active, resolved };
              });
            }
            return [];
          } catch (err) {
            logWarn(`Error counting reversals in ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const reversalResults = await Promise.all(reversalPromises);
        const allReversalsData = reversalResults.flat();
        
        allReversalsData.forEach((reversal: { active: boolean; resolved: boolean }) => {
          totalReversals++;
          if (reversal.active) activeReversals++;
          if (reversal.resolved) resolvedReversals++;
        });
      }
    } catch (error) {
      logError('Error calculating reversal counts:', error);
    }
    
    return { activeReversals, resolvedReversals, totalReversals };
  }

  private async calculateAcknowledgmentRequirement(
    period: PeriodDates,
    currentUserEmail: string,
    isAgent: boolean
  ): Promise<number> {
    if (!isAgent) return 0;
    
    try {
      const { data: scorecards, error: scError } = await (window.supabaseClient as any)
        .from('scorecards')
        .select('table_name')
        .eq('is_active', true);
      
      if (!scError && scorecards) {
        const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
        
        const auditPromises = scorecards.map(async (scorecard: Scorecard) => {
          try {
            const { data: allAudits, error: auditError } = await (window.supabaseClient as any)
              .from(scorecard.table_name)
              .select('id, employee_email, acknowledgement_status, submitted_at')
              .limit(1000);
            
            if (!auditError && allAudits) {
              let pendingAudits = allAudits.filter((audit: Audit) => {
                const emailToCheck = audit.employee_email;
                if (!emailToCheck) return false;
                const emailMatches = emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
                
                const ackStatus = audit.acknowledgement_status || audit.acknowledgementStatus || '';
                const isPending = ackStatus && (
                  ackStatus.toLowerCase() === 'pending' || 
                  ackStatus === 'Pending'
                );
                
                return emailMatches && isPending;
              });
              
              pendingAudits = pendingAudits.filter((audit: Audit) => {
                const auditDate = audit.submitted_at;
                if (!auditDate) return false;
                return this.dateFilterManager.isDateInRange(auditDate, period.start, period.end);
              });
              
              return pendingAudits.length;
            }
            return 0;
          } catch (err) {
            logWarn(`Error counting pending audits in ${scorecard.table_name}:`, err);
            return 0;
          }
        });
        
        const auditCounts = await Promise.all(auditPromises);
        return auditCounts.reduce((sum: number, count: number) => sum + count, 0);
      }
    } catch (error) {
      logError('Error calculating acknowledgment count:', error);
    }
    
    return 0;
  }
}

