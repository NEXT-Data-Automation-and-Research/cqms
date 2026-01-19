/**
 * Employee Conversations Filters
 * Manages filter state and UI for employee conversations
 * Extracted from employee-conversations-controller.ts to comply with 250-line limit
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';

export interface ConversationFilters {
  open: boolean | null;
  unread: boolean | null;
  sort: string;
  order: string;
  productType: string | null;
  dateStart: string | null;
  dateEnd: string | null;
}

export class EmployeeConversationsFilters {
  private filters: ConversationFilters = {
    open: null,
    unread: null,
    sort: 'updated_at',
    order: 'desc',
    productType: null,
    dateStart: null,
    dateEnd: null
  };

  /**
   * Apply filters from form
   */
  applyConversationsFilters(): ConversationFilters {
    const statusRadio = document.querySelector('input[name="conversationStatus"]:checked') as HTMLInputElement;
    const readStatusRadio = document.querySelector('input[name="conversationReadStatus"]:checked') as HTMLInputElement;
    const sortSelect = document.getElementById('conversationSortBy') as HTMLSelectElement;
    const sortOrderRadio = document.querySelector('input[name="conversationSortOrder"]:checked') as HTMLInputElement;
    const productTypeSelect = document.getElementById('conversationProductType') as HTMLSelectElement;
    const filterDateStart = document.getElementById('filterDateStart') as HTMLInputElement;
    const filterDateEnd = document.getElementById('filterDateEnd') as HTMLInputElement;
    
    if (statusRadio) {
      this.filters.open = statusRadio.value === 'all' ? null : statusRadio.value === 'open';
    }
    
    if (readStatusRadio) {
      this.filters.unread = readStatusRadio.value === 'all' ? null : readStatusRadio.value === 'unread';
    }
    
    if (sortSelect) {
      this.filters.sort = sortSelect.value;
    }
    
    if (sortOrderRadio) {
      this.filters.order = sortOrderRadio.value;
    }
    
    if (productTypeSelect) {
      this.filters.productType = productTypeSelect.value === 'all' ? null : productTypeSelect.value;
    }
    
    if (filterDateStart) {
      this.filters.dateStart = filterDateStart.value || null;
    }
    if (filterDateEnd) {
      this.filters.dateEnd = filterDateEnd.value || null;
    }
    
    return { ...this.filters };
  }

  /**
   * Reset all filters
   */
  resetConversationsFilters(): ConversationFilters {
    this.filters = {
      open: null,
      unread: null,
      sort: 'updated_at',
      order: 'desc',
      productType: null,
      dateStart: null,
      dateEnd: null
    };
    
    const statusAll = document.getElementById('statusAll') as HTMLInputElement;
    if (statusAll) statusAll.checked = true;
    
    const readStatusAll = document.getElementById('readStatusAll') as HTMLInputElement;
    if (readStatusAll) readStatusAll.checked = true;
    
    const sortSelect = document.getElementById('conversationSortBy') as HTMLSelectElement;
    if (sortSelect) sortSelect.value = 'updated_at';
    
    const sortOrderDesc = document.getElementById('sortOrderDesc') as HTMLInputElement;
    if (sortOrderDesc) sortOrderDesc.checked = true;
    
    const productTypeSelect = document.getElementById('conversationProductType') as HTMLSelectElement;
    if (productTypeSelect) productTypeSelect.value = 'all';
    
    const filterDateStart = document.getElementById('filterDateStart') as HTMLInputElement;
    if (filterDateStart) filterDateStart.value = '';
    
    const filterDateEnd = document.getElementById('filterDateEnd') as HTMLInputElement;
    if (filterDateEnd) filterDateEnd.value = '';
    
    return { ...this.filters };
  }

  /**
   * Update active filters display in dialog
   */
  updateActiveFiltersDisplay(filters: ConversationFilters): void {
    const activeFiltersDisplay = document.getElementById('activeFiltersDisplay');
    const activeFiltersBadges = document.getElementById('activeFiltersBadges');
    
    if (!activeFiltersDisplay || !activeFiltersBadges) return;
    
    const badges: Array<{ label: string; value: any }> = [];
    
    if (filters.open !== null) {
      badges.push({ label: filters.open ? 'Open' : 'Closed', value: filters.open });
    }
    
    if (filters.unread !== null) {
      badges.push({ label: filters.unread ? 'Unread' : 'Read', value: filters.unread });
    }
    
    if (filters.sort && filters.sort !== 'updated_at') {
      const sortLabels: Record<string, string> = {
        'created_at': 'Created At',
        'waiting_since': 'Waiting Since'
      };
      badges.push({
        label: `Sort: ${sortLabels[filters.sort] || filters.sort}`,
        value: filters.sort
      });
    }
    
    if (filters.order && filters.order !== 'desc') {
      badges.push({ label: 'Order: Ascending', value: filters.order });
    }
    
    if (filters.productType) {
      badges.push({ label: `Product: ${filters.productType}`, value: filters.productType });
    }
    
    if (filters.dateStart || filters.dateEnd) {
      const dateRange: string[] = [];
      if (filters.dateStart) dateRange.push(filters.dateStart);
      if (filters.dateEnd) dateRange.push(filters.dateEnd);
      badges.push({ label: `Date: ${dateRange.join(' to ')}`, value: dateRange.join(' to ') });
    }
    
    if (badges.length > 0) {
      const badgesHtml = badges.map(badge => 
        `<span style="background-color: #dbeafe; color: #1e40af; padding: 0.25rem 0.5rem; border-radius: 0.375rem; font-size: 0.75rem; font-weight: 500;">${escapeHtml(badge.label)}</span>`
      ).join('');
      safeSetHTML(activeFiltersBadges, badgesHtml);
      activeFiltersDisplay.style.display = 'block';
    } else {
      safeSetHTML(activeFiltersBadges, '');
      activeFiltersDisplay.style.display = 'none';
    }
  }

  /**
   * Update active filters count badge
   */
  updateActiveFiltersCount(filters: ConversationFilters): void {
    const activeFiltersCount = document.getElementById('activeFiltersCount');
    if (!activeFiltersCount) return;
    
    let count = 0;
    if (filters.open !== null) count++;
    if (filters.unread !== null) count++;
    if (filters.sort && filters.sort !== 'updated_at') count++;
    if (filters.order && filters.order !== 'desc') count++;
    if (filters.productType) count++;
    if (filters.dateStart || filters.dateEnd) count++;
    
    if (count > 0) {
      activeFiltersCount.textContent = count.toString();
      activeFiltersCount.style.display = 'inline-block';
    } else {
      activeFiltersCount.style.display = 'none';
    }
  }

  /**
   * Get current filters
   */
  getFilters(): ConversationFilters {
    return { ...this.filters };
  }

  /**
   * Set filters
   */
  setFilters(filters: ConversationFilters): void {
    this.filters = { ...filters };
  }
}

// Singleton instance
let employeeConversationsFiltersInstance: EmployeeConversationsFilters | null = null;

/**
 * Get employee conversations filters instance
 */
export function getEmployeeConversationsFilters(): EmployeeConversationsFilters {
  if (!employeeConversationsFiltersInstance) {
    employeeConversationsFiltersInstance = new EmployeeConversationsFilters();
  }
  return employeeConversationsFiltersInstance;
}


