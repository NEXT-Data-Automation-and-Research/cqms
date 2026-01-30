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

import { getSupabase, initSupabase } from '../../../utils/supabase-init.js';
import { verifyAuth } from '../../../utils/authenticated-supabase-auth.js';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

const CHANNEL_NAME = 'audit-assignments-changes';
let auditAssignmentsChannel: RealtimeChannel | null = null;
let currentSubscribedEmail: string | null = null;
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Show a styled toast notification for audit assignments
 * Matches the app's modern dark theme with purple accents
 */
function showAssignmentToast(employeeName?: string | null): void {
  const displayName = employeeName && employeeName !== 'unknown' ? employeeName : 'an employee';
  
  console.log('[Audit assignment realtime] 🔔 Showing toast for:', displayName);
  
  // Remove any existing toast first
  document.getElementById('audit-assignment-toast')?.remove();
  
  // Add animation styles if not present
  if (!document.getElementById('audit-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'audit-toast-styles';
    style.textContent = `
      @keyframes auditToastSlideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes auditToastSlideOut {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(-20px); opacity: 0; }
      }
      #audit-assignment-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        animation: auditToastSlideIn 0.3s ease-out forwards;
      }
      #audit-assignment-toast.hiding {
        animation: auditToastSlideOut 0.2s ease-in forwards;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Create toast element - clean, formal design
  const toastDiv = document.createElement('div');
  toastDiv.id = 'audit-assignment-toast';
  toastDiv.innerHTML = `
    <div style="
      background: #047857;
      border-left: 4px solid #10b981;
      border-radius: 4px;
      padding: 16px 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      min-width: 320px;
      max-width: 400px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
        <div style="flex: 1;">
          <div style="
            font-size: 14px;
            font-weight: 600;
            color: #ffffff;
            margin-bottom: 4px;
          ">New Audit Assignment</div>
          <div style="
            font-size: 13px;
            color: rgba(255, 255, 255, 0.85);
            line-height: 1.4;
          ">You have been assigned an audit for <strong>${displayName}</strong></div>
        </div>
        <button onclick="
          this.closest('#audit-assignment-toast').classList.add('hiding');
          setTimeout(() => this.closest('#audit-assignment-toast')?.remove(), 200);
        " style="
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          font-size: 18px;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
        " onmouseover="this.style.color='#ffffff'" onmouseout="this.style.color='rgba(255,255,255,0.7)'">&times;</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(toastDiv);
  console.log('[Audit assignment realtime] ✅ Toast displayed');
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    const toast = document.getElementById('audit-assignment-toast');
    if (toast) {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 300);
    }
  }, 8000);
}

/**
 * Get the raw Supabase client (not the authenticated wrapper).
 * Realtime channels need direct access to the client, not the Proxy wrapper.
 */
async function getRawSupabaseClient(): Promise<SupabaseClient | null> {
  // First ensure Supabase is initialized
  let supabase = getSupabase();
  if (!supabase) {
    await initSupabase();
    supabase = getSupabase();
  }
  return supabase;
}

/**
 * Set up real-time subscription for audit_assignments.
 * Only one subscription is active; calling again with the same email is a no-op.
 * Call with a different email (e.g. after re-login) will replace the subscription.
 */
export async function setupAuditAssignmentRealtime(currentUserEmail: string): Promise<void> {
  const normalizedEmail = (currentUserEmail || '').toLowerCase().trim();
  if (!normalizedEmail) return;

  // Verify the user is authenticated first
  const auth = await verifyAuth();
  if (!auth.isAuthenticated) {
    console.warn('[Audit assignment realtime] User not authenticated, skipping realtime setup');
    return;
  }

  // Use the raw Supabase client for realtime (not the Proxy wrapper)
  // The Proxy wrapper can interfere with realtime channel operations
  const supabase = await getRawSupabaseClient();
  if (!supabase) {
    console.warn('[Audit assignment realtime] Supabase client not available');
    return;
  }

  if (typeof supabase.channel !== 'function') {
    console.warn('[Audit assignment realtime] Supabase realtime channel method not available');
    return;
  }

  // Avoid duplicate subscription for same user
  if (auditAssignmentsChannel && currentSubscribedEmail === normalizedEmail) {
    console.log('[Audit assignment realtime] Already subscribed for', normalizedEmail);
    return;
  }

  // Clean up previous subscription if any
  if (auditAssignmentsChannel) {
    try {
      supabase.removeChannel(auditAssignmentsChannel);
    } catch (e) {
      console.warn('[Audit assignment realtime] Error removing previous channel:', e);
    }
    auditAssignmentsChannel = null;
    currentSubscribedEmail = null;
  }

  // Reset retry count for new subscription
  retryCount = 0;

  createRealtimeSubscription(supabase, normalizedEmail);
}

/**
 * Create the realtime subscription with error handling and retry logic
 */
