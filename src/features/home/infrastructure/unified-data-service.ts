/**
 * Unified Data Fetching Service
 * Reduces redundant queries by sharing results between functions
 * Now with persistent IndexedDB caching for instant page loads
 */

import { persistentCacheService } from './persistent-cache-service.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Unified service for fetching and caching data
 * Prevents redundant queries by sharing cached results
 * Uses persistent cache for cross-session data persistence
 */
export class UnifiedDataService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private activeRequests: Map<string, Promise<any>> = new Map();
  private usePersistentCache: boolean = true;

  /**
   * Get data with caching and request deduplication
   * Uses persistent cache with stale-while-revalidate for instant display
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 5 * 60 * 1000, // 5 minutes default (increased from 1 minute)
    options: { usePersistentCache?: boolean; staleWhileRevalidate?: boolean } = {}
  ): Promise<T> {
    const {
      usePersistentCache: usePersistent = this.usePersistentCache,
      staleWhileRevalidate = true
    } = options;

    // Check in-memory cache first (fastest)
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }

    // Check if request is already in progress
    const activeRequest = this.activeRequests.get(key);
    if (activeRequest) {
      return activeRequest;
    }

    // Use persistent cache if enabled
    if (usePersistent) {
      try {
        const data = await persistentCacheService.get(
          key,
          async () => {
            // Fetch function - also update in-memory cache
            const fetchedData = await fetchFn();
            this.cache.set(key, {
              data: fetchedData,
              timestamp: Date.now(),
              ttl
            });
            return fetchedData;
          },
          {
            ttl,
            staleWhileRevalidate
          }
        );

        // Update in-memory cache
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl
        });

        return data;
      } catch (error) {
        // Fallback to in-memory cache if persistent cache fails
        console.warn('[UnifiedDataService] Persistent cache failed, using in-memory:', error);
      }
    }

    // Fallback: Create new request with in-memory cache only
    const request = fetchFn()
      .then(data => {
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl
        });
        // Also store in persistent cache if enabled
        if (usePersistent) {
          persistentCacheService.set(key, data, ttl).catch(err => {
            console.warn('[UnifiedDataService] Failed to persist cache:', err);
          });
        }
        // Remove from active requests
        this.activeRequests.delete(key);
        return data;
      })
      .catch(error => {
        // Remove from active requests on error
        this.activeRequests.delete(key);
        throw error;
      });

    // Store active request
    this.activeRequests.set(key, request);

    return request;
  }

  /**
   * Get data synchronously from cache (for immediate display)
   * Returns null if not available
   */
  async getSync<T>(key: string): Promise<T | null> {
    // Check in-memory cache first
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < cached.ttl * 2) { // Allow stale data for sync reads
        return cached.data;
      }
    }

    // Check persistent cache
    if (this.usePersistentCache) {
      try {
        return await persistentCacheService.getSync<T>(key);
      } catch (error) {
        console.warn('[UnifiedDataService] Failed to get sync from persistent cache:', error);
      }
    }

    return null;
  }

  /**
   * Invalidate cache for a specific key or pattern
   */
  async invalidate(pattern?: string): Promise<void> {
    // Clear in-memory cache
    if (!pattern) {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }

    // Clear persistent cache
    if (this.usePersistentCache) {
      try {
        await persistentCacheService.invalidate(pattern);
      } catch (error) {
        console.warn('[UnifiedDataService] Failed to invalidate persistent cache:', error);
      }
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp >= entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    const persistentStats = this.usePersistentCache
      ? await persistentCacheService.getStats().catch(() => ({
          totalEntries: 0,
          totalSize: 0,
          keys: []
        }))
      : { totalEntries: 0, totalSize: 0, keys: [] };

    return {
      inMemoryCacheSize: this.cache.size,
      persistentCacheSize: persistentStats.totalEntries,
      persistentCacheSizeBytes: persistentStats.totalSize,
      activeRequests: this.activeRequests.size,
      inMemoryKeys: Array.from(this.cache.keys()),
      persistentKeys: persistentStats.keys
    };
  }
}

// Export singleton instance
export const unifiedDataService = new UnifiedDataService();

// Periodically clear expired entries
setInterval(() => {
  unifiedDataService.clearExpired();
}, 60000); // Every minute
