/**
 * Multi-Select Filter Renderer
 * Creates and renders multi-select filter dropdowns
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import type { AuditReport } from '../../domain/entities.js';

export interface MultiSelectFilterConfig {
  id: string;
  label: string;
  placeholder: string;
  values: string[];
  selectedValues: string[];
}

/**
 * Create multi-select filter HTML matching live site structure exactly
 */
export function createMultiSelectFilterHTML(config: MultiSelectFilterConfig): string {
  const { id, label, placeholder, values, selectedValues } = config;
  const selectedCount = selectedValues.length;
  const displayText = selectedCount > 0 
    ? `${selectedCount} selected` 
    : placeholder;
  
  // Generate options HTML
  const optionsHTML = values.map(value => {
    const isSelected = selectedValues.includes(value);
    // Match live site ID format: e.g., "auditor_H. M. Saif Noor"
    const prefix = id === 'auditorNameFilter' ? 'auditor' :
                   id === 'employeeNameFilter' ? 'employee' :
                   id === 'auditTypeFilter' ? 'auditType' :
                   id === 'statusFilter' ? 'status' :
                   id === 'quarterFilter' ? 'quarter' :
                   id === 'channelFilter' ? 'channel' :
                   id === 'employeeTypeFilter' ? 'employeeType' :
                   id === 'countryFilter' ? 'country' :
                   id === 'validationStatusFilter' ? 'validation' :
                   id === 'acknowledgementStatusFilter' ? 'acknowledgement' :
                   id === 'agentPreStatusFilter' ? 'preStatus' :
                   id === 'agentPostStatusFilter' ? 'postStatus' : 'option';
    const valueId = `${prefix}_${escapeHtml(value)}`;
    
    // Match live site label format (some have shortened labels)
    let displayLabel = escapeHtml(value);
    if (id === 'auditTypeFilter') {
      if (value.includes('Routine Audit (Recorded)')) displayLabel = 'Routine (Recorded)';
      else if (value.includes('Focused Audit (Recorded)')) displayLabel = 'Focused (Recorded)';
      else if (value.includes('Focused Audit (Live)')) displayLabel = 'Focused (Live)';
      else if (value.includes('Evaluation and Feedback')) displayLabel = 'Evaluation';
    } else if (id === 'channelFilter' && value.includes('MKT Social Media Comments')) {
      displayLabel = 'MKT Social Media';
    } else if ((id === 'agentPreStatusFilter' || id === 'agentPostStatusFilter')) {
      if (value === 'No active quality concerns') displayLabel = 'No concerns';
      else if (value === 'Performance Improvement Plan (PIP)') displayLabel = 'PIP';
      else if (value === 'Performance Improvement Plan (PIP) - Alert') displayLabel = 'PIP Alert';
      else if (value === 'Performance Improvement Plan (PIP) - Priority') displayLabel = 'PIP Priority';
    }
    
    return `
                <div class="multi-select-option" data-value="${escapeHtml(value)}">
                    <input type="checkbox" id="${valueId}" value="${escapeHtml(value)}" ${isSelected ? 'checked' : ''} onchange="updateMultiSelect('${id}')">
                    <label for="${valueId}">${displayLabel}</label>
                </div>
            `;
  }).join('\n');
  
  // Match live site structure exactly
  return `
        <label for="${id}" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">${escapeHtml(label)}</label>
        <div class="multi-select-container">
            <div class="multi-select-trigger" id="${id}Trigger" data-filter-id="${escapeHtml(id)}" data-placeholder="${escapeHtml(placeholder)}" role="button" tabindex="0">
                <span class="multi-select-placeholder" id="${id}Placeholder" data-original="${escapeHtml(placeholder)}">${escapeHtml(displayText)}</span>
                <span class="multi-select-count" id="${id}Count" style="display: ${selectedCount > 0 ? 'inline' : 'none'};"></span>
                <svg style="width: 0.5625rem; height: 0.5625rem;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </div>
            <div class="multi-select-dropdown" id="${id}Dropdown" style="display: none;">
                <input type="text" class="multi-select-search" id="${id}Search" placeholder="Search ${escapeHtml(label.toLowerCase())}..." oninput="filterMultiSelectOptions('${id}')" onclick="event.stopPropagation()">
                <div class="multi-select-options" id="${id}Options">
            ${optionsHTML}
            </div>
                <div class="multi-select-actions">
                    <button type="button" class="multi-select-action-btn" onclick="selectAllMultiSelect('${id}')">Select All</button>
                    <button type="button" class="multi-select-action-btn" onclick="clearMultiSelect('${id}')">Clear</button>
                </div>
            </div>
        </div>
        <input type="hidden" id="${id}" value="${selectedValues.join(',')}">
    `;
}

