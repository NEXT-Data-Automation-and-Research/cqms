/**
 * Query Validators
 * Validation helpers for SupabaseQueryBuilder
 */

/**
 * Validates that a column name is valid
 */
export function validateColumn(column: string): void {
  if (!column || typeof column !== 'string' || column.trim().length === 0) {
    throw new Error('Column name must be a non-empty string');
  }
}

/**
 * Validates select columns
 */
export function validateSelectColumns(columns: string | string[]): void {
  if (!columns || (Array.isArray(columns) && columns.length === 0)) {
    throw new Error('Select columns cannot be empty');
  }
}

/**
 * Validates insert data
 */
export function validateInsertData(data: any): void {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error('Insert data cannot be empty');
  }
}

/**
 * Validates update data
 */
export function validateUpdateData(data: any): void {
  if (!data || typeof data !== 'object') {
    throw new Error('Update data must be an object');
  }
}

/**
 * Validates limit value
 */
export function validateLimit(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Limit must be a non-negative integer');
  }
}

/**
 * Validates in filter values
 */
export function validateInValues(values: any[]): void {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('In filter requires a non-empty array');
  }
}

/**
 * Validates like pattern
 */
export function validateLikePattern(pattern: string): void {
  if (typeof pattern !== 'string') {
    throw new Error('Like pattern must be a string');
  }
}

/**
 * Validates not operator
 */
export function validateNotOperator(operator: string): void {
  if (!operator || typeof operator !== 'string') {
    throw new Error('Not operator must be a non-empty string');
  }
}

