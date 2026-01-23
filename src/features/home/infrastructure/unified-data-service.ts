/**
 * Unified Data Fetching Service
 * Reduces redundant queries by sharing results between functions
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Unified service for fetching and caching data
 * Prevents redundant queries by sharing cached results
 */
export class UnifiedDataService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private activeRequests: Map<string, Promise<any>> = new Map();

  /**
   * Get data with caching and request deduplication
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = 60000 // 1 minute default
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }

    // Check if request is already in progress
    const activeRequest = this.activeRequests.get(key);
    if (activeRequest) {
      return activeRequest;
    }

    // Create new request
    const request = fetchFn()
      .then(data => {
        // Cache the result
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
          ttl
        });
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
   * Invalidate cache for a specific key or pattern
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      // Clear all cache
      this.cache.clear();
    } else {
      // Clear matching keys
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
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
  getStats() {
    return {
      cacheSize: this.cache.size,
      activeRequests: this.activeRequests.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const unifiedDataService = new UnifiedDataService();

// Periodically clear expired entries
setInterval(() => {
  unifiedDataService.clearExpired();
}, 60000); // Every minute
