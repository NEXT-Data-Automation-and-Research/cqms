/**
 * Persistent Cache Service using IndexedDB
 * Provides robust caching across page loads with stale-while-revalidate pattern
 * Makes homepage feel instant and realtime
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: number;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  staleWhileRevalidate: boolean; // If true, return stale data while refreshing
  maxStaleAge?: number; // Maximum age for stale data (default: 2x TTL)
}

const DB_NAME = 'homepage_cache_db';
const DB_VERSION = 1;
const STORE_NAME = 'cache';

class PersistentCacheService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private readonly defaultConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes default
    staleWhileRevalidate: true,
    maxStaleAge: 10 * 60 * 1000 // 10 minutes max stale
  };

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Get data from cache with stale-while-revalidate support
   */
  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: Partial<CacheConfig> = {}
  ): Promise<T> {
    await this.init();

    const finalConfig: CacheConfig = { ...this.defaultConfig, ...config };
    const cacheKey = this.normalizeKey(key);

    // Try to get from cache first
    const cached = await this.getFromDB<T>(cacheKey);

    if (cached) {
      const age = Date.now() - cached.timestamp;
      const isFresh = age < cached.ttl;
      const isStale = age < (finalConfig.maxStaleAge || cached.ttl * 2);

      if (isFresh) {
        // Data is fresh, return immediately
        console.log(`[Cache] Fresh data for ${key}`);
        return cached.data;
      }

      if (isStale && finalConfig.staleWhileRevalidate) {
        // Data is stale but usable, return it and refresh in background
        console.log(`[Cache] Stale data for ${key}, refreshing in background`);
        this.refreshInBackground(key, fetchFn, finalConfig).catch(err => {
          console.warn(`[Cache] Background refresh failed for ${key}:`, err);
        });
        return cached.data;
      }
    }

    // No cache or too stale, fetch fresh data
    console.log(`[Cache] Fetching fresh data for ${key}`);
    return this.fetchAndCache(key, fetchFn, finalConfig);
  }

  /**
   * Get data synchronously from cache (for immediate display)
   * Returns null if not available
   */
  async getSync<T>(key: string): Promise<T | null> {
    await this.init();
    const cacheKey = this.normalizeKey(key);
    const cached = await this.getFromDB<T>(cacheKey);
    
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    const maxAge = cached.ttl * 2; // Allow stale data for sync reads
    
    if (age < maxAge) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Fetch and cache data
   */
  private async fetchAndCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    try {
      const data = await fetchFn();
      await this.set(key, data, config.ttl);
      return data;
    } catch (error) {
      // If fetch fails, try to return stale cache if available
      const cached = await this.getFromDB<T>(this.normalizeKey(key));
      if (cached) {
        console.warn(`[Cache] Fetch failed, using stale cache for ${key}`);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Refresh data in background
   */
  private async refreshInBackground<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: CacheConfig
  ): Promise<void> {
    try {
      const data = await fetchFn();
      await this.set(key, data, config.ttl);
    } catch (error) {
      // Silently fail background refresh
      console.warn(`[Cache] Background refresh failed for ${key}:`, error);
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, ttl: number = this.defaultConfig.ttl): Promise<void> {
    await this.init();

    const cacheKey = this.normalizeKey(key);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: 1
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ key: cacheKey, ...entry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get data from IndexedDB
   */
  private async getFromDB<T>(key: string): Promise<CacheEntry<T> | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          resolve({
            data: result.data,
            timestamp: result.timestamp,
            ttl: result.ttl,
            version: result.version || 1
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        console.warn(`[Cache] Error reading from DB for ${key}:`, request.error);
        resolve(null); // Fail gracefully
      };
    });
  }

  /**
   * Invalidate cache for a key or pattern
   */
  async invalidate(pattern?: string): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          if (!pattern || cursor.value.key.includes(pattern)) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      const now = Date.now();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry = cursor.value;
          const maxAge = entry.ttl * 2; // Keep stale entries for cleanup
          if (now - entry.timestamp >= maxAge) {
            cursor.delete();
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await this.init();

    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    keys: string[];
  }> {
    await this.init();

    if (!this.db) {
      return { totalEntries: 0, totalSize: 0, keys: [] };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result;
        const keys = entries.map((e: any) => e.key);
        const totalSize = JSON.stringify(entries).length;

        resolve({
          totalEntries: entries.length,
          totalSize,
          keys
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Normalize cache key
   */
  private normalizeKey(key: string): string {
    return `homepage_${key}`;
  }

  /**
   * Preload critical data for instant display
   */
  async preload(keys: string[]): Promise<void> {
    await this.init();
    // Preload is handled by get() calls, this is just for future optimization
    console.log(`[Cache] Preloading ${keys.length} keys`);
  }
}

// Export singleton instance
export const persistentCacheService = new PersistentCacheService();

// Periodically clean up expired entries
setInterval(() => {
  persistentCacheService.clearExpired().catch(err => {
    console.warn('[Cache] Error clearing expired entries:', err);
  });
}, 5 * 60 * 1000); // Every 5 minutes
