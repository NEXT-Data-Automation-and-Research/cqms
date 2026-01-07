/**
 * Create Audit Repository
 * Handles database operations for creating audits
 */

import { BaseRepository } from '../../../core/repository/base-repository.js';
import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { AUDIT_FIELDS } from '../../../core/constants/field-whitelists.js';
import type { CreateAudit } from '../domain/types.js';

export class CreateAuditRepository extends BaseRepository {
  constructor(db: IDatabaseClient) {
    super(db, 'audits');
  }

  async create(auditData: Omit<CreateAudit, 'id'>): Promise<CreateAudit> {
    return this.executeQuery(
      async () => {
        return await this.db
          .from(this.tableName)
          .insert(auditData)
          .select(AUDIT_FIELDS)
          .single()
          .execute<CreateAudit>();
      },
      'Failed to create audit'
    );
  }

}

