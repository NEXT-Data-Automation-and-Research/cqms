/**
 * Audit Data Mapper
 * Maps database fields (snake_case) to TypeScript interface (camelCase)
 */

import type { AuditReport } from '../domain/entities.js';

/**
 * Map database row to AuditReport interface
 * Handles both snake_case and camelCase field names
 */
export function mapAuditData(row: any): AuditReport {
  return {
    id: row.id || row.ID || '',
    employeeEmail: row.employee_email || row.employeeEmail || '',
    employeeName: row.employee_name || row.employeeName || '',
    employeeType: row.employee_type || row.employeeType,
    auditorEmail: row.auditor_email || row.auditorEmail || '',
    auditorName: row.auditor_name || row.auditorName,
    interactionId: row.interaction_id !== undefined && row.interaction_id !== null 
      ? String(row.interaction_id) 
      : (row.interactionId !== undefined && row.interactionId !== null 
          ? String(row.interactionId) 
          : ''),
    interactionDate: row.interaction_date || row.interactionDate,
    auditType: row.audit_type || row.auditType,
    channel: row.channel || '',
    channelName: row.channel_name || row.channelName || undefined,
    quarter: row.quarter,
    week: row.week ? Number(row.week) : undefined,
    countryOfEmployee: row.country_of_employee || row.countryOfEmployee,
    clientEmail: row.client_email || row.clientEmail,
    clientName: row.client_name || row.clientName,
    agentPreStatus: row.agent_pre_status || row.agentPreStatus,
    agentPostStatus: row.agent_post_status || row.agentPostStatus,
    passingStatus: row.passing_status || row.passingStatus || 'Not Passed',
    validationStatus: row.validation_status || row.validationStatus,
    averageScore: row.average_score !== undefined && row.average_score !== null 
      ? (typeof row.average_score === 'number' ? row.average_score : parseFloat(String(row.average_score)) || 0)
      : (row.averageScore !== undefined && row.averageScore !== null 
          ? (typeof row.averageScore === 'number' ? row.averageScore : parseFloat(String(row.averageScore)) || 0)
          : 0),
    criticalErrors: row.critical_errors !== undefined && row.critical_errors !== null
      ? (typeof row.critical_errors === 'number' ? row.critical_errors : parseInt(String(row.critical_errors), 10) || 0)
      : (row.criticalErrors !== undefined && row.criticalErrors !== null
          ? (typeof row.criticalErrors === 'number' ? row.criticalErrors : parseInt(String(row.criticalErrors), 10) || 0)
          : 0),
    totalErrorsCount: row.total_errors_count !== undefined && row.total_errors_count !== null
      ? (typeof row.total_errors_count === 'number' ? row.total_errors_count : parseInt(String(row.total_errors_count), 10) || 0)
      : (row.totalErrorsCount !== undefined && row.totalErrorsCount !== null
          ? (typeof row.totalErrorsCount === 'number' ? row.totalErrorsCount : parseInt(String(row.totalErrorsCount), 10) || 0)
          : 0),
    transcript: row.transcript,
    errorDescription: row.error_description || row.errorDescription,
    criticalFailError: row.critical_fail_error !== undefined && row.critical_fail_error !== null
      ? (typeof row.critical_fail_error === 'number' ? row.critical_fail_error : parseInt(String(row.critical_fail_error), 10) || 0)
      : (row.criticalFailError !== undefined && row.criticalFailError !== null
          ? (typeof row.criticalFailError === 'number' ? row.criticalFailError : parseInt(String(row.criticalFailError), 10) || 0)
          : 0),
    criticalError: row.critical_error !== undefined && row.critical_error !== null
      ? (typeof row.critical_error === 'number' ? row.critical_error : parseInt(String(row.critical_error), 10) || 0)
      : (row.criticalError !== undefined && row.criticalError !== null
          ? (typeof row.criticalError === 'number' ? row.criticalError : parseInt(String(row.criticalError), 10) || 0)
          : 0),
    significantError: row.significant_error !== undefined && row.significant_error !== null
      ? (typeof row.significant_error === 'number' ? row.significant_error : parseInt(String(row.significant_error), 10) || 0)
      : (row.significantError !== undefined && row.significantError !== null
          ? (typeof row.significantError === 'number' ? row.significantError : parseInt(String(row.significantError), 10) || 0)
          : 0),
    recommendations: row.recommendations,
    reversalRequestedAt: row.reversal_requested_at || row.reversalRequestedAt,
    reversalRespondedAt: row.reversal_responded_at || row.reversalRespondedAt,
    reversalApproved: row.reversal_approved !== undefined ? row.reversal_approved : row.reversalApproved,
    acknowledgementStatus: row.acknowledgement_status || row.acknowledgementStatus,
    acknowledgementStatusUpdatedAt: row.acknowledgement_status_updated_at || row.acknowledgementStatusUpdatedAt,
    auditDuration: row.audit_duration !== undefined && row.audit_duration !== null
      ? (typeof row.audit_duration === 'number' ? row.audit_duration : parseInt(String(row.audit_duration), 10) || 0)
      : (row.auditDuration !== undefined && row.auditDuration !== null
          ? (typeof row.auditDuration === 'number' ? row.auditDuration : parseInt(String(row.auditDuration), 10) || 0)
          : 0),
    submittedAt: row.submitted_at || row.submittedAt,
    auditTimestamp: row.audit_timestamp || row.auditTimestamp,
    auditStartTime: row.audit_start_time || row.auditStartTime,
    auditEndTime: row.audit_end_time || row.auditEndTime,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
    // Scorecard metadata (preserve if already set)
    _scorecard_id: row._scorecard_id,
    _scorecard_name: row._scorecard_name,
    _scorecard_table: row._scorecard_table,
    _scoring_type: row._scoring_type,
    // Preserve any other dynamic fields
    ...Object.keys(row).reduce((acc, key) => {
      if (!key.includes('_scorecard_') && !['id', 'employee_email', 'employee_name', 'auditor_email', 'interaction_id'].includes(key)) {
        acc[key] = row[key];
      }
      return acc;
    }, {} as any)
  } as AuditReport;
}

/**
 * Map array of database rows to AuditReport array
 */
export function mapAuditDataArray(rows: any[]): AuditReport[] {
  return (rows || []).map(mapAuditData);
}

