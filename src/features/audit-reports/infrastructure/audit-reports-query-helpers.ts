/**
 * Audit Reports Query Helpers
 * Helper functions for querying audit tables
 */

import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { logError, logInfo } from '../../../utils/logging-helper.js';
import type { AuditReport } from '../domain/entities.js';
import { mapAuditDataArray } from './audit-data-mapper.js';

/**
 * Query audits from a specific table with pagination to bypass Supabase's 1000-row limit
 */
export async function queryAuditTable(
  db: IDatabaseClient,
  tableName: string,
  fields: string,
  employeeEmail?: string,
  showAllAudits: boolean = true
): Promise<AuditReport[]> {
  try {
    console.log(`[QueryHelper] 🗄️ queryAuditTable called for ${tableName}:`, {
      employeeEmail: employeeEmail || '(undefined)',
      showAllAudits,
      willFilter: !!(employeeEmail && !showAllAudits)
    });

    // Supabase has a server-side limit of 1000 rows per request (PGRST_MAX_ROWS)
    // We need to paginate to get all data
    const PAGE_SIZE = 1000;
    const allData: AuditReport[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      let query = db
        .from(tableName)
        .select(fields)
        .order('submitted_at', { ascending: false })
        .range(from, to);

      // Filter by employee email if provided and not showing all
      if (employeeEmail && !showAllAudits) {
        const normalizedEmail = employeeEmail.toLowerCase().trim();
        if (page === 0) {
          console.log(`[QueryHelper] ✅ FILTERING audits by employee_email: "${normalizedEmail}"`);
        }
        query = query.eq('employee_email', normalizedEmail);
      } else if (page === 0) {
        console.log(`[QueryHelper] ❌ NOT filtering - employeeEmail: "${employeeEmail || 'undefined'}", showAllAudits: ${showAllAudits}`);
      }

      const { data, error } = await query.execute<AuditReport[]>();

      if (error) {
        // Handle errors on first page only - subsequent pages may fail if there's no more data
        if (page === 0) {
          // Return the error handling to the original logic
          return handleQueryError(db, tableName, fields, employeeEmail, showAllAudits, error);
        }
        break;
      }

      const pageData = data || [];
      console.log(`[QueryHelper] 📊 Page ${page} result for ${tableName}: ${pageData.length} rows`);
      
      allData.push(...pageData);

      // If we got less than PAGE_SIZE rows, we've reached the end
      if (pageData.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
        // Safety limit to prevent infinite loops
        if (page > 20) {
          console.warn(`[QueryHelper] ⚠️ Hit pagination safety limit for ${tableName}`);
          hasMore = false;
        }
      }
    }

    console.log(`[QueryHelper] 📊 Total rows fetched for ${tableName}: ${allData.length}`);

    // Filter completed audits only
    const completedAudits = allData.filter(audit => {
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
 * Handle query errors with fallback to minimal fields
 */
async function handleQueryError(
  db: IDatabaseClient,
  tableName: string,
  fields: string,
  employeeEmail?: string,
  showAllAudits?: boolean,
  error?: any
): Promise<AuditReport[]> {
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
  
  // For unexpected errors, log but don't throw
  logError(`Unexpected error querying table ${tableName}:`, error);
  return [];
}

/**
 * Retry query with minimal fields if full query fails (with pagination)
 */
async function retryQueryWithMinimalFields(
  db: IDatabaseClient,
  tableName: string,
  employeeEmail?: string,
  showAllAudits: boolean = true
): Promise<AuditReport[]> {
  try {
    // Use expanded minimal field set that should exist in all tables
    const minimalFields = 'id, employee_email, employee_name, employee_type, auditor_email, auditor_name, interaction_id, interaction_date, channel, quarter, week, country_of_employee, client_email, submitted_at, passing_status, average_score, total_errors_count, transcript, error_description, recommendations, acknowledgement_status, reversal_requested_at, reversal_approved, created_at';
    
    // Paginate to bypass Supabase's 1000-row limit
    const PAGE_SIZE = 1000;
    const allData: AuditReport[] = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      
      let query = db
        .from(tableName)
        .select(minimalFields)
        .order('submitted_at', { ascending: false })
        .range(from, to);

      if (employeeEmail && !showAllAudits) {
        const normalizedEmail = employeeEmail.toLowerCase().trim();
        if (page === 0) {
          logInfo(`[QueryHelper] Retry query - Filtering audits by employee_email: ${normalizedEmail}`);
        }
        query = query.eq('employee_email', normalizedEmail);
      }

      const { data, error } = await query.execute<AuditReport[]>();

      if (error) {
        if (page === 0) {
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
        }
        break;
      }

      const pageData = data || [];
      allData.push(...pageData);

      if (pageData.length < PAGE_SIZE) {
        hasMore = false;
      } else {
        page++;
        if (page > 20) {
          hasMore = false;
        }
      }
    }

    const completedAudits = allData.filter(audit => {
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

