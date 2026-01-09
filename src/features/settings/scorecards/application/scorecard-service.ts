/**
 * Scorecard Service
 * Business logic layer for scorecard management
 */

import { BaseService } from '../../../../core/service/base-service.js';
import { ScorecardRepository } from '../infrastructure/scorecard-repository.js';
import type { Scorecard, ScorecardParameter, Channel } from '../domain/entities.js';
import { createValidationError, createBusinessError } from '../../../../core/errors/app-error.js';
import { logError } from '../../../../utils/logging-helper.js';

export class ScorecardService extends BaseService {
  constructor(private repository: ScorecardRepository) {
    super();
  }

  /**
   * Load all scorecards with audit counts
   */
  async loadScorecards(): Promise<Scorecard[]> {
    return this.executeBusinessLogic(
      async () => {
        const scorecards = await this.repository.loadAll();
        
        // Load audit counts for each scorecard
        const scorecardsWithCounts = await Promise.all(
          scorecards.map(async (scorecard) => {
            try {
              const count = await this.repository.getAuditCount(scorecard.table_name);
              return { ...scorecard, audit_count: count };
            } catch (error) {
              logError('Failed to get audit count', error);
              return { ...scorecard, audit_count: 0 };
            }
          })
        );
        
        return scorecardsWithCounts;
      },
      'Failed to load scorecards'
    );
  }

  /**
   * Load scorecard with parameters
   */
  async loadScorecardWithParameters(id: string): Promise<{ scorecard: Scorecard; parameters: ScorecardParameter[] }> {
    this.validateInput(id, (id) => id.length > 0 || 'Scorecard ID is required');
    
    return this.executeBusinessLogic(
      async () => {
        const scorecard = await this.repository.loadById(id);
        if (!scorecard) {
          throw createBusinessError('Scorecard not found');
        }
        
        const parameters = await this.repository.loadParameters(id);
        return { scorecard, parameters };
      },
      `Failed to load scorecard ${id}`
    );
  }

  /**
   * Validate scorecard data
   */
  validateScorecardData(data: Partial<Scorecard>, parameters: ScorecardParameter[]): void {
    if (!data.name || data.name.trim().length === 0) {
      throw createValidationError('Scorecard name is required');
    }
    
    if (!data.table_name || data.table_name.trim().length === 0) {
      throw createValidationError('Table name is required');
    }
    
    if (data.passing_threshold === undefined || data.passing_threshold === null) {
      throw createValidationError('Passing threshold is required');
    }
    
    if (data.passing_threshold < 0 || data.passing_threshold > 100) {
      throw createValidationError('Passing threshold must be between 0 and 100');
    }
    
    if (!data.channels || data.channels.trim().length === 0) {
      throw createValidationError('At least one channel must be selected');
    }
    
    if (parameters.length === 0) {
      throw createValidationError('At least one parameter is required');
    }
    
    // Validate parameter types match scoring type
    this.validateParameterTypes(data.scoring_type || 'deductive', parameters);
  }

  /**
   * Validate parameter types match scoring type
   */
  validateParameterTypes(scoringType: string, parameters: ScorecardParameter[]): void {
    const errorParams = parameters.filter(p => p.parameter_type === 'error');
    const achievementParams = parameters.filter(p => p.parameter_type === 'achievement');
    const bonusParams = parameters.filter(p => p.parameter_type === 'bonus');
    
    switch (scoringType) {
      case 'deductive':
        if (achievementParams.length > 0) {
          throw createValidationError('Deductive scorecards cannot have Achievement parameters');
        }
        if (bonusParams.length > 0) {
          throw createValidationError('Deductive scorecards cannot have Bonus parameters');
        }
        if (errorParams.length === 0) {
          throw createValidationError('Deductive scorecards must have at least one Error parameter');
        }
        // Validate field types
        for (const param of parameters) {
          if (param.field_type === 'radio') {
            throw createValidationError(`Deductive scorecards cannot use Yes/No fields. Parameter "${param.error_name}" must use Counter field type`);
          }
        }
        break;
        
      case 'additive':
        if (errorParams.length > 0) {
          throw createValidationError('Additive scorecards cannot have Error parameters');
        }
        if (bonusParams.length > 0) {
          throw createValidationError('Additive scorecards cannot have Bonus parameters');
        }
        if (achievementParams.length === 0) {
          throw createValidationError('Additive scorecards must have at least one Achievement parameter');
        }
        // Validate field types
        for (const param of parameters) {
          if (param.field_type === 'counter') {
            throw createValidationError(`Additive scorecards cannot use Counter fields. Parameter "${param.error_name}" must use Yes/No field type`);
          }
        }
        break;
        
      case 'hybrid':
        if (errorParams.length === 0 && achievementParams.length === 0 && bonusParams.length === 0) {
          throw createValidationError('Hybrid scorecards must have at least one parameter');
        }
        break;
    }
    
    // Validate all parameters have categories
    for (const param of parameters) {
      if (!param.error_category || param.error_category.trim() === '') {
        throw createValidationError(`Parameter "${param.error_name}" must have a category selected`);
      }
    }
  }

