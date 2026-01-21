# Auditor Dashboard - Business Logic & Security Analysis

## Executive Summary

This document analyzes the business logic, data requirements, and security posture of the new auditors dashboard. The dashboard provides team statistics and standup views for quality auditors, aggregating data from multiple audit tables and assignments.

---

## Business Logic Overview

### Purpose
The auditor dashboard serves two main views:
1. **Team Stats Tab**: Shows aggregated performance metrics for all auditors
2. **Standup View Tab**: Provides detailed breakdowns for daily standup meetings

### Key Features

#### Team Stats Tab
- **Assigned Count**: Assignments scheduled in the selected period
- **Completed Count**: Assignments completed in the period
- **In Progress**: Assignments currently being worked on
- **Average Duration**: Mean audit duration across all audits
- **Reversals**: Count of audits with reversal requests
- **Passing Rate**: Percentage of audits that passed
- **Per-Auditor Breakdown**: Individual stats for each auditor

#### Standup View Tab
- **Overall Stats**: Similar to Team Stats but for standup context
- **Channel Breakdown**: Stats grouped by channel (e.g., Email, Chat)
- **Backlog/Early Completions**: Assignments completed before/after scheduled date
- **Hourly Breakdown**: Activity distribution throughout the day

---

## Data Requirements

### Primary Data Sources

#### 1. `audit_assignments` Table
**Purpose**: Tracks audit assignments to auditors

**Key Fields Used**:
- `auditor_email`: Who the audit is assigned to
- `employee_email`: Who is being audited
- `status`: pending, in_progress, completed
- `scheduled_date`: When the audit is scheduled (DATE type)
- `created_at`: When assignment was created (TIMESTAMPTZ)
- `completed_at`: When audit was completed (TIMESTAMPTZ)
- `scorecard_id`: Links to scorecard configuration

**Queries**:
- **Scheduled assignments**: Filtered by `scheduled_date` (or `created_at` fallback) within period
- **Completed assignments**: Filtered by `completed_at` within period
- **Status filtering**: Used to count pending/in_progress/completed

**Security**: ✅ RLS policies enforce that users can only see:
- Assignments where they are the auditor (`auditor_email`)
- Assignments where they are the employee (`employee_email`)
- Assignments they created (`assigned_by`)
- Admins can see all assignments

#### 2. Dynamic Audit Tables (e.g., `fnchat_cfd`, `fnchat_cfd_v4_0_v2`)
**Purpose**: Store actual audit data and results

**Discovery Mechanism**:
- Uses `get_audit_tables()` RPC function to discover tables
- Falls back to `scorecards` table if RPC fails
- Filters out `ai_analysis_results` and `calibration_results`

**Key Fields Used**:
- `submitted_at`: When audit was submitted (for date filtering)
- `audit_duration`: Duration of audit (for averages)
- `passing_status`: Whether audit passed (for passing rate)
- `reversal_requested_at`: If reversal was requested (for reversal count)
- `auditor_email`: Who performed the audit
- `employee_email`: Who was audited (for channel grouping)

**Queries Per Table**:
1. **Duration Query**: `SELECT audit_duration, submitted_at WHERE audit_duration IS NOT NULL`
2. **Reversal Query**: `SELECT id, submitted_at WHERE reversal_requested_at IS NOT NULL`
3. **Passing Query**: `SELECT passing_status, submitted_at`
4. **Completed Query**: `SELECT id, submitted_at, employee_email WHERE submitted_at IS NOT NULL`

**Security**: ⚠️ **CONCERN**: All authenticated users can read ALL audit data
- RLS policy: `auth.role() = 'authenticated'` (no filtering by auditor/employee)
- This means any authenticated user can see all audits from all auditors
- **Recommendation**: Add auditor/employee filtering to RLS policies

#### 3. `people` Table
**Purpose**: User profile information

**Key Fields Used**:
- `email`: User email (primary key)
- `name`: User's display name
- `role`: User's role (Auditor, Employee, Admin, etc.)
- `channel`: User's channel assignment

