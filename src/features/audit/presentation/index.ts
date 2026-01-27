/**
 * Unified Audit Module Exports
 */

export { 
  UnifiedAuditController, 
  initializeUnifiedAudit,
  type UnifiedAuditConfig as ControllerConfig,
  type AuditPageState
} from './unified-audit-controller.js';

export {
  getUnifiedAuditConfig,
  setUnifiedAuditConfig,
  shouldUseUnifiedPage,
  getAuditPageUrl,
  initializeUnifiedAuditConfig,
  type UnifiedAuditConfig
} from './unified-audit-config.js';
