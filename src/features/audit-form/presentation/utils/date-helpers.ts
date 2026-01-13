/**
 * Date Helpers
 * Utility functions for date formatting and manipulation
 * Migrated from audit-form.html
 */

import { logInfo } from '../../../../utils/logging-helper.js';

export class DateHelpers {
  /**
   * Set default conversations date range
   */
  setDefaultConversationsDateRange(): void {
    const startDateInput = document.getElementById('conversationsStartDate') as HTMLInputElement;
    const endDateInput = document.getElementById('conversationsEndDate') as HTMLInputElement;
    
    if (!startDateInput || !endDateInput) {
      return;
    }
    
    // Set default to last 7 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    
    if (!startDateInput.value) {
      startDateInput.value = startDate.toISOString().split('T')[0];
    }
    if (!endDateInput.value) {
      endDateInput.value = endDate.toISOString().split('T')[0];
    }
    
    logInfo('Default conversations date range set');
  }

  /**
   * Format date for API (ISO format)
   */
  formatDateForAPI(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString();
  }

  /**
   * Format end date for API (end of day)
   */
  formatEndDateForAPI(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    date.setHours(23, 59, 59, 999);
    return date.toISOString();
  }

  /**
   * Format conversation date for display
   */
  formatConversationDateForDisplay(timestamp: number | string | undefined): string {
    if (!timestamp) return '-';
    
    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (typeof timestamp === 'number') {
      // Check if it's seconds or milliseconds
      date = timestamp > 1000000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
    } else {
      return '-';
    }
    
    if (isNaN(date.getTime())) return '-';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// Singleton instance
let dateHelpersInstance: DateHelpers | null = null;

/**
 * Get date helpers instance
 */
export function getDateHelpers(): DateHelpers {
  if (!dateHelpersInstance) {
    dateHelpersInstance = new DateHelpers();
  }
  return dateHelpersInstance;
}

// Expose to window for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).setDefaultConversationsDateRange = () => {
    getDateHelpers().setDefaultConversationsDateRange();
  };
  
  (window as any).formatDateForAPI = (dateStr: string) => {
    return getDateHelpers().formatDateForAPI(dateStr);
  };
  
  (window as any).formatEndDateForAPI = (dateStr: string) => {
    return getDateHelpers().formatEndDateForAPI(dateStr);
  };
  
  (window as any).formatConversationDateForDisplay = (timestamp: number | string | undefined) => {
    return getDateHelpers().formatConversationDateForDisplay(timestamp);
  };
}

