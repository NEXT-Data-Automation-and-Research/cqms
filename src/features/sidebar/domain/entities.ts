/**
 * Sidebar Domain Entities
 * Data shapes that represent real things in our app
 */

/**
 * Information about the logged-in user
 */
export interface UserInfo {
  id: string                    // User's unique ID
  name: string                  // User's full name
  email: string                 // User's email address
  avatar: string | null         // User's profile picture URL
  picture: string | null         // Same as avatar (for compatibility)
  avatar_url: string | null      // Same as avatar (for compatibility)
  role?: string                 // User's role (Employee, Auditor, etc.)
  department?: string            // User's department
  designation?: string          // User's designation/job title
}

/**
 * Information about notification counts
 */
export interface NotificationCounts {
  reversals: number              // How many reversals need attention
  employeeReversals: number      // How many employee reversals
  acknowledgments: number        // How many acknowledgments pending
}

/**
 * Information about a scorecard table
 */
export interface ScorecardTable {
  table_name: string            // Name of the table in the database
}

