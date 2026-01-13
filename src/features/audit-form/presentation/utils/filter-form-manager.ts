/**
 * Filter Form Manager
 * Manages filter form values
 * Extracted from filter-ui-manager.ts to comply with 250-line limit
 */

import type { ConversationFilters } from './conversation-filter.js';

export class FilterFormManager {
  /**
   * Set filter form values
   */
  setFilterFormValues(filters: ConversationFilters): void {
    const setValue = (id: string, value: string | number | null) => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      if (el) {
        el.value = value ? String(value) : '';
      }
    };
    
    setValue('pullFilterState', filters.state ?? null);
    setValue('pullFilterPriority', filters.priority ?? null);
    setValue('pullFilterRating', filters.rating ?? null);
    setValue('pullFilterSourceType', filters.sourceType ?? null);
    setValue('pullFilterProductType', filters.productType ?? null);
    setValue('pullFilterLanguage', filters.language ?? null);
    setValue('pullFilterSlaStatus', filters.slaStatus ?? null);
    setValue('pullFilterMinParts', filters.minParts ?? null);
    setValue('pullFilterMinReopens', filters.minReopens ?? null);
    setValue('pullFilterMaxTimeToReply', filters.maxTimeToReply ?? null);
    setValue('pullFilterClientSearch', filters.clientSearch ?? null);
    setValue('pullFilterConversationId', filters.conversationId ?? null);
  }

  /**
   * Get filter form values
   */
  getFilterFormValues(): ConversationFilters {
    const getValue = (id: string): string | null => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
      const val = el ? el.value : '';
      return val && val.trim() ? val.trim() : null;
    };
    
    const getNumberValue = (id: string): number | null => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      const val = el ? el.value : '';
      return val && val.trim() ? parseInt(val.trim(), 10) : null;
    };
    
    return {
      state: getValue('pullFilterState'),
      priority: getValue('pullFilterPriority'),
      rating: getValue('pullFilterRating'),
      sourceType: getValue('pullFilterSourceType'),
      productType: getValue('pullFilterProductType'),
      language: getValue('pullFilterLanguage'),
      slaStatus: getValue('pullFilterSlaStatus'),
      minParts: getNumberValue('pullFilterMinParts'),
      minReopens: getNumberValue('pullFilterMinReopens'),
      maxTimeToReply: getNumberValue('pullFilterMaxTimeToReply'),
      clientSearch: getValue('pullFilterClientSearch'),
      conversationId: getValue('pullFilterConversationId')
    };
  }

  /**
   * Clear filter form
   */
  clearFilterForm(): void {
    const form = document.getElementById('pullConversationsFilterForm') as HTMLFormElement;
    if (form) {
      form.reset();
    }
  }

  /**
   * Clear specific filter field
   */
  clearFilterField(filterKey: string): void {
    const inputMap: Record<string, string> = {
      'state': 'pullFilterState',
      'priority': 'pullFilterPriority',
      'rating': 'pullFilterRating',
      'sourceType': 'pullFilterSourceType',
      'productType': 'pullFilterProductType',
      'language': 'pullFilterLanguage',
      'slaStatus': 'pullFilterSlaStatus',
      'minParts': 'pullFilterMinParts',
      'minReopens': 'pullFilterMinReopens',
      'maxTimeToReply': 'pullFilterMaxTimeToReply',
      'clientSearch': 'pullFilterClientSearch',
      'conversationId': 'pullFilterConversationId'
    };
    
    const inputId = inputMap[filterKey];
    if (inputId) {
      const input = document.getElementById(inputId) as HTMLInputElement;
      if (input) {
        input.value = '';
      }
    }
  }
}

// Singleton instance
let filterFormManagerInstance: FilterFormManager | null = null;

/**
 * Get filter form manager instance
 */
export function getFilterFormManager(): FilterFormManager {
  if (!filterFormManagerInstance) {
    filterFormManagerInstance = new FilterFormManager();
  }
  return filterFormManagerInstance;
}

