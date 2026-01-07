/**
 * Audit Loader Module
 * Handles loading audit data from the database
 */

import type { Audit, Assignment, PeriodDates, Scorecard, Filters } from '../types.js';
import { homeState } from '../state.js';
import { DateFilterManager } from '../date-filter-manager.js';
import { logError, logWarn } from '../../../../utils/logging-helper.js';

export class AuditLoader {
  constructor(
    private dateFilterManager: DateFilterManager
  ) {}

  async loadAssignedAudits(period: PeriodDates, filters: Filters): Promise<void> {
    const { isAgent } = homeState;
    
    if (isAgent) {
      await this.loadCompletedAuditsForEmployee(period, filters);
    } else {
      await this.loadPendingAssignmentsForAuditor(period, filters);
    }
  }

  private async loadCompletedAuditsForEmployee(
    period: PeriodDates,
    filters: Filters
  ): Promise<void> {
    const { currentUserEmail } = homeState;
    
    const { data: scorecards, error: scError } = await window.supabaseClient
      .from('scorecards')
      .select('id, name, table_name, scoring_type')
      .eq('is_active', true);
    
    if (scError) throw scError;
    
    let combinedAudits: Audit[] = [];
    const auditFilterField = 'employee_email';
    const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
    
    for (const scorecard of (scorecards || [])) {
      try {
        const { data, error } = await window.supabaseClient
          .from(scorecard.table_name)
          .select('id, employee_email, employee_name, auditor_email, interaction_id, created_at, submitted_at, status, passing_status, _scorecard_id, _scorecard_name, _scorecard_table')
          .order('submitted_at', { ascending: false })
          .limit(500);
        
        if (error) {
          logWarn(`Error loading from ${scorecard.table_name}:`, error);
          continue;
        }
        
        if (data && data.length > 0) {
          let filteredAudits = data.filter((audit: Audit) => {
            const emailToCheck = audit[auditFilterField];
            if (!emailToCheck) return false;
            return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
          });
          
          filteredAudits = filteredAudits.filter((audit: Audit) => {
            const auditDate = audit.submitted_at;
            if (!auditDate) return false;
            return this.dateFilterManager.isDateInRange(auditDate, period.start, period.end);
          });
          
          if (filters.channel) {
            filteredAudits = filteredAudits.filter((audit: Audit) => audit.channel === filters.channel);
          }
          
          const auditsWithScorecard = filteredAudits.map((audit: Audit) => ({
            ...audit,
            _scorecard_id: scorecard.id,
            _scorecard_name: scorecard.name,
            _scorecard_table: scorecard.table_name,
            _scoring_type: scorecard.scoring_type,
            _isAssignment: false
          }));
          combinedAudits = combinedAudits.concat(auditsWithScorecard);
        }
      } catch (err) {
        logWarn(`Exception loading from ${scorecard.table_name}:`, err);
        continue;
      }
    }
    
    combinedAudits.sort((a, b) => {
      const dateA = new Date(a.submitted_at || 0).getTime();
      const dateB = new Date(b.submitted_at || 0).getTime();
      return dateB - dateA;
    });
    
    const invalidAudits = combinedAudits.filter(audit => {
      const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim();
      return auditEmployeeEmail !== normalizedCurrentEmail;
    });
    
    if (invalidAudits.length > 0) {
      logError('CRITICAL: Found audits that do not belong to current user:', invalidAudits);
      combinedAudits = combinedAudits.filter(audit => {
        const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim();
        return auditEmployeeEmail === normalizedCurrentEmail;
      });
    }
    
    combinedAudits = combinedAudits.slice(0, 50);
    homeState.assignedAudits = combinedAudits;
    homeState.allAssignments = combinedAudits;
  }

  private async loadPendingAssignmentsForAuditor(
    period: PeriodDates,
    filters: Filters
  ): Promise<void> {
    const { currentUserEmail } = homeState;
    const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
    
    const { data, error } = await window.supabaseClient
      .from('audit_assignments')
      .select(`
        *,
        scorecards:scorecard_id (
          id,
          name,
          table_name
        )
      `)
      .eq('auditor_email', currentUserEmail)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false });
    
    if (error) {
      logError('Error loading assignments:', error);
      throw error;
    }
    
    let filteredAssignments = (data || []).filter((assignment: Assignment) => {
      const auditorEmail = (assignment.auditor_email || '').toLowerCase().trim();
      return auditorEmail === normalizedCurrentEmail;
    });
    
    filteredAssignments = filteredAssignments.filter((assignment: Assignment) => {
      const assignmentDate = assignment.scheduled_date 
        ? new Date(assignment.scheduled_date + 'T00:00:00')
        : assignment.created_at;
      if (!assignmentDate) return false;
      return this.dateFilterManager.isDateInRange(assignmentDate, period.start, period.end);
    });
    
    if (filters.channel) {
      filteredAssignments = filteredAssignments.filter((assignment: Assignment) => assignment.channel === filters.channel);
    }
    
    if (filters.status) {
      filteredAssignments = filteredAssignments.filter((assignment: Assignment) => assignment.status === filters.status);
    }
    
    if (filters.agent) {
      filteredAssignments = filteredAssignments.filter((assignment: Assignment) => assignment.employee_email === filters.agent);
    }
    
    homeState.assignedAudits = filteredAssignments.map((assignment: Assignment) => ({
      ...assignment,
      _scorecard_id: assignment.scorecard_id,
      _scorecard_name: assignment.scorecards?.name || 'Unknown Scorecard',
      _scorecard_table: assignment.scorecards?.table_name || '',
      _isAssignment: true,
      id: assignment.id,
      employee_name: assignment.employee_name,
      employee_email: assignment.employee_email,
      auditor_email: assignment.auditor_email,
      status: assignment.status,
      created_at: assignment.created_at,
      scheduled_date: assignment.scheduled_date
    }));
    
    homeState.allAssignments = homeState.assignedAudits;
  }
}

