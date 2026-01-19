/**
 * Input Validation Middleware
 * Comprehensive validation for API requests
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../utils/logger.js';
import { sanitizeString, isValidEmail } from '../utils/validation.js';

const logger = createLogger('ValidationMiddleware');

/**
 * Validation rules for common fields
 */
const VALIDATION_RULES = {
  email: {
    required: true,
    type: 'string',
    maxLength: 255,
    validator: (value: string) => isValidEmail(value),
    error: 'Invalid email format'
  },
  name: {
    required: true,
    type: 'string',
    maxLength: 100,
    minLength: 1,
    validator: (value: string) => /^[a-zA-Z0-9\s\-'.,]+$/.test(value),
    error: 'Name contains invalid characters'
  },
  role: {
    required: false,
    type: 'string',
    allowedValues: ['Super Admin', 'Admin', 'Quality Analyst', 'Employee', 'General User'],
    error: 'Invalid role'
  },
  department: {
    required: false,
    type: 'string',
    maxLength: 200,
    error: 'Department name too long'
  },
  employee_id: {
    required: false,
    type: 'string',
    maxLength: 50,
    validator: (value: string) => /^[a-zA-Z0-9\-_]+$/.test(value),
    error: 'Employee ID contains invalid characters'
  }
};

/**
 * Validate a single field
 */
function validateField(fieldName: string, value: any, rule: any): string | null {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${fieldName} is required`;
  }

  // Skip validation if not required and value is empty
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return null;
  }

  // Check type
  if (rule.type && typeof value !== rule.type) {
    return `${fieldName} must be of type ${rule.type}`;
  }

  // Check string length
  if (rule.type === 'string') {
    if (rule.maxLength && value.length > rule.maxLength) {
      return `${fieldName} exceeds maximum length of ${rule.maxLength}`;
    }
    if (rule.minLength && value.length < rule.minLength) {
      return `${fieldName} is below minimum length of ${rule.minLength}`;
    }
  }

  // Check allowed values
  if (rule.allowedValues && !rule.allowedValues.includes(value)) {
    return rule.error || `${fieldName} has invalid value`;
  }

  // Check custom validator
  if (rule.validator && !rule.validator(value)) {
    return rule.error || `${fieldName} validation failed`;
  }

  return null;
}

/**
 * Validate request body against rules
 */
export function validateRequestBody(rules: Record<string, any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];
    const sanitized: Record<string, any> = {};

    // Validate each field
    for (const [fieldName, rule] of Object.entries(rules)) {
      const value = req.body[fieldName];
      const error = validateField(fieldName, value, rule);

      if (error) {
        errors.push(error);
      } else if (value !== undefined && value !== null) {
        // Sanitize string values
        if (rule.type === 'string' && typeof value === 'string') {
          sanitized[fieldName] = sanitizeString(value, rule.maxLength || 1000);
        } else {
          sanitized[fieldName] = value;
        }
      }
    }

    // Check for unexpected fields (optional - can be enabled for strict validation)
    // const allowedFields = Object.keys(rules);
    // const receivedFields = Object.keys(req.body);
    // const unexpectedFields = receivedFields.filter(f => !allowedFields.includes(f));
    // if (unexpectedFields.length > 0) {
    //   errors.push(`Unexpected fields: ${unexpectedFields.join(', ')}`);
    // }

    if (errors.length > 0) {
      logger.warn('Validation failed:', { errors, path: req.path });
      res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
      return;
    }

    // Replace body with sanitized version
    req.body = { ...req.body, ...sanitized };
    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQueryParams(rules: Record<string, any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [fieldName, rule] of Object.entries(rules)) {
      const value = req.query[fieldName];
      const error = validateField(fieldName, value, rule);

      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      logger.warn('Query validation failed:', { errors, path: req.path });
      res.status(400).json({
        error: 'Invalid query parameters',
        details: errors
      });
      return;
    }

    next();
  };
}

/**
 * Validate URL parameters
 */
export function validateParams(rules: Record<string, any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [fieldName, rule] of Object.entries(rules)) {
      const value = req.params[fieldName];
      const error = validateField(fieldName, value, rule);

      if (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      logger.warn('Params validation failed:', { errors, path: req.path });
      res.status(400).json({
        error: 'Invalid URL parameters',
        details: errors
      });
      return;
    }

    next();
  };
}

/**
 * Request size limit middleware
 */
export function validateRequestSize(maxSizeBytes: number = 1024 * 1024) { // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > maxSizeBytes) {
      logger.warn('Request too large:', { size: contentLength, max: maxSizeBytes, path: req.path });
      res.status(413).json({
        error: 'Request entity too large',
        maxSize: maxSizeBytes
      });
      return;
    }

    next();
  };
}

/**
 * Export validation rules for reuse
 */
export { VALIDATION_RULES };
