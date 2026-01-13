/**
 * Audit Reports Filter Helpers
 * Helper functions for filtering audits
 */

import type { AuditReport, AuditFilters, DateRange } from '../domain/entities.js';

/**
 * Normalize passing status
 */
function normalizePassingStatus(status: string | undefined): string {
  if (!status) return 'Not Passed';
  const normalized = status.toLowerCase().trim();
  if (normalized === 'passed' || normalized === 'pass') {
    return 'Passed';
  }
  return 'Not Passed';
}

/**
 * Filter audits based on filters and date range
 */
export function filterAudits(
  audits: AuditReport[],
  filters: AuditFilters,
  dateRange?: DateRange | null
): AuditReport[] {
  let filtered = [...audits];

  // Date range filter
  if (dateRange && dateRange.startDate && dateRange.endDate) {
    const start = new Date(dateRange.startDate).getTime();
    const end = new Date(dateRange.endDate).getTime() + 86400000; // Add 1 day to include end date
    
    filtered = filtered.filter(audit => {
      const dateValue = audit.submittedAt || 
        audit.submitted_at || 
        audit.auditTimestamp || 
        audit.audit_timestamp || 
        '';
      if (!dateValue || typeof dateValue !== 'string') return false;
      const auditDate = new Date(dateValue).getTime();
      return auditDate >= start && auditDate <= end;
    });
  }

  // Auditor names filter
  if (filters.auditorNames && filters.auditorNames.length > 0) {
    filtered = filtered.filter(audit => {
      const auditorName = (audit.auditorName || '').toLowerCase();
      return filters.auditorNames!.some(name => 
        auditorName.includes(name.toLowerCase())
      );
    });
  }

  // Employee names filter
  if (filters.employeeNames && filters.employeeNames.length > 0) {
    filtered = filtered.filter(audit => {
      const employeeName = (audit.employeeName || '').toLowerCase();
      return filters.employeeNames!.some(name => 
        employeeName.includes(name.toLowerCase())
      );
    });
  }

  // Audit types filter
  if (filters.auditTypes && filters.auditTypes.length > 0) {
    filtered = filtered.filter(audit => 
      audit.auditType && filters.auditTypes!.includes(audit.auditType)
    );
  }

  // Status filter (passing status)
  if (filters.statuses && filters.statuses.length > 0) {
    filtered = filtered.filter(audit => {
      const status = normalizePassingStatus(audit.passingStatus);
      return filters.statuses!.includes(status);
    });
  }

  // Quarters filter
  if (filters.quarters && filters.quarters.length > 0) {
    filtered = filtered.filter(audit => {
      const quarter = audit.quarter;
      if (!quarter) return false;
      const quarterStr = quarter.toString().startsWith('Q') 
        ? quarter.toString() 
        : `Q${quarter}`;
      return filters.quarters!.includes(quarterStr);
    });
  }

  // Channels filter
  if (filters.channels && filters.channels.length > 0) {
    filtered = filtered.filter(audit => 
      audit.channel && filters.channels!.includes(audit.channel)
    );
  }

  // Employee types filter
  if (filters.employeeTypes && filters.employeeTypes.length > 0) {
    filtered = filtered.filter(audit => 
      audit.employeeType && filters.employeeTypes!.includes(audit.employeeType)
    );
  }

  // Countries filter
  if (filters.countries && filters.countries.length > 0) {
    filtered = filtered.filter(audit => 
      audit.countryOfEmployee && filters.countries!.includes(audit.countryOfEmployee)
    );
  }

  // Validation statuses filter
  if (filters.validationStatuses && filters.validationStatuses.length > 0) {
    filtered = filtered.filter(audit => 
      audit.validationStatus && filters.validationStatuses!.includes(audit.validationStatus)
    );
  }

  // Acknowledgement statuses filter
  if (filters.acknowledgementStatuses && filters.acknowledgementStatuses.length > 0) {
    filtered = filtered.filter(audit => {
      const status = audit.acknowledgementStatus || audit.acknowledgement_status || '';
      return typeof status === 'string' && status && filters.acknowledgementStatuses!.includes(status);
    });
  }

  // Agent pre-status filter
  if (filters.agentPreStatuses && filters.agentPreStatuses.length > 0) {
    filtered = filtered.filter(audit => 
      audit.agentPreStatus && filters.agentPreStatuses!.includes(audit.agentPreStatus)
    );
  }

  // Agent post-status filter
  if (filters.agentPostStatuses && filters.agentPostStatuses.length > 0) {
    filtered = filtered.filter(audit => 
      audit.agentPostStatus && filters.agentPostStatuses!.includes(audit.agentPostStatus)
    );
  }

  // Audit ID filter
  if (filters.auditId && filters.auditId.trim().length > 0) {
    const auditIdQuery = filters.auditId.toLowerCase().trim();
    filtered = filtered.filter(audit => {
      const auditId = String(audit.id || '').toLowerCase();
      return auditId.includes(auditIdQuery);
    });
  }

  // Search query filter
  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const query = filters.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(audit => {
      const searchableFields = [
        audit.employeeName,
        audit.employeeEmail,
        audit.auditorName,
        audit.auditorEmail,
        audit.interactionId,
        audit.channel,
        audit.auditType,
        audit.transcript
      ].filter(Boolean).map(f => String(f).toLowerCase());
      
      return searchableFields.some(field => field.includes(query));
    });
  }

  return filtered;
}

