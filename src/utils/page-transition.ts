/**
 * Page Transition Utility
 * Provides smooth page transitions with loading indicators
 */

/**
 * Show page transition overlay
 */
function showTransitionOverlay(): void {
  let overlay = document.getElementById('page-transition-overlay');
  
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'page-transition-overlay';
    overlay.className = 'page-transition-overlay';
    overlay.innerHTML = `
      <div class="page-transition-content">
        <div class="page-transition-spinner"></div>
        <p class="page-transition-text">Loading...</p>
      </div>
    `;
    document.body.appendChild(overlay);
  }
  
  // Trigger fade-in animation
  requestAnimationFrame(() => {
    overlay?.classList.add('active');
  });
}

/**
 * Hide page transition overlay
 */
function hideTransitionOverlay(): void {
  const overlay = document.getElementById('page-transition-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    // Remove after animation completes
    setTimeout(() => {
      overlay?.remove();
    }, 300);
  }
}

/**
 * Navigate to a URL with smooth transition
 * @param url - The URL to navigate to
 * @param options - Navigation options
 */
export function navigateWithTransition(
  url: string,
  options: { replace?: boolean } = {}
): void {
  // Don't show transition for same page
  if (url === window.location.href || url === window.location.pathname) {
    return;
  }
  
  // Show transition overlay
  showTransitionOverlay();
  
  // Small delay to ensure overlay is visible
  setTimeout(() => {
    if (options.replace) {
      window.location.replace(url);
    } else {
      window.location.href = url;
    }
  }, 50);
}

/**
 * Setup smooth navigation for all sidebar links
 */
export function setupSmoothNavigation(): void {
  // Handle sidebar navigation links
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a.menu-item, a.submenu-item') as HTMLAnchorElement;
    
    if (link && link.href) {
      const url = new URL(link.href);
      const currentUrl = new URL(window.location.href);
      
      // Only handle internal navigation (same origin)
      if (url.origin === currentUrl.origin) {
        // Don't handle special links (logout, external, etc.)
        if (link.classList.contains('logout-link') || 
            link.hasAttribute('target') ||
            link.getAttribute('href') === '#') {
          return;
        }
        
        e.preventDefault();
        navigateWithTransition(link.href);
      }
    }
  }, true); // Use capture phase to intercept before default behavior
}

/**
 * Hide transition overlay when page loads
 */
export function hideTransitionOnLoad(): void {
  // Hide any existing overlay immediately
  hideTransitionOverlay();
  
  // Hide overlay when DOM is ready (in case it wasn't ready yet)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      hideTransitionOverlay();
    });
  }
  
  // Hide overlay when page is fully loaded
  window.addEventListener('load', () => {
    hideTransitionOverlay();
  });
  
  // Also hide on page visibility change (back/forward navigation)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      hideTransitionOverlay();
    }
  });
  
  // Handle browser back/forward navigation
  window.addEventListener('pageshow', (event) => {
    // If page was loaded from cache (back/forward), hide overlay
    if (event.persisted) {
      hideTransitionOverlay();
    }
  });
}

