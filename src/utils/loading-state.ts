/**
 * Loading State Utility
 * M1 FIX: Standardized loading state component
 */

import { escapeHtml } from './html-sanitizer.js';

/**
 * Render a standardized loading state
 */
export function renderLoadingState(message: string = 'Loading...'): string {
  return `
    <div class="loading-state" style="text-align: center; padding: 3rem;">
      <div class="spinner" style="width: 3rem; height: 3rem; border: 0.25rem solid rgba(26, 115, 62, 0.2); border-top-color: #1A733E; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
      <p style="font-size: 0.875rem; color: #6b7280; margin: 0;">${escapeHtml(message)}</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
}

/**
 * Render a standardized error state with retry button
 */
export function renderErrorState(message: string, retryCallback?: () => void): string {
  const retryButton = retryCallback
    ? `<button onclick="(${retryCallback.toString()})()" 
                style="padding: 0.75rem 1.5rem; background-color: #1A733E; color: white; border: none; border-radius: 0.375rem; font-weight: 500; cursor: pointer; margin-top: 1rem;">
         Retry
       </button>`
    : '';

  return `
    <div class="error-state" style="text-align: center; padding: 2rem; max-width: 600px; margin: 0 auto;">
      <div style="margin-bottom: 1.5rem;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #ef4444; margin: 0 auto;">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      </div>
      <h3 style="font-size: 1.25rem; font-weight: 600; color: #1f2937; margin-bottom: 0.75rem;">Error</h3>
      <p style="font-size: 0.875rem; color: #6b7280; margin-bottom: 1.5rem;">${escapeHtml(message)}</p>
      ${retryButton}
    </div>
  `;
}
