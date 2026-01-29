/**
 * Sidebar HTML Generator
 * Generates sidebar HTML dynamically from route configuration
 */

import { router } from '../../../core/routing/router.js'
import type { RouteConfig, UserRole } from '../../../core/routing/route-types.js'
import type { UserInfo } from '../domain/entities.js'
import { getCleanPathFromFilePath } from '../../../core/routing/route-mapper.js'

/**
 * Generate sidebar HTML from route configuration.
 * When pagePermissions is provided, submenu items with permissionResource use it; otherwise role-based.
 */
export class SidebarHTMLGenerator {
  /**
   * Check if user can access a route based on permissions, roles, and allowed emails.
   * 
   * Permission hierarchy:
   * 1. If allowedEmails is specified → only those emails can access (strict email check)
   * 2. If permission check returns TRUE → allow (permission system grants access)
   * 3. If permission check returns FALSE → check route config roles as fallback
   * 4. If no permissionResource or no pagePermissions → use route config roles only
   * 
   * This ensures:
   * - Email-restricted routes are only visible to specific users
   * - Individual ALLOW permissions grant access even if role wouldn't
   * - Role-based access from route config is always respected as fallback
   * - Users see all pages their role allows, plus any individually granted
   */
  private checkRouteAccess(
    permissionResourceName: string | undefined,
    allowedRoles: UserRole[],
    userRole: string | undefined,
    userEmail: string | undefined,
    pagePermissions?: Record<string, { hasAccess: boolean; reason?: string }>,
    allowedEmails?: string[]
  ): boolean {
    // If route has email restriction, only those specific emails can access
    if (allowedEmails && allowedEmails.length > 0) {
      if (!userEmail) return false;
      const normalizedUserEmail = userEmail.toLowerCase().trim();
      const hasEmailAccess = allowedEmails.some(
        email => email.toLowerCase().trim() === normalizedUserEmail
      );
      if (!hasEmailAccess) return false;
      // If email matches, still need to pass role check
    }
    
    // If we have permission data and a resource name to check
    if (permissionResourceName && pagePermissions) {
      const permissionResult = pagePermissions[permissionResourceName];

      // If permission system explicitly grants access → allow
      if (permissionResult?.hasAccess === true) {
        return true;
      }

      // If explicitly denied by an individual rule, hide the item even if role would allow.
      const reason = (permissionResult?.reason || '').toLowerCase();
      if (reason.includes('individual deny')) {
        return false;
      }
    }
    
    // Fall back to route config role check
    return router.canAccessRoute(allowedRoles, userRole);
  }
  /**
   * Generate complete sidebar HTML.
   * @param userInfo - Current user (for role and email checks).
   * @param pagePermissions - Optional map resourceName -> hasAccess for permission-based menu items.
   */
  generate(
    userInfo: UserInfo | null,
    pagePermissions?: Record<string, { hasAccess: boolean; reason?: string }> | null
  ): string {
    const userRole = userInfo?.role;
    const userEmail = userInfo?.email;
    const currentPath = router.getCurrentPath();
    const accessibleRoutes = router.getSidebarRoutes(userRole);

    const menuItems = accessibleRoutes
      .map(route => this.generateMenuItem(route, currentPath, userRole, userEmail, pagePermissions ?? undefined))
      .filter(item => item !== '')
      .join('');

    return this.generateSidebarTemplate(menuItems);
  }

  /**
   * Generate a single menu item HTML
   * 
   * Permission hierarchy:
   * 1. If allowedEmails specified → only those emails can see this item
   * 2. If permission check returns true → show (explicit allow or role allows via permission system)
   * 3. If permission check returns false → fall back to route config roles (allow if role matches)
   * 4. If no permissionResource defined → use route config roles only
   * 
   * This ensures role-based access from route config is always respected,
   * while individual permissions can grant additional access.
   */
  private generateMenuItem(
    route: RouteConfig,
    currentPath: string,
    userRole?: string,
    userEmail?: string,
    pagePermissions?: Record<string, { hasAccess: boolean; reason?: string }>
  ): string {
    const hasSubmenu = route.submenu && route.submenu.length > 0;

    if (hasSubmenu) {
      return this.generateSubmenuItem(route, currentPath, userRole, userEmail, pagePermissions);
    }

    // Determine if user can access this route (including email check)
    const canAccess = this.checkRouteAccess(
      route.meta.permissionResource?.name,
      route.meta.roles,
      userRole,
      userEmail,
      pagePermissions,
      route.meta.allowedEmails
    );

    if (!canAccess) {
      return '';
    }

    const isActive = router.isRouteActive(route.path);

    // Use clean URL if available, fallback to original path (backward compatible)
    const href = getCleanPathFromFilePath(route.path) || route.path

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
        <a href="${href}" class="menu-item ${isActive ? 'active' : ''}" 
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
   * Generate submenu item HTML.
   * Uses the same permission hierarchy as top-level items:
   * 1. allowedEmails → strict email check
   * 2. Permission TRUE → allow
   * 3. Permission FALSE → fall back to route config roles
   * 4. No permission data → use route config roles
   */
  private generateSubmenuItem(
    route: RouteConfig,
    currentPath: string,
    userRole?: string,
    userEmail?: string,
    pagePermissions?: Record<string, { hasAccess: boolean; reason?: string }>
  ): string {
    if (!route.submenu || route.submenu.length === 0) {
      return '';
    }

    const isActive = route.submenu.some(item => router.isRouteActive(item.path));
    const isExpanded = isActive;

    // Filter submenu items using the same access check logic
    const accessibleSubmenuItems = route.submenu.filter(item => {
      return this.checkRouteAccess(
        item.permissionResource?.name,
        item.roles,
        userRole,
        userEmail,
        pagePermissions
      );
    });

    // If no submenu items are accessible, don't show the parent menu item
    if (accessibleSubmenuItems.length === 0) {
      return ''
    }

    const submenuItems = accessibleSubmenuItems
      .map(item => {
        const itemActive = router.isRouteActive(item.path)
        // Use clean URL if available, fallback to original path (backward compatible)
        const href = getCleanPathFromFilePath(item.path) || item.path
        const accessControlId = item.path.includes('access-control') 
          ? 'id="accessControlMenuItem"' 
          : ''
        const accessControlStyle = item.path.includes('access-control')
          ? 'style="display: none;"'
          : ''
        return `
          <li role="none" ${accessControlId} ${accessControlStyle}>
            <a class="submenu-item ${itemActive ? 'active' : ''}" 
               href="${href}" role="menuitem" tabindex="-1">
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

    return `<!-- Hamburger Menu Toggle Button (Mobile Only) -->
<button class="menu-toggle" id="mobileMenuToggle" aria-label="Toggle navigation menu" aria-expanded="false">
    <div class="hamburger-icon">
        <span></span>
        <span></span>
        <span></span>
    </div>
</button>

<!-- Sidebar Overlay (Mobile Only) -->
<div class="sidebar-overlay" id="sidebarOverlay"></div>

<!-- Sidebar Component -->
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
        <div class="user-profile" role="button" tabindex="0" aria-label="View your profile - Click to open profile page">
            <div class="user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
            </div>
            <div class="user-info">
                <div class="user-name">Loading...</div>
                <div class="user-email">Loading...</div>
                <div class="user-designation" style="display: none;"></div>
                <div class="user-department" style="display: none;"></div>
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