/**
 * Create a multi-select filter dropdown (legacy function, kept for compatibility)
 */
export function createMultiSelectFilter(config: MultiSelectFilterConfig): string {
  const { id, label, placeholder, values, selectedValues } = config;
  const selectedCount = selectedValues.length;
  const displayText = selectedCount > 0 
    ? `${selectedCount} selected` 
    : placeholder;
  
  // Show "No options" if empty, but still render the filter
  const hasOptions = values.length > 0;
  const optionsHTML = hasOptions 
    ? values.map(value => {
        const isSelected = selectedValues.includes(value);
        const valueId = `${id}_${value.replace(/[^a-zA-Z0-9]/g, '_')}`;
        return `
          <div class="multi-select-option" data-value="${escapeHtml(value)}">
            <input 
              type="checkbox" 
              id="${valueId}" 
              value="${escapeHtml(value)}" 
              ${isSelected ? 'checked' : ''}
              onchange="updateMultiSelect('${id}')"
            >
            <label for="${valueId}">${escapeHtml(value)}</label>
          </div>
        `;
      }).join('')
    : '<div class="multi-select-option" style="padding: 0.5rem; color: #6b7280; font-size: 0.75rem; text-align: center;">No options available</div>';

  return `
    <div class="filter-group" style="pointer-events: auto; position: relative; z-index: 103;">
      <label for="${id}" class="filter-label" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.1875rem; font-family: 'Poppins', sans-serif; display: block; pointer-events: none;">${escapeHtml(label)}</label>
      <div class="multi-select-container">
        <button 
          type="button" 
          class="multi-select-trigger ${selectedCount > 0 ? 'active' : ''}" 
          id="${id}Trigger"
          data-filter-id="${escapeHtml(id)}" role="button" tabindex="0"
          style="width: 100%; ${!hasOptions ? 'opacity: 0.7;' : ''}"
        >
          <span class="multi-select-placeholder">${escapeHtml(displayText)}</span>
          ${selectedCount > 0 ? `<span class="multi-select-count">${selectedCount}</span>` : ''}
          <svg style="width: 0.5625rem; height: 0.5625rem; flex-shrink: 0;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div class="multi-select-dropdown" id="${id}Dropdown" style="display: none;">
          ${hasOptions ? `
          <input 
            type="text" 
            class="multi-select-search" 
            id="${id}Search" 
            placeholder="Search ${escapeHtml(label.toLowerCase())}..." 
            oninput="filterMultiSelectOptions('${id}')"
            onclick="event.stopPropagation()"
          >
          ` : ''}
          <div class="multi-select-options" id="${id}Options">
            ${optionsHTML}
          </div>
          ${hasOptions ? `
          <div class="multi-select-actions">
            <button type="button" class="multi-select-action-btn" onclick="selectAllMultiSelect('${id}')">Select All</button>
            <button type="button" class="multi-select-action-btn" onclick="clearMultiSelect('${id}')">Clear</button>
          </div>
          ` : ''}
        </div>
      </div>
      <input type="hidden" id="${id}" value="${selectedValues.join(',')}">
    </div>
  `;
}

/**
 * Extract unique values from audits for filter options
 */
