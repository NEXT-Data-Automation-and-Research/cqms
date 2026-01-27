/**
 * Error Details Renderer
 * Renders error details section for audit modal
 */

import { escapeHtml } from '../../../../../utils/html-sanitizer.js';
import type { AuditReport } from '../../../domain/entities.js';
import type { ScorecardParameter } from './audit-detail-modal-renderer.js';

/**
 * Generate error details HTML
 */
export function generateErrorDetails(audit: AuditReport, parameters: ScorecardParameter[]): string {
  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
  
  // Debug: Log available feedback columns in audit data
  const auditKeys = Object.keys(audit || {});
  const feedbackKeys = auditKeys.filter(key => key.toLowerCase().includes('feedback'));
  const parameterValueKeys = auditKeys.filter(key => 
    !key.toLowerCase().includes('feedback') && 
    !key.startsWith('_') &&
    !['id', 'employee_email', 'employee_name', 'transcript', 'recommendations', 'created_at', 'updated_at', 'submitted_at'].includes(key.toLowerCase())
  );
  
  console.log('[ErrorDetails] ===== ERROR DETAILS DEBUG =====');
  console.log('[ErrorDetails] Total audit keys:', auditKeys.length);
  console.log('[ErrorDetails] Available feedback columns:', feedbackKeys.length > 0 ? feedbackKeys : 'none found');
  console.log('[ErrorDetails] Available parameter value columns (sample):', parameterValueKeys.slice(0, 15));
  
  if (feedbackKeys.length > 0) {
    // Log sample feedback values
    feedbackKeys.slice(0, 3).forEach(key => {
      const value = (audit as any)[key];
      console.log(`[ErrorDetails] Feedback "${key}":`, 
        value === null ? 'null' : 
        value === undefined ? 'undefined' : 
        typeof value === 'string' ? `string(${value.length} chars)` :
        Array.isArray(value) ? `array[${value.length}]` :
        typeof value
      );
    });
  }
  console.log('[ErrorDetails] Parameters count:', parameters.length);
  if (parameters.length > 0) {
    console.log('[ErrorDetails] First 3 parameter field_ids:', parameters.slice(0, 3).map(p => p.field_id));
    console.log('[ErrorDetails] Expected feedback keys:', parameters.slice(0, 3).map(p => `feedback_${p.field_id}`));
    
    // Try to match parameter field_ids to actual columns
    parameters.slice(0, 3).forEach(param => {
      const fieldId = param.field_id;
      const matchingValueCol = parameterValueKeys.find(k => 
        k.toLowerCase().includes(fieldId.toLowerCase()) || 
        fieldId.toLowerCase().includes(k.toLowerCase().replace('_', ''))
      );
      const matchingFeedbackCol = feedbackKeys.find(k => 
        k.toLowerCase().includes(fieldId.toLowerCase()) || 
        fieldId.toLowerCase().includes(k.toLowerCase().replace('feedback_', '').replace('_', ''))
      );
      console.log(`[ErrorDetails] Parameter "${fieldId}": value_col="${matchingValueCol || 'NOT FOUND'}", feedback_col="${matchingFeedbackCol || 'NOT FOUND'}"`);
    });
  }
  console.log('[ErrorDetails] ==============================');
  
  // Build error fields from parameters, or use fallback defaults
  let errorFields: Array<{
    key: string;
    label: string;
    feedback: string;
    severity: string;
    field_type: string;
    parameter_type: string;
    points: number;
  }>;
  
  if (parameters.length > 0) {
    // Get all available keys from audit data for dynamic matching
    const auditKeys = Object.keys(audit || {});
    const auditKeysLower = auditKeys.map(k => k.toLowerCase());
    
    errorFields = parameters.map(param => {
      const fieldId = param.field_id;
      const fieldIdLower = fieldId.toLowerCase();
      
      // Try to find matching parameter value column (might have different name than field_id)
      let matchingValueKey = auditKeys.find(k => {
        const kLower = k.toLowerCase();
        // Exact match
        if (kLower === fieldIdLower) return true;
        // Contains field_id
        if (kLower.includes(fieldIdLower) || fieldIdLower.includes(kLower.replace(/_/g, ''))) return true;
        // Try matching by removing common suffixes/prefixes
        const kClean = kLower.replace(/^(error_|count_|total_)/, '').replace(/_count$|_errors$/, '');
        const fieldIdClean = fieldIdLower.replace(/_deduction$|_error$/, '');
        if (kClean === fieldIdClean || kClean.includes(fieldIdClean) || fieldIdClean.includes(kClean)) return true;
        return false;
      });
      
      // Try to find matching feedback column
      let matchingFeedbackKey = auditKeys.find(k => {
        const kLower = k.toLowerCase();
        if (!kLower.includes('feedback')) return false;
        const kWithoutFeedback = kLower.replace('feedback_', '').replace('_', '');
        const fieldIdClean = fieldIdLower.replace(/_deduction$|_error$/, '').replace(/_/g, '');
        // Exact match after removing feedback prefix
        if (kWithoutFeedback === fieldIdLower) return true;
        // Contains field_id
        if (kWithoutFeedback.includes(fieldIdClean) || fieldIdClean.includes(kWithoutFeedback)) return true;
        return false;
      });
      
      // Use found keys or fallback to expected pattern
      const valueKey = matchingValueKey || fieldId;
      const feedbackKey = matchingFeedbackKey || `feedback_${fieldId}`;
      
      if (matchingValueKey && matchingValueKey !== fieldId) {
        console.log(`[ErrorDetails] Mapped parameter "${fieldId}" to value column "${matchingValueKey}"`);
      }
      if (matchingFeedbackKey && matchingFeedbackKey !== `feedback_${fieldId}`) {
        console.log(`[ErrorDetails] Mapped parameter "${fieldId}" to feedback column "${matchingFeedbackKey}"`);
      }
      
      return {
        key: valueKey, // Use actual column name from database
        label: param.error_name,
        feedback: feedbackKey, // Use actual feedback column name from database
        severity: param.error_category.includes('Fail') ? 'Critical Fail' : 
                 param.error_category.includes('Critical') ? 'Critical' : 
                 'Significant',
        field_type: param.field_type || 'counter',
        parameter_type: param.parameter_type || 'error',
        points: param.penalty_points || 0
      };
    });
  } else {
    // Fallback to default fields if no parameters loaded
    errorFields = [
      { key: 'revenue_or_policy_violation', label: 'Revenue or Policy Violation', feedback: 'feedback_revenue_or_policy_violation', severity: 'Critical Fail', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'confidentiality_breach', label: 'Confidentiality Breach', feedback: 'feedback_confidentiality_breach', severity: 'Critical Fail', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'unprofessional_conduct', label: 'Unprofessional Conduct', feedback: 'feedback_unprofessional_conduct', severity: 'Critical Fail', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'complete_resolution_before_closure', label: 'Incomplete Resolution Before Closure', feedback: 'feedback_complete_resolution_before_closure', severity: 'Critical', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'incorrect_misleading_information_non_revenue', label: 'Incorrect / Misleading Information (non-revenue)', feedback: 'feedback_incorrect_misleading_information_non_revenue', severity: 'Critical', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'operational_diligence', label: 'Operational Diligence', feedback: 'feedback_operational_diligence', severity: 'Critical', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'professional_and_empathetic_tone', label: 'Professional & Empathetic Tone', feedback: 'feedback_professional_and_empathetic_tone', severity: 'Significant', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'ownership_and_resolutionclarity', label: 'Ownership & Resolution Clarity', feedback: 'feedback_ownership_and_resolutionclarity', severity: 'Significant', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'clear_logical_communication', label: 'Clear & Logical Communication', feedback: 'feedback_clear_logical_communication', severity: 'Significant', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'brand_tone_and_etiquette', label: 'Brand Tone & Etiquette', feedback: 'feedback_brand_tone_and_etiquette', severity: 'Significant', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'reviewlink_sales_approach_post_positive_interaction', label: 'Review Link / Sales Approach Post-Positive Interaction', feedback: 'feedback_reviewlink_sales_approach_post_positive_interaction', severity: 'Minor', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'grammar_deduction', label: 'Grammar', feedback: 'feedback_grammar_deduction', severity: 'Minor', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'celebrate_achievements', label: 'Celebrate Achievements', feedback: 'feedback_celebrate_achievements', severity: 'Minor', field_type: 'counter', parameter_type: 'error', points: 0 },
      { key: 'missing_minimal_info', label: 'Missing Minimal Information', feedback: 'feedback_missing_minimal_info', severity: 'Significant', field_type: 'counter', parameter_type: 'error', points: 0 }
    ];
  }

  // Filter error parameters: only show error parameters that have values or feedback
  // For non-error parameters (achievements/bonus), always show them
  const filteredErrorFields = errorFields.filter(field => {
    // If it's not an error parameter, always show it
    if (field.parameter_type !== 'error') {
      return true;
    }
    
    // For error parameters, only show if they have a value > 0 OR have feedback
    const camelKey = field.key;
    const snakeKey = camelKey.replace(/([A-Z])/g, '_$1').toLowerCase();
    const rawValue = audit[camelKey] ?? audit[snakeKey] ?? (audit as any)[camelKey] ?? (audit as any)[snakeKey];
    const count = rawValue ? parseInt(String(rawValue)) : 0;
    
    // Check if there's feedback
    const feedbackKey = field.feedback;
    const feedbackData = (audit as any)[feedbackKey] ?? 
                         (audit as any)[feedbackKey.replace(/([A-Z])/g, '_$1').toLowerCase()];
    const hasFeedback = feedbackData && (
      (typeof feedbackData === 'string' && feedbackData.trim()) ||
      (Array.isArray(feedbackData) && feedbackData.some(f => f && String(f).trim()))
    );
    
    // Show if count > 0 OR has feedback
    return count > 0 || hasFeedback;
  });
  
  // Calculate totals from filtered error fields
  let criticalFailTotal = 0;
  let criticalTotal = 0;
  let significantTotal = 0;
  
  filteredErrorFields.forEach(field => {
    // Try both camelCase and snake_case field names
    const camelKey = field.key;
    const snakeKey = camelKey.replace(/([A-Z])/g, '_$1').toLowerCase();
    const rawValue = audit[camelKey] ?? audit[snakeKey] ?? (audit as any)[camelKey] ?? (audit as any)[snakeKey];
    const count = rawValue ? parseInt(String(rawValue)) : 0;
    if (count > 0) {
      if (field.severity === 'Critical Fail') {
        criticalFailTotal += count;
      } else if (field.severity === 'Critical') {
        criticalTotal += count;
      } else if (field.severity === 'Significant') {
        significantTotal += count;
      }
    }
  });
  
  const errorRows = filteredErrorFields.map(field => {
    // Try both camelCase and snake_case field names for parameter values
    const camelKey = field.key;
    const snakeKey = camelKey.replace(/([A-Z])/g, '_$1').toLowerCase();
    const rawValue = audit[camelKey] ?? audit[snakeKey] ?? (audit as any)[camelKey] ?? (audit as any)[snakeKey];
    let displayValue = '';
    let count = 0;
    
    if (field.field_type === 'radio') {
      const isYes = rawValue === 1 || rawValue === true || rawValue === 'true' || rawValue === '1';
      displayValue = isYes ? '✓ YES' : '✗ NO';
      count = isYes ? 1 : 0;
    } else {
      count = rawValue ? parseInt(String(rawValue)) : 0;
      displayValue = count.toString();
    }
    
    // Try multiple variations of feedback key to find the feedback data
    // Feedback keys are typically stored as: feedback_${field_id} (snake_case)
    const feedbackKey = field.feedback; // e.g., "feedback_revenue_or_policy_violation"
    
    // Get all keys from audit object for case-insensitive search
    const auditKeys = Object.keys(audit || {});
    const auditKeysLower = auditKeys.map(k => k.toLowerCase());
    
    // Try direct access first (most common)
    let feedbackData = (audit as any)[feedbackKey];
    
    // If not found, try case-insensitive search
    if (!feedbackData) {
      const feedbackKeyLower = feedbackKey.toLowerCase();
      const matchingKey = auditKeys.find(k => k.toLowerCase() === feedbackKeyLower);
      if (matchingKey) {
        feedbackData = (audit as any)[matchingKey];
      }
    }
    
    // If still not found, try snake_case variations
    if (!feedbackData) {
      const feedbackSnakeKey = feedbackKey.replace(/([A-Z])/g, '_$1').toLowerCase();
      feedbackData = (audit as any)[feedbackSnakeKey];
      if (!feedbackData) {
        const matchingKey = auditKeys.find(k => k.toLowerCase() === feedbackSnakeKey.toLowerCase());
        if (matchingKey) {
          feedbackData = (audit as any)[matchingKey];
        }
      }
    }
    
    // If still not found, try accessing via field key pattern
    if (!feedbackData && field.key) {
      const fieldKeySnake = field.key.replace(/([A-Z])/g, '_$1').toLowerCase();
      const alternativeFeedbackKey = `feedback_${fieldKeySnake}`;
      feedbackData = (audit as any)[alternativeFeedbackKey];
      if (!feedbackData) {
        const matchingKey = auditKeys.find(k => k.toLowerCase() === alternativeFeedbackKey.toLowerCase());
        if (matchingKey) {
          feedbackData = (audit as any)[matchingKey];
        }
      }
    }
    
    // Also try camelCase version
    if (!feedbackData && field.key) {
      const alternativeFeedbackKeyCamel = `feedback${field.key.charAt(0).toUpperCase() + field.key.slice(1)}`;
      feedbackData = (audit as any)[alternativeFeedbackKeyCamel];
      if (!feedbackData) {
        const matchingKey = auditKeys.find(k => k.toLowerCase() === alternativeFeedbackKeyCamel.toLowerCase());
        if (matchingKey) {
          feedbackData = (audit as any)[matchingKey];
        }
      }
    }
    
    // Last resort: search for any column that contains the field_id and "feedback"
    if (!feedbackData && field.key) {
      const fieldIdLower = field.key.toLowerCase();
      const matchingFeedbackKey = auditKeys.find(k => {
        const kLower = k.toLowerCase();
        return kLower.includes('feedback') && kLower.includes(fieldIdLower);
      });
      if (matchingFeedbackKey) {
        feedbackData = (audit as any)[matchingFeedbackKey];
        console.log(`[ErrorDetails] Found feedback via fuzzy search: "${matchingFeedbackKey}" for field "${field.key}"`);
      }
    }
    
    let feedback = '-';
    
    // Handle feedback - support both old format (string) and new format (JSON array)
    if (feedbackData) {
      if (typeof feedbackData === 'string') {
        // Try to parse as JSON array, fallback to single string
        try {
          const parsed = JSON.parse(feedbackData);
          if (Array.isArray(parsed)) {
            // Filter out empty feedbacks and join with separator
            const filtered = parsed.filter(f => f && String(f).trim());
            feedback = filtered.length > 0 ? filtered.join('\n\n---\n\n') : '-';
          } else if (parsed && String(parsed).trim()) {
            feedback = String(parsed);
          }
        } catch (e) {
          // If not valid JSON, treat as single string (backward compatibility)
          if (feedbackData.trim()) {
            feedback = feedbackData;
          }
        }
      } else if (Array.isArray(feedbackData)) {
        // Already an array - filter and join
        const filtered = feedbackData.filter(f => f && String(f).trim());
        feedback = filtered.length > 0 ? filtered.join('\n\n---\n\n') : '-';
      } else if (feedbackData && String(feedbackData).trim()) {
        feedback = String(feedbackData);
      }
    }
    
    // Debug logging for first few fields to help troubleshoot
    if (filteredErrorFields.indexOf(field) < 3) {
      console.log(`[ErrorDetails] Field: ${field.key}, FeedbackKey: ${feedbackKey}, Found: ${!!feedbackData}, Value: ${feedback !== '-' ? 'has feedback' : 'no feedback'}`);
    }
    
    let severityColor = '#3b82f6';
    let severityBg = '#eff6ff';
    let paramIcon = '';
    
    if (field.parameter_type === 'error') {
      paramIcon = '−';
      if (field.severity === 'Critical Fail') {
        severityColor = '#ef4444';
        severityBg = '#fee2e2';
      } else if (field.severity === 'Critical') {
        severityColor = '#f59e0b';
        severityBg = '#fef3c7';
      }
    } else if (field.parameter_type === 'achievement' || field.parameter_type === 'bonus') {
      paramIcon = '+';
      severityColor = '#10b981';
      severityBg = '#d1fae5';
    }
    
    return `
      <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 3fr; gap: 0.75rem; align-items: center; padding: 0.375rem 0; border-bottom: 0.0469rem solid ${isDarkMode ? 'var(--border-light)' : '#f3f4f6'};">
        <div style="font-size: 0.6562rem; color: ${isDarkMode ? 'var(--text-color)' : '#1f2937'}; font-weight: 600; font-family: 'Poppins', sans-serif;">
          <span style="font-weight: 700; color: ${field.parameter_type === 'error' ? '#dc2626' : '#10b981'};">${escapeHtml(paramIcon)}</span> ${escapeHtml(field.label)}
          <span style="font-size: 0.5156rem; color: ${isDarkMode ? 'var(--text-muted)' : '#6b7280'}; font-weight: 400;"> (${field.points} pts)</span>
        </div>
        <div style="display: flex; justify-content: center;">
          <span style="background: ${severityBg}; color: ${severityColor}; padding: 0.1875rem 0.5625rem; border-radius: 0.2812rem; font-size: 0.5625rem; font-weight: 600; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem;">${(field.parameter_type === 'achievement' || field.parameter_type === 'bonus') && field.field_type !== 'radio' ? 'ACHIEVEMENT' : field.severity}</span>
        </div>
        <div style="font-size: 0.6562rem; color: ${isDarkMode ? 'var(--text-color)' : '#1f2937'}; text-align: center; font-weight: 700; font-family: 'Poppins', sans-serif;">${escapeHtml(displayValue)}</div>
        <div style="font-size: 0.6562rem; color: ${isDarkMode ? 'var(--text-secondary)' : '#4b5563'}; font-family: 'Poppins', sans-serif; white-space: pre-wrap; line-height: 1.6;">${escapeHtml(feedback)}</div>
      </div>
    `;
  }).join('');
  
  return `
    <div style="background: ${isDarkMode ? 'var(--background-white)' : '#f9fafb'}; border-radius: 0.375rem; padding: 0.75rem; margin-bottom: 0.75rem; border: 0.0352rem solid ${isDarkMode ? 'var(--border-light)' : '#e5e7eb'};">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5625rem;">
        <h3 style="font-size: 0.7031rem; font-weight: 600; color: #1A733E; margin: 0; font-family: 'Poppins', sans-serif; display: flex; align-items: center; gap: 0.375rem;">
          <svg style="width: 0.8438rem; height: 0.8438rem;" viewBox="0 0 24 24" fill="#1A733E"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          Error Details
        </h3>
        <div style="display: flex; gap: 0.2812rem;">
          <span style="background: #dc2626; color: #ffffff; padding: 0.1875rem 0.375rem; border-radius: 351.5273rem; font-size: 0.5156rem; font-weight: 700; font-family: 'Poppins', sans-serif; white-space: nowrap;">Critical Fail: ${criticalFailTotal}</span>
          <span style="background: #f59e0b; color: #ffffff; padding: 0.1875rem 0.375rem; border-radius: 351.5273rem; font-size: 0.5156rem; font-weight: 700; font-family: 'Poppins', sans-serif; white-space: nowrap;">Critical: ${criticalTotal}</span>
          <span style="background: #3b82f6; color: #ffffff; padding: 0.1875rem 0.375rem; border-radius: 351.5273rem; font-size: 0.5156rem; font-weight: 700; font-family: 'Poppins', sans-serif; white-space: nowrap;">Significant: ${significantTotal}</span>
        </div>
      </div>
      
      <div class="error-table-container" style="background: ${isDarkMode ? 'var(--background-white)' : 'white'}; border-radius: 0.5625rem; box-shadow: 0 0.0469rem 0.1406rem 0 rgba(0, 0, 0, 0.1); overflow: hidden; margin-bottom: 0.75rem;">
        <div class="error-table-header" style="background-color: ${isDarkMode ? 'var(--background-white)' : '#f8f9fa'}; padding: 0.5625rem 0.75rem; border-bottom: 0.0469rem solid ${isDarkMode ? 'var(--border-light)' : '#e5e7eb'};">
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 3fr; gap: 0.75rem; align-items: center; font-weight: 700; font-size: 0.6562rem; color: ${isDarkMode ? 'var(--text-color)' : '#1f2937'}; text-transform: uppercase; letter-spacing: 0.05em;">
            <div>Error Type</div>
            <div style="text-align: center;">Severity</div>
            <div style="text-align: center;">Status</div>
            <div>Feedback</div>
          </div>
        </div>
        <div class="error-table-body" style="padding: 0 0.75rem 0.75rem 0.75rem; box-shadow: 0 -0.0703rem 0.1406rem rgba(0, 0, 0, 0.05); background: ${isDarkMode ? 'var(--background-white)' : 'transparent'};">
          ${errorRows}
        </div>
      </div>
      
      <!-- Pre/Post Status -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.3281rem, 1fr)); gap: 0.5625rem;">
        <div style="background: #f0fdf4; padding: 0.5625rem; border-radius: 0.2812rem; border: 0.0352rem solid #bbf7d0;">
          <p style="font-size: 0.5156rem; color: #166534; margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem; font-weight: 600;">Pre-Status</p>
          <p style="font-size: 0.6562rem; color: #15803d; margin: 0; font-family: 'Poppins', sans-serif; font-weight: 600;">${escapeHtml(audit.agentPreStatus || 'N/A')}</p>
        </div>
        <div style="background: #f0f9ff; padding: 0.5625rem; border-radius: 0.2812rem; border: 0.0352rem solid #bae6fd;">
          <p style="font-size: 0.5156rem; color: #075985; margin: 0 0 0.1875rem 0; font-family: 'Poppins', sans-serif; text-transform: uppercase; letter-spacing: 0.0175rem; font-weight: 600;">Post-Status</p>
          <p style="font-size: 0.6562rem; color: #0369a1; margin: 0; font-family: 'Poppins', sans-serif; font-weight: 600;">${escapeHtml(audit.agentPostStatus || 'N/A')}</p>
        </div>
      </div>
    </div>
  `;
}

