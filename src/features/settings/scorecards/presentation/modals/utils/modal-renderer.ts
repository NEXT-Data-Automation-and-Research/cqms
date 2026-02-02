/**
 * Modal Renderer Utilities
 * Helper functions for rendering modal HTML
 */

import { escapeHtml } from '../../../../../../utils/html-sanitizer.js';
import type { Scorecard } from '../../../domain/entities.js';
import { getScoringTypeHelpText, getParametersHeaderText } from './form-helpers.js';

/**
 * Render edit modal HTML structure
 */
export function renderEditModalHTML(scorecard: Scorecard): string {
  return `
    <div class="modal-content" style="max-width: 95vw; width: 95vw; max-width: 90rem;">
      <div class="modal-header">
        <h3>Edit Scorecard: ${escapeHtml(scorecard.name)}</h3>
        <button class="modal-close" id="editScorecardModalClose">&times;</button>
      </div>
      <div class="modal-body">
        <form id="editScorecardForm">
          <input type="hidden" id="editScorecardId" value="${scorecard.id}">
          
          <!-- Basic Information -->
          <div style="background: #f9fafb; border-radius: 0.2812rem; padding: 0.375rem; margin-bottom: 0.5625rem;">
            <h3 style="font-size: 0.5625rem; font-weight: 600; color: #374151; margin-bottom: 0.375rem;">Basic Information</h3>
            
            <div class="form-group">
              <label for="editScorecardName">Scorecard Name *</label>
              <input type="text" id="editScorecardName" required value="${escapeHtml(scorecard.name || '')}">
            </div>
            <div class="form-group">
              <label for="editScorecardDescription">Description</label>
              <textarea id="editScorecardDescription" rows="3" placeholder="Brief description... (supports multiple paragraphs)">${escapeHtml(scorecard.description || '')}</textarea>
            </div>
            <div class="form-group">
              <label for="editScorecardTableName">Table Name *</label>
              <input type="text" id="editScorecardTableName" required value="${escapeHtml(scorecard.table_name || '')}" readonly style="background-color: #f3f4f6;">
              <small style="display: block; margin-top: 0.25rem; font-size: 0.75rem; color: #6b7280;">
                Table name cannot be changed after creation
              </small>
            </div>
            <div class="form-group">
              <label for="editScorecardScoringType">Scoring Type *</label>
              <select id="editScorecardScoringType" required>
                <option value="">Select Scoring Type</option>
                <option value="deductive" ${scorecard.scoring_type === 'deductive' ? 'selected' : ''}>Deductive (100% - errors)</option>
                <option value="additive" ${scorecard.scoring_type === 'additive' ? 'selected' : ''}>Additive (0% + achievements)</option>
                <option value="hybrid" ${scorecard.scoring_type === 'hybrid' ? 'selected' : ''}>Hybrid (both)</option>
              </select>
              <small id="editScoringTypeHelp" style="display: block; margin-top: 0.25rem; font-size: 0.75rem; color: #6b7280;">
                ${getScoringTypeHelpText(scorecard.scoring_type || 'deductive')}
              </small>
            </div>
            <div class="form-group">
              <label for="editScorecardPassingThreshold">Passing Threshold (%) *</label>
              <input type="number" id="editScorecardPassingThreshold" required min="0" max="100" step="0.01" value="${scorecard.passing_threshold || 0}">
            </div>
          </div>
          
          <!-- Applicable Channels -->
          <div style="background: #f9fafb; border-radius: 0.2812rem; padding: 0.375rem; margin-bottom: 0.5625rem;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.2812rem;">
              <label style="font-size: 0.5156rem; font-weight: 500; color: #374151; margin: 0;">Applicable Channels <span style="color: #ef4444;">*</span></label>
              <div style="display: flex; gap: 0.2812rem;">
                <button type="button" style="padding: 0.1875rem 0.375rem; background: #1A733E; color: white; border: none; border-radius: 0.1875rem; font-size: 0.4688rem; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 0.1875rem;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                  Load Template
                </button>
                <button type="button" style="padding: 0.1875rem 0.375rem; background: transparent; color: #1A733E; border: 0.0469rem solid #1A733E; border-radius: 0.1875rem; font-size: 0.4688rem; cursor: pointer; font-weight: 500;">+ Manage Channels</button>
              </div>
            </div>
            <div id="editChannelsContainer" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.375rem; padding: 0.5625rem; background: white; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem;">
              <!-- Channel checkboxes will be dynamically generated here -->
            </div>
            <small style="font-size: 0.4219rem; color: #6b7280; display: block; margin-top: 0.1875rem;">Select at least one channel where this scorecard will be used.</small>
          </div>
          
          <!-- Error Parameters -->
          <div style="background: #f9fafb; border-radius: 0.2812rem; padding: 0.375rem; margin-bottom: 0.5625rem; overflow-x: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.375rem;">
              <h3 id="editParametersHeader" style="font-size: 0.5625rem; font-weight: 600; color: #374151;">
                ${getParametersHeaderText(scorecard.scoring_type || 'deductive')}
              </h3>
              <div style="display: flex; gap: 0.2812rem;">
                <button type="button" class="btn-secondary" id="editParameterBulkImportBtn" style="padding: 0.1875rem 0.4688rem; font-size: 0.4688rem; display: flex; align-items: center; gap: 0.1875rem;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Bulk Import
                </button>
                <button type="button" id="editParameterAddOneBtn" class="btn-secondary" style="padding: 0.1875rem 0.4688rem; font-size: 0.4688rem;">+ Add One</button>
              </div>
            </div>
            
            <div class="parameter-table-wrapper">
              <div class="parameter-headers with-ai-prompt">
                <div>Name</div>
                <div>Points</div>
                <div>Type</div>
                <div>Category <span style="font-size: 0.375rem; font-weight: 400; color: #9ca3af;">(Severity)</span></div>
                <div>Field Type</div>
                <div>Field ID <span style="font-size: 0.375rem; font-weight: 400; color: #9ca3af;">(auto)</span></div>
                <div>Description</div>
                <div style="text-align: center;">AI Audit</div>
                <div>AI Prompt</div>
                <div style="text-align: center;">Fatal Error</div>
                <div></div>
              </div>
              <div id="editParametersContainer">
                <!-- Parameters will be added here -->
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" id="editScorecardIsActive" ${scorecard.is_active ? 'checked' : ''}>
              Active
            </label>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn-secondary" id="editScorecardCancelBtn">Cancel</button>
        <button type="button" class="btn-create" id="editScorecardSubmitBtn">Save Changes</button>
      </div>
    </div>
  `;
}

