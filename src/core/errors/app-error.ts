/**
 * Application Error Types
 * 
 * Standardized error handling across the application.
 * All errors should extend AppError for consistent error handling.
 */

export enum ErrorCode {
  // Database errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_NOT_FOUND = 'DATABASE_NOT_FOUND',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  
  // Business logic errors
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR'
}

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      stack: this.stack
    };
  }
}

/**
 * Create database error
 */
export function createDatabaseError(
  message: string,
  originalError?: Error,
  details?: any
): AppError {
  return new AppError(
    ErrorCode.DATABASE_QUERY_ERROR,
    message,
    details,
    originalError
  );
}

/**
 * Create validation error
 */
export function createValidationError(
  message: string,
  details?: any
): AppError {
  return new AppError(
    ErrorCode.VALIDATION_ERROR,
    message,
    details
  );
}

/**
 * Create business logic error
 */
export function createBusinessError(
  message: string,
  details?: any
): AppError {
  return new AppError(
    ErrorCode.BUSINESS_RULE_VIOLATION,
    message,
    details
  );
}

