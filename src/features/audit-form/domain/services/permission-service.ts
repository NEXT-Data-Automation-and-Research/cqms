/**
 * Permission Service
 * Centralized service for checking user permissions on audits
 * Extracted from inline logic in audit-view.html
 */

import type { AuditFormData } from '../entities.js';

export interface AuditPermissions {
  canEdit: boolean;
  canAcknowledge: boolean;
  canRequestReversal: boolean;
  canViewReversal: boolean;
  canRespondToReversal: boolean;
  canRate: boolean;
  isOwner: boolean;
  isAuditor: boolean;
}

export interface UserContext {
  email: string;
  role?: string;
  isAuditor?: boolean;
  isQualityAnalyst?: boolean;
  isAdmin?: boolean;
}

/**
 * Acknowledgement status values that indicate the audit is locked
 */
const ACKNOWLEDGED_STATUSES = [
  'acknowledged',
  'acknowledged - after reversal approved',
  'acknowledged - after reversal rejected'
];

/**
 * Check if a status indicates the audit is acknowledged (locked)
 */
export function isAcknowledgedStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const statusLower = status.toLowerCase().trim();
  return ACKNOWLEDGED_STATUSES.includes(statusLower);
}

/**
 * Check if audit has a pending reversal request
 */
export function hasPendingReversal(audit: Partial<AuditFormData> | Record<string, any>): boolean {
  // Cast to Record to allow flexible property access (supports both camelCase and snake_case from DB)
  const auditRecord = audit as Record<string, any>;
  
  // Check for reversal_requested_at or reversalRequestedAt
  const reversalRequestedAt = auditRecord.reversal_requested_at || auditRecord.reversalRequestedAt;
  if (!reversalRequestedAt) return false;
  
  // Check if reversal has been responded to
  const reversalRespondedAt = auditRecord.reversal_responded_at || auditRecord.reversalRespondedAt;
  const reversalApproved = auditRecord.reversal_approved ?? auditRecord.reversalApproved;
  
  // Pending if requested but not responded to
  if (!reversalRespondedAt && reversalApproved === null) {
    return true;
  }
  
  // Check acknowledgement status for workflow state
  const ackStatus = auditRecord.acknowledgement_status || auditRecord.acknowledgementStatus || '';
  const statusLower = ackStatus.toLowerCase();
  
  // Check for specific workflow states
  if (statusLower.includes('reversal requested') || 
      statusLower.includes('pending reversal') ||
      statusLower.includes('team lead review')) {
    return true;
  }
  
  return false;
}

/**
 * Check if audit has reversal request (pending or resolved)
 */
export function hasReversalRequest(audit: Partial<AuditFormData> | Record<string, any>): boolean {
  const auditRecord = audit as Record<string, any>;
  const reversalRequestedAt = auditRecord.reversal_requested_at || auditRecord.reversalRequestedAt;
  return !!reversalRequestedAt;
}

export class PermissionService {
  private currentUser: UserContext | null = null;

