/**
 * Filter Panel Renderer
 * Renders the filter panel with ALL filters directly in HTML (matching live site)
 */

import { safeSetHTML, escapeHtml } from '../../../../utils/html-sanitizer.js';
import type { AuditReportsController } from '../audit-reports-controller.js';
import { extractFilterValues, createMultiSelectFilterHTML } from './multi-select-filter-renderer.js';
import type { AuditReport } from '../../domain/entities.js';

export function renderFilterPanel(
  container: HTMLElement,
  controller: AuditReportsController
): void {
  // Get audits to extract filter values (or empty array if not loaded yet)
  // Access private audits property via type assertion
  const audits: AuditReport[] = (controller as any).audits || [];
  const currentFilters = (controller as any).filters || {};
  const currentDateRange = (controller as any).dateRange || null;
  const filterValues = extractFilterValues(audits);

  // Generate multi-select HTML for all filters
  const auditorFilter = createMultiSelectFilterHTML({
    id: 'auditorNameFilter',
    label: 'Auditor',
    placeholder: 'Select auditors...',
    values: filterValues.auditorNames,
    selectedValues: currentFilters.auditorNames || []
  });

  const employeeFilter = createMultiSelectFilterHTML({
    id: 'employeeNameFilter',
    label: 'Employee',
    placeholder: 'Select employees...',
    values: filterValues.employeeNames,
    selectedValues: currentFilters.employeeNames || []
  });

  const typeFilter = createMultiSelectFilterHTML({
    id: 'auditTypeFilter',
    label: 'Type',
    placeholder: 'Select types...',
    values: filterValues.auditTypes,
    selectedValues: currentFilters.auditTypes || []
  });

  const statusFilter = createMultiSelectFilterHTML({
    id: 'statusFilter',
    label: 'Status',
    placeholder: 'Select statuses...',
    values: filterValues.statuses,
    selectedValues: currentFilters.statuses || []
  });

  const quarterFilter = createMultiSelectFilterHTML({
    id: 'quarterFilter',
    label: 'Quarter',
    placeholder: 'Select quarters...',
    values: filterValues.quarters,
    selectedValues: currentFilters.quarters || []
  });

  const channelFilter = createMultiSelectFilterHTML({
    id: 'channelFilter',
    label: 'Channel',
    placeholder: 'Select channels...',
    values: filterValues.channels,
    selectedValues: currentFilters.channels || []
  });

  const empTypeFilter = createMultiSelectFilterHTML({
    id: 'employeeTypeFilter',
    label: 'Emp Type',
    placeholder: 'Select types...',
    values: filterValues.employeeTypes,
    selectedValues: currentFilters.employeeTypes || []
  });

  const countryFilter = createMultiSelectFilterHTML({
    id: 'countryFilter',
    label: 'Country',
    placeholder: 'Select countries...',
    values: filterValues.countries,
    selectedValues: currentFilters.countries || []
  });

  const validationFilter = createMultiSelectFilterHTML({
    id: 'validationStatusFilter',
    label: 'Validation',
    placeholder: 'Select validation...',
    values: filterValues.validationStatuses,
    selectedValues: currentFilters.validationStatuses || []
  });

  const acknowledgementFilter = createMultiSelectFilterHTML({
    id: 'acknowledgementStatusFilter',
    label: 'Acknowledgement',
    placeholder: 'Select status...',
    values: filterValues.acknowledgementStatuses,
    selectedValues: currentFilters.acknowledgementStatuses || []
  });

  const preStatusFilter = createMultiSelectFilterHTML({
    id: 'agentPreStatusFilter',
    label: 'Pre Status',
    placeholder: 'Select pre status...',
    values: filterValues.agentPreStatuses,
    selectedValues: currentFilters.agentPreStatuses || []
  });

  const postStatusFilter = createMultiSelectFilterHTML({
    id: 'agentPostStatusFilter',
    label: 'Post Status',
    placeholder: 'Select post status...',
    values: filterValues.agentPostStatuses,
    selectedValues: currentFilters.agentPostStatuses || []
  });

  // Match live site exactly: compact grid, smaller padding, all filters in order
  const html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5625rem;">
      <div class="controls-header" style="margin: 0; padding: 0; border: none;">Search & Filters</div>
      <button id="clearFilters" style="padding: 0.2812rem 0.5625rem; background-color: #f9fafb; color: #374151; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; cursor: pointer;">Clear All</button>
    </div>

    <!-- Compact Filter Grid - matching live site exactly -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(5.2734rem, 1fr)); gap: 0.375rem; align-items: end; width: 100%;">
      <!-- Scorecard Selector -->
      <div>
        <label for="scorecardSelector" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Scorecard</label>
        <select id="scorecardSelector" style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
          <option value="">Loading scorecards...</option>
        </select>
      </div>
      
      <!-- General Search -->
      <div>
        <label for="searchInput" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Search</label>
        <input type="text" id="searchInput" placeholder="Search audits..." style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- Audit ID Search -->
      <div>
        <label for="auditIdSearch" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Audit ID</label>
        <input type="text" id="auditIdSearch" placeholder="e.g., audit_1765963145843" style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- Auditor Name -->
      <div id="auditorNameFilterContainer">
        ${auditorFilter}
      </div>
      
      <!-- Employee Name -->
      <div>
        ${employeeFilter}
      </div>
      
      <!-- Audit Type -->
      <div>
        ${typeFilter}
      </div>
      
      <!-- Status -->
      <div>
        ${statusFilter}
      </div>
      
      <!-- Quarter -->
      <div>
        ${quarterFilter}
      </div>
      
      <!-- Channel -->
      <div>
        ${channelFilter}
      </div>
      
      <!-- Employee Type -->
      <div>
        ${empTypeFilter}
      </div>
      
      <!-- Country -->
      <div>
        ${countryFilter}
      </div>
      
      <!-- Interaction ID -->
      <div>
        <label for="interactionIdFilter" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Interaction ID</label>
        <input type="text" id="interactionIdFilter" placeholder="Interaction ID..." style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- Week -->
      <div>
        <label for="weekFilter" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Week</label>
        <input type="number" id="weekFilter" min="1" max="52" placeholder="Week (1-52)..." style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- Min Score -->
      <div>
        <label for="minScoreFilter" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Min Score</label>
        <input type="number" id="minScoreFilter" min="0" max="100" placeholder="Min %..." style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- Max Score -->
      <div>
        <label for="maxScoreFilter" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Max Score</label>
        <input type="number" id="maxScoreFilter" min="0" max="100" placeholder="Max %..." style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- Min Errors -->
      <div>
        <label for="minErrorsFilter" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Min Errors</label>
        <input type="number" id="minErrorsFilter" min="0" placeholder="Min errors..." style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- Max Errors -->
      <div>
        <label for="maxErrorsFilter" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">Max Errors</label>
        <input type="number" id="maxErrorsFilter" min="0" placeholder="Max errors..." style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- From Date -->
      <div>
        <label for="dateFromFilter" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">From Date</label>
        <input type="date" id="dateFromFilter" value="${currentDateRange?.startDate || ''}" style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- To Date -->
      <div>
        <label for="dateToFilter" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.0938rem; font-family: 'Poppins', sans-serif; display: block;">To Date</label>
        <input type="date" id="dateToFilter" value="${currentDateRange?.endDate || ''}" style="padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%;">
      </div>
      
      <!-- Validation Status -->
      <div>
        ${validationFilter}
      </div>
      
      <!-- Acknowledgement Status -->
      <div>
        ${acknowledgementFilter}
      </div>
      
      <!-- Employee Pre Status -->
      <div>
        ${preStatusFilter}
      </div>
      
      <!-- Employee Post Status -->
      <div>
        ${postStatusFilter}
      </div>
    </div>
  `;

  safeSetHTML(container, html);
}
