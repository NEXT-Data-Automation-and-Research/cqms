/**
 * Base Repository
 * 
 * Abstract base class for all repositories.
 * Provides common functionality and enforces repository pattern.
 * 
 * All repositories should extend this class.
 */

import { IDatabaseClient } from '../database/database-client.interface.js';
import { CacheManager, defaultCacheManager } from '../cache/cache-manager.js';
import { AppError, createDatabaseError } from '../errors/app-error.js';
import { logger } from '../../utils/logger.js';

export abstract class BaseRepository {
  protected db: IDatabaseClient;
  protected cache: CacheManager;
  protected tableName: string;

  constructor(
    db: IDatabaseClient,
    tableName: string,
    cache?: CacheManager
  ) {
    this.db = db;
    this.tableName = tableName;
    this.cache = cache || defaultCacheManager;
  }

  /**
   * Execute query with error handling
   */
  protected async executeQuery<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    errorMessage: string
  ): Promise<T> {
    try {
      const { data, error } = await queryFn();

      if (error) {
        logger.error(`${errorMessage}:`, error);
        throw createDatabaseError(
          `${errorMessage}: ${error.message || 'Unknown error'}`,
          error
        );
      }

      if (data === null) {
        throw createDatabaseError(`${errorMessage}: No data returned`);
      }

      return data;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error(`${errorMessage}:`, error);
      throw createDatabaseError(
        `${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get cached data or fetch and cache
   */
  protected async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = this.cache.get<T>(cacheKey, { ttl });
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const data = await fetchFn();
    this.cache.set(cacheKey, data, { ttl });
    return data;
  }

  /**
   * Invalidate cache for a key
   */
  protected invalidateCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Get table name
   */
  getTableName(): string {
    return this.tableName;
  }
}

