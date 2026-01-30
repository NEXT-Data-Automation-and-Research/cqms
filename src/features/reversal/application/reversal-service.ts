/**
 * Reversal Service
 * Business logic for reversals
 */

import type {
  ReversalRequest,
  ReversalWithAuditData,
  ProcessReversalRequest,
  ReversalWorkflowStateType
} from '../domain/types.js';
import { ReversalRepository } from '../infrastructure/reversal-repository.js';

export class ReversalService {
  constructor(private repository: ReversalRepository) {}

  /**
   * Get all reversals with audit data merged
   * 
   * @param options.requestedByEmail - Filter by requester email (legacy, use employeeEmail for employees)
   * @param options.employeeEmail - For employees: show reversals where they are either the requester OR the subject of the audit
   * @param options.onlyPending - Filter to only pending reversals
   * @param options.limit - Limit number of results
   */
  async getReversalsWithAuditData(options: {
    requestedByEmail?: string;
    employeeEmail?: string;
    onlyPending?: boolean;
    limit?: number;
  } = {}): Promise<ReversalWithAuditData[]> {
    try {
      console.log('[ReversalService] getReversalsWithAuditData called with options:', options);
      
      // Determine query options for repository
      // If employeeEmail is provided, we need to fetch without requestedByEmail filter
      // so we can also include reversals where the employee is the subject of the audit
      const repoOptions: {
        requestedByEmail?: string;
        onlyPending?: boolean;
        limit?: number;
      } = {
        onlyPending: options.onlyPending,
        limit: options.limit
      };

      // Only use requestedByEmail filter if employeeEmail is NOT provided
      // When employeeEmail is provided, we'll filter after merging with audit data
      if (options.requestedByEmail && !options.employeeEmail) {
        repoOptions.requestedByEmail = options.requestedByEmail;
      }

      // Get reversal requests
      const reversalRequests = await this.repository.getReversalRequests(repoOptions);

      console.log('[ReversalService] Got', reversalRequests.length, 'reversal requests');

      if (reversalRequests.length === 0) {
        // Backward compatibility fallback:
        // Some reversals were historically stored only on the audit tables (reversal_requested_at, etc.)
        // and may not exist in reversal_requests (e.g., if the insert failed or for older data).
        console.log('[ReversalService] No reversal_requests rows found, trying legacy audit-table fallback');
        
        const legacy = await this.repository.getLegacyReversalsFromAuditTables({
          employeeEmail: options.employeeEmail,
          limit: options.limit
        });
        
        if (!legacy.length) {
          console.log('[ReversalService] Legacy fallback returned no rows, returning empty array');
          return [];
        }
        
        // Apply employee ownership filter (already applied in repository when employeeEmail is passed,
        // but keep defensive filtering here in case repository behavior changes).
        const normalizedEmployeeEmail = options.employeeEmail?.toLowerCase().trim();
        let filtered = legacy;
        if (normalizedEmployeeEmail) {
          filtered = legacy.filter(r => (r.employee_email || '').toLowerCase().trim() === normalizedEmployeeEmail);
        }
        
        // Apply pending filter if requested
        if (options.onlyPending) {
          filtered = filtered.filter(r => this.isPendingReversal(r));
        }
        
        console.log('[ReversalService] Returning', filtered.length, 'legacy reversals after filtering');
        return filtered;
      }

      // Get workflow states
      const reversalIds = reversalRequests.map(rr => rr.id);
      const workflowStates = await this.repository.getWorkflowStates(reversalIds);
      const wsMap = new Map<string, ReversalWorkflowStateType>();
      workflowStates.forEach(ws => {
        if (ws.is_current) {
          wsMap.set(ws.reversal_request_id, ws.state);
        }
      });

      // Batch fetch audit data
      const auditDataMap = await this.repository.batchGetAuditData(reversalRequests);

      // Merge reversal requests with audit data
      const mergedReversals: ReversalWithAuditData[] = [];

      // Normalize employee email for comparison if provided
      const normalizedEmployeeEmail = options.employeeEmail?.toLowerCase().trim();

      for (const reversalReq of reversalRequests) {
        const auditData = auditDataMap.get(reversalReq.audit_id);

        if (!auditData) {
          console.warn(`Audit not found for reversal ${reversalReq.id}: audit_id=${reversalReq.audit_id}`);
          continue;
        }

        // If employeeEmail filter is provided, check if this reversal belongs to the employee
        // Employee should see reversals where:
        // 1. They requested the reversal (requested_by_email matches), OR
        // 2. The reversal record lists them as the employee (employee_email in reversal_requests matches), OR
        // 3. The audit is for them (employee_email in audit data matches)
        if (normalizedEmployeeEmail) {
          const requestedByEmail = (reversalReq.requested_by_email || '').toLowerCase().trim();
          const reversalEmployeeEmail = (reversalReq.employee_email || '').toLowerCase().trim();
          const auditEmployeeEmail = (auditData.employee_email || '').toLowerCase().trim();
          
          const isRequester = requestedByEmail === normalizedEmployeeEmail;
          const isReversalSubject = reversalEmployeeEmail === normalizedEmployeeEmail;
          const isAuditSubject = auditEmployeeEmail === normalizedEmployeeEmail;
          
          if (!isRequester && !isReversalSubject && !isAuditSubject) {
            // This reversal doesn't belong to the employee, skip it
            continue;
          }
        }

        const workflowState = wsMap.get(reversalReq.id) || 'submitted';

        const merged: ReversalWithAuditData = {
          ...reversalReq,
          ...auditData,
          // Override with reversal_requests data (new structure takes precedence)
          reversal_requested_at: reversalReq.requested_at,
          reversal_type: reversalReq.reversal_type,
          reversal_justification_from_agent: reversalReq.justification,
          reversal_metrics_parameters: reversalReq.metrics_parameters,
          reversal_attachments: reversalReq.attachments,
          score_before_appeal: reversalReq.original_score,
          score_after_appeal: reversalReq.new_score,
          reversal_approved:
            reversalReq.final_decision === 'approved'
              ? true
              : reversalReq.final_decision === 'rejected'
              ? false
              : null,
          reversal_responded_at: reversalReq.final_decision_at,
          reversal_approved_by: reversalReq.final_decision_by_name,
          reversal_processed_by_email: reversalReq.final_decision_by_email,
          sla_in_hours: reversalReq.sla_hours,
          within_auditor_scope: reversalReq.within_auditor_scope,
          reversal_workflow_state: workflowState,
          _reversal_request_id: reversalReq.id
        };

        mergedReversals.push(merged);
      }

      console.log('[ReversalService] Returning', mergedReversals.length, 'merged reversals after filtering');
      return mergedReversals;
    } catch (error) {
      console.error('Error getting reversals with audit data:', error);
      throw error;
    }
  }

