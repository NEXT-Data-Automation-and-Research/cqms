/**
 * Home Domain Entities
 * Data shapes that represent real things in our app
 */

import type { UpdateType, AuditStatus, DatePeriod, ActiveFilters } from './types.js'

/**
 * Information about a user
 */
export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar_url?: string | null
}

/**
 * Information about an audit assignment
 */
export interface AuditAssignment {
  id: string
  auditor_email: string
  employee_email: string
  scorecard_id: string
  status: 'pending' | 'in_progress'
  created_at: string
  updated_at: string
}

/**
 * Information about a completed audit
 */
export interface CompletedAudit {
  id: string
  employee_email: string
  employee_name?: string
  auditor_email?: string
  auditor_name?: string
  interaction_id?: string
  submitted_at: string
  passing_status?: string
  scorecard_id?: string
  table_name?: string
}

/**
 * Information about an update in the feed
 */
export interface Update {
  id: string
  type: UpdateType
  displayName: string | null
  displayEmail: string | null
  timestamp: string
  status?: string
  interactionId?: string
  scorecardId?: string
  scorecardTable?: string
  auditId?: string
  assignmentId?: string
}

/**
 * Information about statistics
 */
export interface Stats {
  totalAssigned: number
  completed: number
  inProgress: number
  pending: number
  remaining: number
  percentage: number
  daysRemaining: number
  avgDurationText: string
  totalAuditsConducted: number
  totalAuditsWithScore: number
  avgQualityScoreText: string
  passingCount: number
  notPassingCount: number
  activeReversals: number
  resolvedReversals: number
  totalReversals: number
  requiresAcknowledgment: number
}

/**
 * Information about a notification
 */
export interface Notification {
  id: string
  type: string
  message: string
  read: boolean
  created_at: string
  assignmentId?: string
  auditId?: string
  tableName?: string
}

/**
 * Information about an event
 */
export interface Event {
  id: string
  title: string
  date: string
  description?: string
}

/**
 * Information about filter options
 */
export interface FilterOptions {
  channels: string[]
  statuses: string[]
  agents: User[]
}

