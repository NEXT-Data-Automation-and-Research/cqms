/**
 * View Scorecard Modal
 * Read-only display of scorecard details and parameters
 */

import { safeSetHTML } from '../../../../../utils/html-sanitizer.js';
import { escapeHtml } from '../../../../../utils/html-sanitizer.js';
import type { Scorecard, ScorecardParameter } from '../../domain/entities.js';

export class ViewScorecardModal {
  private modal: HTMLElement | null = null;

  constructor() {
    this.modal = document.getElementById('viewScorecardModal');
  }

  /**
   * Open view modal with scorecard and parameters
   */
  open(scorecard: Scorecard, parameters: ScorecardParameter[]): void {
    if (!this.modal) return;

    const channelsList = (scorecard.channels || '')
      .split(',')
      .map((ch) => ch.trim())
      .filter(Boolean);
    const channelsHtml = channelsList.length
      ? channelsList
          .map(
            (ch) =>
              `<span style="background: #1A733E; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 500;">${escapeHtml(ch)}</span>`
          )
          .join(' ')
      : '<span style="color: #6b7280; font-size: 0.875rem;">None</span>';

    const parametersHtml = parameters
      .map(
        (param) => `
        <div style="padding: 0.5rem 0.75rem; background: white; border: 0.0625rem solid #e5e7eb; border-radius: 0.375rem; margin-bottom: 0.375rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.25rem;">
            <strong style="color: #1A733E; font-size: 0.875rem; font-weight: 600; line-height: 1.35;">${escapeHtml(param.error_name)}</strong>
            <span style="background: #1A733E; color: white; padding: 0.1875rem 0.375rem; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; flex-shrink: 0;">−${param.penalty_points} pts</span>
          </div>
          ${param.description ? `<div style="font-size: 0.8125rem; color: #4b5563; margin-bottom: 0.375rem; font-style: italic; white-space: pre-wrap; line-height: 1.45;">${escapeHtml(param.description)}</div>` : ''}
          <div style="font-size: 0.75rem; color: #6b7280; display: flex; gap: 0.375rem; align-items: center; flex-wrap: wrap;">
            <span>${escapeHtml(param.error_category)}</span>
            <span aria-hidden="true">·</span>
            <code style="background: #f3f4f6; padding: 0.125rem 0.25rem; border-radius: 0.1875rem; font-size: 0.75rem; color: #374151;">${escapeHtml(param.field_id)}</code>
            ${param.enable_ai_audit ? '<span style="background: #1A733E; color: white; padding: 0.125rem 0.25rem; border-radius: 0.1875rem; font-size: 0.6875rem; font-weight: 500;">AI</span>' : ''}
          </div>
          ${param.enable_ai_audit && param.prompt ? `
          <div style="padding: 0.375rem 0.5rem; background: #f0fdf4; border: 0.0625rem solid #86efac; border-radius: 0.25rem; margin-top: 0.375rem;">
            <div style="font-size: 0.6875rem; color: #166534; font-weight: 600; margin-bottom: 0.125rem;">AI Prompt</div>
            <div style="font-size: 0.75rem; color: #166534; white-space: pre-wrap; line-height: 1.45;">${escapeHtml(param.prompt || '')}</div>
          </div>
          ` : ''}
        </div>
      `
      )
      .join('');

    const html = `
      <div class="modal-content view-scorecard-modal-content" style="max-width: 95vw; width: 95vw; max-width: 90rem; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.75rem; border-bottom: 0.0625rem solid #e5e7eb; background: #f9fafb; flex-shrink: 0;">
          <h2 id="viewModalTitle" style="font-size: 1.125rem; font-weight: 600; color: #1A733E; margin: 0; line-height: 1.3;">${escapeHtml(scorecard.name)}</h2>
          <button type="button" id="viewScorecardModalClose" class="modal-close" style="font-size: 1.25rem; width: 1.75rem; height: 1.75rem;" title="Close">&times;</button>
        </div>
        <div id="viewModalBody" style="padding: 0.75rem 1rem; overflow-y: auto; flex: 1; min-height: 0;">
          <p style="margin: 0 0 0.75rem; color: #4b5563; font-size: 0.8125rem; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(scorecard.description || 'No description provided')}</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr)); gap: 0.5rem 1rem; margin-bottom: 0.75rem; padding: 0.5rem 0.75rem; background: #f9fafb; border-radius: 0.375rem; border: 0.0625rem solid #e5e7eb;">
            <div>
              <p style="font-size: 0.6875rem; color: #6b7280; margin: 0 0 0.125rem; text-transform: uppercase; letter-spacing: 0.02em;">Passing</p>
              <p style="font-size: 1rem; font-weight: 700; color: #1A733E; margin: 0;">${scorecard.passing_threshold ?? 0}%</p>
            </div>
            <div>
              <p style="font-size: 0.6875rem; color: #6b7280; margin: 0 0 0.125rem; text-transform: uppercase; letter-spacing: 0.02em;">Version</p>
              <p style="font-size: 1rem; font-weight: 700; color: #374151; margin: 0;">v${scorecard.version ?? 1}</p>
            </div>
            <div>
              <p style="font-size: 0.6875rem; color: #6b7280; margin: 0 0 0.125rem; text-transform: uppercase; letter-spacing: 0.02em;">Table</p>
              <code style="font-size: 0.8125rem; font-weight: 500; color: #374151; background: white; padding: 0.125rem 0.25rem; border-radius: 0.1875rem; border: 0.0625rem solid #e5e7eb;">${escapeHtml(scorecard.table_name)}</code>
            </div>
            <div>
              <p style="font-size: 0.6875rem; color: #6b7280; margin: 0 0 0.125rem; text-transform: uppercase; letter-spacing: 0.02em;">Channels</p>
              <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">${channelsHtml}</div>
            </div>
          </div>
          <h4 style="font-size: 0.875rem; font-weight: 600; color: #374151; margin: 0 0 0.5rem; padding-bottom: 0.375rem; border-bottom: 0.0625rem solid #e5e7eb;">
            Error Parameters <span style="color: #6b7280; font-weight: 400;">(${parameters.length})</span>
          </h4>
          <div>${parametersHtml}</div>
        </div>
      </div>
    `;

    safeSetHTML(this.modal, html);
    this.attachCloseListeners();
    this.modal.classList.add('active');
  }

  /**
   * Close modal
   */
  close(): void {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  private attachCloseListeners(): void {
    const closeBtn = document.getElementById('viewScorecardModalClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }
    if (this.modal) {
      const onOverlayClick = (e: Event) => {
        if ((e.target as HTMLElement) === this.modal) {
          this.close();
        }
      };
      this.modal.addEventListener('click', onOverlayClick);
    }
  }
}
