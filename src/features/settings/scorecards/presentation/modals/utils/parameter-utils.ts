/**
 * Parameter Utilities
 * Helper functions for parameter management
 */

import type { ParameterType, FieldType, ErrorCategory } from '../../../domain/entities.js';

/**
 * Convert text to snake_case for field IDs
 */
export function toSnakeCase(text: string | null | undefined): string {
  if (!text) return '';
  
  return text
    .trim()
    // Replace spaces, hyphens, and special characters with underscores
    .replace(/[\s\-_\/&]+/g, '_')
    // Insert underscore before capital letters (for camelCase/PascalCase)
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    // Convert to lowercase
    .toLowerCase()
    // Remove any non-alphanumeric characters except underscores
    .replace(/[^a-z0-9_]/g, '')
    // Replace multiple consecutive underscores with a single one
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');
}

/**
 * Get available parameter types based on scoring type
 */
export function getAvailableParameterTypes(scoringType: string): ParameterType[] {
  if (scoringType === 'deductive') {
    return ['error'];
  } else if (scoringType === 'additive') {
    return ['achievement'];
  } else {
    return ['error', 'achievement', 'bonus'];
  }
}

/**
 * Get available field types based on parameter type and scoring type
 */
export function getAvailableFieldTypes(
  parameterType: ParameterType,
  scoringType: string
): FieldType[] {
  // Deductive scoring: only counter allowed (errors can occur multiple times)
  if (scoringType === 'deductive') {
    return ['counter'];
  }
  
  // Additive scoring: only radio allowed (achievements are binary)
  if (scoringType === 'additive') {
    return ['radio'];
  }
  
  // Hybrid scoring: depends on parameter type
  if (parameterType === 'error' || parameterType === 'bonus') {
    return ['counter'];
  } else {
    return ['radio'];
  }
}

/**
 * Get available error categories
 */
export function getAvailableCategories(): ErrorCategory[] {
  return [
    'Critical Fail Error',
    'Critical Error',
    'Significant Error',
    'Major Error',
    'Minor Error'
  ];
}

/**
 * Get default parameter type based on scoring type
 */
export function getDefaultParameterType(scoringType: string): ParameterType {
  if (scoringType === 'deductive') {
    return 'error';
  } else if (scoringType === 'additive') {
    return 'achievement';
  } else {
    return 'error';
  }
}

/**
 * Get default field type based on scoring type
 */
export function getDefaultFieldType(scoringType: string): FieldType {
  if (scoringType === 'deductive') {
    return 'counter';
  } else if (scoringType === 'additive') {
    return 'radio';
  } else {
    return 'counter';
  }
}

/**
 * Format parameter type for display
 */
export function formatParameterType(type: ParameterType): string {
  const labels: Record<ParameterType, string> = {
    'error': 'Error',
    'achievement': 'Achievement',
    'bonus': 'Bonus'
  };
  return labels[type] || type;
}

/**
 * Format field type for display
 */
export function formatFieldType(type: FieldType): string {
  return type === 'counter' ? 'Counter' : 'Yes/No';
}

