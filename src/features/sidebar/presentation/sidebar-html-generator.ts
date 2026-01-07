/**
 * Sidebar HTML Generator
 * Generates sidebar HTML dynamically from route configuration
 */

import { router } from '../../../core/routing/router.js'
import type { RouteConfig } from '../../../core/routing/route-types.js'
import type { UserInfo } from '../domain/entities.js'

/**
 * Generate sidebar HTML from route configuration
 */
export class SidebarHTMLGenerator {
  /**
   * Generate complete sidebar HTML
   */
  generate(userInfo: UserInfo | null): string {
    // Show all routes initially (like the old system)
    // Role-based hiding will be done by JavaScript after sidebar loads
    // Pass undefined when no userInfo to show all routes
    const userRole = userInfo?.role
    const sidebarRoutes = router.getSidebarRoutes(userRole)
    const currentPath = router.getCurrentPath()

    const menuItems = sidebarRoutes
      .map(route => this.generateMenuItem(route, currentPath, userRole))
      .filter(item => item !== '') // Filter out empty items (e.g., submenus with no accessible items)
      .join('')

    return this.generateSidebarTemplate(menuItems)
  }

  /**
   * Generate a single menu item HTML
   */
  private generateMenuItem(
    route: RouteConfig, 
    currentPath: string, 
    userRole?: string
  ): string {
    const isActive = router.isRouteActive(route.path)
    const hasSubmenu = route.submenu && route.submenu.length > 0

    if (hasSubmenu) {
      return this.generateSubmenuItem(route, currentPath, userRole)
    }

    const badge = route.meta.badge 
      ? `<span class="coming-soon-chip">${route.meta.badge}</span>` 
      : ''

    let notificationBadges = ''
    if (route.meta.notificationBadgeId) {
      notificationBadges += `<span class="notification-badge" id="${route.meta.notificationBadgeId}" style="display: none;">0</span>`
    }
    if (route.meta.additionalNotificationBadgeId) {
      notificationBadges += `<span class="notification-badge" id="${route.meta.additionalNotificationBadgeId}" style="display: none;">0</span>`
    }

    return `
      <li role="none">
        <a href="${route.path}" class="menu-item ${isActive ? 'active' : ''}" 
           role="menuitem" tabindex="0" aria-label="${route.meta.label}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            ${route.meta.icon}
          </svg>
          <span>${route.meta.label}</span>
          ${badge}
          ${notificationBadges}
        </a>
      </li>
    `
  }

  /**
   * Generate submenu item HTML
   */
  private generateSubmenuItem(
    route: RouteConfig,
    currentPath: string,
    userRole?: string
  ): string {
    if (!route.submenu || route.submenu.length === 0) {
      return ''
    }

    const isActive = route.submenu.some(item => 
      router.isRouteActive(item.path)
    )
    const isExpanded = isActive

    // Filter submenu items by access
    const accessibleSubmenuItems = route.submenu.filter(item => 
      router.canAccessRoute(item.roles, userRole)
    )

    // If no submenu items are accessible, don't show the parent menu item
    if (accessibleSubmenuItems.length === 0) {
      return ''
    }

    const submenuItems = accessibleSubmenuItems
      .map(item => {
        const itemActive = router.isRouteActive(item.path)
        const accessControlId = item.path.includes('access-control') 
          ? 'id="accessControlMenuItem"' 
          : ''
        const accessControlStyle = item.path.includes('access-control')
          ? 'style="display: none;"'
          : ''
        return `
          <li role="none" ${accessControlId} ${accessControlStyle}>
            <a class="submenu-item ${itemActive ? 'active' : ''}" 
               href="${item.path}" role="menuitem" tabindex="-1">
              <span>${item.label}</span>
            </a>
          </li>
        `
      }).join('')

    return `
      <li role="none" class="menu-item-with-submenu ${isExpanded ? 'expanded' : ''}">
        <button class="menu-item has-submenu" role="menuitem" tabindex="0" 
                aria-label="${route.meta.label}" 
                aria-expanded="${isExpanded ? 'true' : 'false'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            ${route.meta.icon}
          </svg>
          <span>${route.meta.label}</span>
          <svg class="submenu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <ul class="submenu ${isExpanded ? 'open' : ''}" role="menu">
          ${submenuItems}
        </ul>
      </li>
    `
  }

  /**
   * Generate search menu item
   */
  private generateSearchMenuItem(): string {
    return `
      <li role="none">
        <button class="menu-item" role="menuitem" tabindex="0" aria-label="Search" id="search-menu-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <span>Search</span>
        </button>
      </li>
    `
  }

  /**
   * Generate complete sidebar template
   */
  private generateSidebarTemplate(menuItems: string): string {
    const searchItem = this.generateSearchMenuItem()

    return `<!-- Sidebar Component -->
<nav class="sidebar collapsed" role="navigation" aria-label="Main navigation">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
        <button class="sidebar-brand-btn" role="button" tabindex="0" aria-label="NEXT QMS">
            <svg class="brand-icon" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm491-80h69v-69l-69 69Zm-457 0h73l120-120h85L452-200h64l120-120h85L541-200h65l120-120h34v-440H200v509l69-69h85L434-200Zm72-200-56-56 177-177 80 80 147-147 56 56-203 204-80-80-121 120Z"/>
            </svg>
            <span class="brand-text">NEXT QMS</span>
        </button>
    </div>
    
    <!-- Main Navigation Menu -->
    <ul class="menu-items" role="menubar">
        ${searchItem}
        ${menuItems}
    </ul>

    <!-- User Profile Section at Bottom -->
    <div class="user-profile-section">
        <div class="user-profile" role="button" tabindex="0" aria-label="User Profile">
            <div class="user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
            </div>
            <div class="user-info">
                <div class="user-name">Loading...</div>
                <div class="user-email">Loading...</div>
            </div>
        </div>
        
        <!-- Logout Link -->
        <div class="profile-links">
            <a href="#" class="profile-link logout-link">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/>
                </svg>
                <span>Logout</span>
            </a>
        </div>
    </div>
</nav>`
  }
}

