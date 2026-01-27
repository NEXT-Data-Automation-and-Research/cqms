/**
 * Redis Cache Manager
 * 
 * Redis-backed implementation of CacheManager for server-side caching
 * Falls back to in-memory cache if Redis is unavailable
 * Provides both async (Redis) and sync (fallback) methods
 */

import { CacheManager, CacheOptions, CacheEntry } from './cache-manager.js';
import { getRedisClient, getRedisConfig } from './redis-client.js';
import { logWarn, logInfo } from '../../utils/logging-helper.js';

export class RedisCacheManager {
  private memoryFallback: Map<string, CacheEntry<any>> = new Map();
  private useRedis: boolean = false;
  private keyPrefix: string;
  protected defaultOptions: Required<CacheOptions>;
  private baseCache: CacheManager;

  constructor(defaultOptions: CacheOptions = {}) {
    this.defaultOptions = {
      ttl: defaultOptions.ttl ?? 300000, // 5 minutes default
      storage: defaultOptions.storage ?? 'session',
      keyPrefix: defaultOptions.keyPrefix ?? 'app_cache_'
    };
    this.keyPrefix = defaultOptions.keyPrefix || 'app_cache_';
    this.baseCache = new CacheManager(defaultOptions);
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    const config = getRedisConfig();
    if (!config.enabled) {
      logInfo('[RedisCacheManager] Redis is disabled, using memory fallback');
      return;
    }

    try {
      const client = await getRedisClient();
      if (client && client.status === 'ready') {
        this.useRedis = true;
        logInfo('[RedisCacheManager] Using Redis for caching');
      } else {
        logWarn('[RedisCacheManager] Redis not available, using memory fallback');
      }
    } catch (error) {
      logWarn('[RedisCacheManager] Redis initialization failed, using memory fallback:', error);
    }
  }

  /**
   * Get cached data (async - tries Redis first)
   */
  async getAsync<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const opts = { ...this.defaultOptions, ...options };
    const fullKey = this.keyPrefix + key;

    // Try Redis first if available
    if (this.useRedis) {
      try {
        const client = await getRedisClient();
        if (client && client.status === 'ready') {
          const cached = await client.get(fullKey);
          if (cached) {
            try {
              const entry: CacheEntry<T> = JSON.parse(cached);
              
              // Check if expired
              if (entry.ttl) {
                const age = Date.now() - entry.timestamp;
                if (age > entry.ttl) {
                  await this.deleteAsync(key, options);
                  return null;
                }
              }
              
              return entry.data;
            } catch (parseError) {
              logWarn('[RedisCacheManager] Failed to parse cached data:', parseError);
              await client.del(fullKey);
              return null;
            }
          }
        }
      } catch (error) {
        logWarn('[RedisCacheManager] Redis get error, falling back to memory:', error);
        this.useRedis = false;
      }
    }

    // Fallback to memory cache
    return this.baseCache.get<T>(key, options);
  }

  /**
   * Set cached data (async - tries Redis first)
   */
  async setAsync<T>(key: string, data: T, options?: CacheOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    const fullKey = this.keyPrefix + key;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: opts.ttl
    };

    // Try Redis first if available
    if (this.useRedis) {
      try {
        const client = await getRedisClient();
        if (client && client.status === 'ready') {
          const serialized = JSON.stringify(entry);
          
          // Calculate TTL in seconds for Redis
          const ttlSeconds = opts.ttl ? Math.ceil(opts.ttl / 1000) : undefined;
          
          if (ttlSeconds) {
            await client.setex(fullKey, ttlSeconds, serialized);
          } else {
            await client.set(fullKey, serialized);
          }
          
          // Also store in memory fallback
          this.memoryFallback.set(fullKey, entry);
          return;
        }
      } catch (error) {
        logWarn('[RedisCacheManager] Redis set error, falling back to memory:', error);
        this.useRedis = false;
      }
    }

    // Fallback to memory cache
    this.baseCache.set(key, data, options);
    this.memoryFallback.set(fullKey, entry);
  }

  /**
   * Delete cached data (async - tries Redis first)
   */
  async deleteAsync(key: string, options?: CacheOptions): Promise<void> {
    const opts = { ...this.defaultOptions, ...options };
    const fullKey = this.keyPrefix + key;

    // Try Redis first if available
    if (this.useRedis) {
      try {
        const client = await getRedisClient();
        if (client && client.status === 'ready') {
          await client.del(fullKey);
        }
      } catch (error) {
        logWarn('[RedisCacheManager] Redis delete error:', error);
        this.useRedis = false;
      }
    }

    // Also delete from memory fallback
    this.baseCache.delete(key, options);
    this.memoryFallback.delete(fullKey);
  }

  /**
   * Clear all cache (with pattern matching)
   */
  async clearAsync(pattern?: string): Promise<void> {
    if (this.useRedis) {
      try {
        const client = await getRedisClient();
        if (client && client.status === 'ready') {
          const searchPattern = pattern 
            ? `${this.keyPrefix}${pattern}*`
            : `${this.keyPrefix}*`;
          
          const keys = await client.keys(searchPattern);
          if (keys.length > 0) {
            await client.del(...keys);
          }
        }
      } catch (error) {
        logWarn('[RedisCacheManager] Redis clear error:', error);
        this.useRedis = false;
      }
    }

    // Also clear memory fallback
    if (pattern) {
      const prefix = this.keyPrefix + pattern;
      for (const key of this.memoryFallback.keys()) {
        if (key.startsWith(prefix)) {
          this.memoryFallback.delete(key);
        }
      }
    } else {
      this.memoryFallback.clear();
    }
    
    this.baseCache.clear();
  }

  /**
   * Invalidate cache by pattern (useful for related data)
   */
  async invalidatePattern(pattern: string): Promise<void> {
    await this.clearAsync(pattern);
  }

  /**
   * Synchronous get for compatibility (delegates to base cache)
   */
  get<T>(key: string, options?: CacheOptions): T | null {
    return this.baseCache.get<T>(key, options);
  }

  /**
   * Synchronous set for compatibility (delegates to base cache)
   */
  set<T>(key: string, data: T, options?: CacheOptions): void {
    this.baseCache.set(key, data, options);
  }

  /**
   * Synchronous delete for compatibility (delegates to base cache)
   */
  delete(key: string, options?: CacheOptions): void {
    this.baseCache.delete(key, options);
  }

  /**
   * Synchronous clear for compatibility
   */
  clear(options?: CacheOptions): void {
    this.baseCache.clear(options);
  }
}
