/**
 * Validation Utilities
 * Common validation functions for API endpoints
 */

/** Max lengths for input fields (single place for consistency and DoS prevention) */
export const INPUT_LIMITS = {
  EMAIL: 255,
  NAME: 100,
  TITLE: 200,
  BODY_SHORT: 500,
  BODY_LONG: 5000,
  URL: 500,
  URL_LONG: 2000,
  REASON: 500,
  RESOURCE_NAME: 255,
  RULE_TYPE: 50,
  CHANNEL: 200,
  CATEGORY: 100,
  TYPE: 50,
  AVATAR_URL: 500,
  DESCRIPTION: 2000,
} as const;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate required fields in an object
 */
export function validateRequired(
  data: Record<string, any>,
  fields: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize string input (remove dangerous characters)
 * Enhanced to handle all XSS vectors
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '')           // Remove HTML tags
    .replace(/javascript:/gi, '')    // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '')     // Remove event handlers (onclick=, onerror=, etc.)
    .replace(/data:/gi, '')         // Remove data URIs (if not needed)
    .replace(/vbscript:/gi, '')     // Remove vbscript: URLs
    .replace(/expression\s*\(/gi, '') // Remove CSS expressions
    .slice(0, maxLength);
}

