/**
 * Router Service
 * Handles navigation and route matching
 */

import type { RouteConfig, UserRole } from './route-types.js'
import { routes } from './route-config.js'
import { navigateWithTransition } from '../../utils/page-transition.js'
import { getCleanPathFromFilePath, getFilePathFromCleanPath } from './route-mapper.js'

/**
 * Router class for navigation and route management
 */
export class Router {
  /**
   * Get current route path
   */
  getCurrentPath(): string {
    return window.location.pathname
  }

  /**
   * Check if a route matches the current path
   * Supports both clean URLs and old file paths for backward compatibility
   */
  isRouteActive(routePath: string, exact: boolean = false): boolean {
    const currentPath = this.getCurrentPath()
    
    // Convert routePath to clean URL if it's a file path
    const cleanRoutePath = getCleanPathFromFilePath(routePath) || routePath
    
    // Convert currentPath to clean URL if it's a file path
    const cleanCurrentPath = getCleanPathFromFilePath(currentPath) || currentPath
    
    if (exact) {
      // Check both clean URLs and original paths for exact match
      return currentPath === routePath || 
             cleanCurrentPath === cleanRoutePath ||
             cleanCurrentPath === routePath ||
             currentPath === cleanRoutePath
    }
    
    // Check if current path starts with route path or vice versa
    // Support both clean URLs and file paths
    return currentPath === routePath || 
           cleanCurrentPath === cleanRoutePath ||
           currentPath.startsWith(routePath) ||
           routePath.startsWith(currentPath) ||
           cleanCurrentPath.startsWith(cleanRoutePath) ||
           cleanRoutePath.startsWith(cleanCurrentPath)
  }

  /**
   * Check if user has access to route
   * 
   * SECURITY: When user role is unknown, only show routes available to everyone.
   * This prevents employees from briefly seeing admin-only menu items before
   * the role is loaded from the database.
   */
  canAccessRoute(routeRoles: UserRole[], userRole?: string): boolean {
    // If route allows 'all', always show it
    if (routeRoles.includes('all')) {
      return true
    }
    
    // SECURITY FIX: If no user role provided, be conservative - only show 'all' routes
    // This prevents unauthorized menu items from flashing before role is loaded
    // Once the actual role is fetched, the sidebar will regenerate with proper access
    if (!userRole) {
      return false
    }

    // Normalize role for comparison (trim and handle case)
    const normalizedUserRole = userRole.trim()
    
    // Check exact match first
    if (routeRoles.includes(normalizedUserRole as UserRole)) {
      return true
    }
    
    // Also check case-insensitive match for common role variations
    return routeRoles.some(routeRole => 
      routeRole.toLowerCase() === normalizedUserRole.toLowerCase()
    )
  }

  /**
   * Navigate to a route
   * Automatically converts file paths to clean URLs when available
   * Falls back to original path if no clean URL mapping exists (backward compatible)
   */
  navigate(path: string, options: { replace?: boolean } = {}): void {
    // Try to convert file path to clean URL
    const cleanPath = getCleanPathFromFilePath(path)
    const finalPath = cleanPath || path
    navigateWithTransition(finalPath, options)
  }

  /**
   * Get all routes
   */
  getAllRoutes(): RouteConfig[] {
    return routes
  }

  /**
   * Get routes visible in sidebar for a user role
   * 
   * SECURITY: When role is unknown, only returns routes available to everyone.
   * This prevents unauthorized menu items from appearing before role is loaded.
   */
  getSidebarRoutes(userRole?: string): RouteConfig[] {
    return routes
      .filter(route => {
        // Filter by sidebar visibility
        if (!route.meta.sidebar) {
          return false
        }

        // Filter by role access - uses canAccessRoute which is conservative
        // when role is unknown (only shows 'all' routes)
        return this.canAccessRoute(route.meta.roles, userRole)
      })
      .sort((a, b) => {
        // Sort by order
        const orderA = a.meta.order ?? 999
        const orderB = b.meta.order ?? 999
        return orderA - orderB
      })
  }

  /**
   * Find route by path
   */
  findRoute(path: string): RouteConfig | undefined {
    return routes.find(route => {
      // Check exact match
      if (route.path === path) {
        return true
      }

      // Check submenu items
      if (route.submenu) {
        return route.submenu.some(item => item.path === path)
      }

      return false
    })
  }

  /**
   * Get active route
   * Supports both clean URLs and old file paths
   */
  getActiveRoute(): RouteConfig | undefined {
    const currentPath = this.getCurrentPath()
    
    // Convert clean URL to file path if needed
    const filePath = getFilePathFromCleanPath(currentPath) || currentPath
    
    // Try exact match first (check both clean URL and file path)
    let route = routes.find(r => r.path === currentPath || r.path === filePath)
    if (route) {
      return route
    }

    // Try submenu match (check both clean URL and file path)
    for (const r of routes) {
      if (r.submenu) {
        const submenuMatch = r.submenu.find(item => 
          item.path === currentPath || item.path === filePath
        )
        if (submenuMatch) {
          return r
        }
      }
    }

    // Try partial match (check both clean URL and file path)
    return routes.find(r => {
      if (currentPath.includes(r.path) || r.path.includes(currentPath) ||
          filePath.includes(r.path) || r.path.includes(filePath)) {
        return true
      }
      if (r.submenu) {
        return r.submenu.some(item => 
          currentPath.includes(item.path) || item.path.includes(currentPath) ||
          filePath.includes(item.path) || item.path.includes(filePath)
        )
      }
      return false
    })
  }
}

// Export singleton instance
export const router = new Router()

