/**
 * Audit Form Service
 * Business logic for audit form operations
 */

import { BaseService } from '../../../core/service/base-service.js';
import { AuditFormRepository } from '../infrastructure/audit-form-repository.js';
import type { AuditFormData, Scorecard, ScorecardParameter } from '../domain/entities.js';
import { createValidationError, createBusinessError } from '../../../core/errors/app-error.js';
import { sanitizeString } from '../../../api/utils/validation.js';

export class AuditFormService extends BaseService {
  constructor(private repository: AuditFormRepository) {
    super();
  }

  /**
   * Load audit form data
   */
  async loadAudit(scorecardTableName: string, auditId: string): Promise<AuditFormData> {
    this.validateInput(scorecardTableName, (val) => val.length > 0 || 'Scorecard table name is required');
    this.validateInput(auditId, (val) => val.length > 0 || 'Audit ID is required');

    return this.executeBusinessLogic(
      async () => {
        const audit = await this.repository.findAuditById(scorecardTableName, auditId);
        if (!audit) {
          throw createBusinessError(`Audit ${auditId} not found`);
        }
        return audit;
      },
      'Failed to load audit'
    );
  }

  /**
   * Load scorecard with parameters
   */
  async loadScorecardWithParameters(scorecardId: string): Promise<{ scorecard: Scorecard; parameters: ScorecardParameter[] }> {
    this.validateInput(scorecardId, (val) => val.length > 0 || 'Scorecard ID is required');

    return this.executeBusinessLogic(
      async () => {
        const scorecard = await this.repository.findScorecardById(scorecardId);
        if (!scorecard) {
          throw createBusinessError(`Scorecard ${scorecardId} not found`);
        }

        const parameters = await this.repository.findScorecardParameters(scorecardId);
        return { scorecard, parameters };
      },
      'Failed to load scorecard'
    );
  }

  /**
   * Load available scorecards
   */
  async loadScorecards(channelFilter?: string): Promise<Scorecard[]> {
    return this.executeBusinessLogic(
      async () => {
        const channel = channelFilter ? sanitizeString(channelFilter) : undefined;
        return await this.repository.findActiveScorecards(channel);
      },
      'Failed to load scorecards'
    );
  }

  /**
   * Validate audit form data
   */
  validateAuditFormData(data: Partial<AuditFormData>): void {
    if (!data.employeeEmail) {
      throw createValidationError('Employee email is required');
    }
    if (!data.interactionId) {
      throw createValidationError('Interaction ID is required');
    }
    if (!data.scorecardId) {
      throw createValidationError('Scorecard ID is required');
    }
    if (!data.channel) {
      throw createValidationError('Channel is required');
    }
  }

  /**
   * Save audit form
   */
  async saveAudit(scorecardTableName: string, auditData: Partial<AuditFormData>): Promise<AuditFormData> {
    this.validateAuditFormData(auditData);

    return this.executeBusinessLogic(
      async () => {
        return await this.repository.saveAudit(scorecardTableName, auditData);
      },
      'Failed to save audit'
    );
  }

  /**
   * Update audit form
   */
  async updateAudit(scorecardTableName: string, auditId: string, auditData: Partial<AuditFormData>): Promise<AuditFormData> {
    this.validateInput(auditId, (val) => val.length > 0 || 'Audit ID is required');
    this.validateAuditFormData(auditData);

    return this.executeBusinessLogic(
      async () => {
        return await this.repository.updateAudit(scorecardTableName, auditId, auditData);
      },
      'Failed to update audit'
    );
  }
}