  /**
   * Process a reversal (approve or reject)
   */
  async processReversal(
    request: ProcessReversalRequest,
    auditTableName: string,
    auditId: string,
    passingThreshold: number
  ): Promise<void> {
    try {
      const reversalRequest = await this.repository.getReversalRequestById(
        request.reversalRequestId
      );

      if (!reversalRequest) {
        throw new Error('Reversal request not found');
      }

      // Calculate SLA hours
      const requestedAt = new Date(reversalRequest.requested_at);
      const respondedAt = new Date();
      const slaHours = parseFloat(
        ((respondedAt.getTime() - requestedAt.getTime()) / (1000 * 60 * 60)).toFixed(2)
      );

      // Determine if passing
      const passedAfterAppeal = request.scoreAfterAppeal >= passingThreshold;

      // Update reversal request
      await this.repository.processReversal(request.reversalRequestId, request.decision, {
        new_score: request.scoreAfterAppeal,
        final_decision_by_name: request.approvedBy,
        final_decision_by_email: request.resolvedBy,
        sla_hours: slaHours
      });

      // If approved, update the audit score and passing status
      if (request.decision === 'approved') {
        const auditUpdateData: any = {
          average_score: request.scoreAfterAppeal,
          passing_status: passedAfterAppeal ? 'Passing' : 'Not Passing',
          reversal_status: 'Approved',
          reversal_approved: true,
          reversal_responded_at: respondedAt.toISOString(),
          reversal_sla_hours: slaHours,
          reversal_response_delay_reason: request.delayReason || null,
          reversal_approved_by: request.approvedBy || null,
          score_after_appeal: request.scoreAfterAppeal,
          passed_after_appeal: passedAfterAppeal
        };

        // Update audit table
        await this.repository.updateAuditTable(auditTableName, auditId, auditUpdateData);
      } else {
        // Rejected - still update audit with rejection status
        const auditUpdateData: any = {
          reversal_status: 'Rejected',
          reversal_approved: false,
          reversal_responded_at: respondedAt.toISOString(),
          reversal_sla_hours: slaHours,
          reversal_response_delay_reason: request.delayReason || null,
          reversal_approved_by: request.approvedBy || null
        };

        await this.repository.updateAuditTable(auditTableName, auditId, auditUpdateData);
      }
    } catch (error) {
      console.error('Error processing reversal:', error);
      throw error;
    }
  }

