/**
 * Sidebar Repository
 * This file talks to the database to get information
 */

import { IDatabaseClient } from '../../../core/database/database-client.interface.js';
import type { UserInfo, ScorecardTable } from '../domain/entities.js'
import { logInfo, logWarn } from '../../../utils/logging-helper.js'
import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js'

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
    // Note: department and role are in the people table, not users table
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

    // Fetch additional data from people table (designation, department if not in users table)
    // Use getAuthenticatedSupabase directly (same approach as ProfileRepository) to ensure proper RLS
    let peopleData: any = null
    const userEmail = userData.email || authUser.email
    if (userEmail) {
      try {
        // Use getAuthenticatedSupabase directly for people table query (ensures RLS works correctly)
        const supabase = await getAuthenticatedSupabase()
        const { data: peopleResult, error: peopleError } = await supabase
          .from('people')
          .select('designation, department, role')
          .eq('email', userEmail)
          .maybeSingle()

        if (peopleError) {
          // Log error but continue - not all users may have people records
          logWarn('[SidebarRepository] Error fetching from people table:', {
            error: peopleError,
            email: userEmail,
            code: peopleError.code,
            message: peopleError.message
          })
        } else if (peopleResult) {
          peopleData = peopleResult
          logInfo('[SidebarRepository] People data fetched successfully:', {
            email: userEmail,
            designation: peopleResult.designation,
            department: peopleResult.department,
            role: peopleResult.role,
            hasDesignation: !!peopleResult.designation,
            hasDepartment: !!peopleResult.department
          })
        } else {
          logWarn('[SidebarRepository] No people record found for email:', userEmail)
        }
      } catch (peopleErr) {
        // Log error but continue - not all users may have people records
        logWarn('[SidebarRepository] Exception fetching from people table:', {
          error: peopleErr,
          email: userEmail
        })
      }
    }

    // Helper to convert empty strings to undefined
    const cleanValue = (value: any): string | undefined => {
      if (!value || value === '' || value === 'null' || value === 'undefined') {
        return undefined
      }
      return String(value).trim() || undefined
    }

    // Convert database data to UserInfo format
    // Prefer people table data for department/role/designation, fallback to users table
    const result = {
      id: authUser.id,
      name: userData.full_name || authUser.email?.split('@')[0] || 'User',
      email: userData.email || authUser.email || '',
      avatar: userData.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      picture: userData.avatar_url || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
      avatar_url: userData.avatar_url || null,
      role: cleanValue(peopleData?.role || userData.role),
      department: cleanValue(peopleData?.department || userData.department),
      designation: cleanValue(peopleData?.designation),
    }

    logInfo('[SidebarRepository] Final user info:', {
      designation: result.designation,
      department: result.department,
      role: result.role
    })

    return result
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
   * Count employee reversals from reversal_requests table
   * Uses the new reversal_requests table structure
   * Counts pending reversals (those awaiting response - not yet approved or rejected)
   * 
   * An employee should see reversals where:
   * 1. They requested the reversal (requested_by_email matches), OR
   * 2. The reversal is for their audit (employee_email matches)
   */
  async countEmployeeReversalsFromRequests(employeeEmail: string): Promise<number> {
    try {
      // Use underlying Supabase client for count queries (Supabase-specific feature)
      const supabaseClient = (this.db as any).client;
      if (!supabaseClient) {
        throw new Error('Database connection not available')
      }

      // Normalize email for comparison
      const normalizedEmail = employeeEmail.toLowerCase().trim()

      // Get all reversal requests for this employee that are still pending (no final decision)
      // Include reversals where:
      // 1. requested_by_email matches (they submitted the reversal), OR
      // 2. employee_email matches (the reversal is for their audit)
      // Only count those with final_decision = null so completed reversals don't show as pending
      const { data: reversalRequests, error: requestsError } = await supabaseClient
        .from('reversal_requests')
        .select('id')
        .or(`requested_by_email.eq.${normalizedEmail},employee_email.eq.${normalizedEmail}`)
        .is('final_decision', null)

      if (requestsError) {
        // Handle table not found gracefully
        if (requestsError.code === 'PGRST205' || requestsError.code === 'PGRST116' || 
            requestsError.code === '42P01' || requestsError.code === '42703') {
          return 0
        }
        throw requestsError
      }

      if (!reversalRequests || reversalRequests.length === 0) {
        return 0
      }

      // Get workflow states for these reversals
      const reversalIds = reversalRequests.map((rr: any) => rr.id)
      const { data: workflowStates, error: statesError } = await supabaseClient
        .from('reversal_workflow_states')
        .select('reversal_request_id, state')
        .in('reversal_request_id', reversalIds)
        .eq('is_current', true)

      if (statesError) {
        // If workflow_states table doesn't exist, fall back to final_decision check
        if (statesError.code === 'PGRST205' || statesError.code === 'PGRST116' || 
            statesError.code === '42P01' || statesError.code === '42703') {
          // Fallback: count by final_decision
          const { count, error: countError } = await supabaseClient
            .from('reversal_requests')
            .select('*', { count: 'exact', head: true })
            .or(`requested_by_email.eq.${normalizedEmail},employee_email.eq.${normalizedEmail}`)
            .is('final_decision', null)
          
          if (countError) {
            return 0
          }
          return count || 0
        }
        throw statesError
      }

      // Define pending states (reversals awaiting response)
      const pendingStates = [
        'submitted',
        'team_lead_review',
        'team_lead_approved',
        'qa_review',
        'cqc_review',
        'cqc_sent_back',
        'agent_re_review'
      ]

      // Count reversals in pending states
      if (!workflowStates || workflowStates.length === 0) {
        // No workflow states found - fallback to final_decision check
        const { count, error: countError } = await supabaseClient
          .from('reversal_requests')
          .select('*', { count: 'exact', head: true })
          .or(`requested_by_email.eq.${normalizedEmail},employee_email.eq.${normalizedEmail}`)
          .is('final_decision', null)
        
        if (countError) {
          return 0
        }
        return count || 0
      }

      // Count reversals with pending workflow states
      const pendingCount = workflowStates.filter((ws: any) => 
        pendingStates.includes(ws.state)
      ).length

      return pendingCount
    } catch (err: any) {
      // Handle table not found or schema issues gracefully
      if (err?.code === 'PGRST205' || err?.code === 'PGRST116' || err?.code === '42P01' || err?.code === '42703' ||
          err?.message?.includes('reversal_requests') || err?.message?.includes('reversal_workflow_states') || 
          err?.message?.includes('schema cache')) {
        return 0
      }
      throw err
    }
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

