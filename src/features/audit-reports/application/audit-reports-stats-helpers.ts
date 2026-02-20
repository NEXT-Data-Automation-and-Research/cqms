/**
 * Audit Reports Stats Helpers
 * Helper functions for calculating audit statistics
 */

import type { AuditReport, AuditStats } from '../domain/entities.js';
import { isAcknowledgedStatus } from './agent-acknowledgement-stats.js';

/**
 * Normalize passing status
 */
function normalizePassingStatus(status: string | undefined): string {
  if (!status) return 'Not Passed';
  const normalized = status.toLowerCase().trim();
  // Check for all variations: "passing", "passed", "pass"
  if (normalized === 'passing' || normalized === 'passed' || normalized === 'pass') {
    return 'Passed';
  }
  return 'Not Passed';
}

/**
 * Calculate audit statistics
 */
export function calculateAuditStats(audits: AuditReport[]): AuditStats {
  const total = audits.length;
  
  // Calculate scores
  const scores = audits
    .map(a => {
      const score = typeof a.averageScore === 'number' 
        ? a.averageScore 
        : parseFloat(String(a.averageScore || 0));
      return isNaN(score) ? null : score;
    })
    .filter((s): s is number => s !== null);
  
  const totalScores = scores.reduce((sum, score) => sum + score, 0);
  const auditsWithScores = scores.length;
  const avgScore = auditsWithScores > 0 ? Math.round(totalScores / auditsWithScores) : 0;

  // Calculate passing
  const passing = audits.filter(a => 
    normalizePassingStatus(a.passingStatus) === 'Passed'
  ).length;
  const passRate = total > 0 ? Math.round((passing / total) * 100) : 0;

  // Calculate errors
  const totalErrors = audits.reduce((sum, audit) => {
    const errors = typeof audit.totalErrorsCount === 'number'
      ? audit.totalErrorsCount
      : parseFloat(String(audit.totalErrorsCount || 0));
    return sum + (isNaN(errors) ? 0 : errors);
  }, 0);

  const totalCriticalErrors = audits.reduce((sum, audit) => {
    const criticalFail = typeof audit.criticalFailError === 'number'
      ? audit.criticalFailError
      : parseFloat(String(audit.criticalFailError || 0));
    // Use criticalErrors (plural) - this is the correct field from the database
    const critical = typeof audit.criticalErrors === 'number'
      ? audit.criticalErrors
      : parseFloat(String(audit.criticalErrors || 0));
    return sum + (isNaN(criticalFail) ? 0 : criticalFail) + (isNaN(critical) ? 0 : critical);
  }, 0);

  const criticalErrorRate = totalErrors > 0 
    ? Math.round((totalCriticalErrors / totalErrors) * 100) 
    : 0;

  const avgErrorsPerAudit = total > 0 
    ? Math.round((totalErrors / total) * 100) / 100 
    : 0;

  // Calculate reversals
  const reversals = audits.filter(a => 
    a.reversalRequestedAt || a.reversal_requested_at
  ).length;
  const reversalRate = total > 0 ? Math.round((reversals / total) * 100) : 0;

  // Calculate acknowledgements (align with audit-view: Acknowledged, Acknowledged - after reversal approved/rejected)
  const acknowledged = audits.filter(a => 
    isAcknowledgedStatus(a.acknowledgementStatus ?? (a as { acknowledgement_status?: string }).acknowledgement_status)
  ).length;
  const pendingAcknowledgments = total - acknowledged;

  // Calculate not passed
  const notPassing = audits.filter(a => 
    normalizePassingStatus(a.passingStatus) === 'Not Passed'
  ).length;

  return {
    total,
    totalScores,
    auditsWithScores,
    avgScore,
    passing,
    passRate,
    totalCriticalErrors,
    totalErrors,
    criticalErrorRate,
    avgErrorsPerAudit,
    reversals,
    reversalRate,
    acknowledged,
    pendingAcknowledgments,
    notPassing
  };
}

