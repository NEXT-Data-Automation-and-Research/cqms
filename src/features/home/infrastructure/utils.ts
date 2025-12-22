/**
 * Utility Functions
 * Common helper functions used throughout the home page
 */

import type { Audit, User } from './types.js';

/**
 * Format timestamp to human-readable relative time
 */
export function formatTimestamp(timestamp: string | Date | null | undefined): string {
  if (!timestamp) return 'N/A';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/**
 * Get status text based on status and user role
 */
export function getStatusText(status: string, isAgentView = false): string {
  if (isAgentView) {
    const statusMap: { [key: string]: string } = {
      'pending': 'audit assigned',
      'in_progress': 'audit in progress',
      'completed': 'audit completed'
    };
    return statusMap[status] || 'updated';
  } else {
    const statusMap: { [key: string]: string } = {
      'pending': 'was assigned',
      'in_progress': 'started',
      'completed': 'completed'
    };
    return statusMap[status] || 'updated';
  }
}

/**
 * Normalize passing status values
 */
export function normalizePassingStatus(status: string | null | undefined): string {
  if (!status) return status || '';
  if (status === 'Passing' || status === 'Pass') return 'Passed';
  if (status === 'Not Passing') return 'Not Passed';
  return status;
}

/**
 * Get user initials from name
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name.split(' ').map((n: string) => n.charAt(0)).join('').toUpperCase().slice(0, 2);
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format agent name from email
 */
export function formatAgentName(email: string | null | undefined): string {
  if (!email || email === 'Unknown') return 'Unknown';
  return email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
}

/**
 * Get acknowledgment status chip HTML
 */
export function getAcknowledgmentStatusChip(audit: Audit): string {
  const acknowledgementStatus = audit.acknowledgement_status || audit.acknowledgementStatus || '';
  
  const isAcknowledged = acknowledgementStatus && (
    acknowledgementStatus.toLowerCase().includes('acknowledged') || 
    acknowledgementStatus === 'Acknowledged'
  );
  
  const isPending = acknowledgementStatus && (
    acknowledgementStatus.toLowerCase() === 'pending' || 
    acknowledgementStatus === 'Pending'
  );
  
  if (!acknowledgementStatus || acknowledgementStatus.trim() === '') {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: #fef3c7; color: #92400e;">
      <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Acknowledgement Pending
    </span>`;
  }
  
  if (isAcknowledged) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: #dcfce7; color: #166534;">
      <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
      </svg>
      Acknowledged
    </span>`;
  }
  
  if (isPending) {
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: #fef3c7; color: #92400e;">
      <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      Acknowledgement Pending
    </span>`;
  }
  
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: #fef3c7; color: #92400e;">
    <svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
    Acknowledgement Pending
  </span>`;
}

/**
 * Get reversal status chip HTML
 */
export function getReversalStatusChip(audit: Audit): string {
  const reversalRequestedAt = audit.reversal_requested_at || audit.reversalRequestedAt;
  const reversalRespondedAt = audit.reversal_responded_at || audit.reversalRespondedAt;
  const reversalApproved = audit.reversal_approved;
  const acknowledgementStatus = audit.acknowledgement_status || audit.acknowledgementStatus;
  
  if (!reversalRequestedAt) return '';
  
  let status: string | null = null;
  
  if (acknowledgementStatus === 'Acknowledged') {
    status = 'Acknowledged';
  } else if (reversalRequestedAt && !reversalRespondedAt) {
    status = 'Pending';
  } else if (reversalRespondedAt) {
    if (reversalApproved === true || reversalApproved === 'true' || reversalApproved === 1 || reversalApproved === '1') {
      status = 'Approved';
    } else if (reversalApproved === false || reversalApproved === 'false' || reversalApproved === 0 || reversalApproved === '0') {
      status = 'Rejected';
    } else {
      status = 'Pending';
    }
  }
  
  if (!status) return '';
  
  let statusBgColor: string, statusTextColor: string, statusIcon: string, statusText: string;
  if (status === 'Pending') {
    statusBgColor = '#fef3c7';
    statusTextColor = '#92400e';
    statusIcon = `<svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>`;
    statusText = 'Pending';
  } else if (status === 'Approved') {
    statusBgColor = '#dcfce7';
    statusTextColor = '#166534';
    statusIcon = `<svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>`;
    statusText = 'Approved';
  } else if (status === 'Rejected') {
    statusBgColor = '#fee2e2';
    statusTextColor = '#991b1b';
    statusIcon = `<svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
    </svg>`;
    statusText = 'Rejected';
  } else if (status === 'Acknowledged') {
    statusBgColor = '#dbeafe';
    statusTextColor = '#1e40af';
    statusIcon = `<svg style="width: 0.75rem; height: 0.75rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
    </svg>`;
    statusText = 'Acknowledged';
  } else {
    statusBgColor = '#f3f4f6';
    statusTextColor = '#374151';
    statusIcon = '';
    statusText = status;
  }
  
  return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold" style="background-color: ${statusBgColor}; color: ${statusTextColor};">
    ${statusIcon}
    ${statusText}
  </span>`;
}

/**
 * Wait for Supabase client to be available
 */
export async function waitForSupabase(maxWait = 2000): Promise<boolean> {
  if ((window as any).supabaseClient) return true;
  
  const startTime = Date.now();
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if ((window as any).supabaseClient) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > maxWait) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 50);
  });
}

/**
 * Navigation functions
 */
export function viewAudit(assignmentId: string): void {
  window.location.href = `create-audit.html?assignment=${assignmentId}`;
}

export function viewAuditDetails(auditId: string, scorecardId: string, tableName: string): void {
  window.location.href = `audit-view.html?id=${auditId}&scorecard=${scorecardId || ''}&table=${tableName || ''}`;
}

