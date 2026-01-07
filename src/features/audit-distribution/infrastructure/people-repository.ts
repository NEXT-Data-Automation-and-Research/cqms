/**
 * People Repository
 * Handles database operations for people table
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import type { Auditor, Employee } from '../domain/types.js';
import { logInfo, logError } from '../../../utils/logging-helper.js';

interface PeopleRow {
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  role: string | null;
  is_active: boolean | null;
  channel: string | null;
  team: string | null;
  department: string | null;
  country: string | null;
  designation: string | null;
  quality_mentor: string | null;
  team_supervisor: string | null;
  employee_id: number | null;
}

export class PeopleRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'people');
  }

  /**
   * Find all quality analysts (role = 'Quality Analyst')
   */
  async findQualityAnalysts(): Promise<Auditor[]> {
    return this.getCachedOrFetch(
      'quality_analysts',
      async () => {
        try {
          const result = await this.executeQuery(
            async () => {
              return await this.db
                .from(this.getTableName())
                .select(['email', 'name', 'role', 'is_active'])
                .eq('role', 'Quality Analyst')
                .eq('is_active', true)
                .execute<PeopleRow[]>();
            },
            'Failed to load quality analysts'
          );

          const auditors = this.mapToAuditors(Array.isArray(result) ? result : []);
          logInfo(`[PeopleRepository] Loaded ${auditors.length} quality analysts`);
          return auditors;
        } catch (error) {
          logError('[PeopleRepository] Error loading quality analysts:', error);
          throw error;
        }
      },
      300000 // 5 minutes cache
    );
  }

  /**
   * Find all team members (excluding Quality Analysts)
   */
  async findTeamMembers(): Promise<Employee[]> {
    return this.getCachedOrFetch(
      'team_members',
      async () => {
        try {
          // Get all active users, then filter out Quality Analysts in JavaScript
          // This handles NULL roles properly (Supabase neq() doesn't match NULL)
          const result = await this.executeQuery(
            async () => {
              const query = this.db
                .from(this.getTableName())
                .select(['email', 'name', 'avatar_url', 'role', 'is_active', 'channel', 'team', 'department', 'country', 'designation', 'quality_mentor', 'team_supervisor', 'employee_id'])
                .eq('is_active', true);
              
              return await query.execute<PeopleRow[]>();
            },
            'Failed to load team members'
          );

          // Filter out Quality Analysts (including NULL roles)
          const filtered = Array.isArray(result) 
            ? result.filter(row => row.role !== 'Quality Analyst')
            : [];
          
          const employees = this.mapToEmployees(filtered);
          logInfo(`[PeopleRepository] Loaded ${employees.length} team members`);
          return employees;
        } catch (error) {
          logError('[PeopleRepository] Error loading team members:', error);
          throw error;
        }
      },
      300000 // 5 minutes cache
    );
  }

  /**
   * Map database rows to Auditor entities
   */
  private mapToAuditors(rows: PeopleRow[]): Auditor[] {
    return rows
      .filter(row => row.email && row.name && row.role)
      .map(row => ({
        id: row.email!,
        email: row.email!,
        name: row.name!,
        role: row.role! as 'Quality Analyst',
        is_active: row.is_active ?? true
      }));
  }

  /**
   * Map database rows to Employee entities
   */
  private mapToEmployees(rows: PeopleRow[]): Employee[] {
    return rows
      .filter(row => row.email && row.name)
      .map(row => ({
        id: row.email!,
        email: row.email!,
        name: row.name!,
        avatar_url: row.avatar_url || null,
        channel: row.channel || null,
        team: row.team || null,
        department: row.department || null,
        country: row.country || null,
        designation: row.designation || null,
        quality_mentor: row.quality_mentor || null,
        team_supervisor: row.team_supervisor || null,
        is_active: row.is_active ?? true
      }));
  }

  /**
   * Invalidate cache for quality analysts
   */
  invalidateQualityAnalystsCache(): void {
    this.invalidateCache('quality_analysts');
  }

  /**
   * Invalidate cache for team members
   */
  invalidateTeamMembersCache(): void {
    this.invalidateCache('team_members');
  }

  /**
   * Find a person by email
   */
  async findByEmail(email: string): Promise<PeopleRow | null> {
    try {
      const result = await this.executeQuery(
        async () => {
          return await this.db
            .from(this.getTableName())
            .select('*')
            .eq('email', email)
            .single()
            .execute<PeopleRow>();
        },
        `Failed to find person with email: ${email}`
      );

      return result || null;
    } catch (error) {
      logError(`[PeopleRepository] Error finding person by email ${email}:`, error);
      return null;
    }
  }
}

