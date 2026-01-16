/**
 * Audit Reports Query Helpers
 * Helper functions for querying audit tables
 */

import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { logError, logInfo } from '../../../utils/logging-helper.js';
import type { AuditReport } from '../domain/entities.js';
import { mapAuditDataArray } from './audit-data-mapper.js';

/**
 * Query audits from a specific table
 */
export async function queryAuditTable(
  db: IDatabaseClient,
  tableName: string,
  fields: string,
  employeeEmail?: string,
  showAllAudits: boolean = true
): Promise<AuditReport[]> {
  try {
    let query = db
      .from(tableName)
      .select(fields)
      .order('submitted_at', { ascending: false });

    // Filter by employee email if provided and not showing all
    if (employeeEmail && !showAllAudits) {
      query = query.eq('employee_email', employeeEmail);
    }

    const { data, error } = await query.execute<AuditReport[]>();

    if (error) {
      // Handle table not found errors gracefully (404)
      if (error.code === 'PGRST205' || 
          error.message?.includes('Could not find the table') ||
          error.message?.includes('relation') && error.message?.includes('does not exist')) {
        // Table doesn't exist, return empty array (expected for some tables)
        logInfo(`Table '${tableName}' not found, skipping (this is normal if table doesn't exist)`);
        return [];
      }
      
      // Handle bad request errors gracefully (400) - usually schema mismatches
      if (error.code === 'PGRST202' || 
          error.code === '400' ||
          (error.message && (
            error.message.includes('column') && error.message.includes('does not exist') ||
            error.message.includes('permission denied') ||
            error.message.includes('invalid input')
          ))) {
        // Try with minimal fields
        logInfo(`Table '${tableName}' has schema issues, retrying with minimal fields`);
        return await retryQueryWithMinimalFields(
          db,
          tableName,
          employeeEmail,
          showAllAudits
        );
      }
      
      // Handle column errors gracefully (some tables might have different schemas)
      const errorMessage = error.message || JSON.stringify(error);
      if (errorMessage.includes('audit_status') || 
          error.code === 'PGRST116' || 
          error.code === '42703') {
        // Retry without problematic fields or with minimal fields
        logInfo(`Table '${tableName}' missing some columns, retrying with minimal fields`);
        return await retryQueryWithMinimalFields(
          db,
          tableName,
          employeeEmail,
          showAllAudits
        );
      }
      
      // For unexpected errors, log but don't throw (will be caught by outer try-catch)
      logError(`Unexpected error querying table ${tableName}:`, error);
      return [];
    }

    // Filter completed audits only
    const completedAudits = (data || []).filter(audit => {
      const auditStatus = (audit as any).audit_status;
      return !auditStatus || auditStatus === 'completed';
    });

    // Map database fields (snake_case) to TypeScript interface (camelCase)
    return mapAuditDataArray(completedAudits);
  } catch (error) {
    logError(`Error querying audit table ${tableName}:`, error);
    return [];
  }
}

/**
 * Retry query with minimal fields if full query fails
 */
async function retryQueryWithMinimalFields(
  db: IDatabaseClient,
  tableName: string,
  employeeEmail?: string,
  showAllAudits: boolean = true
): Promise<AuditReport[]> {
  try {
    // Use minimal field set that should exist in all tables
    // Include interaction_id and channel as they are critical for display
    const minimalFields = 'id, employee_email, employee_name, auditor_email, auditor_name, interaction_id, channel, submitted_at, passing_status, average_score, total_errors_count';
    
    let query = db
      .from(tableName)
      .select(minimalFields)
      .order('submitted_at', { ascending: false });

    if (employeeEmail && !showAllAudits) {
      query = query.eq('employee_email', employeeEmail);
    }

    const { data, error } = await query.execute<AuditReport[]>();

    if (error) {
      // Don't log expected errors (table not found, schema issues)
      const isExpectedError = 
        error.code === 'PGRST205' || 
        error.code === 'PGRST202' ||
        error.code === '400' ||
        error.message?.includes('Could not find the table') ||
        error.message?.includes('does not exist') ||
        error.message?.includes('permission denied');
      
      if (!isExpectedError) {
        logError(`Retry query also failed for ${tableName}:`, error);
      } else {
        logInfo(`Table '${tableName}' cannot be queried (schema mismatch or missing), skipping`);
      }
      return [];
    }

    const completedAudits = (data || []).filter(audit => {
      const auditStatus = (audit as any).audit_status;
      return !auditStatus || auditStatus === 'completed';
    });

    // Map database fields (snake_case) to TypeScript interface (camelCase)
    return mapAuditDataArray(completedAudits);
  } catch (error) {
    logError(`Retry query error for ${tableName}:`, error);
    return [];
  }
}

