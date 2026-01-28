/**
 * Impersonation Banner Component
 * Shows a prominent banner when an admin is logged in as another user
 * 
 * SECURITY:
 * - Clearly indicates impersonation mode to prevent confusion
 * - Provides easy exit mechanism to return to admin account
 * - Cannot be dismissed without exiting impersonation
 */

import { isImpersonating, exitImpersonation, getImpersonationInfo, checkImpersonationFromUrl } from '../utils/impersonation-service.js';
import { logInfo, logError } from '../utils/logging-helper.js';

let bannerInitialized = false;

/**
 * Initialize the impersonation banner
 * Should be called on every page load
 */
export function initImpersonationBanner(): void {
  // Prevent multiple initializations
  if (bannerInitialized) {
    return;
  }
  
  // Check URL for impersonation parameter
  checkImpersonationFromUrl();
  
  // Check if we're in impersonation mode
  if (!isImpersonating()) {
    return;
  }
  
  bannerInitialized = true;
  
  const info = getImpersonationInfo();
  if (!info) {
    return;
  }
  
  logInfo('[ImpersonationBanner] Initializing banner for impersonation mode');
  
  // Create banner element
  const banner = document.createElement('div');
  banner.id = 'impersonation-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'polite');
  
  // Calculate duration
  const startTime = new Date(info.startedAt).getTime();
  const formatDuration = () => {
    const now = Date.now();
    const seconds = Math.floor((now - startTime) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };
  
  banner.innerHTML = `
    <style>
      #impersonation-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(90deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%);
        color: white;
        padding: 10px 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        z-index: 999999;
        font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
        animation: impersonation-slide-in 0.3s ease-out;
      }
      
      @keyframes impersonation-slide-in {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      #impersonation-banner .banner-icon {
        font-size: 20px;
        animation: pulse-icon 2s ease-in-out infinite;
      }
      
      @keyframes pulse-icon {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }
      
      #impersonation-banner .banner-content {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: center;
      }
      
      #impersonation-banner .banner-text {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      #impersonation-banner .banner-text strong {
        font-weight: 700;
        background: rgba(255, 255, 255, 0.2);
        padding: 2px 8px;
        border-radius: 4px;
      }
      
      #impersonation-banner .banner-duration {
        font-size: 12px;
        opacity: 0.9;
        background: rgba(0, 0, 0, 0.2);
        padding: 2px 8px;
        border-radius: 4px;
      }
      
      #impersonation-banner .btn-exit {
        background: white;
        color: #dc2626;
        border: none;
        padding: 8px 20px;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }
      
      #impersonation-banner .btn-exit:hover {
        background: #fef2f2;
        transform: scale(1.02);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
      }
      
      #impersonation-banner .btn-exit:active {
        transform: scale(0.98);
      }
      
      #impersonation-banner .btn-exit:disabled {
        opacity: 0.7;
        cursor: not-allowed;
        transform: none;
      }
      
      #impersonation-banner .btn-exit svg {
        width: 16px;
        height: 16px;
      }
      
      /* Adjust page content to account for banner */
      body.impersonating {
        padding-top: 52px !important;
      }
      
      body.impersonating .sidebar {
        top: 52px !important;
        height: calc(100vh - 52px) !important;
      }
      
      body.impersonating .main-content {
        margin-top: 0 !important;
      }
      
      /* Mobile responsive */
      @media (max-width: 768px) {
        #impersonation-banner {
          flex-direction: column;
          gap: 8px;
          padding: 8px 12px;
          font-size: 12px;
        }
        
        #impersonation-banner .btn-exit {
          padding: 6px 16px;
          font-size: 12px;
        }
        
        body.impersonating {
          padding-top: 80px !important;
        }
        
        body.impersonating .sidebar {
          top: 80px !important;
          height: calc(100vh - 80px) !important;
        }
      }
    </style>
    
    <span class="banner-icon">⚠️</span>
    
    <div class="banner-content">
      <span class="banner-text">
        Logged in as <strong id="impersonated-email">${escapeHtml(info.targetEmail)}</strong>
      </span>
      <span class="banner-duration" id="impersonation-duration">${formatDuration()}</span>
    </div>
    
    <button class="btn-exit" id="exit-impersonation-btn" title="Return to your admin account">
      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
      </svg>
      Return to Admin
    </button>
  `;
  
  // Insert banner at the beginning of body
  document.body.insertBefore(banner, document.body.firstChild);
  document.body.classList.add('impersonating');
  
  // Update duration every second
  const durationEl = document.getElementById('impersonation-duration');
  if (durationEl) {
    setInterval(() => {
      durationEl.textContent = formatDuration();
    }, 1000);
  }
  
  // Handle exit button click
  const exitBtn = document.getElementById('exit-impersonation-btn');
  if (exitBtn) {
    exitBtn.addEventListener('click', async () => {
      exitBtn.setAttribute('disabled', 'true');
      exitBtn.innerHTML = `
        <svg class="animate-spin" fill="none" viewBox="0 0 24 24" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" style="opacity: 0.25;"></circle>
          <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" style="opacity: 0.75;"></path>
        </svg>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        Exiting...
      `;
      
      try {
        await exitImpersonation();
      } catch (error) {
        logError('[ImpersonationBanner] Exit failed:', error);
        alert('Failed to exit impersonation. Please try logging out manually.');
        exitBtn.removeAttribute('disabled');
        exitBtn.innerHTML = `
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
          </svg>
          Return to Admin
        `;
      }
    });
  }
  
  logInfo('[ImpersonationBanner] Banner initialized');
}

/**
 * Remove the impersonation banner
 */
export function removeImpersonationBanner(): void {
  const banner = document.getElementById('impersonation-banner');
  if (banner) {
    banner.remove();
  }
  document.body.classList.remove('impersonating');
  bannerInitialized = false;
}

/**
 * Simple HTML escape function
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Auto-initialize on DOMContentLoaded if not already initialized
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initImpersonationBanner();
    });
  } else {
    // DOM already loaded
    initImpersonationBanner();
  }
}
