/**
 * Create Audit Service
 * Business logic for creating audits
 */

import { BaseService } from '../../../core/service/base-service.js';
import { CreateAuditRepository } from '../infrastructure/create-audit-repository.js';
import type { AuditFormData } from '../domain/entities.js';
import type { CreateAudit } from '../domain/types.js';

export class CreateAuditService extends BaseService {
  constructor(private repository: CreateAuditRepository) {
    super();
  }

  async createAudit(formData: AuditFormData): Promise<CreateAudit> {
    this.validateFormData(formData);

    return this.executeBusinessLogic(
      async () => {
        const auditData = {
          employeeId: formData.employee?.id || '',
          interactionId: formData.interaction?.id || '',
          scorecardId: formData.scorecard?.id || '',
          transcript: formData.transcript,
          recommendations: formData.recommendations,
          parameters: formData.parameters.reduce((acc, param) => {
            acc[param.parameterId] = param.value;
            return acc;
          }, {} as Record<string, any>),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return await this.repository.create(auditData);
      },
      'Failed to create audit'
    );
  }

  private validateFormData(formData: AuditFormData): void {
    if (!formData.employee) {
      throw this.createValidationError('Employee is required');
    }
    if (!formData.interaction) {
      throw this.createValidationError('Interaction is required');
    }
    if (!formData.scorecard) {
      throw this.createValidationError('Scorecard is required');
    }
    if (!formData.transcript || formData.transcript.trim().length === 0) {
      throw this.createValidationError('Transcript is required');
    }
  }

  private createValidationError(message: string): Error {
    return new Error(message);
  }
}

