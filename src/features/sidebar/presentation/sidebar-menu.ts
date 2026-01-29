/**
 * Sidebar Menu
 * This file handles menu clicks and submenu toggles
 */

import { router } from '../../../core/routing/router.js'

let sidebarMenuDelegatedHandlersAttached = false
let accessControlVisibilityPollStarted = false

/**
 * This class handles menu interactions
 */
export class SidebarMenu {
  /**
   * Set up all menu click handlers
   */
  setupMenuHandlers(): void {
    this.attachDelegatedHandlersOnce()
    this.setupAccessControlMenuItem()
    this.setupActiveMenuItem()
  }

  /**
   * Attach delegated handlers only once.
   *
   * Important: The sidebar DOM can be replaced at runtime (e.g. when user role/permissions load),
   * so element-bound listeners would be lost and/or duplicated. Delegation keeps behavior stable.
   */
  private attachDelegatedHandlersOnce(): void {
    if (sidebarMenuDelegatedHandlersAttached) return
    sidebarMenuDelegatedHandlersAttached = true

    const closeAllSubmenus = () => {
      const buttons = document.querySelectorAll<HTMLButtonElement>('.menu-item.has-submenu')
      buttons.forEach(btn => {
        btn.setAttribute('aria-expanded', 'false')
        const menuItem = btn.closest('.menu-item-with-submenu')
        const submenu = menuItem?.querySelector('.submenu')
        submenu?.classList.remove('open')
        menuItem?.classList.remove('expanded')
      })
    }

    document.addEventListener('click', (e) => {
      const target = e.target as Element | null
      if (!target) return

      // Search button
      const searchBtn = target.closest('#search-menu-btn')
      if (searchBtn) {
        const searchEvent = new CustomEvent('openSearchModal')
        window.dispatchEvent(searchEvent)
        return
      }

      // Submenu toggle button
      const submenuToggle = target.closest('button.menu-item.has-submenu') as HTMLButtonElement | null
      if (submenuToggle) {
        e.preventDefault()
        e.stopPropagation()

        const menuItem = submenuToggle.closest('.menu-item-with-submenu')
        const submenu = menuItem?.querySelector('.submenu')
        if (!menuItem || !submenu) return

        const isExpanded = submenuToggle.getAttribute('aria-expanded') === 'true'

        // Close others first
        const allButtons = document.querySelectorAll<HTMLButtonElement>('.menu-item.has-submenu')
        allButtons.forEach(otherButton => {
          if (otherButton === submenuToggle) return
          otherButton.setAttribute('aria-expanded', 'false')
          const otherMenuItem = otherButton.closest('.menu-item-with-submenu')
          const otherSubmenu = otherMenuItem?.querySelector('.submenu')
          otherSubmenu?.classList.remove('open')
          otherMenuItem?.classList.remove('expanded')
        })

        // Toggle current
        if (isExpanded) {
          submenuToggle.setAttribute('aria-expanded', 'false')
          submenu.classList.remove('open')
          menuItem.classList.remove('expanded')
        } else {
          submenuToggle.setAttribute('aria-expanded', 'true')
          submenu.classList.add('open')
          menuItem.classList.add('expanded')
        }

        return
      }

      // Clicked outside: close all submenus
      if (!target.closest('.menu-item-with-submenu')) {
        closeAllSubmenus()
      }
    })
  }

  /**
   * Show or hide Access Control menu item based on user role
   */
  private setupAccessControlMenuItem(): void {
    const accessControlMenuItem = document.getElementById('accessControlMenuItem')
    if (!accessControlMenuItem) return

    const applyVisibility = (): boolean => {
      const hasPermission =
        Boolean((window as any).accessControl) &&
        Boolean((window as any).accessControl.hasAccessControlPermission)

      accessControlMenuItem.style.display = hasPermission ? 'block' : 'none'
      return Boolean((window as any).accessControl)
    }

    // Apply once immediately.
    const accessControlExists = applyVisibility()

    // Edge case: accessControl may load after sidebar renders (lazy-loaded scripts).
    // Start a short-lived poll once per page to avoid permanent "hidden" state.
    if (!accessControlExists && !accessControlVisibilityPollStarted) {
      accessControlVisibilityPollStarted = true

      let attempts = 0
      const maxAttempts = 15 // ~3s at 200ms
      const intervalMs = 200

      const interval = window.setInterval(() => {
        attempts++
        const nowExists = applyVisibility()
        if (nowExists || attempts >= maxAttempts) {
          window.clearInterval(interval)
        }
      }, intervalMs)
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
}

