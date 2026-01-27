/**
 * Cache-Aware Data Loader
 * Wraps data loading functions with robust caching for instant display
 */

import { unifiedDataService } from './unified-data-service.js';

/**
 * Cache configuration for different data types
 */
export const CACHE_CONFIG = {
  stats: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true
  },
  assignedAudits: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: true
  },
  recentUpdates: {
    ttl: 3 * 60 * 1000, // 3 minutes
    staleWhileRevalidate: true
  },
  notifications: {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleWhileRevalidate: true
  },
  events: {
    ttl: 10 * 60 * 1000, // 10 minutes
    staleWhileRevalidate: true
  },
  users: {
    ttl: 10 * 60 * 1000, // 10 minutes
    staleWhileRevalidate: true
  },
  filters: {
    ttl: 10 * 60 * 1000, // 10 minutes
    staleWhileRevalidate: true
  }
};

/**
 * Wrap a data loading function with caching
 */
export function withCache<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  config: { ttl?: number; staleWhileRevalidate?: boolean } = {}
): () => Promise<T> {
  const finalConfig = {
    ttl: config.ttl || CACHE_CONFIG.stats.ttl,
    staleWhileRevalidate: config.staleWhileRevalidate !== false
  };

  return async () => {
    return unifiedDataService.get(
      cacheKey,
      fetchFn,
      finalConfig.ttl,
      {
        usePersistentCache: true,
        staleWhileRevalidate: finalConfig.staleWhileRevalidate
      }
    );
  };
}

/**
 * Get cached data synchronously (for immediate display)
 */
export async function getCachedSync<T>(cacheKey: string): Promise<T | null> {
  return unifiedDataService.getSync<T>(cacheKey);
}

/**
 * Invalidate cache for a specific pattern
 */
export async function invalidateCache(pattern?: string): Promise<void> {
  return unifiedDataService.invalidate(pattern);
}

/**
 * Build cache key from components
 */
export function buildCacheKey(...components: (string | number | null | undefined)[]): string {
  return components
    .filter(c => c !== null && c !== undefined)
    .map(c => String(c))
    .join('_');
}
