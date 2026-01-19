/**
 * Audit Form Repository
 * Data access layer for audit forms
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import type { AuditFormData, Scorecard, ScorecardParameter } from '../domain/entities.js';
import { AUDIT_FORM_FIELDS, SCORECARD_PARAMETER_FIELDS } from '../../../core/constants/field-whitelists.js';

/**
 * Map database scorecard row (snake_case) to Scorecard entity (camelCase)
 */
function mapToScorecard(row: any): Scorecard {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    passingThreshold: row.passing_threshold,
    tableName: row.table_name,
    scoringType: row.scoring_type,
    channels: row.channels,
    isActive: row.is_active,
    defaultForChannels: row.default_for_channels,
    allowOver100: row.allow_over_100,
    maxBonusPoints: row.max_bonus_points,
    createdAt: row.created_at,
  };
}

/**
 * Map database scorecard parameter row (snake_case) to ScorecardParameter entity (camelCase)
 */
function mapToScorecardParameter(row: any): ScorecardParameter {
  return {
    id: row.id,
    scorecardId: row.scorecard_id,
    errorName: row.error_name,
    penaltyPoints: row.penalty_points,
    errorCategory: row.error_category,
    fieldId: row.field_id,
    fieldType: row.field_type,
    requiresFeedback: row.requires_feedback,
    displayOrder: row.display_order,
    isActive: row.is_active,
    parameterType: row.parameter_type,
    pointsDirection: row.points_direction,
    isFailAll: row.is_fail_all,
    description: row.description,
  };
}

export class AuditFormRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'audit_assignments');
  }

  /**
   * Load audit by ID from scorecard table
   */
  async findAuditById(scorecardTableName: string, auditId: string): Promise<AuditFormData | null> {
    return this.executeQuery(
      async () => {
        const fields = AUDIT_FORM_FIELDS.join(', ');
        const result = await this.db
          .from(scorecardTableName)
          .select(fields)
          .eq('id', auditId)
          .single()
          .execute<AuditFormData>();
        return result;
      },
      `Failed to find audit ${auditId}`
    );
  }

  /**
   * Load scorecard by ID
   */
  async findScorecardById(scorecardId: string): Promise<Scorecard | null> {
    const rawData = await this.executeQuery(
      async () => {
        return await this.db
          .from('scorecards')
          .select('id, name, description, passing_threshold, table_name, scoring_type, channels, is_active, default_for_channels, allow_over_100, max_bonus_points, created_at')
          .eq('id', scorecardId)
          .eq('is_active', true)
          .single()
          .execute<any>();
      },
      `Failed to find scorecard ${scorecardId}`
    );
    return rawData ? mapToScorecard(rawData) : null;
  }

  /**
   * Load scorecard parameters
   */
  async findScorecardParameters(scorecardId: string): Promise<ScorecardParameter[]> {
    const rawData = await this.executeQuery(
      async () => {
        return await this.db
          .from('scorecard_perameters')
          .select(SCORECARD_PARAMETER_FIELDS)
          .eq('scorecard_id', scorecardId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .execute<any[]>();
      },
      `Failed to load parameters for scorecard ${scorecardId}`
    );
    return (rawData || []).map(mapToScorecardParameter);
  }

  /**
   * Load active scorecards
   */
  async findActiveScorecards(channelFilter?: string): Promise<Scorecard[]> {
    const rawScorecards = await this.executeQuery(
      async () => {
        const query = this.db
          .from('scorecards')
          .select('id, name, description, passing_threshold, table_name, scoring_type, channels, is_active, default_for_channels, allow_over_100, max_bonus_points, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        return await query.execute<any[]>();
      },
      'Failed to load scorecards'
    );

    // Map to Scorecard entities (snake_case to camelCase)
    const scorecards = (rawScorecards || []).map(mapToScorecard);

    if (!channelFilter) {
      return scorecards;
    }

    // Filter by channel on client side
    return scorecards.filter((scorecard: Scorecard) => {
      if (!scorecard.channels) return false;
      const channelsList = scorecard.channels.split(',').map((c: string) => c.trim());
      return channelsList.includes(channelFilter);
    });
  }

  /**
   * Save audit form data
   */
  async saveAudit(scorecardTableName: string, auditData: Partial<AuditFormData>): Promise<AuditFormData> {
    return this.executeQuery(
      async () => {
        const fields = AUDIT_FORM_FIELDS.join(', ');
        const result = await this.db
          .from(scorecardTableName)
          .insert(auditData)
          .select(fields)
          .single()
          .execute<AuditFormData>();
        return result;
      },
      'Failed to save audit'
    );
  }

  /**
   * Update audit form data
   */
  async updateAudit(scorecardTableName: string, auditId: string, auditData: Partial<AuditFormData>): Promise<AuditFormData> {
    return this.executeQuery(
      async () => {
        const fields = AUDIT_FORM_FIELDS.join(', ');
        const result = await this.db
          .from(scorecardTableName)
          .update(auditData)
          .eq('id', auditId)
          .select(fields)
          .single()
          .execute<AuditFormData>();
        return result;
      },
      `Failed to update audit ${auditId}`
    );
  }
}

