/**
 * Scorecard Repository
 * Data access layer for scorecards
 */

import { BaseRepository } from '../../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../../core/database/database-client.interface.js';
import { SCORECARD_AUDIT_FORM_FIELDS } from '../../../../core/constants/field-whitelists.js';
import type { Scorecard, ScorecardParameter, Channel } from '../domain/entities.js';
import { logError } from '../../../../utils/logging-helper.js';

const SCORECARD_PARAMETER_FIELDS = 'id, scorecard_id, error_name, penalty_points, parameter_type, error_category, field_type, field_id, description, enable_ai_audit, prompt, is_fail_all, points_direction, requires_feedback, display_order, is_active, created_at';
const CHANNEL_FIELDS = 'id, name, description, is_active, created_at, created_by, updated_at, updated_by';

export class ScorecardRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'scorecards');
  }

  /**
   * Load all scorecards
   */
  async loadAll(): Promise<Scorecard[]> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .select(SCORECARD_AUDIT_FORM_FIELDS)
          .order('created_at', { ascending: false })
          .execute<Scorecard[]>();
        return result;
      },
      'Failed to load scorecards'
    );
  }

  /**
   * Load scorecard by ID
   */
  async loadById(id: string): Promise<Scorecard | null> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .select(SCORECARD_AUDIT_FORM_FIELDS)
          .eq('id', id)
          .single()
          .execute<Scorecard>();
        return result;
      },
      `Failed to load scorecard ${id}`
    );
  }

  /**
   * Get audit count for a scorecard table
   */
  async getAuditCount(tableName: string): Promise<number> {
    try {
      // Use underlying Supabase client for count queries (Supabase-specific feature)
      const supabaseClient = (this.db as any).client;
      if (!supabaseClient) {
        logError('Database connection not available for count query', null);
        return 0;
      }

      const { count, error } = await supabaseClient
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        logError('Failed to get audit count', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      logError('Failed to get audit count', error);
      return 0;
    }
  }

  /**
   * Create new scorecard
   */
  async create(scorecard: Partial<Scorecard>): Promise<Scorecard> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .insert([scorecard])
          .select(SCORECARD_AUDIT_FORM_FIELDS)
          .single()
          .execute<Scorecard>();
        return result;
      },
      'Failed to create scorecard'
    );
  }

  /**
   * Update scorecard
   */
  async update(id: string, updates: Partial<Scorecard>): Promise<void> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .update(updates)
          .eq('id', id)
          .execute();
        return result;
      },
      `Failed to update scorecard ${id}`
    );
  }

  /**
   * Delete scorecard
   */
  async delete(id: string): Promise<void> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.getTableName())
          .delete()
          .eq('id', id)
          .execute();
        return result;
      },
      `Failed to delete scorecard ${id}`
    );
  }

  /**
   * Load parameters for a scorecard
   */
  async loadParameters(scorecardId: string): Promise<ScorecardParameter[]> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('scorecard_perameters')
          .select(SCORECARD_PARAMETER_FIELDS)
          .eq('scorecard_id', scorecardId)
          .order('display_order', { ascending: true })
          .execute<ScorecardParameter[]>();
        return result || [];
      },
      `Failed to load parameters for scorecard ${scorecardId}`
    );
  }

  /**
   * Create parameters
   */
  async createParameters(parameters: ScorecardParameter[]): Promise<void> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('scorecard_perameters')
          .insert(parameters)
          .execute();
        return result;
      },
      'Failed to create parameters'
    );
  }

  /**
   * Update parameter
   */
  async updateParameter(scorecardId: string, fieldId: string, updates: Partial<ScorecardParameter>): Promise<void> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('scorecard_perameters')
          .update(updates)
          .eq('scorecard_id', scorecardId)
          .eq('field_id', fieldId)
          .execute();
        return result;
      },
      `Failed to update parameter ${fieldId}`
    );
  }

  /**
   * Load all active channels
   */
  async loadChannels(): Promise<Channel[]> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('channels')
          .select(CHANNEL_FIELDS)
          .eq('is_active', true)
          .order('name', { ascending: true })
          .execute<Channel[]>();
        return result || [];
      },
      'Failed to load channels'
    );
  }

  /**
   * Create channel
   */
  async createChannel(channel: Partial<Channel>): Promise<void> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('channels')
          .insert([channel])
          .execute();
        return result;
      },
      'Failed to create channel'
    );
  }

  /**
   * Update channel
   */
  async updateChannel(id: string, updates: Partial<Channel>): Promise<void> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('channels')
          .update(updates)
          .eq('id', id)
          .execute();
        return result;
      },
      `Failed to update channel ${id}`
    );
  }

  /**
   * Delete channel
   */
  async deleteChannel(id: string): Promise<void> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('channels')
          .delete()
          .eq('id', id)
          .execute();
        return result;
      },
      `Failed to delete channel ${id}`
    );
  }

  /**
   * Call RPC function to create audit table
   */
  async createAuditTable(tableName: string, parameters: Array<{ field_id: string; error_name: string }>): Promise<{ success: boolean; error?: string }> {
    try {
      // Use underlying Supabase client for RPC calls (Supabase-specific feature)
      const supabaseClient = (this.db as any).client;
      if (!supabaseClient) {
        return { success: false, error: 'Database connection not available' };
      }

      const { data, error } = await supabaseClient.rpc('create_audit_table', {
        table_name: tableName,
        parameters: parameters
      });

      if (error) {
        logError('Failed to create audit table', error);
        return { success: false, error: error.message || 'Unknown error' };
      }

      return data || { success: true };
    } catch (error: any) {
      logError('Failed to create audit table', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }

  /**
   * Call RPC function to drop audit table
   */
  async dropAuditTable(tableName: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Use underlying Supabase client for RPC calls (Supabase-specific feature)
      const supabaseClient = (this.db as any).client;
      if (!supabaseClient) {
        return { success: false, error: 'Database connection not available' };
      }

      const { data, error } = await supabaseClient.rpc('drop_audit_table', {
        table_name: tableName
      });

      if (error) {
        logError('Failed to drop audit table', error);
        return { success: false, error: error.message || 'Unknown error' };
      }

      return data || { success: true };
    } catch (error: any) {
      logError('Failed to drop audit table', error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  }
}

