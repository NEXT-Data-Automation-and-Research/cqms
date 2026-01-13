/**
 * Filter Panel Renderer
 * Renders the filter panel with multi-select filters
 */

import { safeSetHTML } from '../../../../utils/html-sanitizer.js';
import type { AuditReportsController } from '../audit-reports-controller.js';

export function renderFilterPanel(
  container: HTMLElement,
  controller: AuditReportsController
): void {
  const html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5625rem; pointer-events: auto; position: relative; z-index: 102;">
      <div class="controls-header" style="margin: 0; padding: 0; border: none; pointer-events: none;">Search & Filters</div>
      <button id="clearFilters" class="filter-input" style="padding: 0.2812rem 0.5625rem; background-color: #f9fafb; color: #374151; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; cursor: pointer !important; pointer-events: auto !important; position: relative; z-index: 103; touch-action: manipulation;">Clear All</button>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr)); gap: 0.5625rem; align-items: end; width: 100%; pointer-events: auto; position: relative; z-index: 102;">
      <div class="filter-group" style="pointer-events: auto; position: relative; z-index: 103;">
        <label for="scorecardSelector" class="filter-label" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.1875rem; font-family: 'Poppins', sans-serif; display: block; pointer-events: none;">Scorecard</label>
        <select id="scorecardSelector" class="filter-select" style="padding: 0.375rem 0.5625rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.6562rem; font-family: 'Poppins', sans-serif; width: 100%; cursor: pointer !important; pointer-events: auto !important; position: relative; z-index: 104; background-color: #ffffff !important; appearance: auto !important; -webkit-appearance: menulist !important; -moz-appearance: menulist !important; touch-action: manipulation; min-height: 1.75rem;">
          <option value="">Loading scorecards...</option>
        </select>
      </div>
      
      <div class="filter-group" style="pointer-events: auto; position: relative; z-index: 103;">
        <label for="searchInput" class="filter-label" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.1875rem; font-family: 'Poppins', sans-serif; display: block; pointer-events: none;">Search</label>
        <input type="text" id="searchInput" class="filter-input" placeholder="Search audits..." style="padding: 0.375rem 0.5625rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.6562rem; font-family: 'Poppins', sans-serif; width: 100%; cursor: text !important; pointer-events: auto !important; position: relative; z-index: 104; background-color: #ffffff !important; touch-action: manipulation; min-height: 1.75rem; box-sizing: border-box;">
      </div>
      
      <div class="filter-group" style="pointer-events: auto; position: relative; z-index: 103;">
        <label for="auditIdSearch" class="filter-label" style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin-bottom: 0.1875rem; font-family: 'Poppins', sans-serif; display: block; pointer-events: none;">Audit ID</label>
        <input type="text" id="auditIdSearch" class="filter-input" placeholder="e.g., audit_1765963145843" style="padding: 0.375rem 0.5625rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.6562rem; font-family: 'Poppins', sans-serif; width: 100%; cursor: text !important; pointer-events: auto !important; position: relative; z-index: 104; background-color: #ffffff !important; touch-action: manipulation; min-height: 1.75rem; box-sizing: border-box;">
      </div>
    </div>
    
    <!-- Multi-select filters will be added here by event handlers -->
    <div id="multiSelectFilters" style="margin-top: 0.75rem; pointer-events: auto; position: relative; z-index: 102;">
      <!-- Filters populated dynamically -->
    </div>
  `;

  safeSetHTML(container, html);
}

