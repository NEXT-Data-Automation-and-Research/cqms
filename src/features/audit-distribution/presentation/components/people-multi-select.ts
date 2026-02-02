/**
 * People list multi-select dropdowns
 * Same structure and class names as audit reports multi-select for consistent UI
 */

import { escapeHtml } from './filter-chip-utils.js';

export interface PeopleMultiSelectConfig {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  selectedValues: string[];
  /** Compact trigger (smaller height) for inline filter bar */
  compact?: boolean;
}

/**
 * Create one multi-select filter HTML (same structure as audit reports)
 */
export function createPeopleMultiSelectHTML(config: PeopleMultiSelectConfig): string {
  const { id, label, placeholder, values, selectedValues, compact } = config;
  const selectedCount = selectedValues.length;
  const displayText = selectedCount > 0
    ? `${selectedCount} selected`
    : placeholder;

  const triggerClass = compact
    ? 'multi-select-trigger multi-select-trigger-compact'
    : 'multi-select-trigger';
  const hasOptions = values.length > 0;
  const optionsHTML = hasOptions
    ? values.map((value) => {
        const isSelected = selectedValues.includes(value);
        const valueId = `${id}_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
        return `
          <div class="multi-select-option" data-value="${escapeHtml(value)}">
            <input type="checkbox" id="${valueId}" value="${escapeHtml(value)}" ${isSelected ? 'checked' : ''} data-multi-select-id="${escapeHtml(id)}">
            <label for="${valueId}">${escapeHtml(value)}</label>
          </div>
        `;
      }).join('')
    : '<div class="multi-select-option" style="padding: 0.5rem; color: #6b7280; font-size: 0.75rem; text-align: center;">No options</div>';

  return `
    <div class="people-multi-select-wrapper" style="min-width: 0; ${compact ? 'max-width: 7rem;' : ''}">
      <label for="${id}" class="block text-xs font-medium text-gray-600 mb-0.5">${escapeHtml(label)}</label>
      <div class="multi-select-container" data-people-filter-id="${escapeHtml(id)}">
        <div class="${triggerClass}" id="${id}Trigger" data-filter-id="${escapeHtml(id)}" data-placeholder="${escapeHtml(placeholder)}" role="button" tabindex="0">
          <span class="multi-select-placeholder" id="${id}Placeholder">${escapeHtml(displayText)}</span>
          <span class="multi-select-count" id="${id}Count" style="display: ${selectedCount > 0 ? 'inline' : 'none'};">${selectedCount}</span>
          <svg style="width: 0.5625rem; height: 0.5625rem; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
        <div class="multi-select-dropdown" id="${id}Dropdown" style="display: none;">
          ${hasOptions ? `
          <input type="text" class="multi-select-search" id="${id}Search" placeholder="Search..." data-multi-select-id="${escapeHtml(id)}" autocomplete="off">
          ` : ''}
          <div class="multi-select-options" id="${id}Options">
            ${optionsHTML}
          </div>
          ${hasOptions ? `
          <div class="multi-select-actions">
            <button type="button" class="multi-select-action-btn" data-action="select-all" data-multi-select-id="${escapeHtml(id)}">Select All</button>
            <button type="button" class="multi-select-action-btn" data-action="clear" data-multi-select-id="${escapeHtml(id)}">Clear</button>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}
