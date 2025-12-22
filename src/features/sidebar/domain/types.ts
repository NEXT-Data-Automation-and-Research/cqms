/**
 * Sidebar Domain Types
 * Simple type definitions that anyone can understand
 */

// What type of notification badge we have
export type NotificationType = 'reversals' | 'employeeReversals' | 'acknowledgments'

// Is the sidebar open or closed?
export type SidebarState = 'expanded' | 'collapsed'

// What pages should not show the sidebar?
export type PageWithoutSidebar = 'login.html' | 'index.html'

// How long to keep cached data (in milliseconds)
export const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

// How often to update notification counts (in milliseconds)
export const UPDATE_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

// How long to wait before refreshing user profile (in milliseconds)
export const USER_PROFILE_REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

