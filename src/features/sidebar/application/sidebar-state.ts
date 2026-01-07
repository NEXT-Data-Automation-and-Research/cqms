/**
 * Sidebar State
 * This file remembers things about the sidebar
 */

import type { UserInfo, NotificationCounts } from '../domain/entities.js'
import type { SidebarState } from '../domain/types.js'
import { logError } from '../../../utils/logging-helper.js'

/**
 * This class remembers sidebar information
 */
export class SidebarStateManager {
  // Did we load the sidebar yet?
  isSidebarLoaded: boolean = false

  // Is sidebar open or closed?
  sidebarIsExpanded: boolean = false

  // Who is logged in?
  currentUser: UserInfo | null = null

  // How many notifications?
  notificationCounts: NotificationCounts = {
    reversals: 0,
    employeeReversals: 0,
    acknowledgments: 0
  }

  /**
   * Save sidebar state to browser storage
   */
  saveSidebarState(state: SidebarState): void {
    try {
      localStorage.setItem('sidebarState', state)
    } catch (error) {
      logError('Error saving sidebar state:', error)
    }
  }

  /**
   * Load sidebar state from browser storage
   */
  loadSidebarState(): SidebarState {
    try {
      return (localStorage.getItem('sidebarState') || 'collapsed') as SidebarState
    } catch (error) {
      logError('Error loading sidebar state:', error)
      return 'collapsed'
    }
  }

  /**
   * Save user info to browser storage
   */
  saveUserInfo(user: UserInfo): void {
    try {
      localStorage.setItem('userInfo', JSON.stringify(user))
      localStorage.setItem('userProfileLastFetch', Date.now().toString())
    } catch (error) {
      logError('Error saving user info:', error)
    }
  }

  /**
   * Load user info from browser storage
   */
  loadUserInfo(): UserInfo | null {
    try {
      const userInfo = localStorage.getItem('userInfo')
      if (!userInfo) return null
      
      const parsedUserInfo = JSON.parse(userInfo) as UserInfo
      
      // Migration: If user has 'picture' field but no 'avatar', copy it over
      if (parsedUserInfo && parsedUserInfo.picture && !parsedUserInfo.avatar) {
        parsedUserInfo.avatar = parsedUserInfo.picture
        localStorage.setItem('userInfo', JSON.stringify(parsedUserInfo))
      }
      
      return parsedUserInfo
    } catch (error) {
      logError('Error loading user info:', error)
      return null
    }
  }

  /**
   * Get notification count from cache
   */
  getNotificationCountFromCache(type: string, userEmail: string): number | null {
    try {
      const cacheKey = `notification_count_${type}_${userEmail.toLowerCase().trim()}`
      const timestampKey = `notification_count_${type}_timestamp_${userEmail.toLowerCase().trim()}`
      const cachedData = localStorage.getItem(cacheKey)
      const cachedTimestamp = localStorage.getItem(timestampKey)

      if (!cachedData || !cachedTimestamp) {
        return null
      }

      const timestamp = parseInt(cachedTimestamp, 10)
      const now = Date.now()
      const fiveMinutes = 5 * 60 * 1000

      // Check if cache is still valid
      if (now - timestamp > fiveMinutes) {
        // Cache expired, clear it
        localStorage.removeItem(cacheKey)
        localStorage.removeItem(timestampKey)
        return null
      }

      return parseInt(cachedData, 10)
    } catch (error) {
      logError(`Error reading notification count cache for ${type}:`, error)
      return null
    }
  }

  /**
   * Save notification count to cache
   */
  saveNotificationCountToCache(type: string, count: number, userEmail: string): void {
    try {
      const cacheKey = `notification_count_${type}_${userEmail.toLowerCase().trim()}`
      const timestampKey = `notification_count_${type}_timestamp_${userEmail.toLowerCase().trim()}`
      localStorage.setItem(cacheKey, count.toString())
      localStorage.setItem(timestampKey, Date.now().toString())
    } catch (error) {
      logError(`Error writing notification count cache for ${type}:`, error)
    }
  }

  /**
   * Check if user profile needs refreshing
   */
  shouldRefreshUserProfile(): boolean {
    const lastFetchTime = localStorage.getItem('userProfileLastFetch')
    if (!lastFetchTime) return true

    const now = Date.now()
    const fiveMinutes = 5 * 60 * 1000
    return (now - parseInt(lastFetchTime)) > fiveMinutes
  }
}

// Create a single instance to share
export const sidebarState = new SidebarStateManager()

