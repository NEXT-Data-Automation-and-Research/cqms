/**
 * Loading Overlay Utility
 * Provides consistent loading state UI across the application
 */

/**
 * Show a full-page loading overlay
 */
export function showLoadingOverlay(message: string = 'Loading...'): void {
  // Remove any existing overlay first
  hideLoadingOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 3rem;
    height: 3rem;
    border: 0.25rem solid rgba(255, 255, 255, 0.3);
    border-top-color: #1A733E;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  `;

  const text = document.createElement('p');
  text.textContent = message;
  text.style.cssText = `
    color: white;
    font-size: 1rem;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    margin: 0;
  `;

  // Add spin animation if not already present
  if (!document.querySelector('#loading-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'loading-spinner-style';
    style.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
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
