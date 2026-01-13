/**
 * Conversation Fetcher Controller
 * Handles fetching conversations from Intercom API with caching
 * Migrated from audit-form.html fetchConversationsForCurrentUser()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { getConversationCache } from '../utils/conversation-cache.js';
import { getConversationProgress } from '../utils/conversation-progress.js';
import { getConversationDisplay } from '../utils/conversation-display.js';
import { getConversationFilter } from '../utils/conversation-filter.js';
import { getFilterDisplayManager } from '../utils/filter-display-manager.js';
import { getHttpClient } from '../utils/http-client.js';
import type { ConversationFilters } from '../utils/conversation-filter.js';
import type { Conversation } from '../utils/conversation-formatter.js';

export class ConversationFetcher {
  private cache = getConversationCache();
  private progress = getConversationProgress();
  private display = getConversationDisplay();
  private filter = getConversationFilter();
  private filterDisplay = getFilterDisplayManager();
  private httpClient = getHttpClient();

  /**
   * Fetch conversations for current user
   */
  async fetchConversationsForCurrentUser(
    adminId: string,
    selectedDate: string,
    filters: ConversationFilters
  ): Promise<Conversation[]> {
    if (!adminId) {
      this.display.showPullConversationsError('Admin ID not found. Please try again.');
      return [];
    }
    
    // Hide elements during loading
    this.progress.hideElementsDuringLoading();
    
    // Show loading state
    const loadingDiv = document.getElementById('pullConversationsLoading');
    const errorDiv = document.getElementById('pullConversationsError');
    const listDiv = document.getElementById('pullConversationsList');
    
    if (loadingDiv) loadingDiv.style.display = 'block';
    if (errorDiv) errorDiv.style.display = 'none';
    if (listDiv) listDiv.style.display = 'none';
    
    // Get Supabase configuration
    const supabaseUrl = (window as any).SupabaseConfig?.url || '';
    const supabaseAnonKey = (window as any).SupabaseConfig?.anonKey || '';
    
    // Normalize adminId and date for cache lookup
    const normalizedAdminId = String(adminId || '').trim();
    const normalizedDate = selectedDate ? String(selectedDate).trim().split('T')[0] : '';
    
    if (!normalizedAdminId || !normalizedDate) {
      if (!normalizedAdminId) {
        this.display.showPullConversationsError('Admin ID is missing. Please pull conversations again.');
        if (loadingDiv) loadingDiv.style.display = 'none';
        return [];
      }
      if (!normalizedDate) {
        this.display.showPullConversationsError('Please select a date.');
        if (loadingDiv) loadingDiv.style.display = 'none';
        return [];
      }
    }
    
    // Check cache first
    logInfo(`Cache check - AdminId: ${normalizedAdminId} Date: ${normalizedDate}`);
    const cachedData = await this.cache.getCachedConversations(normalizedAdminId, normalizedDate);
    
    if (cachedData) {
      logInfo('Using cached data, skipping API call');
      this.progress.updateProgressIndicator(10, 'Loading from cache...');
      await new Promise(resolve => setTimeout(resolve, 300));
      const conversations = this.extractConversationsFromResponse(cachedData);
      logInfo(`Loaded ${conversations.length} conversations from cache`);
      this.progress.updateProgressIndicator(100, 'Loaded from cache', conversations.length);
      await new Promise(resolve => setTimeout(resolve, 200));
      return this.processConversations(conversations, filters, loadingDiv, listDiv);
    }
    
    // No cache found, fetch from API
    logInfo('Fetching from API (no cache found)');
    
    // Update progress: Initial
    this.progress.updateProgressIndicator(10, 'Pulling from Intercom...');
    
    try {
      // Build edge function URL
      const updatedSince = `${selectedDate} 00:00:00`;
      const updatedBefore = `${selectedDate} 23:59:59`;
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/intercom-proxy?endpoint=conversations&admin_id=${encodeURIComponent(adminId)}&updated_since=${encodeURIComponent(updatedSince)}&updated_before=${encodeURIComponent(updatedBefore)}`;
      
      logInfo(`Calling: ${edgeFunctionUrl} Date range: ${updatedSince} to ${updatedBefore}`);
      this.progress.updateProgressIndicator(20, 'Searching conversations in Intercom...');
      
      const response = await this.httpClient.fetchWithRetry(
        edgeFunctionUrl,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'apikey': supabaseAnonKey,
            'Accept': 'application/json'
          }
        },
        3,
        1000,
        60000
      );

      // Update progress: Processing
      this.progress.updateProgressIndicator(70, 'Processing participation data...');
      
      const data = await response.json();
      
      // Extract conversations from response
      const conversations = this.extractConversationsFromResponse(data);
      
      // Only cache if we have valid data
      if (data && conversations.length >= 0) {
        logInfo(`Caching data... AdminId: ${normalizedAdminId} Date: ${normalizedDate} Count: ${conversations.length}`);
        const cacheResult = await this.cache.cacheConversations(normalizedAdminId, normalizedDate, data);
        if (!cacheResult) logWarn('Cache save failed or was skipped');
      } else {
        logWarn('Not caching: invalid or empty data');
      }
      
      logInfo(`Fetched ${conversations.length} participated conversations`);
      this.progress.updateProgressIndicator(100, 'Almost done...', conversations.length);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Process conversations
      return this.processConversations(conversations, filters, loadingDiv, listDiv);
      
    } catch (error) {
      logError('Error fetching conversations:', error);
      this.display.showPullConversationsError(`Failed to fetch conversations: ${(error as Error).message}`);
      if (loadingDiv) loadingDiv.style.display = 'none';
      return [];
    }
  }

  /**
   * Extract conversations from API response
   */
  private extractConversationsFromResponse(data: any): Conversation[] {
    if (data && Array.isArray(data.conversations)) {
      return data.conversations;
    } else if (data && data.type === 'conversation.list' && Array.isArray(data.conversations)) {
      return data.conversations;
    }
    return [];
  }

  /**
   * Process conversations (filter and display)
   */
  private processConversations(
    conversations: Conversation[],
    filters: ConversationFilters,
    loadingDiv: HTMLElement | null,
    listDiv: HTMLElement | null
  ): Conversation[] {
    // Store conversations (original unfiltered list)
    if (typeof window !== 'undefined') {
      (window as any).pullConversationsList = conversations;
    }
    
    // Initialize filtered list with all conversations
    let filtered = [...conversations];
    
    // Only apply filters if any are actually set
    const hasActiveFilters = Object.values(filters).some(value => value !== null && value !== '');
    if (hasActiveFilters) {
      filtered = this.filter.filterPullConversations(conversations, filters);
      if (typeof window !== 'undefined') {
        (window as any).pullConversationsFilteredList = filtered;
      }
    } else {
      // No filters, just display all conversations
      this.display.displayPullConversationsList(conversations);
      const countElement = document.getElementById('pullConversationsCount');
      if (countElement) {
        countElement.textContent = conversations.length.toString();
      }
    }
    
    // Hide loading and show results
    if (loadingDiv) loadingDiv.style.display = 'none';
    if (listDiv) listDiv.style.display = 'block';
    
    // Show elements after loading
    this.progress.showElementsAfterLoading();
    
    // Update active filters display
    this.filterDisplay.updatePullConversationsActiveFilters(filters);
    
    return filtered;
  }
}

// Singleton instance
let conversationFetcherInstance: ConversationFetcher | null = null;

/**
 * Get conversation fetcher instance
 */
export function getConversationFetcher(): ConversationFetcher {
  if (!conversationFetcherInstance) {
    conversationFetcherInstance = new ConversationFetcher();
  }
  return conversationFetcherInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).fetchConversationsForCurrentUser = async (selectedDate: string) => {
    const fetcher = getConversationFetcher();
    const adminId = (window as any).pullConversationsAdminId;
    const filters = (window as any).pullConversationsFilters || {};
    
    return fetcher.fetchConversationsForCurrentUser(adminId, selectedDate, filters);
  };
}

