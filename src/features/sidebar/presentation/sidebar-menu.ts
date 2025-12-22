/**
 * Sidebar Menu
 * This file handles menu clicks and submenu toggles
 */

import { sidebarState } from '../application/sidebar-state.js'

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
    const currentPath = window.location.pathname
    const menuItems = document.querySelectorAll('.menu-item, .submenu-item')
    
    menuItems.forEach(item => {
      const link = item as HTMLAnchorElement
      if (link.href) {
        const linkPath = new URL(link.href).pathname
        if (currentPath === linkPath || currentPath.includes(linkPath)) {
          item.classList.add('active')
        } else {
          item.classList.remove('active')
        }
      }
    })
  }
}

