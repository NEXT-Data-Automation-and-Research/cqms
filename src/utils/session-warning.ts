/**
 * Session Warning Utility
 * Warns users before session expires and handles auto-save
 */

import { getSupabase } from './supabase-init.js';
import { logInfo, logWarn } from './logging-helper.js';

let warningShown = false;
let warningInterval: number | null = null;
let expiryCheckInterval: number | null = null;

/**
 * Show session expiry warning
 */
function showSessionWarning(): void {
  if (warningShown) return;
  warningShown = true;

  // Create warning banner
  const banner = document.createElement('div');
  banner.id = 'session-warning-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #fef3c7;
    border-bottom: 2px solid #f59e0b;
    padding: 1rem;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  `;

  const icon = document.createElement('div');
  icon.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  `;

  const message = document.createElement('div');
  message.style.cssText = 'flex: 1; text-align: center;';
  message.innerHTML = `
    <strong style="color: #92400e;">Your session will expire in 2 minutes.</strong>
    <span style="color: #78350f; margin-left: 0.5rem;">Please save your work.</span>
  `;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '×';
  closeBtn.style.cssText = `
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #92400e;
    cursor: pointer;
    padding: 0 0.5rem;
    line-height: 1;
  `;
  closeBtn.onclick = () => {
    banner.remove();
    warningShown = false;
  };

  banner.appendChild(icon);
  banner.appendChild(message);
  banner.appendChild(closeBtn);
  document.body.appendChild(banner);

  // Add padding to body to account for banner
  document.body.style.paddingTop = '60px';
}

/**
 * Auto-save form data to localStorage
 */
function autoSaveFormData(): void {
  try {
    const forms = document.querySelectorAll('form');
    const formData: Record<string, any> = {};

    forms.forEach((form, index) => {
      const formId = form.id || `form-${index}`;
      const inputs = form.querySelectorAll('input, textarea, select');
      const data: Record<string, any> = {};

      inputs.forEach((input) => {
        const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (element.name || element.id) {
          const key = element.name || element.id;
          if (key) {
            if (element.type === 'checkbox') {
              data[key] = (element as HTMLInputElement).checked;
            } else {
              data[key] = element.value;
            }
          }
        }
      });

      if (Object.keys(data).length > 0) {
        formData[formId] = data;
      }
    });

    if (Object.keys(formData).length > 0) {
      localStorage.setItem('autoSavedFormData', JSON.stringify({
        timestamp: Date.now(),
        data: formData,
        page: window.location.pathname
      }));
      logInfo('[SessionWarning] Form data auto-saved');
    }
  } catch (error) {
    logWarn('[SessionWarning] Failed to auto-save form data:', error);
  }
}

/**
 * Start monitoring session expiry
 */
export function startSessionMonitoring(): void {
  if (expiryCheckInterval) return; // Already monitoring

  expiryCheckInterval = window.setInterval(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session }, error }: { data: { session: any }, error: any }) => {
      if (error || !session) return;

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;

      // Warn 2 minutes before expiry (120 seconds)
      if (timeUntilExpiry < 120 && timeUntilExpiry > 60 && !warningShown) {
        showSessionWarning();
      }
    });
  }, 30000); // Check every 30 seconds
}

/**
 * Stop monitoring session expiry
 */
export function stopSessionMonitoring(): void {
  if (expiryCheckInterval) {
    clearInterval(expiryCheckInterval);
    expiryCheckInterval = null;
  }
  if (warningInterval) {
    clearInterval(warningInterval);
    warningInterval = null;
  }
  warningShown = false;

  // Remove banner if present
  const banner = document.getElementById('session-warning-banner');
  if (banner) {
    banner.remove();
    document.body.style.paddingTop = '';
  }
}

/**
 * Handle session expiry with auto-save
 */
export function handleSessionExpiry(): void {
  autoSaveFormData();

  // Show message
  const message = document.createElement('div');
  message.id = 'session-expiry-message';
  message.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 2rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    z-index: 10002;
    text-align: center;
    max-width: 400px;
  `;
  message.innerHTML = `
    <h3 style="margin-bottom: 1rem; color: #1f2937;">Session Expired</h3>
    <p style="color: #6b7280; margin-bottom: 1.5rem;">Your session has expired. Your work has been saved. Redirecting to login...</p>
    <div class="spinner" style="width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-top-color: #1A733E; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
  `;
  document.body.appendChild(message);

  // Redirect after 3 seconds
  setTimeout(() => {
    window.location.href = '/src/auth/presentation/auth-page.html';
  }, 3000);
}
