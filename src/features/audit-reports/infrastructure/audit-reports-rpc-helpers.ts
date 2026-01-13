/**
 * Audit Reports RPC Helpers
 * Helper functions for RPC calls
 */

import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import { logError, logInfo } from '../../../utils/logging-helper.js';

export interface AuditTableRPCResult {
  table_name: string;
}

/**
 * Get audit tables using RPC function
 */
export async function getAuditTablesRPC(
  db: IDatabaseClient
): Promise<AuditTableRPCResult[]> {
  try {
    // Access underlying Supabase client for RPC
    const adapter = db as any;
    if (!adapter.client || !adapter.client.rpc) {
      throw new Error('RPC not available');
    }

    const { data, error } = await adapter.client.rpc('get_audit_tables');
    
    if (error) {
      // Handle RPC function not found gracefully (404)
      if (error.code === 'PGRST202' || 
          error.code === '42883' ||
          error.message?.includes('Could not find the function') ||
          error.message?.includes('function') && error.message?.includes('does not exist')) {
        // RPC function doesn't exist, return empty array to fall back to scorecards list
        logInfo('RPC function get_audit_tables not found, falling back to scorecards list (this is normal)');
        return [];
      }
      // For other RPC errors, log but don't throw
      logError('Error calling get_audit_tables RPC:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    // Log but don't throw - allow fallback to scorecards list
    logInfo('Exception calling get_audit_tables RPC, falling back to scorecards list:', error);
    return [];
  }
}

