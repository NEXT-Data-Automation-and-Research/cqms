/**
 * Sidebar Loader
 * This is the main file that loads the sidebar and makes everything work
 */

import { SidebarUserProfile } from './sidebar-user-profile.js'
import { SidebarNotifications } from './sidebar-notifications.js'
import { SidebarMenu } from './sidebar-menu.js'
import { SidebarService } from '../application/sidebar-service.js'
import { sidebarState } from '../application/sidebar-state.js'
import { SidebarHTMLGenerator } from './sidebar-html-generator.js'
import { safeSetHTML, sanitizeHTML } from '../../../utils/html-sanitizer.js'
import { logError } from '../../../utils/logging-helper.js'

/**
 * This class loads the sidebar and makes it work
 */
export class SidebarLoader {
  private userProfile: SidebarUserProfile
  private notifications: SidebarNotifications
  private menu: SidebarMenu
  private service: SidebarService
  private htmlGenerator: SidebarHTMLGenerator

  constructor() {
    this.userProfile = new SidebarUserProfile()
    this.notifications = new SidebarNotifications()
    this.menu = new SidebarMenu()
    this.service = new SidebarService()
    this.htmlGenerator = new SidebarHTMLGenerator()
  }

  /**
   * Start loading the sidebar
   * 
   * PERFORMANCE OPTIMIZATION:
   * - Loads UI immediately without waiting for Supabase
   * - Shows cached data first (instant display)
   * - Fetches fresh data in background (non-blocking)
   * - Reduces initial load time from ~5s to <100ms
   */
  async init(): Promise<void> {
    // Check if we should show sidebar on this page
    if (!this.service.shouldShowSidebarOnThisPage()) {
      return
    }

    // Load the sidebar HTML immediately (don't wait for Supabase)
    await this.loadSidebarHTML()

    // Set up UI features immediately (toggle, menu handlers)
    this.setupSidebarToggle()
    this.menu.setupMenuHandlers()
    this.hideEmployeeMenuItems()
    this.updateAccessControlMenuItem()

    // Load user profile from cache immediately (fast - <10ms)
    const cachedUserInfo = this.userProfile.loadUserInfoFromStorage()
    if (cachedUserInfo) {
      this.userProfile.showUserInfo(cachedUserInfo)
    }
    this.userProfile.setupUserProfileClickHandler()
    this.userProfile.setupLogoutHandler()

    // Load notification counts from cache immediately (fast - <10ms)
    this.notifications.loadNotificationCountsFromCache()

    // Initialize async features in background (don't block UI)
    // This runs after UI is already visible to user
    this.initializeSidebarFeaturesAsync().catch(error => {
      // Silently handle errors - UI is already shown with cached data
      console.debug('[Sidebar] Background initialization error:', error)
    })

    // Update sidebar when user info changes (for role-based menu updates)
    this.setupUserInfoWatcher()
  }

  /**
   * Watch for user info changes and update sidebar if needed
   */
  private setupUserInfoWatcher(): void {
    // Listen for user info updates
    document.addEventListener('userInfoUpdated', () => {
      // Reload sidebar with updated user info
      if (sidebarState.isSidebarLoaded) {
        const userInfo = sidebarState.loadUserInfo()
        const newHTML = this.htmlGenerator.generate(userInfo)
        const sidebarNav = document.querySelector('nav.sidebar')
        if (sidebarNav) {
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = newHTML
          const newNav = tempDiv.querySelector('nav.sidebar')
          if (newNav) {
            // Preserve collapsed state
            const isCollapsed = sidebarNav.classList.contains('collapsed')
            if (isCollapsed) {
              newNav.classList.add('collapsed')
            }
            sidebarNav.replaceWith(newNav)
            // Re-setup handlers
            this.menu.setupMenuHandlers()
          }
        }
      }
    })
  }

  /**
   * Wait for Supabase client to be available (non-blocking, with timeout)
   */
  private async waitForSupabaseClient(maxWaitMs: number = 2000): Promise<boolean> {
    const startTime = Date.now()
    const checkInterval = 100 // Check every 100ms
    
    while (Date.now() - startTime < maxWaitMs) {
      if ((window as any).supabaseClient) {
        return true
      }
      
      // Try to initialize it once
      if (Date.now() - startTime < 500) { // Only try in first 500ms
        try {
          const secureWindowModule = await import('/js/utils/secure-window-supabase.js' as any)
          if (secureWindowModule?.initSecureWindowSupabase) {
            await secureWindowModule.initSecureWindowSupabase()
            if ((window as any).supabaseClient) {
              return true
            }
          }
        } catch (importError) {
          // Module might not exist, continue waiting
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, checkInterval))
    }
    
    return false // Timeout reached
  }

