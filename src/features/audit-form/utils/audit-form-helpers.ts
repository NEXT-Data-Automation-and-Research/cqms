/**
 * Audit Form Helpers
 * Utility functions to help migrate audit-form.html to comply with project rules
 * 
 * Usage in audit-form.html:
 * ```html
 * <script type="module">
 *   import { getSupabaseClient, setSafeHTML, logger, SCORECARD_QUERY_FIELDS } from '/js/features/audit-form/utils/audit-form-helpers.js';
 * </script>
 * ```
 */

import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';
import { safeSetHTML } from '../../../utils/html-sanitizer.js';
import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js';
import { 
  SCORECARD_AUDIT_FORM_FIELDS,
  SCORECARD_PARAMETER_FIELDS,
  AUDIT_ASSIGNMENT_FIELDS,
  AUDIT_FORM_FIELDS,
  INTERCOM_ADMIN_CACHE_FIELDS
} from '../../../core/constants/field-whitelists.js';

/**
 * Get authenticated Supabase client (replaces window.supabaseClient)
 * 
 * @example
 * // Before: const { data } = await window.supabaseClient.from('scorecards').select('*');
 * // After:
 * const supabase = await getSupabaseClient();
 * const { data } = await supabase.from('scorecards').select(SCORECARD_QUERY_FIELDS);
 */
export async function getSupabaseClient() {
  return await getAuthenticatedSupabase();
}

/**
 * Safe innerHTML setter (replaces .innerHTML =)
 * Prevents XSS attacks by sanitizing HTML content
 * 
 * @example
 * // Before: element.innerHTML = '<option>...</option>';
 * // After: setSafeHTML(element, '<option>...</option>');
 */
export function setSafeHTML(element: HTMLElement | null, html: string): void {
  if (!element) {
    logWarn('Attempted to set HTML on null element');
    return;
  }
  safeSetHTML(element, html);
}

/**
 * Scorecard fields for queries (use instead of select('*'))
 */
export const SCORECARD_QUERY_FIELDS = SCORECARD_AUDIT_FORM_FIELDS;

/**
 * Scorecard parameter fields
 */
export const SCORECARD_PARAMETER_QUERY_FIELDS = SCORECARD_PARAMETER_FIELDS;

/**
 * Audit assignment fields
 */
export const AUDIT_ASSIGNMENT_QUERY_FIELDS = AUDIT_ASSIGNMENT_FIELDS;

/**
 * Audit form fields (array - join with ', ' for queries)
 */
export const AUDIT_FORM_QUERY_FIELDS = Array.isArray(AUDIT_FORM_FIELDS) 
  ? AUDIT_FORM_FIELDS.join(', ')
  : AUDIT_FORM_FIELDS;

/**
 * Intercom admin cache fields
 */
export const INTERCOM_ADMIN_QUERY_FIELDS = INTERCOM_ADMIN_CACHE_FIELDS;

/**
 * Logging helpers (replaces console.log/error/warn)
 * 
 * @example
 * // Before: console.log('Loading...'); console.error('Error:', err);
 * // After: logger.info('Loading...'); logger.error('Error loading:', err);
 */
export const logger = {
  info: logInfo,
  error: logError,
  warn: logWarn,
  log: logInfo // For backward compatibility
};

/**
 * Helper to create option elements safely
 */
export function createOptionElement(value: string, text: string, attributes?: Record<string, string>): HTMLOptionElement {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = text; // Use textContent instead of innerHTML for safety
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      option.setAttribute(key, val);
    });
  }
  return option;
}

