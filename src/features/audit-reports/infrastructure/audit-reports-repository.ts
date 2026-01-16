/**
 * Audit Reports Repository
 * Data access layer for audit reports
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { 
  SCORECARD_FIELDS, 
  SCORECARD_PARAMETER_FIELDS,
  AUDIT_TABLE_COMMON_FIELDS,
  AUDIT_ASSIGNMENT_FIELDS,
  CHANNEL_MINIMAL_FIELDS,
  USER_MINIMAL_FIELDS
} from '../../../core/constants/field-whitelists.js';
import { logError, logInfo } from '../../../utils/logging-helper.js';
import type { AuditReport } from '../domain/entities.js';
import { getAuditTablesRPC } from './audit-reports-rpc-helpers.js';
import { queryAuditTable } from './audit-reports-query-helpers.js';
import { mapAuditDataArray } from './audit-data-mapper.js';

export interface ScorecardInfo {
  id: string;
  name: string;
  table_name: string;
  scoring_type?: string;
  is_active?: boolean;
}

export interface TableInfo {
  table_name: string;
  scorecard_id: string | null;
  scorecard_name: string;
  scoring_type: string;
}

export class AuditReportsRepository extends BaseRepository {
  private channelLookup: Map<string, string> | null = null;

  constructor(db: IDatabaseClient) {
    super(db, 'audits'); // Placeholder table name - we query multiple tables
  }

  /**
   * Load channels and create lookup map
   */
  private async loadChannelLookup(): Promise<Map<string, string>> {
    if (this.channelLookup) {
      return this.channelLookup;
    }

    try {
      const result = await this.db
        .from('channels')
        .select(CHANNEL_MINIMAL_FIELDS)
        .eq('is_active', true)
        .execute<Array<{ id: string; name: string }>>();

      const lookup = new Map<string, string>();
      
      const channels = result?.data || [];
      if (channels && channels.length > 0) {
        // Map both by ID and by name (in case channel field stores name instead of ID)
        channels.forEach((channel: { id: string; name: string }) => {
          lookup.set(channel.id, channel.name);
          lookup.set(channel.name, channel.name); // Also map name to name for direct lookup
        });
      }

      this.channelLookup = lookup;
      return lookup;
    } catch (error) {
      logError('Failed to load channel lookup:', error);
      return new Map<string, string>();
    }
  }

  /**
   * Enrich audits with channel names
   */
  private async enrichAuditsWithChannelNames(audits: AuditReport[]): Promise<AuditReport[]> {
    const channelLookup = await this.loadChannelLookup();
    
    return audits.map(audit => {
      if (audit.channel) {
        const channelName = channelLookup.get(audit.channel) || audit.channel;
        return {
          ...audit,
          channelName
        };
      }
      return audit;
    });
  }

  /**
   * Enrich audits with auditor names from users table if missing
   */
  private async enrichAuditsWithAuditorNames(audits: AuditReport[]): Promise<AuditReport[]> {
    // Find audits that need auditor names
    const auditsNeedingNames = audits.filter(audit => 
      audit.auditorEmail && 
      (!audit.auditorName || audit.auditorName.trim() === '' || audit.auditorName === 'N/A')
    );

    if (auditsNeedingNames.length === 0) {
      return audits;
    }

    // Get unique auditor emails
    const auditorEmails = Array.from(new Set(
      auditsNeedingNames
        .map(a => a.auditorEmail)
        .filter(email => email && email.trim() !== '')
    ));

    if (auditorEmails.length === 0) {
      return audits;
    }

    try {
      // Fetch auditor names from users table
      const { data: users, error } = await this.db
        .from('users')
        .select(USER_MINIMAL_FIELDS)
        .in('email', auditorEmails)
        .execute<Array<{ email: string; full_name: string | null }>>();

      if (error) {
        logError('Error fetching auditor names from users table:', error);
        return audits;
      }

      // Create lookup map: email -> full_name
      const auditorNameLookup = new Map<string, string>();
      (users || []).forEach(user => {
        if (user.full_name && user.full_name.trim() !== '') {
          auditorNameLookup.set(user.email.toLowerCase(), user.full_name);
        }
      });

      // Enrich audits with auditor names
      return audits.map(audit => {
        if (audit.auditorEmail && 
            (!audit.auditorName || audit.auditorName.trim() === '' || audit.auditorName === 'N/A')) {
          const auditorName = auditorNameLookup.get(audit.auditorEmail.toLowerCase());
          if (auditorName) {
            return {
              ...audit,
              auditorName
            };
          }
        }
        return audit;
      });
    } catch (error) {
      logError('Error enriching auditor names:', error);
      return audits;
    }
  }

  /**
   * Load all scorecards
   */
  async loadScorecards(): Promise<ScorecardInfo[]> {
    return this.executeQuery(
      async () => {
        return await this.db
          .from('scorecards')
          .select(SCORECARD_FIELDS)
          .order('created_at', { ascending: false })
          .execute<ScorecardInfo[]>();
      },
      'Failed to load scorecards'
    );
  }

  /**
   * Load scorecard by ID
   */
  async loadScorecardById(scorecardId: string): Promise<ScorecardInfo | null> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from('scorecards')
          .select(SCORECARD_FIELDS)
          .eq('id', scorecardId)
          .single()
          .execute<ScorecardInfo>();
        return result;
      },
      `Failed to load scorecard ${scorecardId}`
    );
  }

  /**
   * Load scorecard parameters
   */
  async loadScorecardParameters(scorecardId: string) {
    return this.executeQuery(
      async () => {
        return await this.db
          .from('scorecard_parameters')
          .select(SCORECARD_PARAMETER_FIELDS)
          .eq('scorecard_id', scorecardId)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .execute();
      },
      `Failed to load parameters for scorecard ${scorecardId}`
    );
  }

  /**
   * Get audit tables (using RPC or scorecards)
   */
  async getAuditTables(scorecards: ScorecardInfo[]): Promise<TableInfo[]> {
    try {
      // Try RPC first
      const tables = await getAuditTablesRPC(this.db);
      if (tables && tables.length > 0) {
        return tables
          .filter(t => t.table_name !== 'ai_analysis_results')
          .map(t => {
            const matchingScorecard = scorecards.find(s => s.table_name === t.table_name);
            return {
              table_name: t.table_name,
              scorecard_id: matchingScorecard?.id || null,
              scorecard_name: matchingScorecard?.name || `Deleted Scorecard (${t.table_name})`,
              scoring_type: matchingScorecard?.scoring_type || 'unknown'
            };
          });
      }
    } catch (error) {
      logInfo('RPC get_audit_tables failed, using scorecards list');
    }

    // Fallback to scorecards
    return scorecards
      .filter(s => s.table_name !== 'ai_analysis_results')
      .map(s => ({
        table_name: s.table_name,
        scorecard_id: s.id,
        scorecard_name: s.name,
        scoring_type: s.scoring_type || 'unknown'
      }));
  }

  /**
   * Load audits from a specific table
   */
  async loadAuditsFromTable(
    tableInfo: TableInfo,
    employeeEmail?: string,
    showAllAudits: boolean = true
  ): Promise<AuditReport[]> {
    try {
      const audits = await queryAuditTable(
        this.db,
        tableInfo.table_name,
        AUDIT_TABLE_COMMON_FIELDS,
        employeeEmail,
        showAllAudits
      );

      // Map database fields (snake_case) to TypeScript interface (camelCase)
      const mappedAudits = mapAuditDataArray(audits);

      // Add scorecard metadata
      const auditsWithMetadata = mappedAudits.map(audit => ({
        ...audit,
        _scorecard_id: tableInfo.scorecard_id,
        _scorecard_name: tableInfo.scorecard_name,
        _scorecard_table: tableInfo.table_name,
        _scoring_type: tableInfo.scoring_type
      } as AuditReport));

      // Enrich with channel names
      const auditsWithChannels = await this.enrichAuditsWithChannelNames(auditsWithMetadata);
      
      // Enrich with auditor names if missing
      return await this.enrichAuditsWithAuditorNames(auditsWithChannels);
    } catch (error: any) {
      // Only log unexpected errors (queryAuditTable already handles expected errors)
      if (error && !error.code && !error.message?.includes('does not exist')) {
        logError(`Unexpected error loading audits from ${tableInfo.table_name}:`, error);
      }
      return [];
    }
  }

  /**
   * Load all audits (from all tables or specific scorecard)
   */
  async loadAllAudits(
    scorecardId: string | null,
    employeeEmail?: string,
    showAllAudits: boolean = true
  ): Promise<AuditReport[]> {
    const scorecards = await this.loadScorecards();
    
    let tablesToQuery: TableInfo[];
    
    if (scorecardId) {
      const scorecard = scorecards.find(s => s.id === scorecardId);
      if (!scorecard) {
        return [];
      }
      tablesToQuery = [{
        table_name: scorecard.table_name,
        scorecard_id: scorecard.id,
        scorecard_name: scorecard.name,
        scoring_type: scorecard.scoring_type || 'unknown'
      }];
    } else {
      tablesToQuery = await this.getAuditTables(scorecards);
    }

    // Query all tables in parallel
    const results = await Promise.all(
      tablesToQuery.map(table => 
        this.loadAuditsFromTable(table, employeeEmail, showAllAudits)
      )
    );

    // Flatten and sort by submitted_at
    const allAudits = results.flat();
    
    // Enrich all audits with channel names
    const auditsWithChannels = await this.enrichAuditsWithChannelNames(allAudits);
    
    // Enrich with auditor names if missing
    const enrichedAudits = await this.enrichAuditsWithAuditorNames(auditsWithChannels);
    
    return enrichedAudits.sort((a, b) => {
      const dateAValue = a.submittedAt || a.submitted_at || a.auditTimestamp || a.audit_timestamp || '';
      const dateBValue = b.submittedAt || b.submitted_at || b.auditTimestamp || b.audit_timestamp || '';
      const dateA = (dateAValue && typeof dateAValue === 'string') ? new Date(dateAValue).getTime() : 0;
      const dateB = (dateBValue && typeof dateBValue === 'string') ? new Date(dateBValue).getTime() : 0;
      return dateB - dateA;
    });
  }

  /**
   * Delete audit from table
   */
  async deleteAudit(tableName: string, auditId: string): Promise<void> {
    await this.executeQuery(
      async () => {
        const result = await this.db
          .from(tableName)
          .delete()
          .eq('id', auditId)
          .execute();
        return { data: undefined as void, error: result.error };
      },
      `Failed to delete audit ${auditId} from ${tableName}`
    );
  }

  /**
   * Update audit assignments when audit is deleted
   */
  async resetAuditAssignments(auditId: string): Promise<void> {
    await this.executeQuery(
      async () => {
        // Find assignments referencing this audit
        const { data: assignments } = await this.db
          .from('audit_assignments')
          .select('id')
          .eq('audit_id', auditId)
          .execute<{ id: string }[]>();

        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map(a => a.id);
          const result = await this.db
            .from('audit_assignments')
            .update({
              status: 'pending',
              completed_at: null,
              audit_id: null
            })
            .in('id', assignmentIds)
            .execute();
          return { data: undefined as void, error: result.error };
        }
        return { data: undefined as void, error: null };
      },
      `Failed to reset assignments for audit ${auditId}`
    );
  }
}

