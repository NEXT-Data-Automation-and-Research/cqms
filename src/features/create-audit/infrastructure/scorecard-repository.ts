/**
 * Scorecard Repository
 * Handles database operations for scorecards
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { SCORECARD_FIELDS } from '../../../core/constants/field-whitelists.js';
import type { Scorecard } from '../domain/entities.js';

export class ScorecardRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'scorecards');
  }

  async findAll(): Promise<Scorecard[]> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.tableName)
          .select(SCORECARD_FIELDS)
          .order('name')
          .execute<Scorecard[]>();
        return result;
      },
      'Failed to load scorecards'
    );
  }

  async findById(id: string): Promise<Scorecard | null> {
    return this.executeQuery(
      async () => {
        const result = await this.db
          .from(this.tableName)
          .select(SCORECARD_FIELDS)
          .eq('id', id)
          .single()
          .execute<Scorecard>();
        return result;
      },
      `Failed to load scorecard ${id}`
    );
  }
}