export function extractFilterValues(audits: AuditReport[]): {
  auditorNames: string[];
  employeeNames: string[];
  channels: string[];
  auditTypes: string[];
  statuses: string[];
  quarters: string[];
  employeeTypes: string[];
  countries: string[];
  validationStatuses: string[];
  acknowledgementStatuses: string[];
  agentPreStatuses: string[];
  agentPostStatuses: string[];
} {
  const auditorSet = new Set<string>();
  const employeeSet = new Set<string>();
  const channelSet = new Set<string>();
  const auditTypeSet = new Set<string>();
  const statusSet = new Set<string>();
  const quarterSet = new Set<string>();
  const employeeTypeSet = new Set<string>();
  const countrySet = new Set<string>();

  const validationSet = new Set<string>();
  const acknowledgementSet = new Set<string>();
  const agentPreStatusSet = new Set<string>();
  const agentPostStatusSet = new Set<string>();

  audits.forEach(audit => {
    // Check various field name variations
    const auditorName = audit.auditorName || audit.auditor_name || audit.auditorName || '';
    if (auditorName && typeof auditorName === 'string' && auditorName.trim()) {
      auditorSet.add(auditorName.trim());
    }
    
    const employeeName = audit.employeeName || audit.employee_name || audit.employeeName || '';
    if (employeeName && typeof employeeName === 'string' && employeeName.trim()) {
      employeeSet.add(employeeName.trim());
    }
    
    const channel = audit.channel || audit.channel_name || '';
    if (channel && typeof channel === 'string' && channel.trim()) {
      channelSet.add(channel.trim());
    }
    
    const auditType = audit.auditType || audit.audit_type || '';
    if (auditType && typeof auditType === 'string' && auditType.trim()) {
      auditTypeSet.add(auditType.trim());
    }
    
    if (audit.passingStatus || audit.passing_status) {
      const status = (audit.passingStatus || audit.passing_status || '').toString().toLowerCase().trim();
      if (status === 'passed' || status === 'pass') {
        statusSet.add('Passed');
      } else if (status) {
        statusSet.add('Not Passed');
      }
    }
    
    if (audit.quarter) {
      const quarterStr = audit.quarter.toString().startsWith('Q') 
        ? audit.quarter.toString() 
        : `Q${audit.quarter}`;
      quarterSet.add(quarterStr);
    }
    
    const employeeType = audit.employeeType || audit.employee_type || '';
    if (employeeType && typeof employeeType === 'string' && employeeType.trim()) {
      employeeTypeSet.add(employeeType.trim());
    }
    
    const country = audit.countryOfEmployee || audit.country_of_employee || audit.country || '';
    if (country && typeof country === 'string' && country.trim()) {
      countrySet.add(country.trim());
    }
    
    // Validation status
    const validationStatus = audit.validationStatus || audit.validation_status || '';
    if (validationStatus && typeof validationStatus === 'string' && validationStatus.trim()) {
      validationSet.add(validationStatus.trim());
    }
    
    // Acknowledgement status
    const acknowledgementStatus = audit.acknowledgementStatus || audit.acknowledgement_status || '';
    if (acknowledgementStatus && typeof acknowledgementStatus === 'string' && acknowledgementStatus.trim()) {
      acknowledgementSet.add(acknowledgementStatus.trim());
    }
    
    // Agent pre status
    const agentPreStatus = audit.agentPreStatus || audit.agent_pre_status || '';
    if (agentPreStatus && typeof agentPreStatus === 'string' && agentPreStatus.trim()) {
      agentPreStatusSet.add(agentPreStatus.trim());
    }
    
    // Agent post status
    const agentPostStatus = audit.agentPostStatus || audit.agent_post_status || '';
    if (agentPostStatus && typeof agentPostStatus === 'string' && agentPostStatus.trim()) {
      agentPostStatusSet.add(agentPostStatus.trim());
    }
  });

  return {
    auditorNames: Array.from(auditorSet).sort(),
    employeeNames: Array.from(employeeSet).sort(),
    channels: Array.from(channelSet).sort(),
    auditTypes: Array.from(auditTypeSet).sort(),
    statuses: Array.from(statusSet).sort(),
    quarters: Array.from(quarterSet).sort(),
    employeeTypes: Array.from(employeeTypeSet).sort(),
    countries: Array.from(countrySet).sort(),
    validationStatuses: Array.from(validationSet).sort(),
    acknowledgementStatuses: Array.from(acknowledgementSet).sort(),
    agentPreStatuses: Array.from(agentPreStatusSet).sort(),
    agentPostStatuses: Array.from(agentPostStatusSet).sort()
  };
}

/**
 * Render all multi-select filters
 */
