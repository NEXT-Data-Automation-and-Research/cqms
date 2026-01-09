/**
 * HTML Utilities
 * Safe HTML rendering functions
 */

import { escapeHtml, safeSetHTML } from '../../../../../utils/html-sanitizer.js';

/**
 * Escape HTML to prevent XSS
 */
export function escape(text: string | null | undefined): string {
  return escapeHtml(text);
}

/**
 * Safely set HTML content
 */
export function setHTML(element: HTMLElement | null, html: string): void {
  safeSetHTML(element, html);
}

/**
 * Create a safe HTML string for scorecard row
 */
export function createScorecardRowHTML(scorecard: any): string {
  const statusBadge = scorecard.is_active 
    ? '<span class="status-badge status-active">Active</span>'
    : '<span class="status-badge status-inactive">Inactive</span>';
  
  const versionBadge = scorecard.version && scorecard.version > 1 
    ? `<span class="version-badge">v${scorecard.version}</span>`
    : '<span class="version-badge version-badge-v1">v1</span>';
  
  const createdDate = scorecard.created_at ? new Date(scorecard.created_at).toLocaleDateString() : 'N/A';
  
  const scoringTypeLabels: Record<string, string> = {
    'deductive': 'Deductive',
    'additive': 'Additive',
    'hybrid': 'Hybrid'
  };
  const scoringTypeColors: Record<string, string> = {
    'deductive': '#ef4444',
    'additive': '#10b981',
    'hybrid': '#3b82f6'
  };
  const scoringTypeLabel = scoringTypeLabels[scorecard.scoring_type || 'deductive'] || 'Deductive';
  const scoringTypeColor = scoringTypeColors[scorecard.scoring_type || 'deductive'] || '#6b7280';
  
  // ✅ SECURITY: Use data attributes instead of onclick (CSP-safe)
  const deleteButton = (scorecard.audit_count === 0 || typeof scorecard.audit_count === 'undefined')
    ? `<button data-action="delete" data-scorecard-id="${escape(scorecard.id)}" data-table-name="${escape(scorecard.table_name)}" class="btn-action btn-action-danger" title="Delete Scorecard">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>`
    : `<button data-action="cannot-delete" data-scorecard-name="${escape(scorecard.name)}" data-audit-count="${scorecard.audit_count}" class="btn-action" style="background-color: #f3f4f6; color: #9ca3af; cursor: not-allowed;" title="Cannot delete: Contains ${scorecard.audit_count} audit report(s)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="5" y="11" width="14" height="10" rx="2" ry="2"/>
          <path d="M12 17a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
          <path d="M8 11V7a4 4 0 0 1 8 0v4"/>
        </svg>
      </button>`;
  
  return `
    <tr>
      <td>
        <div style="font-weight: 600; color: #1A733E; font-size: 0.875rem;">${escape(scorecard.name)}</div>
      </td>
      <td>
        <span style="display: inline-flex; align-items: center; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; background-color: ${scoringTypeColor}15; color: ${scoringTypeColor}; text-transform: uppercase; letter-spacing: 0.05em;">
          ${scoringTypeLabel}
        </span>
      </td>
      <td>
        <code style="font-size: 0.75rem; background: #f3f4f6; padding: 0.1875rem 0.375rem; border-radius: 0.25rem; color: #374151; font-family: 'Courier New', monospace;">${escape(scorecard.table_name)}</code>
      </td>
      <td>
        <span style="font-weight: 600; color: #374151; font-size: 0.875rem;">${scorecard.passing_threshold}%</span>
      </td>
      <td style="text-align: center;">
        <span style="display: inline-flex; align-items: center; justify-content: center; padding: 0.1875rem 0.5rem; border-radius: 0.25rem; font-size: 0.875rem; font-weight: 600; ${scorecard.audit_count > 0 ? 'background-color: #dbeafe; color: #1e40af;' : 'background-color: #f3f4f6; color: #6b7280;'}">
          ${scorecard.audit_count || 0}
        </span>
      </td>
      <td style="text-align: center;">${versionBadge}</td>
      <td style="text-align: center;">${statusBadge}</td>
      <td style="font-size: 0.875rem; color: #6b7280; text-align: left;">${createdDate}</td>
      <td style="text-align: center;">
        <div style="display: flex; gap: 0.25rem; justify-content: center; align-items: center;">
          <button data-action="view" data-scorecard-id="${escape(scorecard.id)}" class="btn-action" title="View Details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button data-action="edit" data-scorecard-id="${escape(scorecard.id)}" class="btn-action btn-action-primary" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button data-action="toggle-status" data-scorecard-id="${escape(scorecard.id)}" data-new-status="${String(!scorecard.is_active)}" class="btn-action ${scorecard.is_active ? 'btn-action-success' : ''}" title="${scorecard.is_active ? 'Deactivate' : 'Activate'}">
            ${scorecard.is_active 
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>'
            }
          </button>
          ${deleteButton}
        </div>
      </td>
    </tr>
  `;
}

