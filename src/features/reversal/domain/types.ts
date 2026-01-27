/**
 * Reversal Domain Types
 */

export interface ReversalRequest {
  id: string;
  audit_id: string;
  scorecard_table_name: string;
  requested_by_email: string;
  requested_at: string;
  reversal_type: string;
  justification: string;
  metrics_parameters?: Record<string, any>;
  attachments?: string[];
  original_score: number;
  new_score?: number;
  final_decision?: 'approved' | 'rejected' | null;
  final_decision_at?: string;
  final_decision_by_name?: string;
  final_decision_by_email?: string;
  sla_hours?: number;
  within_auditor_scope?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ReversalWorkflowState {
  id?: string;
  reversal_request_id: string;
  state: ReversalWorkflowStateType;
  is_current: boolean;
  created_at?: string;
}

export type ReversalWorkflowStateType =
  | 'submitted'
  | 'team_lead_review'
  | 'team_lead_approved'
  | 'team_lead_rejected'
  | 'qa_review'
  | 'cqc_review'
  | 'cqc_sent_back'
  | 'agent_re_review'
  | 'approved'
  | 'rejected'
  | 'acknowledged';

export interface ReversalWithAuditData extends ReversalRequest {
  // Audit data merged from scorecard table
  employee_email?: string;
  employee_name?: string;
  auditor_email?: string;
  auditor_name?: string;
  interaction_id?: string;
  submitted_at?: string;
  average_score?: number;
  passing_status?: string;
  acknowledgement_status?: string;
  reversal_workflow_state?: ReversalWorkflowStateType;
  _scorecard_id?: string;
  _scorecard_name?: string;
  _scorecard_table?: string;
  // Reversal fields from audit table (old structure) or merged from reversal_requests
  // Note: reversal_type, metrics_parameters, attachments, sla_hours, and within_auditor_scope
  // are already inherited from ReversalRequest, so we don't redeclare them here
  reversal_requested_at?: string;
  reversal_justification_from_agent?: string;
  reversal_metrics_parameters?: Record<string, any>;
  reversal_attachments?: string[];
  score_before_appeal?: number;
  score_after_appeal?: number;
  reversal_approved?: boolean | string | number | null;
  reversal_responded_at?: string;
  reversal_approved_by?: string;
  reversal_processed_by_email?: string;
  sla_in_hours?: number;
  team_lead_approved?: boolean | string | number | null;
  _reversal_request_id?: string;
}

export interface ProcessReversalRequest {
  reversalRequestId: string;
  decision: 'approved' | 'rejected';
  scoreAfterAppeal: number;
  approvedBy: string;
  resolvedBy: string;
  delayReason?: string;
}