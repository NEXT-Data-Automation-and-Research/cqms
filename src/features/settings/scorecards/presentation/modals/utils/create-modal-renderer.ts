/**
 * Create Modal Renderer Utilities
 * Helper functions for rendering create modal HTML
 */

import { escapeHtml } from '../../../../../../utils/html-sanitizer.js';
import { getScoringTypeHelpText, getParametersHeaderText } from './form-helpers.js';

/**
 * Render create modal HTML structure
 */
export function renderCreateModalHTML(): string {
  return `
    <div class="modal-content" style="max-width: 95vw; width: 95vw; max-width: 90rem;">
      <div class="modal-header">
        <h3>Create New Scorecard</h3>
        <button class="modal-close" id="createScorecardModalClose">&times;</button>
      </div>
      <div class="modal-body">
        <form id="createScorecardForm">
          <!-- Basic Information -->
          <div style="background: #f9fafb; border-radius: 0.2812rem; padding: 0.375rem; margin-bottom: 0.5625rem;">
            <h3 style="font-size: 0.5625rem; font-weight: 600; color: #374151; margin-bottom: 0.375rem;">Basic Information</h3>
            
            <div class="form-group">
              <label for="createScorecardName">Scorecard Name *</label>
              <input type="text" id="createScorecardName" required placeholder="e.g., FN Chat CFD V4.1">
            </div>
            <div class="form-group">
              <label for="createScorecardDescription">Description</label>
              <textarea id="createScorecardDescription" rows="3" placeholder="Brief description... (supports multiple paragraphs)"></textarea>
            </div>
            <div class="form-group">
              <label for="createScorecardTableName">Table Name *</label>
              <input type="text" id="createScorecardTableName" required placeholder="e.g., fnchat_cfd_v4_1" pattern="[a-z0-9_]+" title="Lowercase letters, numbers, and underscores only">
              <small style="display: block; margin-top: 0.25rem; font-size: 0.75rem; color: #6b7280;">
                Used for database table name (lowercase, no spaces). Cannot be changed after creation.
              </small>
            </div>
            <div class="form-group">
              <label for="createScorecardScoringType">Scoring Type *</label>
              <select id="createScorecardScoringType" required>
                <option value="">Select Scoring Type</option>
                <option value="deductive">Deductive (100% - errors)</option>
                <option value="additive">Additive (0% + achievements)</option>
                <option value="hybrid">Hybrid (both)</option>
              </select>
              <small id="createScoringTypeHelp" style="display: block; margin-top: 0.25rem; font-size: 0.75rem; color: #6b7280;"></small>
            </div>
            <div class="form-group">
              <label for="createScorecardPassingThreshold">Passing Threshold (%) *</label>
              <input type="number" id="createScorecardPassingThreshold" required min="0" max="100" step="0.01" placeholder="e.g., 85" value="85">
            </div>
          </div>
          
          <!-- Applicable Channels -->
          <div style="background: #f9fafb; border-radius: 0.2812rem; padding: 0.375rem; margin-bottom: 0.5625rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2812rem;">
              <label style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin: 0;">Applicable Channels <span style="color: #ef4444;">*</span></label>
            </div>
            <div id="createChannelsContainer" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.375rem; padding: 0.5625rem; background: white; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem;">
              <!-- Channel checkboxes will be dynamically generated here -->
            </div>
            <small style="font-size: 0.4219rem; color: #6b7280; display: block; margin-top: 0.1875rem;">Select at least one channel where this scorecard will be used.</small>
          </div>
          
          <!-- Error Parameters -->
          <div style="background: #f9fafb; border-radius: 0.2812rem; padding: 0.375rem; margin-bottom: 0.5625rem; overflow-x: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem;">
              <h3 id="createParametersHeader" style="font-size: 0.5625rem; font-weight: 600; color: #374151;">
                Error Parameters
              </h3>
              <div style="display: flex; gap: 0.2812rem;">
                <button type="button" class="btn-secondary" id="createParameterBulkImportBtn" style="padding: 0.1875rem 0.4688rem; font-size: 0.4688rem; display: flex; align-items: center; gap: 0.1875rem;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Bulk Import
                </button>
                <button type="button" id="createParameterAddOneBtn" class="btn-secondary" style="padding: 0.1875rem 0.4688rem; font-size: 0.4688rem;">+ Add One</button>
              </div>
            </div>
            
            <!-- Parameter Headers -->
            <div class="parameter-headers" style="min-width: max-content;">
              <div>Name</div>
              <div>Points</div>
              <div>Type</div>
              <div>Category <span style="font-size: 0.375rem; font-weight: 400; color: #9ca3af;">(Severity)</span></div>
              <div>Field Type</div>
              <div>Field ID <span style="font-size: 0.375rem; font-weight: 400; color: #9ca3af;">(auto)</span></div>
              <div>Description</div>
              <div style="text-align: center;">AI Audit</div>
              <div style="text-align: center;">Fatal Error</div>
              <div></div>
            </div>
            
            <div id="createParametersContainer" style="min-width: min-content; margin: 0; padding: 0;">
              <!-- Parameters will be added here -->
            </div>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="createScorecardIsActive" checked>
              Active
            </label>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" id="createScorecardCancelBtn">Cancel</button>
        <button type="button" class="btn-create" id="createScorecardSubmitBtn">Create Scorecard</button>
      </div>
    </div>
  `;
}

