/**
 * Conversation Cache Manager
 * Manages IndexedDB and localStorage caching for conversations
 * Migrated from audit-form.html conversation cache functions
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';
import { getConversationCacheStorage } from './conversation-cache-storage.js';
import { getConversationCacheIndexedDB } from './conversation-cache-indexeddb.js';

const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

interface CacheData {
  cacheKey: string;
  adminId: string;
  date: string;
  data: any;
  timestamp: number;
  expiresAt: number;
  conversationCount?: number;
}

export class ConversationCache {
  private indexedDB = getConversationCacheIndexedDB();
  private storage = getConversationCacheStorage();

  /**
   * Generate cache key from admin ID and date
   */
  getConversationCacheKey(adminId: string | number, date: string | Date): string {
    const normalizedAdminId = String(adminId || '').trim();
    let normalizedDate = '';
    
    if (date) {
      if (typeof date === 'string') {
        normalizedDate = date.trim();
        if (normalizedDate.includes('T')) {
          normalizedDate = normalizedDate.split('T')[0];
        }
      } else if (date instanceof Date) {
        normalizedDate = date.toISOString().split('T')[0];
      }
    }
    
    return `${normalizedAdminId}_${normalizedDate}`;
  }


  /**
   * Get cached conversations from IndexedDB (with localStorage fallback)
   */
  async getCachedConversations(adminId: string, date: string): Promise<any | null> {
    const cacheKey = this.getConversationCacheKey(adminId, date);
    logInfo(`Checking cache with key: ${cacheKey} for adminId: ${adminId} date: ${date}`);
    
    // Try IndexedDB first
    const indexedDBResult = await this.indexedDB.getCachedFromIndexedDB(cacheKey);
    if (indexedDBResult !== null) {
      return indexedDBResult;
    }
    
    // Fallback to localStorage
    return this.storage.getCachedFromLocalStorage(cacheKey);
  }

  /**
   * Delete a cached conversation
   */
  async deleteCachedConversation(cacheKey: string): Promise<void> {
    await this.indexedDB.deleteCachedConversation(cacheKey);
    this.storage.deleteFromLocalStorage(cacheKey);
  }

  /**
   * Store conversations in cache (IndexedDB with localStorage fallback)
   */
  async cacheConversations(adminId: string, date: string, data: any): Promise<boolean> {
    // Validate inputs
    if (!adminId || !date || !data) {
      logWarn('Cannot cache: missing required parameters', { adminId, date, hasData: !!data });
      return false;
    }
    
    const cacheKey = this.getConversationCacheKey(adminId, date);
    logInfo(`Cache save attempt - Key: ${cacheKey} AdminId: ${adminId} Date: ${date}`);
    
    const expiresAt = Date.now() + (CACHE_EXPIRY_HOURS * 60 * 60 * 1000);
    
    const cacheData: CacheData = {
      cacheKey: cacheKey,
      adminId: String(adminId),
      date: String(date),
      data: data,
      timestamp: Date.now(),
      expiresAt: expiresAt,
      conversationCount: data.conversations?.length || 0
    };
    
    // Try IndexedDB first
    const indexedDBResult = await this.indexedDB.cacheToIndexedDB(cacheKey, cacheData);
    if (indexedDBResult) {
      return true;
    }
    
    // Fallback to localStorage
    return this.storage.cacheToLocalStorage(cacheKey, cacheData);
  }
}

// Singleton instance
let conversationCacheInstance: ConversationCache | null = null;

/**
 * Get conversation cache instance
 */
export function getConversationCache(): ConversationCache {
  if (!conversationCacheInstance) {
    conversationCacheInstance = new ConversationCache();
  }
  return conversationCacheInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).getCachedConversations = async (adminId: string, date: string) => {
    return getConversationCache().getCachedConversations(adminId, date);
  };
  
  (window as any).cacheConversations = async (adminId: string, date: string, data: any) => {
    return getConversationCache().cacheConversations(adminId, date, data);
  };
  
  (window as any).getConversationCacheKey = (adminId: string | number, date: string | Date) => {
    return getConversationCache().getConversationCacheKey(adminId, date);
  };
}