function createRealtimeSubscription(supabase: SupabaseClient, normalizedEmail: string): void {
  auditAssignmentsChannel = supabase
    .channel(CHANNEL_NAME)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'audit_assignments',
      },
      (payload: { new?: Record<string, unknown>; old?: Record<string, unknown>; eventType?: string }) => {
        console.log('[Audit assignment realtime] 🚨 RAW EVENT RECEIVED:', payload);
        
        const newRow = payload?.new;
        const oldRow = payload?.old;
        const eventType =
          newRow && !oldRow ? 'INSERT' : oldRow && newRow ? 'UPDATE' : oldRow && !newRow ? 'DELETE' : null;
        
        const row = newRow ?? oldRow;
        const auditorEmail = (row?.auditor_email as string)?.toLowerCase?.()?.trim?.() || 'unknown';
        const employeeName = (row?.employee_name as string) || 'unknown';
        
        // Show debug info about email comparison
        const emailMatch = auditorEmail === normalizedEmail;
        console.log('[Audit assignment realtime] Email comparison:', {
          auditorEmail,
          currentUser: normalizedEmail,
          match: emailMatch
        });
        
        // Show toast for INSERT or UPDATE events when this user is the auditor
        const shouldShowToast = (eventType === 'INSERT' || eventType === 'UPDATE') && emailMatch;
        
        console.log('[Audit assignment realtime] Event details:', { eventType, emailMatch, shouldShowToast, employeeName });
        
        if (shouldShowToast) {
          console.log('[Audit assignment realtime] ✅ This assignment is FOR YOU! Showing toast...');
          showAssignmentToast(employeeName);
        } else if (!emailMatch) {
          console.log('[Audit assignment realtime] This assignment is for someone else:', auditorEmail);
        }
        
        // Always dispatch event for any audit_assignments change (for homepage refresh)
        document.dispatchEvent(
          new CustomEvent('auditAssignmentReceived', {
            detail: { type: eventType, assignment: row, isForCurrentUser: emailMatch },
          })
        );
      }
    )
    .subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        // Log the actual error details for debugging
        console.error('[Audit assignment realtime] Subscription error:', {
          status,
          error: err,
          message: err?.message || 'Unknown error',
          retryCount
        });
        
        // ✅ FIX: Check if this is an auth-related error
        const errorMessage = err?.message?.toLowerCase() || '';
        const isAuthError = errorMessage.includes('jwt') || 
                           errorMessage.includes('token') ||
                           errorMessage.includes('auth') ||
                           errorMessage.includes('401') ||
                           errorMessage.includes('unauthorized');
        
        if (isAuthError) {
          console.log('[Audit assignment realtime] Auth error detected - will retry after session refresh');
          // Wait for potential token refresh before retrying
          setTimeout(async () => {
            // Check if still authenticated
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                console.log('[Audit assignment realtime] Session valid after auth error - retrying');
                if (auditAssignmentsChannel) {
                  try {
                    supabase.removeChannel(auditAssignmentsChannel);
                  } catch (_) {}
                  auditAssignmentsChannel = null;
                }
                createRealtimeSubscription(supabase, normalizedEmail);
              } else {
                console.log('[Audit assignment realtime] No valid session - subscription will not be retried');
                auditAssignmentsChannel = null;
                currentSubscribedEmail = null;
              }
            } catch (e) {
              console.warn('[Audit assignment realtime] Error checking session:', e);
            }
          }, 2000); // Wait 2 seconds for token refresh
          return;
        }
        
        // Attempt retry with exponential backoff for non-auth errors
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          console.log(`[Audit assignment realtime] Retrying in ${delay}ms (attempt ${retryCount}/${MAX_RETRIES})`);
          
          setTimeout(() => {
            // Clean up failed channel before retry
            if (auditAssignmentsChannel) {
              try {
                supabase.removeChannel(auditAssignmentsChannel);
              } catch (_) {
                // ignore cleanup errors
              }
              auditAssignmentsChannel = null;
            }
            createRealtimeSubscription(supabase, normalizedEmail);
          }, delay);
        } else {
          console.error('[Audit assignment realtime] Max retries reached, giving up');
          auditAssignmentsChannel = null;
          currentSubscribedEmail = null;
        }
      } else if (status === 'SUBSCRIBED') {
        console.log('[Audit assignment realtime] Successfully subscribed to audit_assignments for', normalizedEmail);
        retryCount = 0; // Reset retry count on success
        currentSubscribedEmail = normalizedEmail;
      } else if (status === 'CLOSED') {
        console.log('[Audit assignment realtime] Channel closed');
        auditAssignmentsChannel = null;
        currentSubscribedEmail = null;
      } else if (status === 'TIMED_OUT') {
        console.warn('[Audit assignment realtime] Subscription timed out, will retry');
        // Treat timeout like an error for retry purposes
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          setTimeout(() => {
            if (auditAssignmentsChannel) {
              try {
                supabase.removeChannel(auditAssignmentsChannel);
              } catch (_) {
                // ignore
              }
              auditAssignmentsChannel = null;
            }
            createRealtimeSubscription(supabase, normalizedEmail);
          }, delay);
        }
      }
    });

  // Set up cleanup on page unload
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
    const supabase = getSupabase();
    if (supabase?.removeChannel) {
      supabase.removeChannel(auditAssignmentsChannel);
    }
  } catch (e) {
    console.warn('[Audit assignment realtime] Error during teardown:', e);
  }
  auditAssignmentsChannel = null;
  currentSubscribedEmail = null;
  retryCount = 0;
}
