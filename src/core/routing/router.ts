/**
 * Router Service
 * Handles navigation and route matching
 */

import type { RouteConfig, UserRole } from './route-types.js'
import { routes } from './route-config.js'
import { navigateWithTransition } from '../../utils/page-transition.js'

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
   */
  isRouteActive(routePath: string, exact: boolean = false): boolean {
    const currentPath = this.getCurrentPath()
    
    if (exact) {
      return currentPath === routePath
    }
    
    // Check if current path starts with route path or vice versa
    return currentPath === routePath || 
           currentPath.startsWith(routePath) ||
           routePath.startsWith(currentPath)
  }

  /**
   * Check if user has access to route
   */
  canAccessRoute(routeRoles: UserRole[], userRole?: string): boolean {
    // If route allows 'all', always show it
    if (routeRoles.includes('all')) {
      return true
    }
    
    // If no user role provided, show routes that allow 'all' only
    // This matches the old behavior where all routes were shown initially
    if (!userRole) {
      return routeRoles.includes('all')
    }

    return routeRoles.includes(userRole as UserRole)
  }

  /**
   * Navigate to a route
   */
  navigate(path: string, options: { replace?: boolean } = {}): void {
    navigateWithTransition(path, options)
  }

  /**
   * Get all routes
   */
  getAllRoutes(): RouteConfig[] {
    return routes
  }

  /**
   * Get routes visible in sidebar for a user role
   * If no role is provided, shows all sidebar routes (matching old behavior)
   */
  getSidebarRoutes(userRole?: string): RouteConfig[] {
    return routes
      .filter(route => {
        // Filter by sidebar visibility
        if (!route.meta.sidebar) {
          return false
        }

        // If no role provided, show all sidebar routes (old behavior - show all, hide with JS)
        // This allows the sidebar to render all routes initially, then JavaScript can hide them
        if (!userRole) {
          return true
        }

        // Filter by role access when role is provided
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
   */
  getActiveRoute(): RouteConfig | undefined {
    const currentPath = this.getCurrentPath()
    
    // Try exact match first
    let route = routes.find(r => r.path === currentPath)
    if (route) {
      return route
    }

    // Try submenu match
    for (const r of routes) {
      if (r.submenu) {
        const submenuMatch = r.submenu.find(item => item.path === currentPath)
        if (submenuMatch) {
          return r
        }
      }
    }

    // Try partial match
    return routes.find(r => {
      if (currentPath.includes(r.path) || r.path.includes(currentPath)) {
        return true
      }
      if (r.submenu) {
        return r.submenu.some(item => 
          currentPath.includes(item.path) || item.path.includes(currentPath)
        )
      }
      return false
    })
  }
}

// Export singleton instance
export const router = new Router()

