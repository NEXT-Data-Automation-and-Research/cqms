/**
 * Logging Helper
 * Utility to replace console.log with structured logging
 * 
 * Usage:
 *   import { log, logError, logWarn, logInfo } from './utils/logging-helper.js';
 *   log('message', data); // instead of console.log('message', data);
 */

import { createLogger } from './logger.js';

// Create a default logger for general use
const defaultLogger = createLogger('App');

/**
 * Log debug message (replaces console.log)
 * Never logs sensitive data (passwords, tokens, etc.)
 */
export function log(message: string, data?: any): void {
  // Sanitize data to remove sensitive information
  const sanitized = sanitizeLogData(data);
  defaultLogger.debug(message, sanitized);
}

/**
 * Log error (replaces console.error)
 */
export function logError(message: string, error?: any): void {
  const sanitized = sanitizeLogData(error);
  defaultLogger.error(message, sanitized);
}

/**
 * Log warning (replaces console.warn)
 */
export function logWarn(message: string, data?: any): void {
  const sanitized = sanitizeLogData(data);
  defaultLogger.warn(message, sanitized);
}

/**
 * Log info (replaces console.info)
 */
export function logInfo(message: string, data?: any): void {
  const sanitized = sanitizeLogData(data);
  defaultLogger.info(message, sanitized);
}

/**
 * Sanitize log data to prevent sensitive information leakage
 */
function sanitizeLogData(data: any): any {
  if (!data) return data;
  
  if (typeof data !== 'object') {
    return data;
  }

  // Create a copy to avoid mutating original
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  // List of sensitive field patterns
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /credential/i,
    /auth/i,
    /authorization/i,
    /bearer/i,
    /api[_-]?key/i,
    /private[_-]?key/i,
  ];

  // Recursively sanitize object
  function sanitizeObject(obj: any): any {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key matches sensitive pattern
      const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
      
      if (isSensitive) {
        result[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return sanitizeObject(sanitized);
}