  /**
   * Create scorecard with parameters
   */
  async createScorecard(scorecardData: Partial<Scorecard>, parameters: ScorecardParameter[]): Promise<Scorecard> {
    this.validateScorecardData(scorecardData, parameters);
    
    return this.executeBusinessLogic(
      async () => {
        // Create audit table first
        const tableParams = parameters.map(p => ({
          field_id: String(p.field_id || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          error_name: String(p.error_name || '').trim()
        }));
        
        const tableResult = await this.repository.createAuditTable(
          scorecardData.table_name!.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          tableParams
        );
        
        if (!tableResult.success) {
          throw createBusinessError(`Failed to create audit table: ${tableResult.error || 'Unknown error'}`);
        }
        
        // Wait for schema cache
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create scorecard
        const newScorecard = await this.repository.create(scorecardData);
        
        // Create parameters
        const parametersWithScorecardId = parameters.map((p, index) => ({
          ...p,
          scorecard_id: newScorecard.id,
          display_order: index + 1
        }));
        
        await this.repository.createParameters(parametersWithScorecardId);
        
        return newScorecard;
      },
      'Failed to create scorecard'
    );
  }

  /**
   * Update scorecard
   */
  async updateScorecard(id: string, updates: Partial<Scorecard>): Promise<void> {
    this.validateInput(id, (id) => id.length > 0 || 'Scorecard ID is required');
    
    return this.executeBusinessLogic(
      async () => {
        await this.repository.update(id, updates);
      },
      `Failed to update scorecard ${id}`
    );
  }

  /**
   * Update scorecard with parameters
   * Handles both metadata updates and parameter updates
   */
  async updateScorecardWithParameters(
    id: string,
    updates: Partial<Scorecard>,
    parameters: ScorecardParameter[]
  ): Promise<void> {
    this.validateInput(id, (id) => id.length > 0 || 'Scorecard ID is required');
    
    return this.executeBusinessLogic(
      async () => {
        // Update scorecard metadata
        if (Object.keys(updates).length > 0) {
          await this.repository.update(id, updates);
        }
        
        // Update parameters
        if (parameters.length > 0) {
          await this.repository.replaceParameters(id, parameters);
        } else {
          // If no parameters provided, delete existing ones
          await this.repository.deleteParameters(id);
        }
      },
      `Failed to update scorecard ${id} with parameters`
    );
  }

  /**
   * Delete scorecard
   */
  async deleteScorecard(id: string, tableName: string): Promise<void> {
    this.validateInput(id, (id) => id.length > 0 || 'Scorecard ID is required');
    
    return this.executeBusinessLogic(
      async () => {
        // Drop audit table first
        const dropResult = await this.repository.dropAuditTable(tableName);
        if (!dropResult.success) {
          throw createBusinessError(`Failed to drop audit table: ${dropResult.error || 'Unknown error'}`);
        }
        
        // Delete scorecard
        await this.repository.delete(id);
      },
      `Failed to delete scorecard ${id}`
    );
  }

  /**
   * Load channels
   */
  async loadChannels(): Promise<Channel[]> {
    return this.executeBusinessLogic(
      async () => {
        const channels = await this.repository.loadChannels();
        return channels;
      },
      'Failed to load channels'
    );
  }

  /**
   * Create channel
   */
  async createChannel(name: string, createdBy: string): Promise<void> {
    this.validateInput(name, (name) => name.trim().length > 0 || 'Channel name is required');
    
    return this.executeBusinessLogic(
      async () => {
        await this.repository.createChannel({
          name: name.trim(),
          is_active: true,
          created_by: createdBy
        });
      },
      'Failed to create channel'
    );
  }

  /**
   * Update channel status
   */
  async updateChannelStatus(id: string, isActive: boolean, updatedBy: string): Promise<void> {
    this.validateInput(id, (id) => id.length > 0 || 'Channel ID is required');
    
    return this.executeBusinessLogic(
      async () => {
        await this.repository.updateChannel(id, {
          is_active: isActive,
          updated_by: updatedBy
        });
      },
      `Failed to update channel ${id}`
    );
  }

  /**
   * Delete channel
   */
  async deleteChannel(id: string): Promise<void> {
    this.validateInput(id, (id) => id.length > 0 || 'Channel ID is required');
    
    return this.executeBusinessLogic(
      async () => {
        await this.repository.deleteChannel(id);
      },
      `Failed to delete channel ${id}`
    );
  }
}

