/**
 * Progressive Conversation Fetcher Controller
 * Handles progressive fetching of employee conversations with pagination
 * Migrated from audit-form.html fetchEmployeeConversationsProgressively()
 */

import { logInfo, logError, logWarn } from '../../../../utils/logging-helper.js';
import { getHttpClient } from '../utils/http-client.js';
import { getConversationFilterHelpers } from '../utils/conversation-filter-helpers.js';
import { getEmployeeConversationsDisplay } from '../utils/employee-conversations-display.js';
import { getEmployeeConversationsController } from './employee-conversations-controller.js';
import { getPaginationCursorParser } from '../utils/pagination-cursor-parser.js';
import type { ConversationFilters } from '../utils/employee-conversations-filters.js';
import type { Conversation } from '../utils/conversation-formatter.js';

const MAX_CONVERSATIONS_TO_FETCH = 150;
const MAX_PAGES = 100;

export class ProgressiveConversationFetcher {
  private httpClient = getHttpClient();
  private filterHelpers = getConversationFilterHelpers();
  private display = getEmployeeConversationsDisplay();
  private conversationsController = getEmployeeConversationsController();
  private cursorParser = getPaginationCursorParser();
  private isLoading = false;
  private rawConversations: Conversation[] = [];

  /**
   * Fetch employee conversations progressively with pagination
   */
  async fetchEmployeeConversationsProgressively(
    adminId: string,
    updatedSince: string,
    updatedBefore: string,
    filters: ConversationFilters | null = null
  ): Promise<Conversation[]> {
    this.isLoading = true;
    this.rawConversations = [];

    const activeFilters = filters || this.conversationsController.getFilters();
    
    logInfo('Using filters for client-side filtering:', activeFilters);

    // Show loading indicator
    const countLoader = document.getElementById('conversationsCountLoader');
    if (countLoader) {
      countLoader.style.display = 'inline-block';
    }

    try {
      let startingAfter: string | null = null;
      let hasMore = true;
      let pageCount = 0;

      while (hasMore && pageCount < MAX_PAGES) {
        pageCount++;
        
        // Build API URL
        let edgeFunctionUrl = `${(window as any).SupabaseConfig?.url || ''}/functions/v1/intercom-proxy?endpoint=conversations&admin_id=${encodeURIComponent(adminId)}&updated_since=${encodeURIComponent(updatedSince)}&updated_before=${encodeURIComponent(updatedBefore)}&per_page=${MAX_CONVERSATIONS_TO_FETCH}`;
        
        // Add pagination cursor if we have one
        if (startingAfter) {
          const cursorValue = String(startingAfter).trim();
          if (cursorValue && cursorValue.length > 0) {
            edgeFunctionUrl += `&starting_after=${encodeURIComponent(cursorValue)}`;
          } else {
            logWarn('Invalid cursor value, skipping pagination');
            hasMore = false;
            break;
          }
        }

        if (pageCount === 1) {
          logInfo('FETCHING CONVERSATIONS (Client-side filtering)');
          logInfo('Active filters:', JSON.stringify(activeFilters, null, 2));
          logInfo('API URL:', edgeFunctionUrl);
          logInfo('Date range:', { updatedSince, updatedBefore });
          logInfo('Admin ID:', adminId);
        } else {
          logInfo(`Background fetch: Loading page ${pageCount}...`);
        }

        let response;
        try {
          response = await this.httpClient.fetchWithRetry(
            edgeFunctionUrl,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${(window as any).SupabaseConfig?.anonKey || ''}`,
                'apikey': (window as any).SupabaseConfig?.anonKey || '',
                'Accept': 'application/json'
              }
            },
            3,
            2000,
            60000
          );
        } catch (fetchError) {
          if (pageCount > 1) {
            logWarn(`Failed to fetch page ${pageCount}, but continuing with ${this.rawConversations.length} conversations already loaded:`, (fetchError as Error).message);
            hasMore = false;
            break;
          }
          throw fetchError;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
          
          if (pageCount > 1 && (response.status === 400 || response.status === 404)) {
            logWarn(`Invalid cursor on page ${pageCount}, stopping pagination. Loaded ${this.rawConversations.length} conversations.`);
            hasMore = false;
            break;
          }
          
          throw new Error(errorMsg);
        }

        const data = await response.json();
        const pageConversations = this.extractConversationsFromResponse(data);

        if (pageConversations.length > 0) {
          this.rawConversations = this.rawConversations.concat(pageConversations);
          
          // Update count to show progress
          const countSpan = document.getElementById('conversationsCount');
          if (countSpan) {
            countSpan.textContent = this.rawConversations.length.toString();
          }
          
          logInfo(`Page ${pageCount} loaded: ${pageConversations.length} conversations (Total fetched: ${this.rawConversations.length})`);
        }

        // Check if there are more pages
        startingAfter = this.cursorParser.extractNextCursor(data);
        hasMore = this.cursorParser.validateCursor(startingAfter);

        // Stop if no more conversations or invalid cursor
        if (pageConversations.length === 0 || !startingAfter) {
          hasMore = false;
          break;
        }
      }

      logInfo(`All conversations loaded: ${this.rawConversations.length} total conversations fetched`);
      
      // Apply final client-side filtering and sorting
      const filteredConversations = this.filterHelpers.sortConversations(
        this.filterHelpers.filterByProductType(this.rawConversations, activeFilters.productType || 'all'),
        activeFilters.sort,
        activeFilters.order
      );
      
      logInfo(`After filtering: ${filteredConversations.length} conversations`);
      
      // Update count with final filtered count
      const countSpan = document.getElementById('conversationsCount');
      if (countSpan) {
        countSpan.textContent = filteredConversations.length.toString();
      }
      
      // Hide loading and show results
      const loadingDiv = document.getElementById('conversationsLoading');
      const listDiv = document.getElementById('conversationsList');
      if (loadingDiv) loadingDiv.style.display = 'none';
      if (listDiv) listDiv.style.display = 'block';
      
      // Update controller and display
      this.conversationsController.setRawConversations(this.rawConversations);
      this.conversationsController.init(this.rawConversations, activeFilters);
      this.display.displayEmployeeConversations(filteredConversations, 1, 20, false);
      
      return filteredConversations;
      
    } catch (error) {
      logError('Error fetching conversations:', error);
      throw error;
    } finally {
      this.isLoading = false;
      
      // Hide loading indicator when done
      const countLoader = document.getElementById('conversationsCountLoader');
      if (countLoader) {
        countLoader.style.display = 'none';
      }
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
    } else if (data && data.conversations && Array.isArray(data.conversations)) {
      return data.conversations;
    }
    return [];
  }


  /**
   * Check if currently loading
   */
  isLoadingConversations(): boolean {
    return this.isLoading;
  }

  /**
   * Get raw conversations
   */
  getRawConversations(): Conversation[] {
    return [...this.rawConversations];
  }
}

// Singleton instance
let progressiveConversationFetcherInstance: ProgressiveConversationFetcher | null = null;

/**
 * Get progressive conversation fetcher instance
 */
export function getProgressiveConversationFetcher(): ProgressiveConversationFetcher {
  if (!progressiveConversationFetcherInstance) {
    progressiveConversationFetcherInstance = new ProgressiveConversationFetcher();
  }
  return progressiveConversationFetcherInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).fetchEmployeeConversationsProgressively = async (
    adminId: string,
    updatedSince: string,
    updatedBefore: string,
    filters: ConversationFilters | null = null
  ) => {
    return getProgressiveConversationFetcher().fetchEmployeeConversationsProgressively(
      adminId,
      updatedSince,
      updatedBefore,
      filters
    );
  };
}