export function renderMultiSelectFilters(
  container: HTMLElement,
  audits: AuditReport[],
  currentFilters: any
): void {
  const filterValues = extractFilterValues(audits);
  
  // Order matches live site exactly:
  // First batch (after Audit ID): Auditor, Employee, Type, Status, Quarter, Channel, Emp Type, Country
  // Second batch (after To Date): Validation, Acknowledgement, Pre Status, Post Status
  const firstBatchFilters = [
    {
      id: 'auditorNameFilter',
      label: 'Auditor',
      placeholder: 'Select auditors...',
      values: filterValues.auditorNames,
      selectedValues: currentFilters.auditorNames || []
    },
    {
      id: 'employeeNameFilter',
      label: 'Employee',
      placeholder: 'Select employees...',
      values: filterValues.employeeNames,
      selectedValues: currentFilters.employeeNames || []
    },
    {
      id: 'auditTypeFilter',
      label: 'Type',
      placeholder: 'Select types...',
      values: filterValues.auditTypes,
      selectedValues: currentFilters.auditTypes || []
    },
    {
      id: 'statusFilter',
      label: 'Status',
      placeholder: 'Select statuses...',
      values: filterValues.statuses,
      selectedValues: currentFilters.statuses || []
    },
    {
      id: 'quarterFilter',
      label: 'Quarter',
      placeholder: 'Select quarters...',
      values: filterValues.quarters,
      selectedValues: currentFilters.quarters || []
    },
    {
      id: 'channelFilter',
      label: 'Channel',
      placeholder: 'Select channels...',
      values: filterValues.channels,
      selectedValues: currentFilters.channels || []
    },
    {
      id: 'employeeTypeFilter',
      label: 'Emp Type',
      placeholder: 'Select types...',
      values: filterValues.employeeTypes,
      selectedValues: currentFilters.employeeTypes || []
    },
    {
      id: 'countryFilter',
      label: 'Country',
      placeholder: 'Select countries...',
      values: filterValues.countries,
      selectedValues: currentFilters.countries || []
    }
  ]; // Show all filters even if empty - user wants all fields visible
  
  const secondBatchFilters = [
    {
      id: 'validationFilter',
      label: 'Validation',
      placeholder: 'Select validation...',
      values: filterValues.validationStatuses,
      selectedValues: currentFilters.validationStatuses || []
    },
    {
      id: 'acknowledgementFilter',
      label: 'Acknowledgement',
      placeholder: 'Select status...',
      values: filterValues.acknowledgementStatuses,
      selectedValues: currentFilters.acknowledgementStatuses || []
    },
    {
      id: 'preStatusFilter',
      label: 'Pre Status',
      placeholder: 'Select pre status...',
      values: filterValues.agentPreStatuses,
      selectedValues: currentFilters.agentPreStatuses || []
    },
    {
      id: 'postStatusFilter',
      label: 'Post Status',
      placeholder: 'Select post status...',
      values: filterValues.agentPostStatuses,
      selectedValues: currentFilters.agentPostStatuses || []
    }
  ]; // Show all filters even if empty - user wants all fields visible
  
  const allFilters = [...firstBatchFilters, ...secondBatchFilters];

  // Insert multi-select filters into the existing grid (not a separate grid)
  // Find the parent grid container
  const parentGrid = container.closest('#filterPanel')?.querySelector('#allFiltersGrid') as HTMLElement;
  
  if (parentGrid) {
    // Insert first batch after Audit ID (3rd child: Scorecard, Search, Audit ID)
    const auditIdFilter = document.getElementById('auditIdSearch')?.closest('.filter-group');
    let insertAfter: Element | null = auditIdFilter || (parentGrid.children[2] as Element);
    
    // Insert first batch filters (Auditor, Employee, Type, Status, Quarter, Channel, Emp Type, Country)
    firstBatchFilters.forEach(filter => {
      const filterHTML = createMultiSelectFilter(filter);
      const tempDiv = document.createElement('div');
      safeSetHTML(tempDiv, filterHTML);
      const filterElement = tempDiv.firstElementChild as HTMLElement;
      if (filterElement && parentGrid && insertAfter) {
        if (insertAfter.nextSibling) {
          parentGrid.insertBefore(filterElement, insertAfter.nextSibling);
        } else {
          parentGrid.appendChild(filterElement);
        }
        insertAfter = filterElement; // Update for next insertion
      }
    });
    
    // Insert second batch after To Date (find To Date input)
    const toDateFilter = document.getElementById('toDate')?.closest('.filter-group');
    insertAfter = toDateFilter || (parentGrid.children[parentGrid.children.length - 1] as Element);
    
    // Insert second batch filters (Validation, Acknowledgement, Pre Status, Post Status)
    secondBatchFilters.forEach(filter => {
      const filterHTML = createMultiSelectFilter(filter);
      const tempDiv = document.createElement('div');
      safeSetHTML(tempDiv, filterHTML);
      const filterElement = tempDiv.firstElementChild as HTMLElement;
      if (filterElement && parentGrid && insertAfter) {
        if (insertAfter.nextSibling) {
          parentGrid.insertBefore(filterElement, insertAfter.nextSibling);
        } else {
          parentGrid.appendChild(filterElement);
        }
        insertAfter = filterElement; // Update for next insertion
      }
    });
    
    // Clear the container since we're inserting into parent grid
    container.innerHTML = '';
  } else {
    // Fallback: render in container if parent grid not found
    const html = `
      <div class="filter-multi-select-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr)); gap: 0.5625rem; align-items: end; width: 100%;">
        ${allFilters.map(filter => createMultiSelectFilter(filter)).join('')}
      </div>
    `;
    safeSetHTML(container, html);
  }
}
