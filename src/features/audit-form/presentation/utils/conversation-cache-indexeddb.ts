/**
 * Conversation Cache IndexedDB Helper
 * Handles IndexedDB operations for conversation caching
 * Extracted from conversation-cache.ts to comply with 250-line limit
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';

const INDEXEDDB_DB_NAME = 'CQMSConversationCache';
const INDEXEDDB_STORE_NAME = 'conversations';
const INDEXEDDB_VERSION = 1;

// Check if IndexedDB is available
const INDEXEDDB_AVAILABLE = typeof indexedDB !== 'undefined';

interface CacheData {
  cacheKey: string;
  adminId: string;
  date: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  conversationCount?: number;
}

export class ConversationCacheIndexedDB {
  private dbInstance: IDBDatabase | null = null;

  /**
   * Initialize IndexedDB database
   */
  private async initConversationCacheDB(): Promise<IDBDatabase | null> {
    return new Promise((resolve, reject) => {
      if (!INDEXEDDB_AVAILABLE) {
        logWarn('IndexedDB not available, will use localStorage fallback');
        resolve(null);
        return;
      }

      const request = indexedDB.open(INDEXEDDB_DB_NAME, INDEXEDDB_VERSION);

      request.onerror = () => {
        logError('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        logInfo('IndexedDB database opened successfully');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(INDEXEDDB_STORE_NAME)) {
          const objectStore = db.createObjectStore(INDEXEDDB_STORE_NAME, { keyPath: 'cacheKey' });
          
          objectStore.createIndex('adminId', 'adminId', { unique: false });
          objectStore.createIndex('date', 'date', { unique: false });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          
          logInfo('IndexedDB object store and indexes created');
        }
      };
    });
  }

  /**
   * Get database instance (with initialization)
   */
  async getConversationCacheDB(): Promise<IDBDatabase | null> {
    if (!INDEXEDDB_AVAILABLE) {
      return null;
    }
    
    if (this.dbInstance) {
      return this.dbInstance;
    }
    
    try {
      this.dbInstance = await this.initConversationCacheDB();
      return this.dbInstance;
    } catch (error) {
      logError('Failed to initialize IndexedDB:', error);
      return null;
    }
  }

  /**
   * Get cached conversations from IndexedDB
   */
  async getCachedFromIndexedDB(cacheKey: string): Promise<any | null> {
    const db = await this.getConversationCacheDB();
    if (!db) {
      return null;
    }

    try {
      return new Promise((resolve) => {
        const transaction = db.transaction([INDEXEDDB_STORE_NAME], 'readonly');
        const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
        const request = store.get(cacheKey);
        
        request.onsuccess = () => {
          const cachedData = request.result as CacheData | undefined;
          
          if (!cachedData) {
            logInfo(`No cache found in IndexedDB for: ${cacheKey}`);
            resolve(null);
            return;
          }
          
          const now = Date.now();
          
          // Check if cache is expired
          if (cachedData.expiresAt && now > cachedData.expiresAt) {
            logInfo(`Cache expired for: ${cacheKey} Expired at: ${new Date(cachedData.expiresAt).toISOString()}`);
            this.deleteCachedConversation(cacheKey);
            resolve(null);
            return;
          }
          
          // Validate cache data structure
          if (!cachedData.data) {
            logWarn(`Cache data structure invalid, missing data field: ${cacheKey}`);
            this.deleteCachedConversation(cacheKey);
            resolve(null);
            return;
          }
          
          const conversationCount = cachedData.data.conversations?.length || 0;
          logInfo(`Cache hit in IndexedDB for: ${cacheKey} (${conversationCount} conversations) Cached at: ${new Date(cachedData.timestamp).toISOString()}`);
          resolve(cachedData.data);
        };
        
        request.onerror = () => {
          logWarn('Error reading from IndexedDB:', request.error);
          resolve(null);
        };
      });
    } catch (error) {
      logWarn('Error accessing IndexedDB:', error);
      return null;
    }
  }

  /**
   * Cache conversations to IndexedDB
   */
  async cacheToIndexedDB(cacheKey: string, cacheData: CacheData): Promise<boolean> {
    const db = await this.getConversationCacheDB();
    if (!db) {
      return false;
    }

    try {
      return new Promise((resolve) => {
        const transaction = db.transaction([INDEXEDDB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
        const request = store.put(cacheData);
        
        request.onsuccess = () => {
          logInfo(`Cache saved to IndexedDB: ${cacheKey}`);
          resolve(true);
        };
        
        request.onerror = () => {
          logWarn('Error saving to IndexedDB:', request.error);
          resolve(false);
        };
      });
    } catch (error) {
      logWarn('Error accessing IndexedDB:', error);
      return false;
    }
  }

  /**
   * Delete a cached conversation from IndexedDB
   */
  async deleteCachedConversation(cacheKey: string): Promise<void> {
    const db = await this.getConversationCacheDB();
    if (db) {
      try {
        const transaction = db.transaction([INDEXEDDB_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(INDEXEDDB_STORE_NAME);
        store.delete(cacheKey);
      } catch (error) {
        logWarn('Error deleting from IndexedDB:', error);
      }
    }
  }
}

// Singleton instance
let conversationCacheIndexedDBInstance: ConversationCacheIndexedDB | null = null;

/**
 * Get conversation cache IndexedDB instance
 */
export function getConversationCacheIndexedDB(): ConversationCacheIndexedDB {
  if (!conversationCacheIndexedDBInstance) {
    conversationCacheIndexedDBInstance = new ConversationCacheIndexedDB();
  }
  return conversationCacheIndexedDBInstance;
}

