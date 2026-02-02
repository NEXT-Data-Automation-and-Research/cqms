/**
 * Scorecard Repository
 * Loads scorecards from Supabase for audit distribution (so assignments can show scorecard name, including completed audits).
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import type { Scorecard } from '../domain/types.js';

const SCORECARD_FIELDS = 'id, name, table_name, channels, is_active';

interface ScorecardRow {
  id: string;
  name: string | null;
  table_name: string | null;
  channels: string | null;
  is_active: boolean | null;
}

export class ScorecardRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'scorecards');
  }

  /**
   * Find all scorecards (active and inactive) so assignments linked to any scorecard show the name.
   */
  async findAll(): Promise<Scorecard[]> {
    return this.getCachedOrFetch(
      'all_scorecards',
      async () => {
        const result = await this.executeQuery<ScorecardRow[]>(
          async () => {
            return await this.db
              .from(this.getTableName())
              .select(SCORECARD_FIELDS)
              .execute<ScorecardRow[]>();
          },
          'Failed to find scorecards'
        );

        return this.mapToScorecards(Array.isArray(result) ? result : []);
      },
      60000 // 1 minute cache
    );
  }

  private mapToScorecards(rows: ScorecardRow[]): Scorecard[] {
    return rows
      .filter(row => row.id)
      .map(row => ({
        id: row.id,
        name: row.name || '',
        table_name: row.table_name || '',
        channels: row.channels ?? null,
        is_active: row.is_active ?? true
      }));
  }

  invalidateScorecardsCache(): void {
    this.invalidateCache('all_scorecards');
  }
}
