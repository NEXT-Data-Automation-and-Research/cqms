/**
 * Session Warning Utility
 * Warns users before session expires and handles auto-save
 * 
 * UX Improvements (v2.0):
 * - Configurable redirect delay (reduced from 3s to 2s by default)
 * - Fixed layout shift - banner now overlays instead of pushing content
 * - Added network error banner for connectivity issues
 * - All changes have fallback options via SESSION_WARNING_CONFIG
 */

import { getSupabase } from './supabase-init.js';
import { logInfo, logWarn } from './logging-helper.js';

/**
 * Configuration for session warning behavior
 * Can be overridden via window.SESSION_WARNING_CONFIG
 */
interface SessionWarningConfig {
  /** Redirect delay in ms after session expiry (default: 2000, previous: 3000) */
  expiryRedirectDelay: number;
  /** Use legacy layout (push content down) instead of overlay (default: false) */
  useLegacyLayout: boolean;
  /** Show "Login Now" button on expiry message (default: true) */
  showLoginButton: boolean;
  /** Warning threshold in seconds before expiry (default: 120) */
  warningThresholdSeconds: number;
}

const DEFAULT_CONFIG: SessionWarningConfig = {
  expiryRedirectDelay: 2000, // Reduced from 3000ms (previous value)
  useLegacyLayout: false,
  showLoginButton: true,
  warningThresholdSeconds: 120,
};

// Allow runtime configuration override
const config: SessionWarningConfig = {
  ...DEFAULT_CONFIG,
  ...((typeof window !== 'undefined' && (window as any).SESSION_WARNING_CONFIG) || {}),
};

let warningShown = false;
let networkErrorShown = false;
let warningInterval: number | null = null;
let expiryCheckInterval: number | null = null;

/**
 * Show session expiry warning
 * ✅ UX FIX: Now overlays content instead of pushing it down (configurable)
 */
function showSessionWarning(): void {
  if (warningShown) return;
  warningShown = true;

  // Create warning banner
  const banner = document.createElement('div');
  banner.id = 'session-warning-banner';
  
  // ✅ UX: Use overlay positioning by default to prevent layout shift
  // Can revert to legacy behavior via config.useLegacyLayout
  const baseStyles = `
    position: fixed;
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
  
  if (config.useLegacyLayout) {
    // Legacy behavior: push content down (previous implementation)
    banner.style.cssText = baseStyles + 'top: 0;';
  } else {
    // New behavior: slide in from top with animation, overlay content
    banner.style.cssText = baseStyles + `
      top: 0;
      transform: translateY(-100%);
      transition: transform 0.3s ease-out;
    `;
    // Trigger slide-in animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        banner.style.transform = 'translateY(0)';
      });
    });
  }

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
  const minutes = Math.ceil(config.warningThresholdSeconds / 60);
  message.innerHTML = `
    <strong style="color: #92400e;">Your session will expire in ${minutes} minute${minutes > 1 ? 's' : ''}.</strong>
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
    if (config.useLegacyLayout) {
      banner.remove();
    } else {
      // Slide out animation
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => banner.remove(), 300);
    }
    warningShown = false;
  };

  banner.appendChild(icon);
  banner.appendChild(message);
  banner.appendChild(closeBtn);
  document.body.appendChild(banner);

  // ✅ UX FIX: Only add body padding in legacy mode
  if (config.useLegacyLayout) {
    document.body.style.paddingTop = '60px';
  }
}

/**
 * Show network error banner
 * ✅ NEW: Informs users about connectivity issues during auth verification
 */
export function showNetworkErrorBanner(message?: string): void {
  if (networkErrorShown) return;
  networkErrorShown = true;

  const banner = document.createElement('div');
  banner.id = 'network-error-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #fef2f2;
    border-bottom: 2px solid #ef4444;
    padding: 0.75rem 1rem;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    transform: translateY(-100%);
    transition: transform 0.3s ease-out;
  `;

  banner.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <span style="color: #991b1b;">${message || 'Network connectivity issue. Some features may be unavailable.'}</span>
    <button onclick="this.parentElement.remove(); window.__networkErrorShown = false;" style="
      background: none;
      border: none;
      font-size: 1.25rem;
      color: #991b1b;
      cursor: pointer;
      padding: 0 0.25rem;
      line-height: 1;
    ">×</button>
  `;

  document.body.appendChild(banner);
  
  // Slide in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.style.transform = 'translateY(0)';
    });
  });

  // Auto-hide after 10 seconds
  setTimeout(() => {
    hideNetworkErrorBanner();
  }, 10000);
}

/**
 * Hide network error banner
 */
export function hideNetworkErrorBanner(): void {
  const banner = document.getElementById('network-error-banner');
  if (banner) {
    banner.style.transform = 'translateY(-100%)';
    setTimeout(() => {
      banner.remove();
      networkErrorShown = false;
    }, 300);
  }
}

