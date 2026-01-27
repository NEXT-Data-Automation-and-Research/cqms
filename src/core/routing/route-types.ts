/**
 * Route Types
 * Type definitions for the routing system
 */

/**
 * User roles that can access routes
 */
export type UserRole = 'all' | 'Employee' | 'Auditor' | 'Admin' | 'Manager' | 'Super Admin'

/**
 * Route metadata for navigation and permissions
 */
export interface RouteMeta {
  /** Display label for the route */
  label: string
  /** SVG icon path (inline SVG string) */
  icon: string
  /** Roles that can access this route */
  roles: UserRole[]
  /** Whether to show in sidebar */
  sidebar: boolean
  /** Badge text (e.g., "New", "Upcoming") */
  badge?: string
  /** Notification badge ID for dynamic counts */
  notificationBadgeId?: string
  /** Additional notification badge ID (for routes with multiple badges) */
  additionalNotificationBadgeId?: string
  /** Order in sidebar (lower = higher) */
  order?: number
}

/**
 * Submenu route item
 */
export interface SubmenuRoute {
  /** Route path */
  path: string
  /** Display label */
  label: string
  /** Roles that can access */
  roles: UserRole[]
  /** Clean URL slug (e.g., 'scorecards' for /settings/scorecards) */
  slug?: string
}

/**
 * Route with submenu
 */
export interface RouteWithSubmenu {
  /** Route path (parent) */
  path: string
  /** Clean URL slug (e.g., 'settings' for /settings) */
  slug?: string
  /** Route metadata */
  meta: RouteMeta
  /** Submenu items */
  submenu: SubmenuRoute[]
}

/**
 * Standard route definition
 */
export interface Route {
  /** Route path */
  path: string
  /** Clean URL slug (e.g., 'home' for /home) */
  slug?: string
  /** Route metadata */
  meta: RouteMeta
  /** Submenu (if any) */
  submenu?: SubmenuRoute[]
}

/**
 * Route configuration
 */
export type RouteConfig = Route | RouteWithSubmenu

