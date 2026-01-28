/**
 * Real-time audit assignment notifications
 *
 * Subscribes to Supabase Postgres Changes on audit_assignments.
 * When an assignment is inserted for the current user (auditor_email),
 * shows a toast and dispatches auditAssignmentReceived for the Home page to refresh.
 *
 * Set up once per session from the sidebar (all pages) so Person B sees the
 * notification no matter which page they are on.
 */

import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import type { RealtimeChannel } from '@supabase/supabase-js';

const CHANNEL_NAME = 'audit-assignments-changes';
let auditAssignmentsChannel: RealtimeChannel | null = null;
let currentSubscribedEmail: string | null = null;

/**
 * Show a platform toast for "You have been assigned a new audit"
 */
async function showAssignmentToast(employeeName?: string | null): Promise<void> {
  try {
    const { showToast } = await import('../../../utils/toast.js');
    const message = employeeName
      ? `You have been assigned a new audit: ${employeeName}`
      : 'You have been assigned a new audit';
    showToast({ message, type: 'success', duration: 5000 });
  } catch (e) {
    console.warn('Could not show assignment toast:', e);
  }
}

/**
 * Set up real-time subscription for audit_assignments.
 * Only one subscription is active; calling again with the same email is a no-op.
 * Call with a different email (e.g. after re-login) will replace the subscription.
 */
export async function setupAuditAssignmentRealtime(currentUserEmail: string): Promise<void> {
  const normalizedEmail = (currentUserEmail || '').toLowerCase().trim();
  if (!normalizedEmail) return;

  const supabase = await getAuthenticatedSupabase();
  if (!supabase) return;

  const client = supabase as unknown as { channel: (name: string) => RealtimeChannel };
  if (typeof client.channel !== 'function') {
    console.warn('Supabase realtime channel not available');
    return;
  }

  // Avoid duplicate subscription for same user
  if (auditAssignmentsChannel && currentSubscribedEmail === normalizedEmail) {
    return;
  }

  // Clean up previous subscription if any
  if (auditAssignmentsChannel) {
    try {
      supabase.removeChannel(auditAssignmentsChannel);
    } catch (_) {
      // ignore
    }
    auditAssignmentsChannel = null;
    currentSubscribedEmail = null;
  }

  auditAssignmentsChannel = client
    .channel(CHANNEL_NAME)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'audit_assignments',
      },
      (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => {
        const newRow = payload?.new;
        const oldRow = payload?.old;
        const eventType =
          newRow && !oldRow ? 'INSERT' : oldRow && newRow ? 'UPDATE' : oldRow && !newRow ? 'DELETE' : null;
        if (!eventType) return;

        const row = newRow ?? oldRow;
        if (!row || typeof row !== 'object') return;

        const auditorEmail = (row.auditor_email as string)?.toLowerCase?.()?.trim?.();
        if (auditorEmail !== normalizedEmail) return;

        console.log('[Audit assignment realtime] Event for you:', eventType, row);

        if (eventType === 'INSERT') {
          const employeeName = row.employee_name as string | null | undefined;
          showAssignmentToast(employeeName ?? undefined);
        }

        document.dispatchEvent(
          new CustomEvent('auditAssignmentReceived', {
            detail: { type: eventType, assignment: row },
          })
        );
      }
    )
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('[Audit assignment realtime] Subscription error');
      } else if (status === 'SUBSCRIBED') {
        console.log('[Audit assignment realtime] Subscribed to audit_assignments for', normalizedEmail);
      }
    });

  currentSubscribedEmail = normalizedEmail;

  const cleanup = () => {
    if (auditAssignmentsChannel) {
      try {
        supabase.removeChannel(auditAssignmentsChannel);
      } catch (_) {
        // ignore
      }
      auditAssignmentsChannel = null;
      currentSubscribedEmail = null;
    }
    window.removeEventListener('beforeunload', cleanup);
  };

  window.addEventListener('beforeunload', cleanup);
}

/**
 * Tear down the subscription (e.g. on logout). Safe to call even if not set up.
 */
export function teardownAuditAssignmentRealtime(): void {
  if (!auditAssignmentsChannel) return;
  try {
    const supabase = (window as unknown as { supabaseClient?: { removeChannel: (ch: RealtimeChannel) => void } })
      .supabaseClient;
    if (supabase?.removeChannel) {
      supabase.removeChannel(auditAssignmentsChannel);
    }
  } catch (_) {
    // ignore
  }
  auditAssignmentsChannel = null;
  currentSubscribedEmail = null;
}
