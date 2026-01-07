/**
 * Sidebar Menu
 * This file handles menu clicks and submenu toggles
 */

import { sidebarState } from '../application/sidebar-state.js'
import { router } from '../../../core/routing/router.js'

/**
 * This class handles menu interactions
 */
export class SidebarMenu {
  /**
   * Set up all menu click handlers
   */
  setupMenuHandlers(): void {
    this.setupSubmenuToggles()
    this.setupSearchMenuHandler()
    this.setupAccessControlMenuItem()
    this.setupActiveMenuItem()
    this.setupNavigationHandlers()
  }

  /**
   * Make submenus open and close when clicked
   */
  private setupSubmenuToggles(): void {
    const submenuButtons = document.querySelectorAll('.menu-item.has-submenu')
    
    submenuButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        const menuItem = button.closest('.menu-item-with-submenu')
        if (!menuItem) return

        const submenu = menuItem.querySelector('.submenu')
        if (!submenu) return

        const isExpanded = button.getAttribute('aria-expanded') === 'true'
        
        // Close all other submenus
        submenuButtons.forEach(otherButton => {
          if (otherButton !== button) {
            otherButton.setAttribute('aria-expanded', 'false')
            const otherMenuItem = otherButton.closest('.menu-item-with-submenu')
            const otherSubmenu = otherMenuItem?.querySelector('.submenu')
            if (otherSubmenu) {
              otherSubmenu.classList.remove('open')
            }
            if (otherMenuItem) {
              otherMenuItem.classList.remove('expanded')
            }
          }
        })

        // Toggle current submenu
        if (isExpanded) {
          button.setAttribute('aria-expanded', 'false')
          submenu.classList.remove('open')
          menuItem.classList.remove('expanded')
        } else {
          button.setAttribute('aria-expanded', 'true')
          submenu.classList.add('open')
          menuItem.classList.add('expanded')
        }
      })
    })

    // Close submenus when clicking outside
    document.addEventListener('click', (e) => {
      const target = e.target as Element
      if (!target.closest('.menu-item-with-submenu')) {
        submenuButtons.forEach(button => {
          button.setAttribute('aria-expanded', 'false')
          const menuItem = button.closest('.menu-item-with-submenu')
          const submenu = menuItem?.querySelector('.submenu')
          if (submenu) {
            submenu.classList.remove('open')
          }
          if (menuItem) {
            menuItem.classList.remove('expanded')
          }
        })
      }
    })
  }

  /**
   * Handle search menu button click
   */
  private setupSearchMenuHandler(): void {
    const searchBtn = document.getElementById('search-menu-btn')
    if (!searchBtn) return

    searchBtn.addEventListener('click', () => {
      // Trigger search modal or search functionality
      const searchEvent = new CustomEvent('openSearchModal')
      window.dispatchEvent(searchEvent)
    })
  }

  /**
   * Show or hide Access Control menu item based on user role
   */
  private setupAccessControlMenuItem(): void {
    const accessControlMenuItem = document.getElementById('accessControlMenuItem')
    if (!accessControlMenuItem) return

    // Check if user has access control permission
    if ((window as any).accessControl && (window as any).accessControl.hasAccessControlPermission) {
      accessControlMenuItem.style.display = 'block'
    } else {
      accessControlMenuItem.style.display = 'none'
    }
  }

  /**
   * Highlight the active menu item based on current page
   */
  private setupActiveMenuItem(): void {
    const currentPath = router.getCurrentPath()
    const menuItems = document.querySelectorAll('.menu-item, .submenu-item')
    
    menuItems.forEach(item => {
      const link = item as HTMLAnchorElement
      if (link.href) {
        const linkPath = new URL(link.href).pathname
        const isActive = router.isRouteActive(linkPath)
        
        if (isActive) {
          item.classList.add('active')
          // Also mark parent submenu as active if it's a submenu item
          const submenuItem = item.closest('.menu-item-with-submenu')
          if (submenuItem) {
            submenuItem.classList.add('expanded')
            const submenu = submenuItem.querySelector('.submenu')
            if (submenu) {
              submenu.classList.add('open')
            }
            const button = submenuItem.querySelector('.has-submenu')
            if (button) {
              button.setAttribute('aria-expanded', 'true')
            }
          }
        } else {
          item.classList.remove('active')
        }
      }
    })
  }

  /**
   * Set up navigation handlers using router
   */
  private setupNavigationHandlers(): void {
    // Handle menu item clicks
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a.menu-item, a.submenu-item') as HTMLAnchorElement
      
      if (link && link.href && !link.classList.contains('logout-link')) {
        const url = new URL(link.href)
        const currentUrl = new URL(window.location.href)
        
        // Only handle internal navigation
        if (url.origin === currentUrl.origin && url.pathname !== currentUrl.pathname) {
          e.preventDefault()
          router.navigate(url.pathname)
        }
      }
    })
  }
}