  /**
   * Load the sidebar HTML into the page
   */
  private async loadSidebarHTML(): Promise<void> {
    try {
      // Check if sidebar is already loaded
      if (sidebarState.isSidebarLoaded) {
        return
      }

      // Get user info for route-based menu generation
      const userInfo = sidebarState.loadUserInfo()
      
      // Generate sidebar HTML from route configuration
      const sidebarHTML = this.htmlGenerator.generate(userInfo)

      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement('div')
      try {
        const sanitized = sanitizeHTML(sidebarHTML, true)
        safeSetHTML(tempDiv, sanitized)
      } catch (error) {
        // If sanitization fails, use innerHTML directly for trusted template
        // This is safe because sidebarHTML is generated from route config, not user-generated
        tempDiv.innerHTML = sidebarHTML
      }

      // Extract the sidebar nav element
      const sidebarNav = tempDiv.querySelector('nav.sidebar')
      if (!sidebarNav) {
        throw new Error('Sidebar nav element not found')
      }

      // Always start collapsed to enable hover expansion
      // The sidebar will auto-expand on hover when collapsed (CSS handles this)
      // Only stay expanded if user explicitly toggles it
      const savedState = sidebarState.loadSidebarState()
      const isExpanded = savedState === 'expanded'

      // Apply collapsed class (enables hover expansion via CSS)
      // Only remove collapsed if user explicitly expanded it
      if (isExpanded) {
        sidebarNav.classList.remove('collapsed')
        sidebarState.sidebarIsExpanded = true
      } else {
        // Default to collapsed for hover expansion behavior
        sidebarNav.classList.add('collapsed')
        sidebarState.sidebarIsExpanded = false
      }

      // Insert the sidebar at the beginning of body
      document.body.insertBefore(sidebarNav, document.body.firstChild)

      sidebarState.isSidebarLoaded = true
      
      // Dispatch custom event when sidebar is loaded
      const sidebarLoadedEvent = new CustomEvent('sidebarLoaded', {
        detail: { usingRouteConfig: true }
      })
      document.dispatchEvent(sidebarLoadedEvent)

      // Enable transitions after a brief moment to prevent flash
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sidebarNav.classList.add('sidebar-ready')
        })
      })
    } catch (error) {
      // Log detailed error information
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logError('Error loading sidebar:', error);
      console.error('[Sidebar] Detailed error:', {
        message: errorMessage,
        stack: errorStack,
        error: error
      });
      this.showSidebarError()
    }
  }

  /**
   * Set up sidebar features asynchronously (non-blocking)
   * This runs in the background after UI is already shown
   */
  private async initializeSidebarFeaturesAsync(): Promise<void> {
    // Wait for Supabase with short timeout (non-blocking)
    const hasSupabase = await this.waitForSupabaseClient(2000)

    if (hasSupabase) {
      // Initialize user profile from database (background refresh)
      await this.userProfile.initializeUserProfile()

      // Update notification counts from database (background refresh)
      await this.notifications.updateAllNotificationCounts()

      // Set up intervals to update counts periodically
      this.notifications.setupNotificationUpdateIntervals()
    } else {
      // Supabase not ready yet - set up retry mechanism
      // User profile and notifications already shown from cache
      setTimeout(() => {
        this.initializeSidebarFeaturesAsync().catch(() => {
          // Silently fail - cache is already displayed
        })
      }, 2000)
    }
  }

  /**
   * Make the sidebar expand and collapse when clicking the toggle button
   */
  private setupSidebarToggle(): void {
    const sidebar = document.querySelector('.sidebar')
    if (!sidebar) return

    // Find or create toggle button
    let toggleButton = document.querySelector('.sidebar-toggle')
    if (!toggleButton) {
      // Create toggle button if it doesn't exist
      toggleButton = document.createElement('button')
      toggleButton.className = 'sidebar-toggle'
      toggleButton.setAttribute('aria-label', 'Toggle sidebar')
      safeSetHTML(toggleButton as HTMLElement, `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      `)
      document.body.appendChild(toggleButton)
    }

    // Handle toggle button click
    // Toggle between permanently expanded and collapsed (with hover expansion)
    toggleButton.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.contains('collapsed')
      
      if (isCollapsed) {
        // Expand permanently (user wants it to stay expanded)
        sidebar.classList.remove('collapsed')
        sidebarState.sidebarIsExpanded = true
        sidebarState.saveSidebarState('expanded')
      } else {
        // Collapse (will auto-expand on hover via CSS)
        sidebar.classList.add('collapsed')
        sidebarState.sidebarIsExpanded = false
        sidebarState.saveSidebarState('collapsed')
      }
    })

    // Handle brand button click (also toggles sidebar)
    const brandButton = document.querySelector('.sidebar-brand-btn')
    if (brandButton) {
      brandButton.addEventListener('click', () => {
        const isCollapsed = sidebar.classList.contains('collapsed')
        
        if (isCollapsed) {
          // Expand permanently
          sidebar.classList.remove('collapsed')
          sidebarState.sidebarIsExpanded = true
          sidebarState.saveSidebarState('expanded')
        } else {
          // Collapse (will auto-expand on hover via CSS)
          sidebar.classList.add('collapsed')
          sidebarState.sidebarIsExpanded = false
          sidebarState.saveSidebarState('collapsed')
        }
      })
    }
  }

  /**
   * Hide menu items that employees shouldn't see
   * This matches the old behavior - show all routes, then hide based on role
   */
  private hideEmployeeMenuItems(): void {
    const userInfo = sidebarState.loadUserInfo()
    if (!userInfo || userInfo.role !== 'Employee') {
      return
    }

    // Hide menu items that employees shouldn't see
    const itemsToHide = [
      'auditor-dashboard-page.html',
      'audit-distribution-page.html',
      'create-audit.html'
    ]

    const menuItems = document.querySelectorAll('.menu-item')
    menuItems.forEach(item => {
      const link = item as HTMLAnchorElement
      if (link.href) {
        const href = link.href.toLowerCase()
        if (itemsToHide.some(itemToHide => href.includes(itemToHide.toLowerCase()))) {
          const listItem = item.closest('li')
          if (listItem) {
            listItem.style.display = 'none'
          }
        }
      }
    })

    // Also hide submenu items that employees shouldn't see
    const submenuItems = document.querySelectorAll('.submenu-item')
    submenuItems.forEach(item => {
      const link = item as HTMLAnchorElement
      if (link.href) {
        const href = link.href.toLowerCase()
        // Hide User Management and Access Control for employees
        if (href.includes('user-management') || href.includes('access-control')) {
          const listItem = item.closest('li')
          if (listItem) {
            listItem.style.display = 'none'
          }
        }
      }
    })
  }

  /**
   * Show or hide Access Control menu item based on user role
   */
  private updateAccessControlMenuItem(): void {
    const accessControlMenuItem = document.getElementById('accessControlMenuItem')
    if (!accessControlMenuItem) return

    // Check if user has access control permission
    // Wait a bit for accessControl to be available
    setTimeout(() => {
      if ((window as any).accessControl && (window as any).accessControl.hasAccessControlPermission) {
        accessControlMenuItem.style.display = 'block'
      } else {
        accessControlMenuItem.style.display = 'none'
      }
    }, 100)
  }

  /**
   * Show an error message if sidebar fails to load
   */
  private showSidebarError(): void {
    const errorDiv = document.createElement('div')
    errorDiv.className = 'sidebar-error'
    errorDiv.textContent = 'Failed to load sidebar. Please refresh the page.'
    errorDiv.style.cssText = 'padding: 1rem; background: #fee; color: #c00; text-align: center;'
    document.body.insertBefore(errorDiv, document.body.firstChild)
  }

  /**
   * Clean up when page unloads
   */
  cleanup(): void {
    this.notifications.clearNotificationUpdateIntervals()
  }
}

// Create a single instance to share
export const sidebarLoader = new SidebarLoader()

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    sidebarLoader.init().catch(error => {
      logError('Error initializing sidebar:', error)
    })
  })
} else {
  // DOM is already ready
  sidebarLoader.init().catch(error => {
    logError('Error initializing sidebar:', error)
  })
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  sidebarLoader.cleanup()
})

