/**
 * Conversation Cache Storage Helper
 * Handles localStorage fallback for conversation caching
 * Extracted from conversation-cache.ts to comply with 250-line limit
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';

const CONVERSATION_CACHE_PREFIX = 'conversations_cache_';

interface CacheData {
  cacheKey: string;
  adminId: string;
  date: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  conversationCount?: number;
}

export class ConversationCacheStorage {
  /**
   * Get cached conversations from localStorage
   */
  getCachedFromLocalStorage(cacheKey: string): any | null {
    try {
      const localStorageKey = CONVERSATION_CACHE_PREFIX + cacheKey;
      const cachedData = localStorage.getItem(localStorageKey);
      
      if (!cachedData) {
        logInfo(`No cache found in localStorage for: ${localStorageKey}`);
        return null;
      }
      
      const parsed = JSON.parse(cachedData) as CacheData;
      const now = Date.now();
      
      // Check if cache is expired
      if (parsed.expiresAt && now > parsed.expiresAt) {
        logInfo(`Cache expired for: ${localStorageKey} Expired at: ${new Date(parsed.expiresAt).toISOString()}`);
        localStorage.removeItem(localStorageKey);
        return null;
      }
      
      // Validate cache data structure
      if (!parsed.data) {
        logWarn(`Cache data structure invalid, missing data field: ${localStorageKey}`);
        localStorage.removeItem(localStorageKey);
        return null;
      }
      
      const conversationCount = parsed.data.conversations?.length || 0;
      logInfo(`Cache hit in localStorage for: ${localStorageKey} (${conversationCount} conversations) Cached at: ${new Date(parsed.timestamp).toISOString()}`);
      return parsed.data;
      
    } catch (error) {
      logWarn('Error reading from localStorage:', error);
      return null;
    }
  }

  /**
   * Cache conversations to localStorage
   */
  cacheToLocalStorage(cacheKey: string, cacheData: CacheData): boolean {
    try {
      const localStorageKey = CONVERSATION_CACHE_PREFIX + cacheKey;
      const cacheString = JSON.stringify(cacheData);
      const sizeInMB = (cacheString.length / (1024 * 1024)).toFixed(2);
      
      // Check if data is too large for localStorage (limit is ~5-10MB, but be conservative)
      if (cacheString.length > 2 * 1024 * 1024) { // 2MB limit per entry
        logWarn(`Cache data too large for localStorage (${sizeInMB}MB), skipping cache storage.`);
        return false;
      }
      
      localStorage.setItem(localStorageKey, cacheString);
      
      // Verify it was saved
      const verifyCache = localStorage.getItem(localStorageKey);
      if (!verifyCache) {
        logWarn('Cache save failed: Item not found after save attempt');
        return false;
      }
      
      logInfo(`Successfully cached conversations in localStorage for: ${localStorageKey} (${cacheData.conversationCount} conversations, ${sizeInMB}MB) Expires: ${new Date(cacheData.expiresAt).toISOString()}`);
      return true;
      
    } catch (error: any) {
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        logWarn('localStorage quota exceeded, clearing old cache entries...');
        this.clearOldLocalStorageEntries();
        
        // Try once more after clearing
        try {
          const localStorageKey = CONVERSATION_CACHE_PREFIX + cacheKey;
          localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
          const verifyCache = localStorage.getItem(localStorageKey);
          if (verifyCache) {
            logInfo('Cached to localStorage after clearing old entries');
            return true;
          }
        } catch (retryError) {
          logWarn('Still unable to cache to localStorage after clearing:', retryError);
        }
      }
      logWarn('Error caching to localStorage:', error);
      return false;
    }
  }

  /**
   * Clear old localStorage cache entries
   */
  private clearOldLocalStorageEntries(): void {
    try {
      const entries: Array<{ key: string; timestamp: number }> = [];
      
      // Collect all cache entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CONVERSATION_CACHE_PREFIX)) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}') as CacheData;
            if (data.timestamp) {
              entries.push({ key, timestamp: data.timestamp });
            }
          } catch {
            // Invalid entry, remove it
            localStorage.removeItem(key);
          }
        }
      }
      
      // Sort by timestamp (newest first)
      entries.sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only last 5 entries for localStorage
      const maxEntries = 5;
      if (entries.length > maxEntries) {
        const toRemove = entries.slice(maxEntries);
        toRemove.forEach(entry => {
          localStorage.removeItem(entry.key);
        });
        logInfo(`Cleared ${toRemove.length} old localStorage cache entries`);
      }
    } catch (error) {
      logWarn('Error clearing old localStorage entries:', error);
    }
  }

  /**
   * Delete cached conversation from localStorage
   */
  deleteFromLocalStorage(cacheKey: string): void {
    try {
      localStorage.removeItem(CONVERSATION_CACHE_PREFIX + cacheKey);
    } catch (error) {
      // Ignore
    }
  }
}

// Singleton instance
let conversationCacheStorageInstance: ConversationCacheStorage | null = null;

/**
 * Get conversation cache storage instance
 */
export function getConversationCacheStorage(): ConversationCacheStorage {
  if (!conversationCacheStorageInstance) {
    conversationCacheStorageInstance = new ConversationCacheStorage();
  }
  return conversationCacheStorageInstance;
}

