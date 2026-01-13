/**
 * Scorecard Repository
 * Data access layer for scorecards
 */

import { BaseRepository } from '../../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../../core/database/database-client.interface.js';
import { SCORECARD_AUDIT_FORM_FIELDS } from '../../../../core/constants/field-whitelists.js';
import type { Scorecard, ScorecardParameter, Channel } from '../domain/entities.js';
import { logError, logInfo } from '../../../../utils/logging-helper.js';

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
        return 0;
      }

      const { count, error } = await supabaseClient
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        // Handle table not found errors silently (404, PGRST205, PGRST116, etc.)
        // These are expected when audit tables haven't been created yet
        const isTableNotFound = 
          error.code === 'PGRST205' || 
          error.code === 'PGRST116' || 
          error.code === '42P01' || 
          error.code === '42703' ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('not found') ||
          (error as any).status === 404;

        if (isTableNotFound) {
          // Table doesn't exist - this is normal for scorecards without audits yet
          return 0;
        }

        // Log other errors (permissions, connection issues, etc.)
        logError('Failed to get audit count', error);
        return 0;
      }

      return count || 0;
    } catch (error: any) {
      // Handle table not found errors silently
      const isTableNotFound = 
        error?.code === 'PGRST205' || 
        error?.code === 'PGRST116' || 
        error?.code === '42P01' || 
        error?.code === '42703' ||
        error?.message?.includes('relation') ||
        error?.message?.includes('does not exist') ||
        error?.message?.includes('not found') ||
        error?.status === 404;

      if (!isTableNotFound) {
        logError('Failed to get audit count', error);
      }
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
        // Remove id field from parameters to let database auto-generate UUID
        // This prevents "null value in column id" errors when updating scorecards
        const parametersWithoutId = parameters.map(({ id, ...param }) => param);
        
        const result = await this.db
          .from('scorecard_perameters')
          .insert(parametersWithoutId)
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
   * Delete all parameters for a scorecard
   */
  async deleteParameters(scorecardId: string): Promise<void> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('scorecard_perameters')
          .delete()
          .eq('scorecard_id', scorecardId)
          .execute();
        return result;
      },
      `Failed to delete parameters for scorecard ${scorecardId}`
    );
  }

  /**
   * Replace all parameters for a scorecard (delete old, insert new)
   */
  async replaceParameters(scorecardId: string, parameters: ScorecardParameter[]): Promise<void> {
    // Delete existing parameters
    await this.deleteParameters(scorecardId);
    
    // Insert new parameters if any
    if (parameters.length > 0) {
      await this.createParameters(parameters);
    }
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

      logInfo('Calling create_audit_table RPC', {
        tableName,
        parameterCount: parameters.length,
        parameters: parameters.slice(0, 2) // Log first 2 parameters for debugging
      });

      // Supabase automatically converts JavaScript arrays/objects to JSONB
      // Pass parameters as array - Supabase will handle conversion
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

