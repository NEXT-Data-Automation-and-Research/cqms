/**
 * Home Domain Types
 * Simple type definitions for the home page
 */

// How to sort audits
export type SortOption = 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'status_asc' | 'status_desc'

// What type of update is this?
export type UpdateType = 'audit_completed' | 'reversal_requested' | 'reversal_responded' | 'reversal_status_update' | 'assignment_created'

// What status does an audit have?
export type AuditStatus = 'pending' | 'in_progress' | 'completed' | 'passed' | 'not_passed'

// What type of date filter?
export type DateFilterType = 'week' | 'month' | 'range'

// What period are we looking at?
export interface DatePeriod {
  start: Date | null
  end: Date | null
}

// What filters are active?
export interface ActiveFilters {
  channel: string
  status: string
  agent: string
}

