/**
 * Filter UI Manager
 * Manages filter dialog UI and active filters display
 * Migrated from audit-form.html filter UI functions
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';
import { getConversationFilter } from './conversation-filter.js';
import { getConversationDisplay } from './conversation-display.js';
import { getFilterFormManager } from './filter-form-manager.js';
import { getFilterDisplayManager } from './filter-display-manager.js';
import type { ConversationFilters } from './conversation-filter.js';
import type { Conversation } from './conversation-formatter.js';

export class FilterUIManager {
  private filter = getConversationFilter();
  private display = getConversationDisplay();
  private formManager = getFilterFormManager();
  private displayManager = getFilterDisplayManager();

  /**
   * Open pull conversations filter dialog
   */
  openPullConversationsFilterDialog(filters: ConversationFilters): void {
    const modal = document.getElementById('pullConversationsFilterModal');
    if (!modal) {
      logWarn('pullConversationsFilterModal not found');
      return;
    }
    
    // Set current filter values in the form
    this.formManager.setFilterFormValues(filters);
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Close on Escape key
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.closePullConversationsFilterDialog();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);
  }

  /**
   * Close pull conversations filter dialog
   */
  closePullConversationsFilterDialog(): void {
    const modal = document.getElementById('pullConversationsFilterModal');
    if (modal) {
      modal.style.display = 'none';
    }
    document.body.style.overflow = '';
  }

  /**
   * Apply filters to conversations
   */
  applyPullConversationsFilters(
    conversations: Conversation[],
    filters: ConversationFilters
  ): Conversation[] {
    // Get filter values from form
    const formFilters = this.formManager.getFilterFormValues();
    
    // Merge with provided filters
    const mergedFilters = { ...filters, ...formFilters };
    
    logInfo('Applied filters:', mergedFilters);
    
    // Apply filters
    const filtered = this.filter.filterPullConversations(conversations, mergedFilters);
    
    // Close modal
    this.closePullConversationsFilterDialog();
    
    // Update active filters display
    this.displayManager.updatePullConversationsActiveFilters(mergedFilters);
    
    return filtered;
  }

  /**
   * Clear all filters
   */
  clearPullConversationsFilters(conversations: Conversation[]): Conversation[] {
    const emptyFilters: ConversationFilters = {
      state: null,
      priority: null,
      rating: null,
      sourceType: null,
      productType: null,
      language: null,
      slaStatus: null,
      minParts: null,
      minReopens: null,
      maxTimeToReply: null,
      clientSearch: null,
      conversationId: null
    };
    
    // Clear form
    this.formManager.clearFilterForm();
    
    // Reset filtered list to original
    const filtered = [...conversations];
    this.display.displayPullConversationsList(filtered);
    
    // Update count
    const countElement = document.getElementById('pullConversationsCount');
    if (countElement) {
      countElement.textContent = conversations.length.toString();
    }
    
    // Update active filters display
    this.displayManager.updatePullConversationsActiveFilters(emptyFilters);
    
    // Close modal if open
    this.closePullConversationsFilterDialog();
    
    return filtered;
  }

  /**
   * Remove a specific filter
   */
  removePullConversationFilter(
    filterKey: string,
    conversations: Conversation[],
    filters: ConversationFilters
  ): Conversation[] {
    const updatedFilters = { ...filters };
    if (updatedFilters.hasOwnProperty(filterKey)) {
      (updatedFilters as any)[filterKey] = null;
    }
    
    // Update form
    this.formManager.clearFilterField(filterKey);
    
    // Re-apply filters
    const filtered = this.filter.filterPullConversations(conversations, updatedFilters);
    
    // Update active filters display
    this.displayManager.updatePullConversationsActiveFilters(updatedFilters);
    
    return filtered;
  }


}

// Singleton instance
let filterUIManagerInstance: FilterUIManager | null = null;

/**
 * Get filter UI manager instance
 */
export function getFilterUIManager(): FilterUIManager {
  if (!filterUIManagerInstance) {
    filterUIManagerInstance = new FilterUIManager();
  }
  return filterUIManagerInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).openPullConversationsFilterDialog = () => {
    const filters = (window as any).pullConversationsFilters || {};
    getFilterUIManager().openPullConversationsFilterDialog(filters);
  };
  
  (window as any).closePullConversationsFilterDialog = () => {
    getFilterUIManager().closePullConversationsFilterDialog();
  };
  
  (window as any).applyPullConversationsFilters = () => {
    const manager = getFilterUIManager();
    const conversations = (window as any).pullConversationsList || [];
    const filters = (window as any).pullConversationsFilters || {};
    
    const filtered = manager.applyPullConversationsFilters(conversations, filters);
    (window as any).pullConversationsFilteredList = filtered;
    
    const display = getConversationDisplay();
    display.displayPullConversationsList(filtered);
    
    const countElement = document.getElementById('pullConversationsCount');
    if (countElement) {
      countElement.textContent = filtered.length.toString();
    }
  };
  
  (window as any).clearPullConversationsFilters = () => {
    const manager = getFilterUIManager();
    const conversations = (window as any).pullConversationsList || [];
    
    const filtered = manager.clearPullConversationsFilters(conversations);
    (window as any).pullConversationsFilteredList = filtered;
    (window as any).pullConversationsFilters = {
      state: null,
      priority: null,
      rating: null,
      sourceType: null,
      productType: null,
      language: null,
      slaStatus: null,
      minParts: null,
      minReopens: null,
      maxTimeToReply: null,
      clientSearch: null,
      conversationId: null
    };
  };
  
  (window as any).removePullConversationFilter = (filterKey: string) => {
    const manager = getFilterUIManager();
    const conversations = (window as any).pullConversationsList || [];
    const filters = (window as any).pullConversationsFilters || {};
    
    const filtered = manager.removePullConversationFilter(filterKey, conversations, filters);
    (window as any).pullConversationsFilteredList = filtered;
    (window as any).pullConversationsFilters = { ...filters, [filterKey]: null };
    
    const display = getConversationDisplay();
    display.displayPullConversationsList(filtered);
    
    const countElement = document.getElementById('pullConversationsCount');
    if (countElement) {
      countElement.textContent = filtered.length.toString();
    }
  };
  
  (window as any).updatePullConversationsActiveFilters = () => {
    const filters = (window as any).pullConversationsFilters || {};
    getFilterDisplayManager().updatePullConversationsActiveFilters(filters);
  };
}

