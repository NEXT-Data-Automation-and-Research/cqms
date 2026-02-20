/**
 * Audit Reports Service
 * Business logic for audit reports
 */

import { BaseService } from '../../../core/service/base-service.js';
import { AuditReportsRepository } from '../infrastructure/audit-reports-repository.js';
import { createValidationError, createBusinessError } from '../../../core/errors/app-error.js';
import { sanitizeString } from '../../../api/utils/validation.js';
import type { 
  AuditReport, 
  AuditStats, 
  AuditFilters,
  DateRange 
} from '../domain/entities.js';
import { calculateAuditStats } from './audit-reports-stats-helpers.js';
import { filterAudits } from './audit-reports-filter-helpers.js';

export class AuditReportsService extends BaseService {
  constructor(private repository: AuditReportsRepository) {
    super();
  }

  /**
   * Load all audits
   */
  async loadAudits(
    scorecardId: string | null,
    employeeEmail?: string,
    showAllAudits: boolean = true
  ): Promise<AuditReport[]> {
    this.validateInput(scorecardId, (id) => id === null || typeof id === 'string' || 'Invalid scorecard ID');
    if (employeeEmail) {
      this.validateInput(employeeEmail, (email) => 
        typeof email === 'string' && email.length > 0 || 'Invalid employee email'
      );
    }

    return this.executeBusinessLogic(
      async () => {
        return await this.repository.loadAllAudits(
          scorecardId,
          employeeEmail,
          showAllAudits
        );
      },
      'Failed to load audits'
    );
  }

  /**
   * Load scorecards
   */
  async loadScorecards() {
    return this.executeBusinessLogic(
      async () => {
        return await this.repository.loadScorecards();
      },
      'Failed to load scorecards'
    );
  }

  /**
   * Load scorecard parameters
   */
  async loadScorecardParameters(scorecardId: string) {
    this.validateInput(scorecardId, (id) => 
      typeof id === 'string' && id.length > 0 || 'Scorecard ID is required'
    );

    return this.executeBusinessLogic(
      async () => {
        return await this.repository.loadScorecardParameters(scorecardId);
      },
      `Failed to load parameters for scorecard ${scorecardId}`
    );
  }

  /**
   * Calculate audit statistics
   */
  calculateStats(audits: AuditReport[]): AuditStats {
    return calculateAuditStats(audits);
  }

  /**
   * Load people details (last_login, channel, team_supervisor, name) for agent emails (Acknowledgement by agent view).
   */
  async loadPeopleDetailsForAgents(
    emails: string[]
  ): Promise<
    Map<
      string,
      { lastLogin: string | null; channel: string | null; teamSupervisor: string | null; name: string | null }
    >
  > {
    return this.repository.loadPeopleDetailsForAgents(emails);
  }

  /**
   * Load last_login for a list of emails from people table (backward-compat).
   */
  async loadPeopleLastLogin(emails: string[]): Promise<Map<string, string | null>> {
    return this.repository.loadPeopleLastLogin(emails);
  }

  /**
   * Filter audits based on filters
   */
  filterAudits(
    audits: AuditReport[],
    filters: AuditFilters,
    dateRange?: DateRange | null
  ): AuditReport[] {
    return filterAudits(audits, filters, dateRange);
  }

  /**
   * Delete audit
   */
  async deleteAudit(
    tableName: string,
    auditId: string,
    auditorEmail: string,
    currentUserEmail: string
  ): Promise<void> {
    this.validateInput(tableName, (name) => 
      typeof name === 'string' && name.length > 0 || 'Table name is required'
    );
    this.validateInput(auditId, (id) => 
      typeof id === 'string' && id.length > 0 || 'Audit ID is required'
    );
    this.validateInput(auditorEmail, (email) => 
      typeof email === 'string' && email.length > 0 || 'Auditor email is required'
    );
    this.validateInput(currentUserEmail, (email) => 
      typeof email === 'string' && email.length > 0 || 'Current user email is required'
    );

    // Verify that current user is the auditor
    const normalizedAuditorEmail = auditorEmail.toLowerCase().trim();
    const normalizedCurrentEmail = currentUserEmail.toLowerCase().trim();
    
    if (normalizedAuditorEmail !== normalizedCurrentEmail) {
      throw createBusinessError(
        'Only the auditor who created this audit can delete it.'
      );
    }

    return this.executeBusinessLogic(
      async () => {
        // Reset audit assignments first
        await this.repository.resetAuditAssignments(auditId);
        
        // Delete the audit
        await this.repository.deleteAudit(tableName, auditId);
      },
      `Failed to delete audit ${auditId}`
    );
  }

  /**
   * Export audits to CSV
   */
  exportToCSV(audits: AuditReport[]): string {
    if (audits.length === 0) {
      return '';
    }

    // Get all unique keys from audits
    const keys = new Set<string>();
    audits.forEach(audit => {
      Object.keys(audit).forEach(key => {
        if (!key.startsWith('_')) { // Exclude metadata fields
          keys.add(key);
        }
      });
    });

    const headers = Array.from(keys);
    
    // Create CSV rows
    const rows = audits.map(audit => {
      return headers.map(header => {
        const value = audit[header as keyof AuditReport];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape quotes and wrap in quotes if contains comma or quote
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
    });

    // Combine headers and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csv;
  }
}

