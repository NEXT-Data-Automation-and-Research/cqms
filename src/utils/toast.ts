/**
 * Toast Notification Utility
 * Provides consistent toast notifications across the application
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number; // in milliseconds
}

/**
 * Show a toast notification
 */
export function showToast(options: ToastOptions | string): void {
  const opts: ToastOptions = typeof options === 'string' 
    ? { message: options, type: 'info' }
    : options;

  const { message, type = 'info', duration = 3000 } = opts;

  // Remove any existing toasts
  const existingToasts = document.querySelectorAll('.toast-notification');
  existingToasts.forEach(toast => toast.remove());

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  
  const colors = {
    success: { bg: '#10b981', text: 'white' },
    error: { bg: '#ef4444', text: 'white' },
    warning: { bg: '#f59e0b', text: 'white' },
    info: { bg: '#3b82f6', text: 'white' }
  };

  const color = colors[type];

  toast.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: ${color.bg};
    color: ${color.text};
    padding: 1rem 1.25rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    font-size: 0.9375rem;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    max-width: 420px;
    animation: slideIn 0.3s ease-out;
    pointer-events: auto;
  `;
  
  console.log('[Toast] Created toast element:', message);

  toast.textContent = message;

  // Add animation styles if not already present
  if (!document.querySelector('#toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(toast);
  console.log('[Toast] Appended to body, should be visible at top-right');

  // Auto-remove after duration
  setTimeout(() => {
    console.log('[Toast] Removing toast after', duration, 'ms');
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
