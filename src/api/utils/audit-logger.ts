/**
 * Audit Logger Utility
 * Tracks API access for compliance and security monitoring
 */

import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { createLogger } from '../../utils/logger.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';

const logger = createLogger('AuditLogger');

export interface AuditLogEntry {
  user_id: string;
  user_email?: string;
  endpoint: string;
  method: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
}

/**
 * Log API access for audit trail
 * 
 * @param req Express request object
 * @param endpoint API endpoint accessed
 * @param success Whether the request was successful
 * @param errorMessage Error message if request failed
 * @param metadata Additional metadata to log
 */
export async function logApiAccess(
  req: AuthenticatedRequest,
  endpoint: string,
  success: boolean = true,
  errorMessage?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const userId = req.user?.id || 'unknown';
    const userEmail = req.user?.email || undefined;
    const ipAddress = req.ip || req.socket.remoteAddress || undefined;
    const userAgent = req.headers['user-agent'] || undefined;
    const method = req.method || 'GET';

    const auditEntry: AuditLogEntry = {
      user_id: userId,
      user_email: userEmail,
      endpoint,
      method,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
      success,
      error_message: errorMessage,
      metadata,
    };

    // Log to console/logger
    logger.info('API access audit', auditEntry);

    // Try to store in database (non-blocking)
    try {
      const supabase = getServerSupabase();
      
      // Check if api_access_logs table exists, if not, just log to console
      const { error } = await supabase
        .from('api_access_logs')
        .insert(auditEntry)
        .select()
        .limit(1);

      if (error) {
        // Table might not exist, that's okay - we still have console logs
        logger.debug('Could not write to api_access_logs table (may not exist):', error.message);
      }
    } catch (dbError) {
      // Non-critical - API access logs are best-effort
      logger.debug('API access log database write failed (non-critical):', dbError);
    }
  } catch (error) {
    // Never let audit logging break the application
    logger.warn('Audit logging failed (non-critical):', error);
  }
}

/**
 * Create api_access_logs table (run as migration if needed)
 * 
 * SQL to create table:
 * 
 * CREATE TABLE IF NOT EXISTS api_access_logs (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL,
 *   user_email TEXT,
 *   endpoint TEXT NOT NULL,
 *   method TEXT NOT NULL,
 *   ip_address TEXT,
 *   user_agent TEXT,
 *   timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   success BOOLEAN NOT NULL DEFAULT true,
 *   error_message TEXT,
 *   metadata JSONB DEFAULT '{}'::jsonb,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE INDEX IF NOT EXISTS idx_api_access_logs_user_id ON api_access_logs(user_id);
 * CREATE INDEX IF NOT EXISTS idx_api_access_logs_timestamp ON api_access_logs(timestamp);
 * CREATE INDEX IF NOT EXISTS idx_api_access_logs_endpoint ON api_access_logs(endpoint);
 */