  /**
   * Get reversal workflow state
   */
  getReversalWorkflowState(reversal: ReversalWithAuditData): ReversalWorkflowStateType {
    // Priority 1: Use workflow state from new structure if available
    if (reversal.reversal_workflow_state) {
      return reversal.reversal_workflow_state;
    }

    // Priority 2: Parse from acknowledgement_status (old structure)
    const ackStatus = (reversal.acknowledgement_status || '').toLowerCase();

    if (ackStatus.includes('team_lead_review')) return 'team_lead_review';
    if (ackStatus.includes('team_lead_rejected')) return 'team_lead_rejected';
    if (ackStatus.includes('qa_review') || ackStatus.includes('auditor_review'))
      return 'qa_review';
    if (ackStatus.includes('cqc_review')) return 'cqc_review';
    if (ackStatus.includes('cqc_sent_back')) return 'cqc_sent_back';
    if (ackStatus.includes('agent_re_review')) return 'agent_re_review';
    if (ackStatus.includes('reversal_approved')) return 'approved';
    if (ackStatus.includes('reversal_rejected')) return 'rejected';
    if (ackStatus === 'acknowledged' || ackStatus.includes('acknowledged'))
      return 'acknowledged';

    // Priority 3: Fallback to old logic using reversal_approved
    const approved = reversal.reversal_approved;
    if (approved === null || approved === undefined) return 'submitted';
    if (approved === true || approved === 'true' || approved === 1 || approved === '1')
      return 'approved';
    if (approved === false || approved === 'false' || approved === 0 || approved === '0')
      return 'rejected';

    return 'submitted';
  }

  /**
   * Check if a reversal is in a pending state
   */
  isPendingReversal(reversal: ReversalWithAuditData): boolean {
    const workflowState = this.getReversalWorkflowState(reversal);

    const pendingStates: ReversalWorkflowStateType[] = [
      'submitted',
      'team_lead_review',
      'team_lead_approved',
      'qa_review',
      'cqc_review',
      'cqc_sent_back',
      'agent_re_review'
    ];

    if (pendingStates.includes(workflowState)) {
      return true;
    }

    // Check if team lead approved but QC hasn't made final decision
    const teamLeadApproved =
      reversal.team_lead_approved === true ||
      reversal.team_lead_approved === 'true' ||
      reversal.team_lead_approved === 1 ||
      reversal.team_lead_approved === '1';
    const finalDecision = reversal.reversal_approved;
    const hasFinalDecision = finalDecision !== null && finalDecision !== undefined;

    if (teamLeadApproved && !hasFinalDecision) {
      return true;
    }

    return false;
  }
}
