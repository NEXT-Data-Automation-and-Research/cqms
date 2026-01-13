/**
 * Employee Conversations Controller
 * Handles loading, filtering, and displaying employee conversations
 * Migrated from audit-form.html employee conversation functions
 */

import { logInfo, logWarn } from '../../../../utils/logging-helper.js';
import { getConversationFilterHelpers } from '../utils/conversation-filter-helpers.js';
import { getEmployeeConversationsDisplay } from '../utils/employee-conversations-display.js';
import { getEmployeeConversationsFilters, type ConversationFilters } from '../utils/employee-conversations-filters.js';
import type { Conversation } from '../utils/conversation-formatter.js';

export class EmployeeConversationsController {
  private filterHelpers = getConversationFilterHelpers();
  private display = getEmployeeConversationsDisplay();
  private filtersManager = getEmployeeConversationsFilters();
  private rawConversations: Conversation[] = [];
  private filteredConversations: Conversation[] = [];
  private currentPage = 1;
  private itemsPerPage = 50;

  /**
   * Initialize controller
   */
  init(rawConversations: Conversation[], filters: ConversationFilters): void {
    this.rawConversations = rawConversations;
    this.filtersManager.setFilters(filters);
    this.currentPage = 1;
  }

  /**
   * Re-apply filters to already-loaded raw conversations
   */
  reapplyFilters(): void {
    if (this.rawConversations.length === 0) {
      logWarn('No raw conversations to filter. Please load conversations first.');
      return;
    }
    
    const filters = this.filtersManager.getFilters();
    
    // Apply filters to raw conversations
    this.filteredConversations = this.filterHelpers.sortConversations(
      this.filterHelpers.filterByProductType(this.rawConversations, filters.productType || 'all'),
      filters.sort,
      filters.order
    );
    
    // Reset to first page
    this.currentPage = 1;
    
    // Update count
    const countSpan = document.getElementById('conversationsCount');
    if (countSpan) {
      countSpan.textContent = this.filteredConversations.length.toString();
    }
    
    // Update display
    this.display.displayEmployeeConversations(
      this.filteredConversations,
      this.currentPage,
      this.itemsPerPage,
      false
    );
    
    logInfo(`Filters reapplied: ${this.rawConversations.length} raw → ${this.filteredConversations.length} filtered`);
  }

  /**
   * Apply filters from form
   */
  applyConversationsFilters(): void {
    const filters = this.filtersManager.applyConversationsFilters();
    
    // Update active filters display
    this.filtersManager.updateActiveFiltersDisplay(filters);
    this.filtersManager.updateActiveFiltersCount(filters);
    
    // Close dialog
    this.closeConversationsFilterDialog();
    
    // Re-apply filters
    this.reapplyFilters();
  }

  /**
   * Reset all filters
   */
  resetConversationsFilters(): void {
    const filters = this.filtersManager.resetConversationsFilters();
    
    // Re-apply filters (will show all conversations)
    this.reapplyFilters();
    
    // Update displays
    this.filtersManager.updateActiveFiltersDisplay(filters);
    this.filtersManager.updateActiveFiltersCount(filters);
  }

  /**
   * Display employee conversations
   */
  displayEmployeeConversations(): void {
    this.display.displayEmployeeConversations(
      this.filteredConversations,
      this.currentPage,
      this.itemsPerPage,
      false
    );
  }

  /**
   * Close conversations filter dialog
   */
  private closeConversationsFilterDialog(): void {
    const modal = document.getElementById('conversationsFilterModal');
    if (modal) {
      modal.style.display = 'none';
    }
    document.body.style.overflow = '';
  }

  /**
   * Get current filters
   */
  getFilters(): ConversationFilters {
    return this.filtersManager.getFilters();
  }

  /**
   * Set raw conversations
   */
  setRawConversations(conversations: Conversation[]): void {
    this.rawConversations = conversations;
  }

  /**
   * Get filtered conversations
   */
  getFilteredConversations(): Conversation[] {
    return this.filteredConversations;
  }
}

// Singleton instance
let employeeConversationsControllerInstance: EmployeeConversationsController | null = null;

/**
 * Get employee conversations controller instance
 */
export function getEmployeeConversationsController(): EmployeeConversationsController {
  if (!employeeConversationsControllerInstance) {
    employeeConversationsControllerInstance = new EmployeeConversationsController();
  }
  return employeeConversationsControllerInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).reapplyFilters = () => {
    getEmployeeConversationsController().reapplyFilters();
  };
  
  (window as any).applyConversationsFilters = () => {
    getEmployeeConversationsController().applyConversationsFilters();
  };
  
  (window as any).resetConversationsFilters = () => {
    getEmployeeConversationsController().resetConversationsFilters();
  };
  
  (window as any).displayEmployeeConversations = () => {
    getEmployeeConversationsController().displayEmployeeConversations();
  };
  
  (window as any).updateActiveFiltersDisplay = () => {
    const controller = getEmployeeConversationsController();
    const filters = controller.getFilters();
    getEmployeeConversationsFilters().updateActiveFiltersDisplay(filters);
  };
  
  (window as any).updateActiveFiltersCount = () => {
    const controller = getEmployeeConversationsController();
    const filters = controller.getFilters();
    getEmployeeConversationsFilters().updateActiveFiltersCount(filters);
  };
}

