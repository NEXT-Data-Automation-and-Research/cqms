/**
 * Base Service
 * 
 * Abstract base class for all services.
 * Provides common functionality and enforces service pattern.
 * 
 * All services should extend this class.
 */

import { AppError, createBusinessError, createValidationError } from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export abstract class BaseService {
  /**
   * Validate input data
   */
  protected validateInput<T>(
    data: T,
    validator: (data: T) => boolean | string
  ): void {
    const result = validator(data);
    if (result !== true) {
      const message = typeof result === 'string' ? result : 'Invalid input';
      throw createValidationError(message, { data });
    }
  }

  /**
   * Execute business logic with error handling
   */
  protected async executeBusinessLogic<T>(
    logicFn: () => Promise<T>,
    errorMessage: string
  ): Promise<T> {
    try {
      return await logicFn();
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`${errorMessage}:`, error);
      throw createBusinessError(
        `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  /**
   * Handle async operations with retry logic
   */
  protected async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          logger.warn(`Operation failed (attempt ${attempt}/${maxRetries}), retrying...`);
          await this.delay(delay * attempt);
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

