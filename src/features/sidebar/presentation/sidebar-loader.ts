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
import { getPagePermissionsForSidebar } from '../../../utils/permissions.js'
import { routes } from '../../../core/routing/route-config.js'

// Sidebar permission map: resourceName -> { hasAccess, reason? }
type SidebarPagePermissions = Record<string, { hasAccess: boolean; reason?: string }>

/**
 * This class loads the sidebar and makes it work
 */
export class SidebarLoader {
  private userProfile: SidebarUserProfile
  private notifications: SidebarNotifications
  private menu: SidebarMenu
  private service: SidebarService
  private htmlGenerator: SidebarHTMLGenerator
  private latestPagePermissions: SidebarPagePermissions | null = null
  private permissionsFetchInFlight: Promise<SidebarPagePermissions | null> | null = null

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
    console.log('[Sidebar] init() called, readyState:', document.readyState)

    // Check if we should show sidebar on this page
    if (!this.service.shouldShowSidebarOnThisPage()) {
      console.log('[Sidebar] Skipping - page excluded from sidebar')
      return
    }

    // Prevent double initialization
    if (sidebarState.isSidebarLoaded) {
      console.log('[Sidebar] Skipping - already loaded')
      return
    }

    // Register userInfoUpdated watcher before any async work so we never miss the event
    // (e.g. when auth-checker or OAuth sets userInfo + role right after first login)
    this.setupUserInfoWatcher()

    // Load the sidebar HTML immediately (don't wait for Supabase)
    try {
      console.log('[Sidebar] Loading sidebar HTML...')
      await this.loadSidebarHTML()
      console.log('[Sidebar] Sidebar HTML loaded successfully')
    } catch (error) {
      console.error('[Sidebar] Critical: loadSidebarHTML failed', error)
      // Try to show at least a basic sidebar
      this.showSidebarError()
      return
    }

    // Verify sidebar was actually inserted
    if (!document.querySelector('nav.sidebar')) {
      console.error('[Sidebar] Critical: sidebar element not found after loadSidebarHTML')
      return
    }

