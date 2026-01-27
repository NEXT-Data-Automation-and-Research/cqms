/**
 * Domain Services Index
 * Exports all shared services for the audit form feature
 */

export { 
  AuditDataService, 
  getAuditDataService,
  type LoadAuditResult,
  type SaveAuditResult 
} from './audit-data-service.js';

export { 
  PermissionService, 
  getPermissionService,
  isAcknowledgedStatus,
  hasPendingReversal,
  hasReversalRequest,
  type AuditPermissions,
  type UserContext
} from './permission-service.js';