/**
 * Auto-save form data to localStorage
 * Returns true if save succeeded, false otherwise
 */
function autoSaveFormData(): boolean {
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
      return true;
    }
    return true; // No forms to save is still a success
  } catch (error) {
    logWarn('[SessionWarning] Failed to auto-save form data:', error);
    return false;
  }
}

/**
 * Restore auto-saved form data from localStorage
 * Call this on page load to restore form data after session expiry
 */
export function restoreAutoSavedFormData(): boolean {
  try {
    const saved = localStorage.getItem('autoSavedFormData');
    if (!saved) return false;
    
    const { timestamp, data, page } = JSON.parse(saved);
    
    // Only restore if saved within last 30 minutes and on same page
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    if (timestamp < thirtyMinutesAgo || page !== window.location.pathname) {
      localStorage.removeItem('autoSavedFormData');
      return false;
    }
    
    // Restore form data
    Object.entries(data).forEach(([formId, formData]) => {
      const form = document.getElementById(formId) || document.querySelector(`form:nth-of-type(${parseInt(formId.replace('form-', '')) + 1})`);
      if (!form) return;
      
      Object.entries(formData as Record<string, any>).forEach(([key, value]) => {
        const input = form.querySelector(`[name="${key}"], [id="${key}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (input) {
          if (input.type === 'checkbox') {
            (input as HTMLInputElement).checked = value as boolean;
          } else {
            input.value = value as string;
          }
        }
      });
    });
    
    // Clear saved data after restore
    localStorage.removeItem('autoSavedFormData');
    logInfo('[SessionWarning] Form data restored from auto-save');
    
    // Show toast notification
    showRestoreNotification();
    
    return true;
  } catch (error) {
    logWarn('[SessionWarning] Failed to restore form data:', error);
    return false;
  }
}

/**
 * Show notification that form data was restored
 */
function showRestoreNotification(): void {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    background: #d1fae5;
    border: 1px solid #10b981;
    color: #065f46;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    z-index: 9999;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    animation: slideIn 0.3s ease-out;
  `;
  toast.innerHTML = `
    <style>
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } }
    </style>
    ✓ Your previous work has been restored
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

// Track if we've attempted proactive refresh
let proactiveRefreshAttempted = false;

/**
 * Start monitoring session expiry
 * ✅ UX: Warning threshold is now configurable
 * ✅ FIX: Proactively refresh token before expiry to prevent session issues
 */
export function startSessionMonitoring(): void {
  if (expiryCheckInterval) return; // Already monitoring

  expiryCheckInterval = window.setInterval(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    // ✅ FIX: Skip if auth is in a transitional state
    try {
      if (sessionStorage.getItem('oauthCallbackInProgress') === 'true') return;
      if (sessionStorage.getItem('loginJustCompleted') === 'true') return;
      if ((window as any).__oauthCallbackInProgress) return;
    } catch (e) {
      // Ignore sessionStorage errors
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) return;

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = session.expires_at || 0;
      const timeUntilExpiry = expiresAt - now;

      // ✅ FIX: Proactively refresh token 5 minutes before expiry
      // This prevents the "jumping" behavior when token expires during page navigation
      const PROACTIVE_REFRESH_THRESHOLD = 300; // 5 minutes
      if (timeUntilExpiry < PROACTIVE_REFRESH_THRESHOLD && timeUntilExpiry > 60 && !proactiveRefreshAttempted) {
        logInfo(`[SessionMonitor] Token expiring in ${timeUntilExpiry}s - proactively refreshing`);
        proactiveRefreshAttempted = true;
        
        try {
          const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && newSession) {
            logInfo('[SessionMonitor] Proactive token refresh successful');
            proactiveRefreshAttempted = false; // Reset for next cycle
          } else {
            logWarn('[SessionMonitor] Proactive refresh failed:', refreshError?.message);
            // Don't reset - will try again on next interval
          }
        } catch (refreshErr) {
          logWarn('[SessionMonitor] Proactive refresh error:', refreshErr);
        }
      }

      // Warn before expiry (configurable, default 120 seconds / 2 minutes)
      // Only show if more than 60 seconds remain (avoid showing right before expiry)
      if (timeUntilExpiry < config.warningThresholdSeconds && timeUntilExpiry > 60 && !warningShown) {
        showSessionWarning();
      }
      
      // ✅ FIX: If session is about to expire (< 30 seconds) and refresh failed, handle gracefully
      if (timeUntilExpiry < 30 && timeUntilExpiry > 0) {
        logWarn('[SessionMonitor] Session expiring very soon - attempting final refresh');
        try {
          const { data: { session: lastChanceSession }, error: lastChanceError } = await supabase.auth.refreshSession();
          if (lastChanceError || !lastChanceSession) {
            logWarn('[SessionMonitor] Final refresh failed - session will expire');
          }
        } catch (e) {
          logWarn('[SessionMonitor] Final refresh error:', e);
        }
      }
    } catch (err) {
      logWarn('[SessionMonitor] Error checking session:', err);
    }
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
    if (config.useLegacyLayout) {
      banner.remove();
      document.body.style.paddingTop = '';
    } else {
      // Slide out animation
      banner.style.transform = 'translateY(-100%)';
      setTimeout(() => banner.remove(), 300);
    }
  }
}

/**
 * Handle session expiry with auto-save
 * ✅ UX: Reduced redirect delay (configurable), added Login Now button
 */
export function handleSessionExpiry(): void {
  // ✅ FIX: Don't interfere if cache reload is in progress
  // The cache-clear-realtime module handles its own redirect and messaging
  if ((window as any).__cacheReloadInProgress) {
    logInfo('[SessionWarning] Cache reload in progress, skipping session expiry handling');
    return;
  }
  try {
    if (sessionStorage.getItem('cacheReloadInProgress') === 'true') {
      logInfo('[SessionWarning] Cache reload in progress (sessionStorage), skipping session expiry handling');
      return;
    }
  } catch {
    // sessionStorage might not be available
  }
  
  // ✅ FIX: Don't interfere if OAuth callback is in progress
  // This prevents session expiry handling from racing with login flow
  // Check URL parameters, session storage flags, and window flags
  try {
    // Check URL for OAuth parameters
    const urlHash = window.location.hash || '';
    const urlSearch = window.location.search || '';
    const hasOAuthParams = urlHash.includes('access_token') || 
                           urlHash.includes('code') ||
                           urlSearch.includes('code') ||
                           urlSearch.includes('access_token');
    
    const oauthInProgress = hasOAuthParams ||
                            sessionStorage.getItem('oauthCallbackInProgress') === 'true' || 
                            sessionStorage.getItem('loginJustCompleted') === 'true' ||
                            (window as any).__oauthCallbackInProgress || 
                            (window as any).__oauthRedirectInProgress;
    if (oauthInProgress) {
      logInfo('[SessionWarning] OAuth callback in progress, skipping session expiry handling');
      return;
    }
  } catch {
    // sessionStorage might not be available
  }
  
  const saveSucceeded = autoSaveFormData();

  const authPagePath = '/src/auth/presentation/auth-page.html';
  
  // Function to perform redirect
  const performRedirect = () => {
    window.location.href = authPagePath;
  };

  // Show message with backdrop
  const backdrop = document.createElement('div');
  backdrop.id = 'session-expiry-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10001;
  `;
  
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
    box-shadow: 0 4px 6px rgba(0,0,0,0.1), 0 10px 15px rgba(0,0,0,0.1);
    z-index: 10002;
    text-align: center;
    max-width: 400px;
  `;
  
  // ✅ UX: Add Login Now button for immediate action
  const loginButtonHtml = config.showLoginButton ? `
    <button id="login-now-btn" style="
      background: #1A733E;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      margin-top: 1rem;
      transition: background 0.2s;
    " onmouseover="this.style.background='#145c32'" onmouseout="this.style.background='#1A733E'">
      Login Now
    </button>
    <p style="color: #9ca3af; font-size: 0.75rem; margin-top: 0.75rem;">
      Or wait ${config.expiryRedirectDelay / 1000} second${config.expiryRedirectDelay > 1000 ? 's' : ''} for automatic redirect...
    </p>
  ` : `
    <div style="width: 2rem; height: 2rem; border: 3px solid #e5e7eb; border-top-color: #1A733E; border-radius: 50%; animation: session-spin 1s linear infinite; margin: 1rem auto 0;"></div>
  `;
  
  const saveMessage = saveSucceeded 
    ? 'Your work has been saved and will be restored after login.'
    : 'Please note any unsaved changes before logging in again.';
  
  message.innerHTML = `
    <h3 style="margin-bottom: 1rem; color: #1f2937;">Session Expired</h3>
    <p style="color: #6b7280; margin-bottom: 0.5rem;">Your session has expired.</p>
    <p style="color: #6b7280; font-size: 0.875rem;">${saveMessage}</p>
    ${loginButtonHtml}
    <style>
      @keyframes session-spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  
  document.body.appendChild(backdrop);
  document.body.appendChild(message);

  // Add click handler for Login Now button
  if (config.showLoginButton) {
    const loginBtn = document.getElementById('login-now-btn');
    if (loginBtn) {
      loginBtn.onclick = performRedirect;
    }
  }

  // ✅ UX: Reduced redirect delay (default 2s, was 3s)
  // Configurable via SESSION_WARNING_CONFIG.expiryRedirectDelay
  setTimeout(performRedirect, config.expiryRedirectDelay);
}