**Queries**:
- Loaded once and cached for 5 minutes
- Used to enrich auditor information and group by channel

**Security**: ✅ RLS policy allows authenticated users to read all people data
- This is appropriate for dashboard aggregation needs

#### 4. `scorecards` Table
**Purpose**: Scorecard configuration metadata

**Key Fields Used**:
- `table_name`: Name of the audit table
- `is_active`: Whether scorecard is active
- `id`: Links to `audit_assignments.scorecard_id`

**Queries**:
- Used as fallback to discover audit tables if RPC fails
- Filtered by `is_active = true`

**Security**: ✅ RLS policies allow authenticated users to read active scorecards

---

## Query Patterns & Performance

### Date Filtering Strategy

The dashboard uses a **two-tier date filtering approach**:

1. **Server-Side Filtering** (Preferred):
   - Converts Dhaka timezone dates to UTC ISO strings
   - Uses `.gte()` and `.lte()` on `submitted_at`/`completed_at` columns
   - More efficient as filtering happens in database

2. **Client-Side Filtering** (Fallback):
   - If server-side filtering fails or returns errors
   - Fetches all data and filters in JavaScript
   - Converts UTC timestamps back to Dhaka timezone for comparison
   - Less efficient but more reliable

**Date Conversion Functions**:
- `dhakaDateToUTCISO(date)`: Converts Dhaka Date → UTC ISO string
- `toDhakaTime(utcString)`: Converts UTC string → Dhaka Date
- `getDhakaStartOfDay(date)`: Gets start of day in Dhaka timezone
- `formatDhakaDateForInput(date)`: Formats date as YYYY-MM-DD for comparison

### Parallel Query Execution

The dashboard optimizes performance by:
- **Parallelizing queries** across multiple audit tables using `Promise.all()`
- **Parallelizing queries** within each table (duration, reversal, passing queries)
- **Cancellation support**: Uses `fetchId` to cancel outdated fetches

### Caching Strategy

- **Users Cache**: 5 minutes in `sessionStorage`
- **Scorecard Tables**: Cached in memory (`cachedScorecardTables`)
- **No caching** for assignment/audit data (always fresh)

---

## Security Analysis

### ✅ What's Working Well

1. **Authentication Required**: All queries require authenticated users via `secure-supabase.js`
2. **RLS Enabled**: All tables have RLS enabled
3. **Assignment Access Control**: `audit_assignments` has proper RLS policies
4. **Client-Side Auth Verification**: `secure-supabase.js` verifies auth before each query

### ⚠️ Security Concerns

#### 1. **Overly Permissive Audit Table Policies**

**Issue**: Audit tables (e.g., `fnchat_cfd`, `fnchat_cfd_v4_0_v2`) allow **any authenticated user** to read **all audit data**.

**Current Policy**:
```sql
CREATE POLICY "Authenticated users can read audits" 
ON fnchat_cfd 
FOR SELECT 
USING (auth.role() = 'authenticated')
```

**Problem**: 
- An auditor can see audits performed by other auditors
- An employee can see audits of other employees
- No data isolation between users

**Impact**: 
- Privacy violation: Users can see audit data they shouldn't access
- Compliance risk: May violate data privacy regulations
- Business logic mismatch: Dashboard aggregates all data, but individual users shouldn't see everything

**Recommendation**: 
Add auditor/employee filtering to RLS policies:
```sql
-- Option 1: Auditors can see audits they performed
CREATE POLICY "Auditors can read their audits" 
ON fnchat_cfd 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  auditor_email = (SELECT (auth.jwt() ->> 'email'))
);

-- Option 2: Employees can see audits of them
CREATE POLICY "Employees can read their audits" 
ON fnchat_cfd 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  employee_email = (SELECT (auth.jwt() ->> 'email'))
);

-- Option 3: Admins can see all audits
CREATE POLICY "Admins can read all audits" 
ON fnchat_cfg 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role IN ('Super Admin', 'Admin')
  )
);
```

