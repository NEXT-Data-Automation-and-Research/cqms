/**
 * Loading Overlay Utility
 * Provides consistent loading state UI across the application
 * Updated to match the green theme and structure
 */

/**
 * Show a full-page loading overlay
 */
export function showLoadingOverlay(message: string = 'Loading...'): void {
  // Remove any existing overlay first
  hideLoadingOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.className = 'loading-overlay';
  
  // Use CSS classes instead of inline styles for better theme integration
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  `;

  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  spinner.style.cssText = `
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 1.5rem;
  `;

  const text = document.createElement('p');
  text.className = 'loading-text';
  text.textContent = message;
  text.style.cssText = `
    font-size: 1rem;
    font-family: var(--font-family-primary, 'Poppins', sans-serif);
    font-weight: 500;
    margin: 0;
    letter-spacing: 0.025em;
  `;

  // Add comprehensive styles for theme integration
  if (!document.querySelector('#loading-overlay-styles')) {
    const style = document.createElement('style');
    style.id = 'loading-overlay-styles';
    style.textContent = `
      /* Loading Overlay Styles - Green Theme Integrated */
      .loading-overlay {
        background: rgba(17, 24, 39, 0.85);
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }

      [data-theme="dark"] .loading-overlay,
      .dark .loading-overlay {
        background: rgba(17, 24, 39, 0.92);
      }

      .loading-spinner {
        border: 0.375rem solid rgba(26, 115, 62, 0.2);
        border-top-color: #1a733e;
        border-right-color: #2d8f5a;
        position: relative;
      }

      .loading-spinner::before {
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

      [data-theme="dark"] .loading-spinner,
      .dark .loading-spinner {
        border-color: rgba(45, 143, 90, 0.25);
        border-top-color: #2d8f5a;
        border-right-color: #3a9d61;
      }

      [data-theme="dark"] .loading-spinner::before,
      .dark .loading-spinner::before {
        border-top-color: rgba(45, 143, 90, 0.5);
      }

      .loading-text {
        color: #f9fafb;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }

      [data-theme="dark"] .loading-text,
      .dark .loading-text {
        color: #e5e7eb;
        text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      /* Smooth fade-in animation */
      .loading-overlay {
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  overlay.appendChild(spinner);
  overlay.appendChild(text);
  document.body.appendChild(overlay);
}

/**
 * Hide the loading overlay
 */
export function hideLoadingOverlay(): void {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.remove();
  }
}
