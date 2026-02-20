/**
 * Agent Acknowledgement Stats
 * Aggregates acknowledgement status by audited employee (agent).
 */

import type { AuditReport, AgentAcknowledgementRow, AgentAcknowledgementStats } from '../domain/entities.js';

/**
 * Whether an audit is considered acknowledged (matches audit-view logic).
 */
export function isAcknowledgedStatus(status: string | undefined): boolean {
  if (!status || typeof status !== 'string') return false;
  const s = status.toLowerCase().trim();
  return (
    s === 'acknowledged' ||
    s.includes('acknowledged - after reversal approved') ||
    s.includes('acknowledged - after reversal rejected') ||
    s.includes('reversal approved') ||
    s.includes('reversal rejected')
  );
}

/**
 * Check if a single audit is acknowledged.
 */
function isAuditAcknowledged(audit: AuditReport): boolean {
  const status =
    audit.acknowledgementStatus ??
    (audit as { acknowledgement_status?: string }).acknowledgement_status ??
    '';
  return isAcknowledgedStatus(status);
}

/**
 * Check if audit is under reversal (pending team_lead/qa/cqc review) - matches legacy.
 */
export function isAuditUnderReversal(audit: AuditReport): boolean {
  const reversalRequestedAt =
    audit.reversalRequestedAt ?? (audit as { reversal_requested_at?: string }).reversal_requested_at;
  if (!reversalRequestedAt) return false;
  const ackStatus = (
    (audit.acknowledgementStatus ?? (audit as { acknowledgement_status?: string }).acknowledgement_status) ?? ''
  ).toLowerCase();
  if (
    ackStatus.includes('team_lead_review') ||
    ackStatus.includes('qa_review') ||
    ackStatus.includes('auditor_review') ||
    ackStatus.includes('cqc_review')
  ) {
    return true;
  }
  const reversalRespondedAt =
    audit.reversalRespondedAt ?? (audit as { reversal_responded_at?: string }).reversal_responded_at;
  const reversalApproved =
    audit.reversalApproved ?? (audit as { reversal_approved?: boolean }).reversal_approved;
  if (reversalRequestedAt && !reversalRespondedAt) return true;
  if (reversalRequestedAt && (reversalApproved === null || reversalApproved === undefined)) return true;
  return false;
}

/**
 * Compute agent acknowledgement stats from a list of audits.
 */
export function calculateAgentAcknowledgementStats(
  audits: AuditReport[]
): AgentAcknowledgementStats {
  const total = audits.length;
  const acknowledged = audits.filter(isAuditAcknowledged).length;
  const pending = total - acknowledged;
  const ratePercent = total > 0 ? Math.round((acknowledged / total) * 100) : 0;

  // Group by agent (employee_email); track lastAcknowledgedAt per agent
  const byEmail = new Map<
    string,
    { name: string; total: number; acknowledged: number; lastAcknowledgedAt: string | null }
  >();

  for (const audit of audits) {
    const email = (audit.employeeEmail ?? (audit as any).employee_email ?? '')
      .trim()
      .toLowerCase();
    const name =
      (audit.employeeName ?? (audit as any).employee_name ?? '')?.trim() ||
      email ||
      'Unknown';
    if (!email) continue;

    const ackDate =
      (audit.acknowledgementStatusUpdatedAt ?? (audit as any).acknowledgement_status_updated_at) ?? null;
    const acknowledged = isAuditAcknowledged(audit);

    const existing = byEmail.get(email);
    if (!existing) {
      byEmail.set(email, {
        name,
        total: 1,
        acknowledged: acknowledged ? 1 : 0,
        lastAcknowledgedAt: acknowledged && ackDate ? ackDate : null
      });
    } else {
      existing.total += 1;
      if (acknowledged) {
        existing.acknowledged += 1;
        if (ackDate && (!existing.lastAcknowledgedAt || new Date(ackDate) > new Date(existing.lastAcknowledgedAt))) {
          existing.lastAcknowledgedAt = ackDate;
        }
      }
    }
  }

  const byAgent: AgentAcknowledgementRow[] = Array.from(byEmail.entries())
    .map(([agentEmail, data]) => ({
      agentEmail,
      agentName: data.name,
      total: data.total,
      acknowledged: data.acknowledged,
      pending: data.total - data.acknowledged,
      ratePercent:
        data.total > 0 ? Math.round((data.acknowledged / data.total) * 100) : 0,
      lastAcknowledgedAt: data.lastAcknowledgedAt ?? undefined
    }))
    .sort((a, b) => b.pending - a.pending); // Most pending first

  const pendingAudits = audits.filter((a) => !isAuditAcknowledged(a));

  return {
    total,
    acknowledged,
    pending,
    ratePercent,
    byAgent,
    pendingAudits
  };
}
