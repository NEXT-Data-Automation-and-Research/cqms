/**
 * Loading State Utility
 * M1 FIX: Standardized loading state component
 * Updated to match the green theme and structure
 */

import { escapeHtml } from './html-sanitizer.js';

/**
 * Render a standardized loading state
 */
export function renderLoadingState(message: string = 'Loading...'): string {
  return `
    <div class="loading-state" style="text-align: center; padding: 3rem;">
      <div class="spinner" style="width: 3.5rem; height: 3.5rem; border: 0.375rem solid rgba(26, 115, 62, 0.2); border-top-color: #1a733e; border-right-color: #2d8f5a; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1.5rem; position: relative;"></div>
      <p style="font-size: 1rem; color: var(--color-text-secondary, #6b7280); margin: 0; font-family: var(--font-family-primary, 'Poppins', sans-serif); font-weight: 500; letter-spacing: 0.025em;">${escapeHtml(message)}</p>
    </div>
    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      .loading-state .spinner::before {
        content: '';
        position: absolute;
        top: -0.375rem;
        left: -0.375rem;
        right: -0.375rem;
        bottom: -0.375rem;
        border-radius: 50%;
        border: 0.375rem solid transparent;
        border-top-color: rgba(26, 115, 62, 0.4);
        animation: spin 1.2s linear infinite reverse;
      }
      [data-theme="dark"] .loading-state .spinner,
      .dark .loading-state .spinner {
        border-color: rgba(45, 143, 90, 0.25);
        border-top-color: #2d8f5a;
        border-right-color: #3a9d61;
      }
      [data-theme="dark"] .loading-state .spinner::before,
      .dark .loading-state .spinner::before {
        border-top-color: rgba(45, 143, 90, 0.5);
      }
      [data-theme="dark"] .loading-state p,
      .dark .loading-state p {
        color: var(--color-text-secondary, #d1d5db);
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
