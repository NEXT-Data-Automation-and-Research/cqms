/**
 * Cache Manager
 * 
 * Centralized caching abstraction for repositories.
 * Supports different storage backends (sessionStorage, localStorage, memory).
 */

export type CacheStorage = 'session' | 'local' | 'memory';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  storage?: CacheStorage;
  keyPrefix?: string;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private defaultOptions: Required<CacheOptions>;

  constructor(defaultOptions: CacheOptions = {}) {
    this.defaultOptions = {
      ttl: defaultOptions.ttl ?? 300000, // 5 minutes default
      storage: defaultOptions.storage ?? 'session',
      keyPrefix: defaultOptions.keyPrefix ?? 'app_cache_'
    };
  }

  /**
   * Get cached data
   */
  get<T>(key: string, options?: CacheOptions): T | null {
    const opts = { ...this.defaultOptions, ...options };
    const fullKey = opts.keyPrefix + key;

    try {
      const entry = this.getEntry<T>(fullKey, opts.storage);
      
      if (!entry) {
        return null;
      }

      // Check if expired
      if (entry.ttl) {
        const age = Date.now() - entry.timestamp;
        if (age > entry.ttl) {
          this.delete(key, options);
          return null;
        }
      }

      return entry.data;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, options?: CacheOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    const fullKey = opts.keyPrefix + key;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: opts.ttl
    };

    try {
      this.setEntry(fullKey, entry, opts.storage);
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  /**
   * Delete cached data
   */
  delete(key: string, options?: CacheOptions): void {
    const opts = { ...this.defaultOptions, ...options };
    const fullKey = opts.keyPrefix + key;

    try {
      this.deleteEntry(fullKey, opts.storage);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  /**
   * Clear all cache
   */
  clear(options?: CacheOptions): void {
    const opts = { ...this.defaultOptions, ...options };

    try {
      if (opts.storage === 'memory') {
        this.memoryCache.clear();
      } else if (opts.storage === 'session') {
        this.clearStorage(sessionStorage, opts.keyPrefix);
      } else if (opts.storage === 'local') {
        this.clearStorage(localStorage, opts.keyPrefix);
      }
    } catch (error) {
      console.warn('Cache clear error:', error);
    }
  }

  /**
   * Get entry from storage
   */
  private getEntry<T>(key: string, storage: CacheStorage): CacheEntry<T> | null {
    if (storage === 'memory') {
      return this.memoryCache.get(key) || null;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    const storageObj = storage === 'local' ? localStorage : sessionStorage;
    const item = storageObj.getItem(key);
    
    if (!item) {
      return null;
    }

    try {
      return JSON.parse(item);
    } catch {
      return null;
    }
  }

  /**
   * Set entry in storage
   */
  private setEntry<T>(key: string, entry: CacheEntry<T>, storage: CacheStorage): void {
    if (storage === 'memory') {
      this.memoryCache.set(key, entry);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const storageObj = storage === 'local' ? localStorage : sessionStorage;
    try {
      storageObj.setItem(key, JSON.stringify(entry));
    } catch (error) {
      // Storage might be full
      console.warn('Storage set error:', error);
    }
  }

  /**
   * Delete entry from storage
   */
  private deleteEntry(key: string, storage: CacheStorage): void {
    if (storage === 'memory') {
      this.memoryCache.delete(key);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const storageObj = storage === 'local' ? localStorage : sessionStorage;
    storageObj.removeItem(key);
  }

  /**
   * Clear storage with prefix
   */
  private clearStorage(storage: Storage, prefix: string): void {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    keys.forEach(key => storage.removeItem(key));
  }
}

// Default cache manager instance
export const defaultCacheManager = new CacheManager();

