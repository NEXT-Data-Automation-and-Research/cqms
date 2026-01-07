/**
 * Updates Loader Module
 * Handles loading recent updates/notifications from the database
 */

import type { Update, PeriodDates, Audit, Scorecard, User } from '../types.js';
import { homeState } from '../state.js';
import { DateFilterManager } from '../date-filter-manager.js';
import { logWarn } from '../../../../utils/logging-helper.js';

export class UpdatesLoader {
  constructor(
    private dateFilterManager: DateFilterManager
  ) {}

  async loadRecentUpdates(period: PeriodDates, allUsers: User[]): Promise<Update[]> {
    const { isAgent, currentUserEmail } = homeState;
    let allUpdates: Update[] = [];

    if (isAgent) {
      allUpdates = await this.loadUpdatesForAgent(period, currentUserEmail);
    } else {
      allUpdates = await this.loadUpdatesForAuditor(period, currentUserEmail, allUsers);
    }

    allUpdates = this.filterAndSortUpdates(allUpdates, period);
    return allUpdates.slice(0, 15);
  }

  private async loadUpdatesForAgent(period: PeriodDates, currentUserEmail: string): Promise<Update[]> {
    const allUpdates: Update[] = [];
    const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();

    const { data: scorecards, error: scError } = await window.supabaseClient
      .from('scorecards')
      .select('id, name, table_name')
      .eq('is_active', true);
    
    if (!scError && scorecards) {
      const auditPromises = scorecards.map(async (scorecard: Scorecard) => {
        try {
          const { data: audits, error } = await window.supabaseClient
            .from(scorecard.table_name)
            .select('id, employee_email, employee_name, auditor_email, interaction_id, created_at, submitted_at, status, passing_status, _scorecard_id, _scorecard_name, _scorecard_table')
            .eq('employee_email', currentUserEmail)
            .order('submitted_at', { ascending: false })
            .limit(20);
          
          if (!error && audits && audits.length > 0) {
            const filteredAudits = audits.filter((audit: Audit) => {
              const emailToCheck = audit.employee_email;
              if (!emailToCheck) return false;
              return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
            });
            
            return filteredAudits.map((audit: Audit) => ({
              id: `audit-${audit.id}`,
              type: 'audit_completed',
              displayName: null,
              displayEmail: null,
              timestamp: audit.submitted_at,
              status: 'completed',
              interactionId: audit.interaction_id,
              scorecardId: scorecard.id,
              scorecardTable: scorecard.table_name,
              auditId: audit.id
            }));
          }
          return [];
        } catch (err) {
          logWarn(`Error loading audits from ${scorecard.table_name}:`, err);
          return [];
        }
      });
      
      const auditResults = await Promise.all(auditPromises);
      allUpdates.push(...auditResults.flat());
      
      const reversalPromises = scorecards.map(async (scorecard: Scorecard) => {
        try {
          const { data: reversals, error } = await window.supabaseClient
            .from(scorecard.table_name)
            .select('id, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, acknowledgement_status, interaction_id, submitted_at')
            .not('reversal_requested_at', 'is', null)
            .order('reversal_requested_at', { ascending: false })
            .limit(200);
          
          if (!error && reversals && reversals.length > 0) {
            reversals.sort((a: Audit, b: Audit) => {
              const aResponded = a.reversal_responded_at ? new Date(a.reversal_responded_at).getTime() : 0;
              const bResponded = b.reversal_responded_at ? new Date(b.reversal_responded_at).getTime() : 0;
              if (aResponded !== bResponded) {
                return bResponded - aResponded;
              }
              const aRequested = new Date(a.reversal_requested_at || 0).getTime();
              const bRequested = new Date(b.reversal_requested_at || 0).getTime();
              return bRequested - aRequested;
            });
            
            let filteredReversals = reversals.filter((rev: Audit) => {
              const emailToCheck = rev.employee_email;
              if (!emailToCheck) return false;
              return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
            });
            
            filteredReversals = filteredReversals.filter((reversal: Audit) => {
              const acknowledgementStatus = reversal.acknowledgement_status || reversal.acknowledgementStatus || '';
              const isAcknowledged = acknowledgementStatus && (
                acknowledgementStatus.toLowerCase().includes('acknowledged') || 
                acknowledgementStatus === 'Acknowledged'
              );
              
              const isPending = reversal.reversal_approved === null;
              const isApproved = reversal.reversal_approved === true || reversal.reversal_approved === 'true' || reversal.reversal_approved === 1 || reversal.reversal_approved === '1';
              const isRejected = reversal.reversal_approved === false || reversal.reversal_approved === 'false' || reversal.reversal_approved === 0 || reversal.reversal_approved === '0';
              
              return !isAcknowledged && (isPending || isApproved || isRejected);
            });
            
            const updates: Update[] = [];
            filteredReversals.forEach((reversal: Audit) => {
              const interactionId = reversal.interaction_id || 'N/A';
              const acknowledgementStatus = reversal.acknowledgement_status || reversal.acknowledgementStatus;
              const isAcknowledged = acknowledgementStatus && (
                acknowledgementStatus.toLowerCase().includes('acknowledged') || 
                acknowledgementStatus === 'Acknowledged'
              );
              
              let status = null;
              
              if (acknowledgementStatus === 'Acknowledged') {
                status = 'Acknowledged';
              } else if (reversal.reversal_responded_at) {
                const approved = reversal.reversal_approved;
                if (approved === true || approved === 'true' || approved === 1 || approved === '1') {
                  status = 'Approved';
                } else if (approved === false || approved === 'false' || approved === 0 || approved === '0') {
                  status = 'Rejected';
                } else {
                  status = 'Pending';
                }
              } else if (reversal.reversal_requested_at && !reversal.reversal_responded_at) {
                status = 'Pending';
              }
              
              if (status === 'Pending' && reversal.reversal_requested_at) {
                updates.push({
                  id: `reversal-request-${reversal.id}`,
                  type: 'reversal_requested',
                  displayName: null,
                  displayEmail: null,
                  timestamp: reversal.reversal_requested_at,
                  status: 'reversal_requested',
                  interactionId: interactionId,
                  scorecardId: scorecard.id,
                  scorecardTable: scorecard.table_name,
                  auditId: reversal.id
                });
              }
              
              if (status && (status === 'Approved' || status === 'Rejected') && !isAcknowledged) {
                const statusText = status === 'Approved' ? 'approved' : 'rejected';
                const statusTimestamp = reversal.reversal_responded_at || reversal.reversal_requested_at;
                
                updates.push({
                  id: `reversal-status-${reversal.id}`,
                  type: 'reversal_status_update',
                  displayName: null,
                  displayEmail: null,
                  timestamp: statusTimestamp,
                  status: status,
                  statusText: statusText,
                  interactionId: interactionId,
                  scorecardId: scorecard.id,
                  scorecardTable: scorecard.table_name,
                  auditId: reversal.id
                });
              }
            });
            return updates;
          }
          return [];
        } catch (err) {
          logWarn(`Error loading reversals from ${scorecard.table_name}:`, err);
          return [];
        }
      });
      
      const reversalResults = await Promise.all(reversalPromises);
      allUpdates.push(...reversalResults.flat());
    }

    return allUpdates;
  }

