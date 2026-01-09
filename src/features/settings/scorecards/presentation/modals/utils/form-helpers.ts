/**
 * Form Helper Utilities
 * Helper functions for form data collection and validation
 */

import type { ScorecardParameter } from '../../../domain/entities.js';

/**
 * Collect parameters from parameter table DOM
 * Works with div-based parameter rows
 */
export function collectParametersFromDOM(containerId: string, scorecardId: string): ScorecardParameter[] {
  const container = document.getElementById(containerId);
  if (!container) return [];
  
  const parameterRows = container.querySelectorAll('.parameter-row[data-parameter-index]');
  const parameters: ScorecardParameter[] = [];

  parameterRows.forEach((row, index) => {
    const nameInput = row.querySelector('.parameter-name-input') as HTMLInputElement;
    const pointsInput = row.querySelector('.parameter-points-input') as HTMLInputElement;
    const typeSelect = row.querySelector('.parameter-type-select') as HTMLSelectElement;
    const categorySelect = row.querySelector('.parameter-category-select') as HTMLSelectElement;
    const fieldTypeSelect = row.querySelector('.parameter-field-type-select') as HTMLSelectElement;
    const fieldIdInput = row.querySelector('.parameter-field-id-input') as HTMLInputElement;
    const descriptionInput = row.querySelector('.parameter-description-input') as HTMLInputElement;
    const aiAuditCheckbox = row.querySelector('.parameter-ai-audit-checkbox') as HTMLInputElement;
    const fatalErrorCheckbox = row.querySelector('.parameter-fatal-error-checkbox') as HTMLInputElement;

    if (nameInput && pointsInput && typeSelect && categorySelect && fieldTypeSelect && fieldIdInput) {
      parameters.push({
        scorecard_id: scorecardId,
        error_name: nameInput.value.trim(),
        penalty_points: parseFloat(pointsInput.value) || 0,
        parameter_type: typeSelect.value as any,
        error_category: categorySelect.value,
        field_type: fieldTypeSelect.value as any,
        field_id: fieldIdInput.value.trim(),
        description: descriptionInput?.value.trim() || null,
        enable_ai_audit: aiAuditCheckbox?.checked || false,
        is_fail_all: fatalErrorCheckbox?.checked || false,
        display_order: index + 1
      });
    }
  });

  return parameters;
}

/**
 * Get scoring type help text
 */
export function getScoringTypeHelpText(scoringType: string): string {
  switch(scoringType) {
    case 'deductive':
      return '<strong>Deductive:</strong> Start perfect, lose points for mistakes.';
    case 'additive':
      return '<strong>Additive:</strong> Start at zero, earn points for achievements.';
    case 'hybrid':
      return '<strong>Hybrid:</strong> Deduct for errors, reward for excellence.';
    default:
      return '';
  }
}

/**
 * Get parameters header text based on scoring type
 */
export function getParametersHeaderText(scoringType: string): string {
  switch(scoringType) {
    case 'deductive':
      return 'Error Parameters';
    case 'additive':
      return 'Achievement Parameters';
    case 'hybrid':
      return 'Parameters (Errors & Achievements)';
    default:
      return 'Parameters';
  }
}