    // Set up UI features immediately (toggle, menu handlers)
    this.setupSidebarToggle()
    this.menu.setupMenuHandlers()
    console.log('[Sidebar] Initialization complete')
    // COMMENTED OUT: User permission checks - temporarily disabled for development
    // this.hideEmployeeMenuItems()
    // this.updateAccessControlMenuItem()

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
      // Background initialization error - non-critical
    })
  }

  /**
   * Watch for user info changes and update sidebar if needed
   */
  private setupUserInfoWatcher(): void {
    document.addEventListener('userInfoUpdated', async (evt) => {
      if (!sidebarState.isSidebarLoaded) return
      const userInfo = sidebarState.loadUserInfo()
      let pagePermissions: SidebarPagePermissions | null = null

      // Prefer event-provided permissions to avoid duplicate network calls.
      const detail = (evt as CustomEvent | undefined)?.detail as
        | { pagePermissions?: SidebarPagePermissions | null }
        | undefined
      if (detail?.pagePermissions) {
        pagePermissions = detail.pagePermissions
        this.latestPagePermissions = pagePermissions
      } else if (this.latestPagePermissions) {
        pagePermissions = this.latestPagePermissions
      }

      // Fetch permissions with timeout to avoid hanging
      if (!pagePermissions) {
        try {
          const permPromise = this.getOrFetchPermissionsForSidebar()
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000))
          pagePermissions = (await Promise.race([permPromise, timeoutPromise])) as SidebarPagePermissions | null
        } catch {
          // Fall back to role-based
        }
      }

      const newHTML = this.htmlGenerator.generate(userInfo, pagePermissions ?? undefined)
      const sidebarNav = document.querySelector('nav.sidebar')
      if (sidebarNav) {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = newHTML
        const newNav = tempDiv.querySelector('nav.sidebar')
        if (newNav) {
          this.preserveSidebarStateOnReplace(sidebarNav, newNav)
          sidebarNav.replaceWith(newNav)
          this.menu.setupMenuHandlers()
          
          // Re-display user info after sidebar replacement (fixes "Loading..." issue)
          if (userInfo) {
            this.userProfile.showUserInfo(userInfo)
          }
          
          // Re-setup click handlers for profile and logout
          this.userProfile.setupUserProfileClickHandler()
          this.userProfile.setupLogoutHandler()
        }
      }
    })
  }

  private preserveSidebarStateOnReplace(oldNav: Element, newNav: Element): void {
    // Desktop collapsed/expanded
    if (oldNav.classList.contains('collapsed')) newNav.classList.add('collapsed')
    if (oldNav.classList.contains('sidebar-ready')) newNav.classList.add('sidebar-ready')

    // Mobile-open state is critical (sidebar can be re-rendered while user is interacting).
    const wasMobileOpen = oldNav.classList.contains('mobile-open')
    if (wasMobileOpen) {
      newNav.classList.add('mobile-open')
      document.body.classList.add('sidebar-open')

      const menuToggle = document.getElementById('mobileMenuToggle') || document.querySelector('.menu-toggle')
      const sidebarOverlay = document.getElementById('sidebarOverlay')
      if (menuToggle) {
        menuToggle.classList.add('active')
        menuToggle.setAttribute('aria-expanded', 'true')
      }
      if (sidebarOverlay) {
        sidebarOverlay.classList.add('active')
      }
    }
  }

  private async getOrFetchPermissionsForSidebar(): Promise<SidebarPagePermissions | null> {
    if (this.permissionsFetchInFlight) return this.permissionsFetchInFlight

    this.permissionsFetchInFlight = (async () => {
      const resourceNames = this.getSidebarPermissionResourceNames()
      if (resourceNames.length === 0) return {}

      const perms = await getPagePermissionsForSidebar(resourceNames)
      if (perms) {
        this.latestPagePermissions = perms
      }
      return perms
    })()

    try {
      return await this.permissionsFetchInFlight
    } finally {
      this.permissionsFetchInFlight = null
    }
  }

  /**
   * Wait for Supabase client to be available (non-blocking, with timeout)
   * RELIABILITY: Increased timeout from 2s to 5s for more reliable initialization
   */
  private async waitForSupabaseClient(maxWaitMs: number = 5000): Promise<boolean> {
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
   * Collect page permission resource names from route config (top-level and submenu items with permissionResource)
   */
  private getSidebarPermissionResourceNames(): string[] {
    const names: string[] = []
    for (const route of routes) {
      // Check top-level route
      if (route.meta?.permissionResource?.name) {
        names.push(route.meta.permissionResource.name)
      }
      // Check submenu items
      if (route.submenu) {
        for (const item of route.submenu) {
          if (item.permissionResource?.name) {
            names.push(item.permissionResource.name)
          }
        }
      }
    }
    return [...new Set(names)]
  }

  /**
   * Fetch permissions in background and refresh sidebar when ready.
   * Uses a timeout to avoid hanging forever if API is slow/unavailable.
   */
  private fetchPermissionsAndRefresh(): void {
    const PERMISSION_TIMEOUT_MS = 5000 // 5 second max wait

    const permissionPromise = (async () => {
      try {
        const pagePermissions = await this.getOrFetchPermissionsForSidebar()
        if (pagePermissions && sidebarState.isSidebarLoaded) {
          // Trigger sidebar refresh with new permissions
          document.dispatchEvent(new CustomEvent('userInfoUpdated', {
            detail: { permissionsLoaded: true, pagePermissions }
          }))
        }
      } catch {
        // Permission fetch failed - sidebar already rendered with role-based access
      }
    })()

    // Race against timeout - don't let permission fetch hang forever
    const timeoutPromise = new Promise<void>(resolve => setTimeout(resolve, PERMISSION_TIMEOUT_MS))
    Promise.race([permissionPromise, timeoutPromise]).catch(() => {
      // Silently ignore - sidebar is already rendered
    })
  }

  /**
   * Load the sidebar HTML into the page
   *
   * CRITICAL: Render sidebar immediately without waiting for permission API.
   * After first login the Supabase client or API may not be ready yet, and
   * awaiting permissions can hang forever, causing the sidebar to never appear.
   * We render with role-based permissions first, then refresh when permissions load.
   */
  private async loadSidebarHTML(): Promise<void> {
    try {
      if (sidebarState.isSidebarLoaded) {
        return
      }

      const userInfo = sidebarState.loadUserInfo()

      // IMPORTANT: Do NOT await permissions here - it can hang and block rendering.
      // Render immediately with role-based access, then update asynchronously.
      let pagePermissions: SidebarPagePermissions | null = null

      const sidebarHTML = this.htmlGenerator.generate(userInfo, pagePermissions)

      // Kick off permission fetch in background - will trigger userInfoUpdated to refresh sidebar
      this.fetchPermissionsAndRefresh()

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

      // Extract the hamburger button, overlay, and sidebar nav element
      const menuToggle = tempDiv.querySelector('.menu-toggle')
      const sidebarOverlay = tempDiv.querySelector('.sidebar-overlay')
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

      // Insert overlay and sidebar at the beginning of body
      // Note: Hamburger button is now placed inline with page heading in each page's HTML
      if (sidebarOverlay) {
        document.body.insertBefore(sidebarOverlay, document.body.firstChild)
      }
      document.body.insertBefore(sidebarNav, document.body.firstChild)
      
      // If hamburger button exists in sidebar HTML but not in page, insert it
      // Otherwise, use the one that's already in the page HTML
      if (menuToggle) {
        const existingToggle = document.getElementById('mobileMenuToggle')
        if (!existingToggle) {
          // Insert at beginning of body if not found in page
          document.body.insertBefore(menuToggle, document.body.firstChild)
        } else {
          // Use existing one, remove the duplicate from sidebar HTML
          menuToggle.remove()
        }
      }

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
    // Wait for Supabase with reasonable timeout (non-blocking)
    // RELIABILITY: Increased timeout from 2s to 5s for more reliable initialization
    const hasSupabase = await this.waitForSupabaseClient(5000)

    if (hasSupabase) {
      // Initialize user profile from database (background refresh)
      await this.userProfile.initializeUserProfile()

      // Ensure sidebar menu reflects role/permissions after profile is loaded
      // (handles first-time login: initial HTML was generic, now we have role from DB)
      const userInfo = sidebarState.loadUserInfo()
      if (userInfo && sidebarState.isSidebarLoaded) {
        document.dispatchEvent(new CustomEvent('userInfoUpdated', {
          detail: { userInfo, roleLoaded: true }
        }))
      }

      // Update notification counts from database (background refresh)
      await this.notifications.updateAllNotificationCounts()

      // Set up intervals to update counts periodically
      this.notifications.setupNotificationUpdateIntervals()

      // Real-time audit assignment notifications (toast when someone assigns an audit to this user)
      console.log('[Sidebar] Checking realtime setup - userInfo:', userInfo?.email, 'role:', userInfo?.role)
      if (userInfo?.email && userInfo.role !== 'Employee') {
        try {
          console.log('[Sidebar] Setting up audit assignment realtime for:', userInfo.email)
          const { setupAuditAssignmentRealtime } = await import(
            '../../notifications/application/audit-assignment-realtime.js'
          )
          await setupAuditAssignmentRealtime(userInfo.email)
          console.log('[Sidebar] Audit assignment realtime setup complete')
        } catch (err) {
          console.warn('[Sidebar] Could not set up audit assignment realtime:', err)
        }
      } else {
        console.log('[Sidebar] Skipping audit realtime setup - email:', userInfo?.email, 'role:', userInfo?.role, '(only non-Employee roles get realtime)')
      }

      // Real-time platform notifications (toast for all users when admin posts announcement)
      if (userInfo?.email) {
        try {
          console.log('[Sidebar] Setting up platform notifications realtime')
          const { setupPlatformNotificationsRealtime } = await import(
            '../../platform-notifications/application/platform-notifications-realtime.js'
          )
          await setupPlatformNotificationsRealtime()
          console.log('[Sidebar] Platform notifications realtime setup complete')
        } catch (err) {
          console.warn('[Sidebar] Could not set up platform notifications realtime:', err)
        }
      }

      // Real-time cache clear (for admin-triggered platform-wide cache clearing)
      if (userInfo?.email) {
        try {
          console.log('[Sidebar] Setting up cache clear realtime')
          const { setupCacheClearRealtime, checkCacheClearOnLoad } = await import(
            '../../cache-management/application/cache-clear-realtime.js'
          )
          await setupCacheClearRealtime()
          // Also check if we missed a cache clear while offline
          await checkCacheClearOnLoad()
          console.log('[Sidebar] Cache clear realtime setup complete')
        } catch (err) {
          console.warn('[Sidebar] Could not set up cache clear realtime:', err)
        }
      }
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
    // Setup mobile menu toggle
    this.setupMobileMenuToggle()

    // Find or create desktop toggle button
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

    // Handle desktop toggle button click
    // Toggle between permanently expanded and collapsed (with hover expansion)
    toggleButton.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar')
      if (!sidebar) return
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

    // Handle brand button click (also toggles sidebar).
    // NOTE: The sidebar <nav> can be replaced at runtime (userInfoUpdated),
    // so bind with delegation so it keeps working.
    this.setupBrandToggleDelegation()
  }

  private static brandToggleDelegationAttached = false

  private setupBrandToggleDelegation(): void {
    if (SidebarLoader.brandToggleDelegationAttached) return
    SidebarLoader.brandToggleDelegationAttached = true

    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement | null
      const brandButton = target?.closest('.sidebar-brand-btn') as HTMLElement | null
      if (!brandButton) return

      const sidebar = document.querySelector('.sidebar')
      if (!sidebar) return

      const isCollapsed = sidebar.classList.contains('collapsed')
      if (isCollapsed) {
        sidebar.classList.remove('collapsed')
        sidebarState.sidebarIsExpanded = true
        sidebarState.saveSidebarState('expanded')
      } else {
        sidebar.classList.add('collapsed')
        sidebarState.sidebarIsExpanded = false
        sidebarState.saveSidebarState('collapsed')
      }
    })
  }

  /**
   * Setup mobile menu toggle functionality
   */
  private setupMobileMenuToggle(): void {
    // Find hamburger button - could be in page HTML or inserted by sidebar loader
    const menuToggle = document.getElementById('mobileMenuToggle') || document.querySelector('.menu-toggle')
    const sidebarOverlay = document.getElementById('sidebarOverlay')
    
    if (!menuToggle) return

    const getSidebar = () => document.querySelector('.sidebar') as HTMLElement | null

    const toggleMobileMenu = (open: boolean) => {
      const sidebar = getSidebar()
      if (!sidebar) return

      if (open) {
        sidebar.classList.add('mobile-open')
        menuToggle.classList.add('active')
        menuToggle.setAttribute('aria-expanded', 'true')
        if (sidebarOverlay) {
          sidebarOverlay.classList.add('active')
        }
        document.body.classList.add('sidebar-open')
      } else {
        sidebar.classList.remove('mobile-open')
        menuToggle.classList.remove('active')
        menuToggle.setAttribute('aria-expanded', 'false')
        if (sidebarOverlay) {
          sidebarOverlay.classList.remove('active')
        }
        document.body.classList.remove('sidebar-open')
      }
    }

    // Toggle menu on hamburger button click
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation()
      const sidebar = getSidebar()
      if (!sidebar) return
      const isOpen = sidebar.classList.contains('mobile-open')
      toggleMobileMenu(!isOpen)
    })

    // Close menu when clicking overlay
    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        toggleMobileMenu(false)
      })
    }

    // Close menu when clicking outside on mobile
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = getSidebar()
      if (!sidebar) return
      const target = e.target as HTMLElement
      if (
        window.innerWidth <= 767 &&
        sidebar.classList.contains('mobile-open') &&
        !sidebar.contains(target) &&
        !menuToggle.contains(target)
      ) {
        toggleMobileMenu(false)
      }
    }

    document.addEventListener('click', handleClickOutside)

    // Close menu when any sidebar link is clicked (delegated, survives sidebar re-render)
    const handleSidebarLinkClick = (e: MouseEvent) => {
      if (window.innerWidth > 767) return
      const sidebar = getSidebar()
      if (!sidebar || !sidebar.classList.contains('mobile-open')) return

      const target = e.target as HTMLElement | null
      const link = target?.closest('a.menu-item, a.submenu-item') as HTMLAnchorElement | null
      if (link && sidebar.contains(link)) {
        toggleMobileMenu(false)
      }
    }
    document.addEventListener('click', handleSidebarLinkClick)

    // Close menu when window is resized to desktop size
    const handleResize = () => {
      if (window.innerWidth > 767) {
        toggleMobileMenu(false)
      }
    }

    window.addEventListener('resize', handleResize)
  }

  /**
   * Hide menu items that employees shouldn't see
   * This matches the old behavior - show all routes, then hide based on role
   * COMMENTED OUT: Temporarily disabled for development
   */
  // private hideEmployeeMenuItems(): void {
  //   const userInfo = sidebarState.loadUserInfo()
  //   if (!userInfo || userInfo.role !== 'Employee') {
  //     return
  //   }

  //   // Hide menu items that employees shouldn't see
  //   const itemsToHide = [
  //     'new-auditors-dashboard.html',
  //     'audit-distribution-page.html',
  //     'create-audit.html'
  //   ]

  //   const menuItems = document.querySelectorAll('.menu-item')
  //   menuItems.forEach(item => {
  //     const link = item as HTMLAnchorElement
  //     if (link.href) {
  //       const href = link.href.toLowerCase()
  //       if (itemsToHide.some(itemToHide => href.includes(itemToHide.toLowerCase()))) {
  //         const listItem = item.closest('li')
  //         if (listItem) {
  //           listItem.style.display = 'none'
  //         }
  //       }
  //     }
  //   })

  //   // Also hide submenu items that employees shouldn't see
  //   const submenuItems = document.querySelectorAll('.submenu-item')
  //   submenuItems.forEach(item => {
  //     const link = item as HTMLAnchorElement
  //     if (link.href) {
  //       const href = link.href.toLowerCase()
  //       // Hide User Management and Access Control for employees
  //       if (href.includes('user-management') || href.includes('access-control')) {
  //         const listItem = item.closest('li')
  //         if (listItem) {
  //           listItem.style.display = 'none'
  //         }
  //       }
  //     }
  //   })
  // }

  /**
   * Show or hide Access Control menu item based on user role
   * COMMENTED OUT: Temporarily disabled for development
   */
  // private updateAccessControlMenuItem(): void {
  //   const accessControlMenuItem = document.getElementById('accessControlMenuItem')
  //   if (!accessControlMenuItem) return

  //   // Check if user has access control permission
  //   // Wait a bit for accessControl to be available
  //   setTimeout(() => {
  //     if ((window as any).accessControl && (window as any).accessControl.hasAccessControlPermission) {
  //       accessControlMenuItem.style.display = 'block'
  //     } else {
  //       accessControlMenuItem.style.display = 'none'
  //     }
  //   }, 100)
  // }

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