**However**: This creates a **conflict** with dashboard requirements:
- Dashboard needs to aggregate data from ALL auditors
- If RLS filters by auditor, dashboard queries will only return current user's data

**Solution Options**:
1. **Service Role Key**: Use service role key for dashboard queries (bypasses RLS)
   - ✅ Secure: Only server-side code can use it
   - ✅ Flexible: Can aggregate all data
   - ⚠️ Requires: Moving dashboard logic to server-side API

2. **Dashboard-Specific Role**: Create a "Dashboard Viewer" role with broader permissions
   - ✅ Maintains RLS structure
   - ⚠️ Requires: Role-based access control implementation

3. **Separate Dashboard Tables**: Create aggregated views/tables for dashboard
   - ✅ Clear separation of concerns
   - ⚠️ Requires: ETL process to populate aggregated data

#### 2. **get_audit_tables() RPC Function Security**

**Current Implementation**:
- Function is `SECURITY DEFINER` (runs with creator's privileges)
- Grants execute to both `authenticated` and `anon` roles
- Returns table names based on naming patterns

**Concerns**:
- `anon` role can execute (though they can't read tables due to RLS)
- Function doesn't filter by user permissions
- Could expose table names that users shouldn't know about

**Recommendation**:
- Remove `anon` grant: `REVOKE EXECUTE ON FUNCTION get_audit_tables() FROM anon;`
- Consider filtering tables by user's access permissions

#### 3. **Missing RLS Policies**

**Tables with RLS enabled but no policies**:
- `access_control_rules`
- `audit_activity_log`
- `calibration_results`
- `calibration_sessions`
- `user_access_rule`

**Impact**: These tables are effectively inaccessible to all users (RLS blocks everything when no policies exist)

**Recommendation**: Add appropriate RLS policies or disable RLS if public access is intended

#### 4. **Function Search Path Security**

**Issue**: Several functions have mutable `search_path`:
- `get_audit_tables()`
- `add_audit_table_rls_policy()`
- `create_audit_table()`
- `fix_audit_table_schema()`
- `update_updated_at_column()`

**Risk**: SQL injection via `search_path` manipulation

**Recommendation**: Set `search_path` explicitly:
```sql
CREATE OR REPLACE FUNCTION get_audit_tables()
RETURNS TABLE(table_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
-- function body
$$;
```

---

## Data Flow & Architecture

### Initialization Flow

```
1. Page Load
   ↓
2. Initialize Supabase Client (secure-supabase.js)
   ↓
3. Load Users (cached for 5 min)
   - Query: audit_assignments → distinct auditor_email
   - Enrich: people table → name, role, channel
   ↓
4. Load Scorecards (cached in memory)
   - Query: scorecards WHERE is_active = true
   ↓
5. Discover Audit Tables
   - Try: RPC get_audit_tables()
   - Fallback: scorecards.table_name
   ↓
6. Load Dashboard Data (based on current tab)
   - Team Stats: assignments + audit data aggregation
   - Standup View: assignments + audit data + channel breakdown
```

### Team Stats Calculation Flow

```
1. Get Period Dates (Today/Week/Month/Custom)
   ↓
2. Load Scheduled Assignments
   - Filter by scheduled_date (or created_at) within period
   ↓
3. Load Completed Assignments
   - Filter by completed_at within period
   ↓
4. Merge & Deduplicate Assignments
   ↓
5. Extract Unique Auditor Emails
   ↓
6. For Each Audit Table (parallel):
   a. Query Duration Data
   b. Query Reversal Data
   c. Query Passing Status Data
   ↓
7. Aggregate Results
   - Calculate averages
   - Count totals
   - Group by auditor
   ↓
8. Render Dashboard
```

### Standup View Calculation Flow

```
1. Get Period Dates
   ↓
2. Load All Assignments (no role filter)
   ↓
3. Extract Unique Auditor Emails
   ↓
4. For Each Audit Table (parallel):
   a. Query Passing Status
   b. Query Reversals
   c. Query Duration
   d. Query Completed Audits (for channel grouping)
   ↓
5. Calculate Backlog/Early Completions
   - Compare scheduled_date vs completed_at
   ↓
6. Group by Channel
   - Use employee_email → people.channel mapping
   ↓
7. Render Dashboard
```

---

## Recommendations

### Immediate Actions

1. **Fix Missing RLS Policies**
   - Add policies for `audit_activity_log`, `calibration_results`, etc.
   - Or disable RLS if public access is intended

2. **Secure get_audit_tables() RPC**
   - Remove `anon` role grant
   - Consider adding user permission filtering

3. **Fix Function Search Paths**
   - Add `SET search_path = public, pg_temp` to all SECURITY DEFINER functions

### Medium-Term Improvements

1. **Implement Proper Audit Table Access Control**
   - Decide on approach: Service Role API vs Role-Based Access vs Aggregated Views
   - Implement chosen solution
   - Test that dashboard still works correctly

2. **Optimize Query Performance**
   - Consider creating materialized views for dashboard aggregations
   - Add database indexes on frequently filtered columns (`submitted_at`, `completed_at`, `auditor_email`)

3. **Add Query Monitoring**
   - Log slow queries
   - Monitor RLS policy performance
   - Track dashboard load times

### Long-Term Considerations

1. **Dashboard API Endpoint**
   - Move aggregation logic to server-side
   - Use service role key for data access
   - Implement proper caching (Redis)
   - Add rate limiting

2. **Data Privacy Compliance**
   - Document data access patterns
   - Implement audit logging for sensitive data access
   - Consider data retention policies

3. **Scalability**
   - Current approach queries all tables in parallel
   - May become slow with many audit tables
   - Consider pagination or incremental loading

---

## Testing Recommendations

### Security Testing

1. **Test RLS Policies**:
   - Verify auditors can only see their own assignments
   - Verify employees can only see their own audits
   - Verify admins can see all data
   - Test with unauthenticated users (should fail)

2. **Test Dashboard Access**:
   - Verify dashboard loads for authenticated users
   - Verify dashboard fails for unauthenticated users
   - Test with different user roles

3. **Test Data Isolation**:
   - Create test audits for different auditors
   - Verify users can't see other users' audit data
   - Verify dashboard aggregates correctly

### Performance Testing

1. **Load Testing**:
   - Test with large number of audit tables
   - Test with large date ranges
   - Test with many concurrent users

2. **Query Performance**:
   - Monitor query execution times
   - Check for N+1 query problems
   - Verify parallelization is working

### Functional Testing

1. **Date Filtering**:
   - Test Today/Week/Month filters
   - Test custom date ranges
   - Test timezone conversions (Dhaka ↔ UTC)

2. **Data Accuracy**:
   - Verify counts match actual data
   - Verify averages are calculated correctly
   - Verify passing rates are accurate

---

## Conclusion

The auditor dashboard has a solid foundation with proper authentication and RLS structure. However, there are **critical security concerns** around audit table access control that need to be addressed. The dashboard's requirement to aggregate data from all auditors conflicts with the principle of least privilege.

**Key Decision Needed**: How should dashboard aggregation queries access data?
- Option A: Service Role API (recommended for security)
- Option B: Role-Based Dashboard Access
- Option C: Aggregated Views/Tables

Once this decision is made, the implementation can proceed with proper security controls while maintaining dashboard functionality.

---

## Questions for Discussion

1. **Who should have access to the dashboard?**
   - All authenticated users?
   - Only auditors and admins?
   - Specific roles?

2. **What level of data access is acceptable?**
   - Can auditors see other auditors' individual audits?
   - Can they see aggregated team stats?
   - Should there be different views for different roles?

3. **Performance vs Security Trade-offs**:
   - Is the current client-side aggregation acceptable?
   - Should we move to server-side API for better security?
   - What are the performance requirements?

4. **Data Privacy Requirements**:
   - Are there compliance requirements (GDPR, etc.)?
   - What data retention policies apply?
   - Should audit access be logged?

---

*Last Updated: [Current Date]*
*Analysis By: AI Assistant*
*Reviewed By: [Pending]*
