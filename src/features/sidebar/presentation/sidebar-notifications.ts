/**
 * Sidebar Notifications
 * This file shows the red notification badges
 */

import type { NotificationType } from '../domain/types.js'
import { DatabaseFactory } from '../../../infrastructure/database-factory.js'
import { SidebarRepository } from '../infrastructure/sidebar-repository.js'
import { sidebarState } from '../application/sidebar-state.js'
import { SidebarService } from '../application/sidebar-service.js'
import { UPDATE_INTERVAL_MS } from '../domain/types.js'

/**
 * This class shows notification badges on the sidebar
 */
export class SidebarNotifications {
  private repository: SidebarRepository | null = null
  private service: SidebarService
  private updateIntervals: {
    reversals: NodeJS.Timeout | null
    employeeReversals: NodeJS.Timeout | null
    acknowledgments: NodeJS.Timeout | null
  } = {
    reversals: null,
    employeeReversals: null,
    acknowledgments: null
  }

  constructor() {
    // Don't create database client in constructor - wait until it's needed
    this.service = new SidebarService()
  }

  /**
   * Get or create the repository (lazy initialization)
   */
  private getRepository(): SidebarRepository {
    if (!this.repository) {
      // Wait for supabase client to be available
      if (typeof window === 'undefined' || !(window as any).supabaseClient) {
        throw new Error('Supabase client not initialized. Please wait for initialization.')
      }
      const db = DatabaseFactory.createClient('supabase')
      this.repository = new SidebarRepository(db)
    }
    return this.repository
  }

