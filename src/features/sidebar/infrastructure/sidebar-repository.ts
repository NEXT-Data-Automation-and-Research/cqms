/**
 * Sidebar Repository
 * This file talks to the database to get information
 */

import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import type { UserInfo, ScorecardTable } from '../domain/entities.js'

/**
 * This class gets data from the database
 */
export class SidebarRepository {
  constructor(private db: IDatabaseClient) {}
  /**
   * Get user information from the database
   */
  async getUserInfoFromDatabase(userId: string): Promise<UserInfo | null> {
    // Get current user from auth
    if (!this.db.auth) {
      throw new Error('Database auth not available')
    }
    
    const { data: { user: authUser }, error: authError } = await this.db.auth.getUser()
    if (authError || !authUser) {
      throw new Error('User not authenticated')
    }

    // Fetch user data from database
    const { data: userData, error: dbError } = await this.db
      .from('users')
      .select(['full_name', 'email', 'avatar_url'])
      .eq('id', authUser.id)
      .single()
      .execute<any>()

    if (dbError) {
      throw dbError
    }

    if (!userData) {
      return null
    }

    // Convert database data to UserInfo format
    return {
      id: authUser.id,
      name: userData.full_name || authUser.email?.split('@')[0] || 'User',
      email: userData.email || authUser.email || '',
      avatar: userData.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      picture: userData.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      avatar_url: userData.avatar_url || null,
    }
  }

  /**
   * Get all scorecard table names from the database
   */
  async getAllScorecardTableNames(): Promise<string[]> {
    try {
      const { data: scorecards, error } = await this.db
        .from('scorecards')
        .select(['table_name'])
        .execute<ScorecardTable[]>()

      // Handle table not found errors gracefully
      if (error) {
        // PGRST205 = table not found, PGRST116 = relation does not exist
        if (error.code === 'PGRST205' || error.code === 'PGRST116' || error.code === '42P01' || error.code === '42703') {
          // Table doesn't exist, return empty array (not an error condition)
          return []
        }
        // For other errors, still throw
        throw error
      }

      if (!scorecards || scorecards.length === 0) {
        return []
      }

      return scorecards.map((sc: ScorecardTable) => sc.table_name)
    } catch (err: any) {
      // If table doesn't exist or schema cache issue, return empty array
      if (err?.code === 'PGRST205' || err?.code === 'PGRST116' || err?.code === '42P01' || err?.code === '42703' || 
          err?.message?.includes('scorecards') || err?.message?.includes('schema cache')) {
        return []
      }
      // Re-throw unexpected errors
      throw err
    }
  }

  /**
   * Count how many reversals are waiting in a table
   */
  async countPendingReversals(tableName: string): Promise<number> {
    // Use underlying Supabase client for count queries (Supabase-specific feature)
    const supabaseClient = (this.db as any).client;
    if (!supabaseClient) {
      throw new Error('Database connection not available')
    }

    const { count, error } = await supabaseClient
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .not('reversal_requested_at', 'is', null)
      .is('reversal_approved', null)

    if (error) {
      throw error
    }

    return count || 0
  }

  /**
   * Count employee reversals in a table
   */
  async countEmployeeReversals(tableName: string, employeeEmail: string, employeeName: string): Promise<number> {
    // Use underlying Supabase client for count queries (Supabase-specific feature)
    const supabaseClient = (this.db as any).client;
    if (!supabaseClient) {
      throw new Error('Database connection not available')
    }

    let countByName = 0
    let countByEmail = 0

    // Try matching by name first
    if (employeeName) {
      const { count, error } = await supabaseClient
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .not('reversal_requested_at', 'is', null)
        .not('reversal_approved', 'is', null)
        .ilike('employee_name', `%${employeeName}%`)

      if (!error && count !== null && count !== undefined) {
        countByName = count
      }
    }

    // Try matching by email
    if (employeeEmail) {
      const { count, error } = await supabaseClient
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .not('reversal_requested_at', 'is', null)
        .not('reversal_approved', 'is', null)
        .ilike('employee_email', employeeEmail)

      if (!error && count !== null && count !== undefined) {
        countByEmail = count
      }
    }

    // Use the maximum count (to avoid double counting if both match)
    return Math.max(countByName, countByEmail)
  }

  /**
   * Count pending acknowledgments in a table
   */
  async countPendingAcknowledgments(tableName: string, userEmail?: string): Promise<number> {
    try {
      let query = this.db
        .from(tableName)
        .select(['acknowledgement_status', 'employee_email'])

      // If filtering by user email
      if (userEmail) {
        query = query.eq('employee_email', userEmail)
      }

      const { data, error } = await query.execute<any[]>()

      if (error) {
        // If error is about column not existing, skip this table
        if (error.code === 'PGRST116' || error.code === '42703' || error.message?.includes('acknowledgement_status')) {
          return 0
        }
        throw error
      }

      if (!data || data.length === 0) {
        return 0
      }

      // Filter for pending acknowledgments: null, empty string, or 'Pending'
      const pending = data.filter((audit: any) => {
        // For employees, ensure exact email match (case-insensitive)
        if (userEmail) {
          const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim()
          if (auditEmployeeEmail !== userEmail.toLowerCase().trim()) {
            return false
          }
        }
        
        // Check if acknowledgment is pending
        const status = audit.acknowledgement_status
        return !status || status.trim() === '' || status === 'Pending'
      })

      return pending.length
    } catch (err: any) {
      // If column doesn't exist, skip this table
      if (err.message?.includes('acknowledgement_status') || err.code === 'PGRST116' || err.code === '42703') {
        return 0
      }
      throw err
    }
  }
}