  private async loadUpdatesForAuditor(period: PeriodDates, currentUserEmail: string, allUsers: User[]): Promise<Update[]> {
    const allUpdates: Update[] = [];
    const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();

    const { data: scorecards, error: scError } = await window.supabaseClient
      .from('scorecards')
      .select('id, name, table_name')
      .eq('is_active', true);
    
    if (!scError && scorecards) {
      const assignmentPromises = scorecards.map(async (scorecard: Scorecard) => {
        try {
          let { data: audits, error } = await window.supabaseClient
            .from(scorecard.table_name)
            .select('id, employee_email, employee_name, auditor_email, interaction_id, created_at, submitted_at, status, passing_status, _scorecard_id, _scorecard_name, _scorecard_table')
            .eq('auditor_email', currentUserEmail)
            .order('submitted_at', { ascending: false })
            .limit(20);
          
          if (error) {
            return [];
          }
          
          if (!error && audits) {
            return audits.map((audit: Audit) => ({
              ...audit,
              status: 'completed',
              created_at: audit.created_at,
              completed_at: audit.submitted_at
            }));
          }
          return [];
        } catch (err) {
          logWarn(`Error loading from ${scorecard.table_name}:`, err);
          return [];
        }
      });
      
      const assignmentResults = await Promise.all(assignmentPromises);
      const filteredAssignments = assignmentResults.flat().filter(assignment => {
        const auditorEmail = (assignment.auditor_email || '').toLowerCase().trim();
        return auditorEmail === normalizedCurrentEmail;
      });
      
      filteredAssignments.forEach(assignment => {
        const employeeEmail = (assignment.employee_email || '').toLowerCase().trim();
        const employeeUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
        const employeeName = employeeUser?.name || assignment.employee_name || assignment.employee_email?.split('@')[0] || 'Unknown';
        
        allUpdates.push({
          id: `assignment-${assignment.id}`,
          type: 'assignment',
          displayName: employeeName,
          displayEmail: assignment.employee_email,
          timestamp: assignment.status === 'completed' && assignment.completed_at 
            ? assignment.completed_at 
            : (assignment.scheduled_date ? new Date(assignment.scheduled_date + 'T00:00:00').toISOString() : assignment.created_at),
          status: assignment.status,
          assignmentId: assignment.id
        });
      });
      
      const { data: reversalScorecards, error: reversalScError } = await window.supabaseClient
        .from('scorecards')
        .select('id, name, table_name')
        .eq('is_active', true);
      
      if (!reversalScError && reversalScorecards) {
        const reversalPromises = reversalScorecards.map(async (scorecard: Scorecard) => {
          try {
            let { data: reversals, error } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('id, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, interaction_id')
              .not('reversal_requested_at', 'is', null)
              .is('reversal_approved', null)
              .order('reversal_requested_at', { ascending: false })
              .limit(50);
            
            if (error) {
              const retryQuery = await window.supabaseClient
                .from(scorecard.table_name)
                .select('id, employee_email, auditor_email, reversal_requested_at, reversal_responded_at, reversal_approved, interaction_id')
                .not('reversal_requested_at', 'is', null)
                .order('reversal_requested_at', { ascending: false })
                .limit(50);
              
              if (!retryQuery.error && retryQuery.data) {
                reversals = retryQuery.data;
                error = null;
                if (reversals && reversals.some((r: Audit) => r.reversal_approved !== undefined)) {
                  reversals = reversals.filter((r: Audit) => r.reversal_approved === null);
                }
              } else {
                return [];
              }
            }
            
            if (!error && reversals && reversals.length > 0) {
              const filteredReversals = reversals.filter((rev: Audit) => {
                const emailToCheck = rev.auditor_email;
                if (!emailToCheck) return false;
                return emailToCheck.toLowerCase().trim() === normalizedCurrentEmail;
              });
              
              const updates: Update[] = [];
              filteredReversals.forEach((reversal: Audit) => {
                const employeeEmail = (reversal.employee_email || '').toLowerCase().trim();
                const employeeUser = allUsers.find(u => (u.email || '').toLowerCase().trim() === employeeEmail);
                const employeeName = employeeUser?.name || reversal.employee_email?.split('@')[0] || 'Unknown';
                const interactionId = reversal.interaction_id || 'N/A';
                
                if (reversal.reversal_requested_at) {
                  updates.push({
                    id: `reversal-request-${reversal.id}`,
                    type: 'reversal_requested',
                    displayName: employeeName,
                    displayEmail: reversal.employee_email,
                    timestamp: reversal.reversal_requested_at,
                    status: 'reversal_requested',
                    interactionId: interactionId,
                    scorecardId: scorecard.id,
                    scorecardTable: scorecard.table_name,
                    auditId: reversal.id
                  });
                }
              });
              return updates;
            }
            return [];
          } catch (err) {
            logWarn(`Error loading reversals from ${scorecard.table_name}:`, err);
            return [];
          }
        });
        
        const reversalResults = await Promise.all(reversalPromises);
        allUpdates.push(...reversalResults.flat());
      }
    }

    return allUpdates;
  }

  private filterAndSortUpdates(allUpdates: Update[], period: PeriodDates): Update[] {
    const { isAgent } = homeState;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    allUpdates = allUpdates.filter(update => {
      if (!update.timestamp) return false;
      
      if (isAgent && update.type === 'reversal_status_update') {
        const updateDate = new Date(update.timestamp);
        if (updateDate >= sevenDaysAgo) {
          return true;
        }
      }
      
      return this.dateFilterManager.isDateInRange(update.timestamp, period.start, period.end);
    });
    
    allUpdates.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    
    return allUpdates;
  }
}