  /**
   * Initialize with current user context
   */
  async initialize(): Promise<boolean> {
    try {
      const supabase = (window as any).supabaseClient;
      if (!supabase) {
        // Wait for Supabase
        let attempts = 0;
        while (!(window as any).supabaseClient && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      const client = (window as any).supabaseClient;
      if (!client) return false;

      const { data: { session } } = await client.auth.getSession();
      if (!session?.user) return false;

      this.currentUser = {
        email: session.user.email || '',
        role: session.user.user_metadata?.role || 'user',
        isAuditor: this.checkIfAuditor(session.user.email || ''),
        isQualityAnalyst: this.checkIfQualityAnalyst(session.user.email || ''),
        isAdmin: session.user.user_metadata?.is_admin === true
      };

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Set current user context manually
   */
  setUserContext(user: UserContext): void {
    this.currentUser = user;
  }

  /**
   * Get current user context
   */
  getUserContext(): UserContext | null {
    return this.currentUser;
  }

  /**
   * Check if user is an auditor (simplified check)
   */
  private checkIfAuditor(email: string): boolean {
    // This can be enhanced with actual role checking from database
    // For now, check if user has auditor role or matches auditor patterns
    const auditorDomains = ['@auditor.', '@qa.', '@quality.'];
    return auditorDomains.some(domain => email.includes(domain)) ||
           (window as any).isCurrentUserAuditor?.() === true;
  }

  /**
   * Check if user is a Quality Analyst
   */
  private checkIfQualityAnalyst(email: string): boolean {
    // This can be enhanced with actual role checking from database
    return (window as any).isCurrentUserQualityAnalyst?.() === true;
  }

  /**
   * Get all permissions for an audit
   */
  getPermissions(audit: Partial<AuditFormData> | Record<string, any>): AuditPermissions {
    if (!this.currentUser) {
      return {
        canEdit: false,
        canAcknowledge: false,
        canRequestReversal: false,
        canViewReversal: false,
        canRespondToReversal: false,
        canRate: false,
        isOwner: false,
        isAuditor: false
      };
    }

    // Cast to Record to allow flexible property access (supports both camelCase and snake_case from DB)
    const auditRecord = audit as Record<string, any>;

    const userEmail = this.currentUser.email.toLowerCase();
    const auditorEmail = (auditRecord.auditor_email || auditRecord.auditorEmail || '').toLowerCase();
    const employeeEmail = (auditRecord.employee_email || auditRecord.employeeEmail || '').toLowerCase();
    
    const isOwner = auditorEmail === userEmail;
    const isEmployee = employeeEmail === userEmail;
    const isAuditor = this.currentUser.isAuditor || false;
    const isQA = this.currentUser.isQualityAnalyst || false;
    const isAdmin = this.currentUser.isAdmin || false;

    const ackStatus = auditRecord.acknowledgement_status || auditRecord.acknowledgementStatus || '';
    const isAcknowledged = isAcknowledgedStatus(ackStatus);
    const hasPending = hasPendingReversal(audit);

    return {
      canEdit: this.checkCanEdit(audit, isOwner, isAuditor, isQA, isAcknowledged, hasPending),
      canAcknowledge: this.checkCanAcknowledge(audit, isEmployee, isAcknowledged, hasPending),
      canRequestReversal: this.checkCanRequestReversal(audit, isEmployee, isAcknowledged, hasPending),
      canViewReversal: hasReversalRequest(audit),
      canRespondToReversal: this.checkCanRespondToReversal(audit, isOwner, isAuditor, isQA, hasPending),
      canRate: this.checkCanRate(audit, isEmployee, isAcknowledged),
      isOwner,
      isAuditor
    };
  }

  /**
   * Check if user can edit the audit
   */
  private checkCanEdit(
    audit: Partial<AuditFormData> | Record<string, any>,
    isOwner: boolean,
    isAuditor: boolean,
    isQA: boolean,
    isAcknowledged: boolean,
    hasPendingReversal: boolean
  ): boolean {
    // Acknowledged audits cannot be edited by anyone
    if (isAcknowledged) return false;

    // Auditors can edit their own audits anytime (unless acknowledged)
    if (isAuditor) return true;

    // QA can only edit when there's a pending reversal
    if (isQA && hasPendingReversal) return true;

    return false;
  }

  /**
   * Check if user can acknowledge the audit
   */
  private checkCanAcknowledge(
    audit: Partial<AuditFormData> | Record<string, any>,
    isEmployee: boolean,
    isAcknowledged: boolean,
    hasPendingReversal: boolean
  ): boolean {
    // Already acknowledged
    if (isAcknowledged) return false;

    // Can't acknowledge while reversal is pending
    if (hasPendingReversal) return false;

    // Only the employee being audited can acknowledge
    return isEmployee;
  }

  /**
   * Check if user can request a reversal
   */
  private checkCanRequestReversal(
    audit: Partial<AuditFormData> | Record<string, any>,
    isEmployee: boolean,
    isAcknowledged: boolean,
    hasPendingReversal: boolean
  ): boolean {
    // Already acknowledged - can't request reversal
    if (isAcknowledged) return false;

    // Already has pending reversal
    if (hasPendingReversal) return false;

    // Already has resolved reversal (check if reversal was already requested)
    if (hasReversalRequest(audit)) return false;

    // Only the employee being audited can request reversal
    return isEmployee;
  }

  /**
   * Check if user can respond to a reversal request
   */
  private checkCanRespondToReversal(
    audit: Partial<AuditFormData> | Record<string, any>,
    isOwner: boolean,
    isAuditor: boolean,
    isQA: boolean,
    hasPendingReversal: boolean
  ): boolean {
    // Must have pending reversal to respond
    if (!hasPendingReversal) return false;

    // Auditor who created the audit can respond
    if (isOwner) return true;

    // QA team can respond
    if (isQA) return true;

    return false;
  }

  /**
   * Check if user can rate the audit
   */
  private checkCanRate(
    audit: Partial<AuditFormData> | Record<string, any>,
    isEmployee: boolean,
    isAcknowledged: boolean
  ): boolean {
    // Can only rate after acknowledging
    if (!isAcknowledged) return false;

    // Only the employee can rate
    if (!isEmployee) return false;

    // Cast to Record to allow flexible property access
    const auditRecord = audit as Record<string, any>;

    // Check if already rated (support both camelCase and snake_case)
    const auditRating = auditRecord.audit_rating ?? auditRecord.auditRating;
    const hasRating = auditRating !== null && auditRating !== undefined;
    
    // Allow rating even if already rated (to update)
    return true;
  }

  /**
   * Quick check: Can user edit this audit?
   */
  canEdit(audit: Partial<AuditFormData> | Record<string, any>): boolean {
    return this.getPermissions(audit).canEdit;
  }

  /**
   * Quick check: Can user acknowledge this audit?
   */
  canAcknowledge(audit: Partial<AuditFormData> | Record<string, any>): boolean {
    return this.getPermissions(audit).canAcknowledge;
  }

  /**
   * Quick check: Can user request reversal for this audit?
   */
  canRequestReversal(audit: Partial<AuditFormData> | Record<string, any>): boolean {
    return this.getPermissions(audit).canRequestReversal;
  }
}

// Singleton instance
let permissionServiceInstance: PermissionService | null = null;

/**
 * Get permission service instance
 */
export function getPermissionService(): PermissionService {
  if (!permissionServiceInstance) {
    permissionServiceInstance = new PermissionService();
  }
  return permissionServiceInstance;
}

// Export for window access
if (typeof window !== 'undefined') {
  (window as any).PermissionService = PermissionService;
  (window as any).getPermissionService = getPermissionService;
  (window as any).isAcknowledgedStatus = isAcknowledgedStatus;
  (window as any).hasPendingReversal = hasPendingReversal;
  (window as any).hasReversalRequest = hasReversalRequest;
}
