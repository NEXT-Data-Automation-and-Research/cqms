/**
 * Filter Display Manager
 * Manages active filters display UI
 * Extracted from filter-ui-manager.ts to comply with 250-line limit
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import type { ConversationFilters } from './conversation-filter.js';

export class FilterDisplayManager {
  /**
   * Update active filters display
   */
  updatePullConversationsActiveFilters(filters: ConversationFilters): void {
    const activeFiltersDiv = document.getElementById('pullConversationsActiveFilters');
    const activeFiltersTags = document.getElementById('pullConversationsActiveFiltersTags');
    const activeFiltersCount = document.getElementById('pullConversationsActiveFiltersCount');
    
    if (!activeFiltersDiv || !activeFiltersTags) return;
    
    const activeFilters: Array<{ label: string; key: string }> = [];
    
    if (filters.state) activeFilters.push({ label: `State: ${filters.state}`, key: 'state' });
    if (filters.priority) activeFilters.push({ label: `Priority: ${filters.priority}`, key: 'priority' });
    if (filters.rating) {
      const ratingLabel = filters.rating === 'unrated' ? 'Unrated' : `${filters.rating} Stars`;
      activeFilters.push({ label: `Rating: ${ratingLabel}`, key: 'rating' });
    }
    if (filters.sourceType) activeFilters.push({ label: `Source: ${filters.sourceType}`, key: 'sourceType' });
    if (filters.productType) activeFilters.push({ label: `Product: ${filters.productType}`, key: 'productType' });
    if (filters.language) activeFilters.push({ label: `Language: ${filters.language}`, key: 'language' });
    if (filters.slaStatus) activeFilters.push({ label: `SLA: ${filters.slaStatus}`, key: 'slaStatus' });
    if (filters.minParts !== null && filters.minParts !== undefined) {
      activeFilters.push({ label: `Min Parts: ${filters.minParts}`, key: 'minParts' });
    }
    if (filters.minReopens !== null && filters.minReopens !== undefined) {
      activeFilters.push({ label: `Min Reopens: ${filters.minReopens}`, key: 'minReopens' });
    }
    if (filters.maxTimeToReply !== null && filters.maxTimeToReply !== undefined) {
      activeFilters.push({ label: `Max Reply Time: ${filters.maxTimeToReply}min`, key: 'maxTimeToReply' });
    }
    if (filters.clientSearch) activeFilters.push({ label: `Client: ${filters.clientSearch}`, key: 'clientSearch' });
    if (filters.conversationId) activeFilters.push({ label: `ID: ${filters.conversationId}`, key: 'conversationId' });
    
    if (activeFilters.length === 0) {
      activeFiltersDiv.style.display = 'none';
      if (activeFiltersCount) {
        activeFiltersCount.style.display = 'none';
      }
    } else {
      activeFiltersDiv.style.display = 'block';
      if (activeFiltersCount) {
        activeFiltersCount.textContent = activeFilters.length.toString();
        activeFiltersCount.style.display = 'inline-block';
      }
      
      const tagsHtml = activeFilters.map(filter => `
        <span style="background: #dbeafe; color: #1e40af; padding: 0.1617rem 0.3234rem; border-radius: 0.1617rem; font-size: 0.4447rem; font-weight: 500; display: flex; align-items: center; gap: 0.1617rem;">
          ${escapeHtml(filter.label)}
          <button onclick="removePullConversationFilter('${filter.key}')" style="background: none; border: none; color: #1e40af; cursor: pointer; padding: 0; margin-left: 0.1617rem; font-size: 0.5659rem; line-height: 1; font-weight: bold;" title="Remove filter">✕</button>
        </span>
      `).join('');
      
      safeSetHTML(activeFiltersTags, tagsHtml);
    }
  }
}

// Singleton instance
let filterDisplayManagerInstance: FilterDisplayManager | null = null;

/**
 * Get filter display manager instance
 */
export function getFilterDisplayManager(): FilterDisplayManager {
  if (!filterDisplayManagerInstance) {
    filterDisplayManagerInstance = new FilterDisplayManager();
  }
  return filterDisplayManagerInstance;
}

