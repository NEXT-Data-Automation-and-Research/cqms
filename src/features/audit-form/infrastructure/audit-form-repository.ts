/**
 * Audit Form Repository
 * Data access layer for audit forms
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import type { AuditFormData, Scorecard, ScorecardParameter } from '../domain/entities.js';
import { AUDIT_FORM_FIELDS } from '../../../core/constants/field-whitelists.js';

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
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('scorecards')
          .select('id, name, description, passing_threshold, table_name, scoring_type, channels, is_active, default_for_channels, allow_over_100, max_bonus_points')
          .eq('id', scorecardId)
          .eq('is_active', true)
          .single()
          .execute<Scorecard>();
        return result;
      },
      `Failed to find scorecard ${scorecardId}`
    );
  }

  /**
   * Load scorecard parameters
   */
  async findScorecardParameters(scorecardId: string): Promise<ScorecardParameter[]> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('scorecard_perameters')
          .select('*')
          .eq('scorecard_id', scorecardId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .execute<ScorecardParameter[]>();
        return result || [];
      },
      `Failed to load parameters for scorecard ${scorecardId}`
    );
  }

  /**
   * Load active scorecards
   */
  async findActiveScorecards(channelFilter?: string): Promise<Scorecard[]> {
    const scorecards = await this.executeQuery(
      async () => {
        let query = this.db
          .from('scorecards')
          .select('id, name, description, passing_threshold, table_name, scoring_type, channels, is_active, default_for_channels, allow_over_100, max_bonus_points')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        return await query.execute<Scorecard[]>();
      },
      'Failed to load scorecards'
    );

    if (!channelFilter) {
      return scorecards || [];
    }

    // Filter by channel on client side
    return (scorecards || []).filter((scorecard: Scorecard) => {
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

