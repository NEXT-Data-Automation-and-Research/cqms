/**
 * Parameter Row Component
 * Renders a single parameter row in the table
 */

import { escapeHtml } from '../../../../../../utils/html-sanitizer.js';
import type { ScorecardParameter, ParameterType, FieldType } from '../../../domain/entities.js';
import {
  getAvailableParameterTypes,
  getAvailableFieldTypes,
  getAvailableCategories,
  formatParameterType,
  formatFieldType,
  toSnakeCase
} from '../utils/parameter-utils.js';

export class ParameterRow {
  /**
   * Render a single parameter row HTML
   */
  static render(
    param: ScorecardParameter,
    index: number,
    scoringType: string
  ): string {
    const parameterTypes = getAvailableParameterTypes(scoringType);
    const fieldTypes = getAvailableFieldTypes(param.parameter_type, scoringType);
    const categories = getAvailableCategories();

    // Ensure field type is valid for current scoring type
    const validFieldType = fieldTypes.includes(param.field_type)
      ? param.field_type
      : fieldTypes[0] || 'counter';

    const inputStyle = "padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%; box-sizing: border-box;";
    const selectStyle = "padding: 0.1875rem 0.2812rem; border: 0.0469rem solid #d1d5db; border-radius: 0.1875rem; font-size: 0.5156rem; font-family: 'Poppins', sans-serif; width: 100%; box-sizing: border-box;";
    const checkboxStyle = "width: 0.75rem; height: 0.75rem; cursor: pointer; accent-color: #1A733E;";
    const readonlyInputStyle = inputStyle + " background-color: #f9fafb; cursor: not-allowed;";
    
    return `
      <div class="parameter-row" data-parameter-index="${index}" data-index="${index}" style="min-width: max-content;">
        <div>
          <input type="text" 
                 class="parameter-name-input" 
                 data-index="${index}" 
                 value="${escapeHtml(param.error_name || '')}" 
                 placeholder="Parameter Name"
                 required
                 style="${inputStyle}">
        </div>
        <div>
          <input type="number" 
                 class="parameter-points-input" 
                 data-index="${index}" 
                 value="${param.penalty_points || 0}" 
                 min="0" 
                 step="0.01"
                 required
                 style="${inputStyle}">
        </div>
        <div>
          <select class="parameter-type-select" data-index="${index}" required style="${selectStyle}">
            ${parameterTypes.map(
              (type) =>
                `<option value="${type}" ${param.parameter_type === type ? 'selected' : ''}>${formatParameterType(type)}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <select class="parameter-category-select" data-index="${index}" required style="${selectStyle}">
            ${categories.map(
              (cat) =>
                `<option value="${escapeHtml(cat)}" ${param.error_category === cat ? 'selected' : ''}>${escapeHtml(cat)}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <select class="parameter-field-type-select" data-index="${index}" required style="${selectStyle}">
            ${fieldTypes.map(
              (type) =>
                `<option value="${type}" ${validFieldType === type ? 'selected' : ''} ${!fieldTypes.includes(type) ? 'disabled' : ''}>${formatFieldType(type)}</option>`
            ).join('')}
          </select>
        </div>
        <div>
          <input type="text" 
                 class="parameter-field-id-input" 
                 data-index="${index}" 
                 value="${escapeHtml(param.field_id || '')}" 
                 placeholder="field_id"
                 readonly
                 style="${readonlyInputStyle}"
                 data-auto-generated="${param.field_id ? 'false' : 'true'}"
                 data-original-value="${escapeHtml(param.field_id || '')}"
                 title="Field ID is automatically generated from parameter name">
        </div>
        <div>
          <input type="text" 
                 class="parameter-description-input" 
                 data-index="${index}" 
                 value="${escapeHtml(param.description || '')}" 
                 placeholder="Description (optional)"
                 style="${inputStyle}">
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <input type="checkbox" 
                 class="parameter-ai-audit-checkbox" 
                 data-index="${index}" 
                 ${param.enable_ai_audit ? 'checked' : ''}
                 style="${checkboxStyle}"
                 title="Enable AI Audit for this parameter">
        </div>
        <div style="display: flex; align-items: center; justify-content: center;">
          <input type="checkbox" 
                 class="parameter-fatal-error-checkbox" 
                 data-index="${index}" 
                 ${param.is_fail_all ? 'checked' : ''}
                 style="width: 0.75rem; height: 0.75rem; cursor: pointer; accent-color: #ef4444;"
                 title="Causes automatic fail regardless of score">
        </div>
        <div style="text-align: center;">
          <button type="button" 
                  class="parameter-remove-btn" 
                  data-index="${index}"
                  title="Remove parameter"
                  style="padding: 0.1875rem; background: #ef4444; color: white; border: none; border-radius: 0.1875rem; cursor: pointer; font-size: 0.6562rem; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">
            ×
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Generate field ID from parameter name
   */
  static generateFieldId(name: string): string {
    const snakeCase = toSnakeCase(name);
    return snakeCase || 'field_' + Date.now();
  }
}

