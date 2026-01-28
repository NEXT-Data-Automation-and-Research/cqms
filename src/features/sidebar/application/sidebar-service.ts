/**
 * Sidebar Service
 * This file does calculations and business rules
 */

import type { UserInfo } from '../domain/entities.js'
import type { PageWithoutSidebar } from '../domain/types.js'

/**
 * This class does business logic for the sidebar
 */
export class SidebarService {
  /**
   * Check if we should show sidebar on this page
   */
  shouldShowSidebarOnThisPage(): boolean {
    // Normalize path: strip trailing slash so "/my-activity/" -> "my-activity" not ""
    const pathname = window.location.pathname.replace(/\/$/, '') || '/'
    const currentPage = pathname.split('/').pop() || ''
    const pagesWithoutSidebar: PageWithoutSidebar[] = ['login.html', 'index.html']
    return !pagesWithoutSidebar.includes(currentPage as PageWithoutSidebar)
  }

  /**
   * Check if user info is old and needs refreshing
   */
  shouldRefreshUserInfo(lastFetchTime: number | null): boolean {
    if (!lastFetchTime) return true
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    return (now - lastFetchTime) > fiveMinutes
  }

  /**
   * Check if notification cache is still good
   */
  isNotificationCacheStillGood(timestamp: number | null): boolean {
    if (!timestamp) return false
    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    return (now - timestamp) <= fiveMinutes
  }

  /**
   * Calculate total reversals from all tables
   */
  calculateTotalReversals(counts: number[]): number {
    return counts.reduce((total, count) => total + count, 0)
  }

  /**
   * Check if user data actually changed
   * Includes role check to ensure sidebar updates when user role changes
   */
  didUserDataChange(oldUser: UserInfo | null, newUser: UserInfo): boolean {
    if (!oldUser) return true
    return (
      oldUser.name !== newUser.name ||
      oldUser.email !== newUser.email ||
      oldUser.avatar_url !== newUser.avatar_url ||
      oldUser.role !== newUser.role ||
      oldUser.department !== newUser.department ||
      oldUser.designation !== newUser.designation
    )
  }

  /**
   * Get user email for cache keys
   */
  getUserEmailForCache(userInfo: UserInfo | null): string {
    if (!userInfo || !userInfo.email) return 'anonymous'
    return userInfo.email.toLowerCase().trim()
  }
}

