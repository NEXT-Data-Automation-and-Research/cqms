/**
 * Redis Cache Middleware
 * 
 * Express middleware for caching API responses in Redis
 * Automatically caches GET requests and invalidates on mutations
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient, getRedisConfig } from '../../core/cache/redis-client.js';
import { createLogger } from '../../utils/logger.js';
import crypto from 'crypto';

const logger = createLogger('RedisCache');

export interface CacheMiddlewareOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
  includeQueryParams?: boolean;
}

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request, includeQuery: boolean = true): string {
  const path = req.path;
  const userId = (req as any).user?.id || 'anonymous';
  
  let key = `api:${req.method}:${path}:user:${userId}`;
  
  if (includeQuery && Object.keys(req.query).length > 0) {
    const queryString = JSON.stringify(req.query);
    const queryHash = crypto.createHash('md5').update(queryString).digest('hex').substring(0, 8);
    key += `:query:${queryHash}`;
  }
  
  return key;
}

/**
 * Redis cache middleware for GET requests
 */
export function redisCacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = generateCacheKey,
    skipCache = () => false,
    includeQueryParams = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip if configured to skip
    if (skipCache(req)) {
      return next();
    }

    // Check if Redis is enabled
    const config = getRedisConfig();
    if (!config.enabled) {
      return next();
    }

    try {
      const client = await getRedisClient();
      if (!client || client.status !== 'ready') {
        return next();
      }

      const cacheKey = keyGenerator(req);
      
      // Try to get from cache
      const cached = await client.get(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          logger.debug(`Cache HIT: ${cacheKey}`);
          
          res.setHeader('X-Cache', 'HIT');
          res.setHeader('X-Cache-Key', cacheKey);
          res.json(cachedData);
          return;
        } catch (parseError) {
          logger.warn('Failed to parse cached response:', parseError);
          await client.del(cacheKey);
        }
      }

      logger.debug(`Cache MISS: ${cacheKey}`);

      // Override res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = function(body: any) {
        // Cache successful responses (status 200-299)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const serialized = JSON.stringify(body);
          client.setex(cacheKey, ttl, serialized).catch((error: Error) => {
            logger.warn('Failed to cache response:', error);
          });
        }
        
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-Cache-Key', cacheKey);
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.warn('Redis cache middleware error:', error);
      next();
    }
  };
}

/**
 * Invalidate cache by pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const config = getRedisConfig();
  if (!config.enabled) {
    return;
  }

  try {
    const client = await getRedisClient();
    if (!client || client.status !== 'ready') {
      return;
    }

    const keys = await client.keys(`api:*${pattern}*`);
    if (keys.length > 0) {
      await client.del(...keys);
      logger.info(`Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
    }
  } catch (error) {
    logger.warn('Failed to invalidate cache pattern:', error);
  }
}

/**
 * Invalidate cache for specific user
 */
export async function invalidateUserCache(userId: string): Promise<void> {
  await invalidateCachePattern(`user:${userId}`);
}

/**
 * Invalidate cache for specific path
 */
export async function invalidatePathCache(path: string): Promise<void> {
  await invalidateCachePattern(`:${path}:`);
}
