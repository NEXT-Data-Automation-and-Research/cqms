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
    errorFields = parameters.map(param => ({
      key: param.field_id,
      label: param.error_name,
      feedback: `feedback_${param.field_id}`,
      severity: param.error_category.includes('Fail') ? 'Critical Fail' : 
               param.error_category.includes('Critical') ? 'Critical' : 
               'Significant',
      field_type: param.field_type || 'counter',
      parameter_type: param.parameter_type || 'error',
      points: param.penalty_points || 0
    }));
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

  // Calculate totals
  let criticalFailTotal = 0;
  let criticalTotal = 0;
  let significantTotal = 0;
  
  errorFields.forEach(field => {
    const count = audit[field.key] ? parseInt(String(audit[field.key])) : 0;
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
  
  const errorRows = errorFields.map(field => {
    const rawValue = audit[field.key];
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
    
    const feedbackKey = field.feedback;
    const feedback = audit[feedbackKey] && String(audit[feedbackKey]).trim() ? String(audit[feedbackKey]) : '-';
    
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

