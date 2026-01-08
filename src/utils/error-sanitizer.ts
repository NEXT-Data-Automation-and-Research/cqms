/**
 * Error Sanitizer
 * Sanitizes error messages to prevent information leakage
 * 
 * SECURITY: Never expose sensitive information in error messages:
 * - Database table/column names
 * - SQL queries
 * - Stack traces
 * - Internal file paths
 * - API keys or tokens
 */

/**
 * Sanitize error message for user display
 * Removes sensitive information and provides generic error messages
 * 
 * @param error Error object or error message string
 * @param defaultMessage Default message if error cannot be sanitized
 * @returns Sanitized error message safe for user display
 */
export function sanitizeErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  if (!error) {
    return defaultMessage;
  }

  let errorMessage = '';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    return defaultMessage;
  }

  // List of sensitive patterns to remove or replace
  type PatternReplacement = 
    | { pattern: RegExp; replacement: string }
    | { pattern: RegExp; replacement: (match: string) => string };
  
  const sensitivePatterns: PatternReplacement[] = [
    // Database-related
    { pattern: /table\s+['"]?\w+['"]?/gi, replacement: 'database table' },
    { pattern: /column\s+['"]?\w+['"]?/gi, replacement: 'database column' },
    { pattern: /from\s+['"]?\w+['"]?/gi, replacement: 'from database' },
    { pattern: /insert\s+into/gi, replacement: 'database operation' },
    { pattern: /update\s+['"]?\w+['"]?/gi, replacement: 'database operation' },
    { pattern: /delete\s+from/gi, replacement: 'database operation' },
    { pattern: /select\s+.*\s+from/gi, replacement: 'database query' },
    
    // SQL-related
    { pattern: /sql\s+error/gi, replacement: 'database error' },
    { pattern: /postgres/i, replacement: 'database' },
    { pattern: /supabase/i, replacement: 'database' },
    
    // File paths
    { pattern: /[A-Z]:\\[^\s]+/g, replacement: '[file path]' },
    { pattern: /\/[^\s]+\.(ts|js|json)/g, replacement: '[file path]' },
    
    // Stack traces
    { pattern: /at\s+[\w.]+\([^)]+\)/g, replacement: '' },
    { pattern: /Error:\s*/gi, replacement: '' },
    
    // API keys/tokens - use function replacement
    { 
      pattern: /[A-Za-z0-9]{32,}/g, 
      replacement: (match: string) => {
        // Only replace if it looks like a token/key (long alphanumeric)
        return match.length > 40 ? '[token]' : match;
      }
    },
    
    // Email addresses (sometimes in errors)
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[email]' },
  ];

  let sanitized = errorMessage;
  
  for (const item of sensitivePatterns) {
    if (typeof item.replacement === 'string') {
      sanitized = sanitized.replace(item.pattern, item.replacement);
    } else {
      sanitized = sanitized.replace(item.pattern, item.replacement);
    }
  }

  // Clean up multiple spaces and trim
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  // If sanitization removed everything, return default
  if (!sanitized || sanitized.length < 3) {
    return defaultMessage;
  }

  // Limit length to prevent extremely long error messages
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 197) + '...';
  }

  return sanitized;
}

/**
 * Get user-friendly error message based on error type
 * Maps common error types to user-friendly messages
 */
export function getUserFriendlyErrorMessage(error: unknown, context: string = 'operation'): string {
  if (!error) {
    return `Failed to ${context}. Please try again.`;
  }

  let errorMessage = '';
  
  if (error instanceof Error) {
    errorMessage = error.message.toLowerCase();
  } else if (typeof error === 'string') {
    errorMessage = error.toLowerCase();
  } else {
    return `Failed to ${context}. Please try again.`;
  }

  // Map common error patterns to user-friendly messages
  const errorMappings: Array<{ pattern: RegExp; message: string }> = [
    { pattern: /network|fetch|connection/i, message: `Network error. Please check your connection and try again.` },
    { pattern: /unauthorized|401/i, message: `Authentication required. Please log in again.` },
    { pattern: /forbidden|403/i, message: `Access denied. You don't have permission to perform this action.` },
    { pattern: /not found|404/i, message: `Resource not found. It may have been deleted or moved.` },
    { pattern: /validation|invalid/i, message: `Invalid input. Please check your data and try again.` },
    { pattern: /already exists|duplicate/i, message: `This item already exists. Please use a different value.` },
    { pattern: /required|missing/i, message: `Required information is missing. Please fill in all required fields.` },
    { pattern: /timeout/i, message: `Request timed out. Please try again.` },
    { pattern: /server|500/i, message: `Server error. Please try again later or contact support.` },
  ];

  for (const { pattern, message } of errorMappings) {
    if (pattern.test(errorMessage)) {
      return message;
    }
  }

  // If no mapping found, sanitize and return
  return sanitizeErrorMessage(error, `Failed to ${context}. Please try again.`);
}

