/**
 * Scorecard Service
 * Business logic for scorecards
 */

import { BaseService } from '../../../core/service/base-service.js';
import { ScorecardRepository } from '../infrastructure/scorecard-repository.js';
import type { Scorecard } from '../domain/entities.js';

export class ScorecardService extends BaseService {
  constructor(private repository: ScorecardRepository) {
    super();
  }

  async getAllScorecards(): Promise<Scorecard[]> {
    return this.executeBusinessLogic(
      async () => {
        return await this.repository.findAll();
      },
      'Failed to load scorecards'
    );
  }

  async getScorecardById(id: string): Promise<Scorecard | null> {
    this.validateInput(id, (id) => id.length > 0 || 'Scorecard ID is required');
    
    return this.executeBusinessLogic(
      async () => {
        return await this.repository.findById(id);
      },
      `Failed to load scorecard ${id}`
    );
  }
}

