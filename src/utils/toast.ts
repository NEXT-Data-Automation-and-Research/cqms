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
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    z-index: 10000;
    font-size: 0.875rem;
    font-family: 'Poppins', sans-serif;
    font-weight: 500;
    max-width: 400px;
    animation: slideIn 0.3s ease-out;
  `;

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

  // Auto-remove after duration
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