  /**
   * Show how many reversals are waiting
   */
  showReversalCount(count: number): void {
    const badge = document.getElementById('reversalNotificationBadge')
    if (!badge) return

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count.toString()
      badge.style.display = 'inline-flex'
    } else {
      badge.style.display = 'none'
    }
  }

  /**
   * Show how many employee reversals
   */
  showEmployeeReversalCount(count: number): void {
    const badge = document.getElementById('employeeReversalNotificationBadge')
    if (!badge) return

    // Only show for employees
    const userInfo = sidebarState.loadUserInfo()
    if (userInfo && userInfo.role !== 'Employee') {
      badge.style.display = 'none'
      return
    }

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count.toString()
      badge.style.display = 'inline-flex'
    } else {
      badge.style.display = 'none'
    }
  }

  /**
   * Show how many acknowledgments are waiting
   */
  showAcknowledgmentCount(count: number): void {
    const badge = document.getElementById('acknowledgmentNotificationBadge')
    if (!badge) return

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count.toString()
      badge.style.display = 'inline-flex'
    } else {
      badge.style.display = 'none'
    }
  }

  /**
   * Load notification counts from cache and display them immediately
   */
  loadNotificationCountsFromCache(): void {
    const userInfo = sidebarState.loadUserInfo()
    const userEmail = this.service.getUserEmailForCache(userInfo)

    // Load reversal count from cache
    const cachedReversals = sidebarState.getNotificationCountFromCache('reversals', userEmail)
    if (cachedReversals !== null) {
      this.showReversalCount(cachedReversals)
    }

    // Load employee reversal count from cache
    const cachedEmployeeReversals = sidebarState.getNotificationCountFromCache('employeeReversals', userEmail)
    if (cachedEmployeeReversals !== null) {
      this.showEmployeeReversalCount(cachedEmployeeReversals)
    }

    // Load acknowledgment count from cache
    const cachedAcknowledgments = sidebarState.getNotificationCountFromCache('acknowledgments', userEmail)
    if (cachedAcknowledgments !== null) {
      this.showAcknowledgmentCount(cachedAcknowledgments)
    }
  }

  /**
   * Update all notification counts from database
   */
  async updateAllNotificationCounts(): Promise<void> {
    await Promise.all([
      this.updateReversalCount(),
      this.updateEmployeeReversalCount(),
      this.updateAcknowledgmentCount()
    ])
  }

  /**
   * Update reversal count from database
   */
  async updateReversalCount(): Promise<void> {
    try {
      // Only show for non-employees (auditors, quality analysts, etc.)
      const userInfo = sidebarState.loadUserInfo()
      if (userInfo && userInfo.role === 'Employee') {
        // Hide the badge for employees
        this.showReversalCount(0)
        return
      }

      if (!window.supabaseClient) {
        // Supabase not initialized yet, try again after a delay
        setTimeout(() => this.updateReversalCount(), 1000)
        return
      }

      // Get all scorecard table names
      const tableNames = await this.getRepository().getAllScorecardTableNames()

      if (tableNames.length === 0) {
        this.showReversalCount(0)
        return
      }

      // Count pending reversals from all scorecard tables
      const counts: number[] = []
      for (const tableName of tableNames) {
        try {
          const count = await this.getRepository().countPendingReversals(tableName)
          counts.push(count)
        } catch (err: any) {
          // Silently skip tables that don't exist or have errors
          // Only log unexpected errors (not table/column missing errors)
          if (err?.code !== 'PGRST205' && err?.code !== 'PGRST116' && err?.code !== '42P01' && err?.code !== '42703') {
            // Only log if it's not a "table not found" type error
            continue
          }
          continue
        }
      }

      // Calculate total
      const totalPending = this.service.calculateTotalReversals(counts)

      // Save to cache and show
      const userEmail = this.service.getUserEmailForCache(userInfo)
      sidebarState.saveNotificationCountToCache('reversals', totalPending, userEmail)
      this.showReversalCount(totalPending)
    } catch (error: any) {
      // Handle errors gracefully - check if it's a "table not found" error
      const isTableNotFound = error?.code === 'PGRST205' || error?.code === 'PGRST116' || 
                             error?.code === '42P01' || error?.code === '42703' ||
                             error?.message?.includes('scorecards') || 
                             error?.message?.includes('schema cache')
      
      if (!isTableNotFound) {
        // Only log unexpected errors (not table missing errors)
        // Silently handle missing tables
      }
      
      // Don't show badge on error, but keep cached value if available
      const userInfo = sidebarState.loadUserInfo()
      const userEmail = this.service.getUserEmailForCache(userInfo)
      const cachedCount = sidebarState.getNotificationCountFromCache('reversals', userEmail)
      if (cachedCount !== null) {
        this.showReversalCount(cachedCount)
      } else {
        this.showReversalCount(0)
      }
    }
  }

  /**
   * Update employee reversal count from database
   */
  async updateEmployeeReversalCount(): Promise<void> {
    try {
      // Only show for employees
      const userInfo = sidebarState.loadUserInfo()
      if (!userInfo || userInfo.role !== 'Employee') {
        return
      }

      if (!window.supabaseClient) {
        // Supabase not initialized yet, try again after a delay
        setTimeout(() => this.updateEmployeeReversalCount(), 1000)
        return
      }

      const employeeName = userInfo.name || ''
      const employeeEmail = userInfo.email || ''

      if (!employeeName && !employeeEmail) {
        return
      }

      // Get all scorecard table names
      const tableNames = await this.getRepository().getAllScorecardTableNames()

      if (tableNames.length === 0) {
        this.showEmployeeReversalCount(0)
        return
      }

      // Count reversals that belong to this employee and have been responded to
      const counts: number[] = []
      for (const tableName of tableNames) {
        try {
          const count = await this.getRepository().countEmployeeReversals(tableName, employeeEmail, employeeName)
          counts.push(count)
        } catch (err: any) {
          // Silently skip tables that don't exist or have errors
          if (err?.code !== 'PGRST205' && err?.code !== 'PGRST116' && err?.code !== '42P01' && err?.code !== '42703') {
            // Only skip, don't log expected errors
            continue
          }
          continue
        }
      }

      // Calculate total
      const totalResponded = this.service.calculateTotalReversals(counts)

      // Save to cache and show
      const userEmail = this.service.getUserEmailForCache(userInfo)
      sidebarState.saveNotificationCountToCache('employeeReversals', totalResponded, userEmail)
      this.showEmployeeReversalCount(totalResponded)
    } catch (error: any) {
      // Handle errors gracefully - check if it's a "table not found" error
      const isTableNotFound = error?.code === 'PGRST205' || error?.code === 'PGRST116' || 
                             error?.code === '42P01' || error?.code === '42703' ||
                             error?.message?.includes('scorecards') || 
                             error?.message?.includes('schema cache')
      
      if (!isTableNotFound) {
        // Only log unexpected errors (not table missing errors)
        // Silently handle missing tables
      }
      
      // Keep cached value if available
      const userInfo = sidebarState.loadUserInfo()
      const userEmail = this.service.getUserEmailForCache(userInfo)
      const cachedCount = sidebarState.getNotificationCountFromCache('employeeReversals', userEmail)
      if (cachedCount !== null) {
        this.showEmployeeReversalCount(cachedCount)
      } else {
        this.showEmployeeReversalCount(0)
      }
    }
  }

  /**
   * Update acknowledgment count from database
   */
  async updateAcknowledgmentCount(): Promise<void> {
    try {
      if (!window.supabaseClient) {
        // Supabase not initialized yet, try again after a delay
        setTimeout(() => this.updateAcknowledgmentCount(), 1000)
        return
      }

      // Get user info to check if they are an employee/agent
      const userInfo = sidebarState.loadUserInfo()
      const isAgent = userInfo && userInfo.role === 'Employee'
      const currentUserEmail = userInfo ? (userInfo.email || '').toLowerCase().trim() : ''

      // Get all scorecard table names
      const tableNames = await this.getRepository().getAllScorecardTableNames()

      if (tableNames.length === 0) {
        this.showAcknowledgmentCount(0)
        return
      }

      // Count pending acknowledgments from all scorecard tables
      const counts: number[] = []
      for (const tableName of tableNames) {
        try {
          const count = await this.getRepository().countPendingAcknowledgments(
            tableName,
            isAgent ? currentUserEmail : undefined
          )
          counts.push(count)
        } catch (err: any) {
          // Silently skip tables that don't exist or have missing columns
          // Check for table/column not found errors
          if (err?.message?.includes('acknowledgement_status') || 
              err?.code === 'PGRST116' || err?.code === '42703' ||
              err?.code === 'PGRST205' || err?.code === '42P01') {
            continue
          }
          // Only skip, don't log expected errors
          continue
        }
      }

      // Calculate total
      const totalPending = this.service.calculateTotalReversals(counts)

      // Save to cache and show
      const userEmail = this.service.getUserEmailForCache(userInfo)
      sidebarState.saveNotificationCountToCache('acknowledgments', totalPending, userEmail)
      this.showAcknowledgmentCount(totalPending)
    } catch (error: any) {
      // Handle errors gracefully - check if it's a "table not found" error
      const isTableNotFound = error?.code === 'PGRST205' || error?.code === 'PGRST116' || 
                             error?.code === '42P01' || error?.code === '42703' ||
                             error?.message?.includes('scorecards') || 
                             error?.message?.includes('schema cache')
      
      if (!isTableNotFound) {
        // Only log unexpected errors (not table missing errors)
        // Silently handle missing tables
      }
      
      // Keep cached value if available
      const userInfo = sidebarState.loadUserInfo()
      const userEmail = this.service.getUserEmailForCache(userInfo)
      const cachedCount = sidebarState.getNotificationCountFromCache('acknowledgments', userEmail)
      if (cachedCount !== null) {
        this.showAcknowledgmentCount(cachedCount)
      } else {
        this.showAcknowledgmentCount(0)
      }
    }
  }

  /**
   * Set up intervals to update notification counts periodically
   */
  setupNotificationUpdateIntervals(): void {
    // Clear any existing intervals
    this.clearNotificationUpdateIntervals()

    // Set up interval for reversals (for auditors)
    this.updateIntervals.reversals = setInterval(() => {
      this.updateReversalCount()
    }, UPDATE_INTERVAL_MS)

    // Set up interval for employee reversals (for employees)
    this.updateIntervals.employeeReversals = setInterval(() => {
      this.updateEmployeeReversalCount()
    }, UPDATE_INTERVAL_MS)

    // Set up interval for acknowledgments
    this.updateIntervals.acknowledgments = setInterval(() => {
      this.updateAcknowledgmentCount()
    }, UPDATE_INTERVAL_MS)
  }

  /**
   * Clear notification update intervals
   */
  clearNotificationUpdateIntervals(): void {
    if (this.updateIntervals.reversals) {
      clearInterval(this.updateIntervals.reversals)
      this.updateIntervals.reversals = null
    }
    if (this.updateIntervals.employeeReversals) {
      clearInterval(this.updateIntervals.employeeReversals)
      this.updateIntervals.employeeReversals = null
    }
    if (this.updateIntervals.acknowledgments) {
      clearInterval(this.updateIntervals.acknowledgments)
      this.updateIntervals.acknowledgments = null
    }
  }
}

