# Database Scalability & Reorganization Analysis

## Executive Summary

This document provides a comprehensive analysis of the current database architecture, data flow patterns, CRUD operations, and proposes scalable reorganization strategies for the Express CQMS (Quality Management System) application.

---

## 1. Current Database Architecture

### 1.1 Core Tables

#### **users** (Supabase Auth Integration)
- **Purpose**: User authentication and profile data
- **Primary Key**: `id` (UUID, references `auth.users`)
- **Key Fields**: 
  - `email` (unique), `full_name`, `avatar_url`, `provider`
  - `last_sign_in_at`, `sign_in_count`, `device_info` (JSONB)
  - `notification_preferences` (JSONB)
- **Relationships**: One-to-many with `notifications`, `notification_subscriptions`
- **RLS**: Disabled (access via authenticated API)

#### **people** (Employee Directory)
- **Purpose**: Employee/organizational data (separate from auth users)
- **Primary Key**: `email` (no UUID primary key - architectural concern)
- **Key Fields**:
  - `email`, `name`, `role`, `department`, `designation`
  - `employee_id`, `channel`, `team`, `team_supervisor`, `quality_mentor`
  - `country`, `is_active`, `intercom_admin_alias`
  - `last_login`, `login_count`, `avatar_url`
- **Relationships**: Referenced by `audit_assignments`, audit tables
- **RLS**: Enabled with permissive read policies
- **Issue**: No primary key constraint, uses email as identifier

#### **scorecards** (Audit Templates)
- **Purpose**: Defines audit templates and scoring configurations
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `name`, `description`, `table_name` (target audit table)
  - `passing_threshold`, `scoring_type`, `channels`
  - `is_active`, `version`, `parent_scorecard_id`
  - `allow_over_100`, `max_bonus_points`
- **Relationships**: One-to-many with `scorecard_perameters`, `audit_assignments`
- **RLS**: Not specified (likely disabled)

#### **scorecard_perameters** (Scorecard Parameters)
- **Purpose**: Defines individual parameters/errors for scorecards
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `scorecard_id` (FK), `error_name`, `penalty_points`
  - `parameter_type` (error/achievement/bonus)
  - `field_type` (counter/radio), `field_id`
  - `enable_ai_audit`, `prompt`, `is_fail_all`
  - `requires_feedback`, `display_order`, `is_active`
- **Relationships**: Many-to-one with `scorecards`
- **Note**: Table name has typo ("perameters" vs "parameters")

#### **audit_assignments** (Work Assignment)
- **Purpose**: Tracks audit assignments to auditors
- **Primary Key**: `id` (UUID)
- **Key Fields**:
  - `employee_email`, `employee_name`, `auditor_email`
  - `scorecard_id` (FK), `status` (pending/in_progress/completed/cancelled)
  - `scheduled_date`, `week`, `completed_at`, `audit_id`
  - `conversation_id`, `intercom_alias`, `source_type`
  - `assigned_by`, `created_at`
- **Relationships**: Many-to-one with `scorecards`, references `people` via email
- **RLS**: Enabled with role-based policies

#### **Dynamic Audit Tables** (Scorecard-Specific)
- **Purpose**: Store actual audit data (one table per scorecard)
- **Naming Pattern**: Defined by `scorecard.table_name`
- **Common Fields** (via `fix_audit_table_schema` function):
  - Identity: `id`, `employee_email`, `employee_name`, `auditor_email`, `auditor_name`
  - Interaction: `interaction_id`, `interaction_date`, `channel`, `transcript`
  - Scoring: `average_score`, `critical_errors`, `total_errors_count`
  - Status: `passing_status`, `validation_status`, `acknowledgement_status`
  - Timing: `audit_duration`, `submitted_at`, `audit_start_time`, `audit_end_time`
  - Reversal: `reversal_requested_at`, `reversal_approved`
  - Dynamic: Parameter-specific fields (e.g., `field_id`, `feedback_field_id`)
- **RLS**: Enabled per table
- **Issue**: Schema fragmentation, no unified audit data model

#### **notifications**
- **Purpose**: Notification history and queued notifications
- **Primary Key**: `id` (UUID)
- **Key Fields**: `user_id` (FK), `title`, `body`, `type`, `category`, `status`
- **Relationships**: Many-to-one with `users`
- **RLS**: Disabled

#### **notification_subscriptions**
- **Purpose**: Web push notification subscriptions
- **Primary Key**: `id` (UUID)
- **Key Fields**: `user_id` (FK), `endpoint`, `p256dh`, `auth`, device metadata
- **Relationships**: Many-to-one with `users`
- **RLS**: Not specified

#### **events** (Event Management)
- **Purpose**: Calendar events and meetings
- **Primary Key**: `id` (UUID)
- **Key Fields**: `title`, `type`, `date`, `start_time`, `end_time`
- **Key Fields**: `participants` (JSONB array), `meet_link`, `created_by`
- **RLS**: Not specified

#### **access_control_rules** (Permissions - Role-Based)
- **Purpose**: Role-based permission rules
- **Key Fields**: `rule_type`, `resource_name`, `allowed_roles` (JSONB), `min_role_level`
- **Relationships**: Used by permission service

#### **user_access_rule** (Permissions - Individual)
- **Purpose**: Individual user permission overrides
- **Key Fields**: `user_email`, `rule_type`, `resource_name`, `access_type` (allow/deny)
- **Relationships**: Used by permission service

#### **role_hierarchy**
- **Purpose**: Role hierarchy levels (optional enhancement)
- **Key Fields**: `role_name`, `level` (0-5), `description`
- **Relationships**: Used by permission service

#### **api_access_logs** (Audit Logging)
- **Purpose**: API access tracking
- **Key Fields**: `user_id`, `endpoint`, `method`, `ip_address`, `timestamp`, `success`
- **RLS**: Enabled (service role access only)

#### **channels** (Reference Data)
- **Purpose**: Communication channels (Email, Chat, etc.)
- **Key Fields**: `id`, `name`, `description`, `is_active`

#### **intercom_admin_cache** (Reference Data)
- **Purpose**: Cached Intercom admin data
- **Key Fields**: `id`, `email`, `name`

---

## 2. Data Flow Patterns

### 2.1 Frontend → Backend → Database Flow

```
Frontend (HTML/TS)
  ↓ (apiClient utility)
Express API Routes (/api/*)
  ↓ (Middleware: auth, permission, validation)
Supabase Client (Service Role)
  ↓ (RLS Policies)
PostgreSQL Database
```

### 2.2 Key Data Flow Examples

#### **User Authentication Flow**
1. User signs in via Google OAuth → Supabase Auth
2. Frontend calls `POST /api/users` → Creates `users` record
3. Profile data merged from `people` table (if exists)
4. Session token stored client-side

#### **Audit Creation Flow**
1. User selects scorecard → Loads `scorecard` + `scorecard_perameters`
2. Fills audit form → Validates against parameter definitions
3. Submits → `POST` to dynamic audit table (`scorecard.table_name`)
4. Updates `audit_assignments.status` → 'completed'
5. Calculates scores → Stores in audit table

#### **Audit Assignment Flow**
1. Admin creates assignment → `POST /api/audit-assignments`
2. Creates `audit_assignments` record → Status: 'pending'
3. Auditor views assignments → Filters by `auditor_email`
4. Starts audit → Updates status to 'in_progress'
5. Completes audit → Updates status to 'completed', links `audit_id`

#### **Audit Reports Flow**
1. User selects filters → Date range, scorecard, channel, etc.
2. Discovers audit tables → `get_audit_tables()` RPC function
3. Queries multiple tables → Aggregates across scorecard tables
4. Applies filters → Client-side filtering (performance concern)
5. Renders results → Pagination, sorting, export

---

## 3. CRUD Operations Analysis

### 3.1 Create Operations

| Entity | Endpoint | Table(s) | Notes |
|--------|----------|----------|-------|
| User Profile | `POST /api/users` | `users` | After OAuth signup |
| Person | `POST /api/people` | `people` | Admin only, bulk upload supported |
| Scorecard | Scorecard management UI | `scorecards`, `scorecard_perameters` | Creates audit table via RPC |
| Audit Assignment | Assignment UI | `audit_assignments` | Links employee to auditor |
| Audit Record | Audit form submission | Dynamic audit table | One per scorecard type |
| Event | Event management UI | `events` | Calendar events |
| Notification | System/API | `notifications` | Background jobs |
| Permission Rule | Permission management UI | `access_control_rules`, `user_access_rule` | Admin only |

### 3.2 Read Operations

| Entity | Endpoint | Table(s) | Filters/Joins |
|--------|----------|----------|---------------|
| User Profile | `GET /api/users/:id` | `users`, `people` | Joined by email |
| People List | `GET /api/people` | `people` | Filtered by role, channel, team |
| Scorecards | Scorecard queries | `scorecards`, `scorecard_perameters` | Filtered by `is_active`, `channels` |
| Audit Assignments | Assignment queries | `audit_assignments`, `scorecards` | Filtered by `auditor_email`, `status`, date range |
| Audit Records | Audit reports | Multiple dynamic tables | Aggregated across tables, complex filtering |
| Events | Event queries | `events` | Filtered by date, `created_by` |
| Notifications | Notification queries | `notifications` | Filtered by `user_id`, `status` |

### 3.3 Update Operations

| Entity | Endpoint | Table(s) | Notes |
|--------|----------|----------|-------|
| User Profile | `PUT /api/users/:id` | `users` | Updates preferences, device info |
| Person | `PUT /api/people/:email` | `people` | Bulk update supported |
| Scorecard | Scorecard management UI | `scorecards`, `scorecard_perameters` | Versioning via `parent_scorecard_id` |
| Audit Assignment | Assignment UI | `audit_assignments` | Status updates, completion |
| Audit Record | Audit form (edit) | Dynamic audit table | Updates existing audit |
| Event | Event management UI | `events` | Updates event details |
| Notification | Notification API | `notifications` | Mark as read, update status |

### 3.4 Delete Operations

| Entity | Endpoint | Table(s) | Notes |
|--------|----------|----------|-------|
| Person | `DELETE /api/people/:email` | `people` | Soft delete via `is_active` |
| Scorecard | Scorecard management UI | `scorecards` | Cascade to parameters, audit tables remain |
| Audit Assignment | Assignment UI | `audit_assignments` | Cancel assignments |
| Event | Event management UI | `events` | Delete events |
| Permission Rule | Permission management UI | `access_control_rules`, `user_access_rule` | Delete rules |

---

## 4. Current Architecture Issues & Scalability Concerns

### 4.1 Schema Fragmentation

**Problem**: Dynamic audit tables create schema fragmentation
- Each scorecard creates a separate table
- No unified audit data model
- Difficult to query across all audits
- Schema changes require migration across multiple tables

**Impact**: 
- Complex reporting queries
- Maintenance overhead
- Performance issues with cross-table aggregations

### 4.2 Data Model Inconsistencies

**Problem**: Dual user identity system
- `users` table (auth) vs `people` table (directory)
- No foreign key relationship
- Email-based joins (fragile)
- `people` table lacks primary key

**Impact**:
- Data integrity risks
- Join performance issues
- Potential data inconsistencies

### 4.3 Missing Relationships

**Problem**: Weak referential integrity
- `audit_assignments` references `people` via email (no FK)
- Dynamic audit tables reference `people` via email
- No cascade delete/update policies
- Orphaned records possible

**Impact**:
- Data integrity issues
- Difficult to maintain referential integrity
- Manual cleanup required

### 4.4 Performance Concerns

**Problem**: Query patterns
- Audit reports query multiple tables sequentially
- Client-side filtering/aggregation
- No materialized views for common aggregations
- Missing indexes on frequently queried fields

**Impact**:
- Slow report generation
- Poor scalability with large datasets
- High database load

### 4.5 JSONB Overuse

**Problem**: Excessive JSONB usage
- `device_info`, `notification_preferences`, `participants`, `metadata`
- Difficult to query/index
- No schema validation

**Impact**:
- Query performance issues
- Data validation challenges
- Difficult to enforce constraints

### 4.6 Naming Inconsistencies

**Problem**: Table/column naming
- `scorecard_perameters` (typo)
- Mixed naming conventions (snake_case vs camelCase)
- Inconsistent field names across tables

**Impact**:
- Developer confusion
- Maintenance challenges

---

## 5. Proposed Scalable Database Reorganization

### 5.1 Unified Audit Data Model

**Strategy**: Single audit table with JSONB for scorecard-specific data

```sql
-- Unified audit table
CREATE TABLE audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identity
  employee_id UUID NOT NULL REFERENCES employees(id),
  auditor_id UUID NOT NULL REFERENCES users(id),
  scorecard_id UUID NOT NULL REFERENCES scorecards(id),
  
  -- Interaction data
  interaction_id TEXT,
  interaction_date DATE,
  channel_id UUID REFERENCES channels(id),
  transcript TEXT,
  
  -- Scoring (normalized)
  total_score NUMERIC(5,2),
  max_score NUMERIC(5,2),
  passing_status TEXT CHECK (passing_status IN ('pass', 'fail', 'pending')),
  
  -- Status tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'validated', 'rejected')),
  validation_status TEXT,
  acknowledgement_status TEXT,
  
  -- Timing
  audit_start_time TIMESTAMPTZ,
  audit_end_time TIMESTAMPTZ,
  audit_duration INTEGER, -- seconds
  submitted_at TIMESTAMPTZ,
  
  -- Reversal workflow
  reversal_requested_at TIMESTAMPTZ,
  reversal_responded_at TIMESTAMPTZ,
  reversal_approved BOOLEAN,
  
  -- Scorecard-specific data (JSONB for flexibility)
  parameter_scores JSONB NOT NULL DEFAULT '{}',
  parameter_feedback JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_audit_id UUID REFERENCES audits(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ -- Soft delete
  
  -- Indexes
  CREATE INDEX idx_audits_employee_id ON audits(employee_id);
  CREATE INDEX idx_audits_auditor_id ON audits(auditor_id);
  CREATE INDEX idx_audits_scorecard_id ON audits(scorecard_id);
  CREATE INDEX idx_audits_submitted_at ON audits(submitted_at DESC);
  CREATE INDEX idx_audits_status ON audits(status);
  CREATE INDEX idx_audits_interaction_date ON audits(interaction_date DESC);
  CREATE INDEX idx_audits_parameter_scores ON audits USING GIN(parameter_scores);
  CREATE INDEX idx_audits_channel_id ON audits(channel_id);
);

-- Audit errors breakdown (normalized)
CREATE TABLE audit_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  parameter_id UUID NOT NULL REFERENCES scorecard_parameters(id),
  error_count INTEGER DEFAULT 0,
  feedback TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_errors_audit_id ON audit_errors(audit_id);
CREATE INDEX idx_audit_errors_parameter_id ON audit_errors(parameter_id);
```

**Benefits**:
- Single source of truth for audit data
- Easier cross-scorecard reporting
- Better query performance with proper indexes
- Maintains flexibility via JSONB for scorecard-specific fields
- Normalized error tracking for better analytics

**Migration Strategy**:
1. Create new `audits` table alongside existing tables
2. Migrate data gradually (ETL process)
3. Update application code to use new table
4. Deprecate old tables after validation period

### 5.2 Unified Employee/User Model

**Strategy**: Merge `users` and `people` into single `employees` table

```sql
-- Unified employees table
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Authentication (from Supabase auth.users)
  auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  
  -- Identity
  name TEXT NOT NULL,
  avatar_url TEXT,
  employee_id TEXT UNIQUE, -- Legacy employee ID
  
  -- Organizational
  role_id UUID REFERENCES roles(id),
  department_id UUID REFERENCES departments(id),
  designation TEXT,
  channel_id UUID REFERENCES channels(id),
  team_id UUID REFERENCES teams(id),
  
  -- Hierarchy
  supervisor_id UUID REFERENCES employees(id),
  quality_mentor_id UUID REFERENCES employees(id),
  
  -- Location
  country_code TEXT REFERENCES countries(code),
  
  -- External integrations
  intercom_admin_id TEXT,
  intercom_admin_alias TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Activity tracking
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ -- Soft delete
  
  -- Indexes
  CREATE INDEX idx_employees_email ON employees(email);
  CREATE INDEX idx_employees_auth_user_id ON employees(auth_user_id);
  CREATE INDEX idx_employees_employee_id ON employees(employee_id);
  CREATE INDEX idx_employees_role_id ON employees(role_id);
  CREATE INDEX idx_employees_channel_id ON employees(channel_id);
  CREATE INDEX idx_employees_team_id ON employees(team_id);
  CREATE INDEX idx_employees_supervisor_id ON employees(supervisor_id);
  CREATE INDEX idx_employees_is_active ON employees(is_active);
);

-- Reference tables for normalization
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  level INTEGER NOT NULL, -- Hierarchy level
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  channel_id UUID REFERENCES channels(id),
  supervisor_id UUID REFERENCES employees(id),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE countries (
  code TEXT PRIMARY KEY, -- ISO 3166-1 alpha-2
  name TEXT NOT NULL
);
```

**Benefits**:
- Single source of truth for employee data
- Proper foreign key relationships
- Better data integrity
- Easier to maintain
- Supports organizational hierarchy

**Migration Strategy**:
1. Create new `employees` table
2. Migrate `users` data (auth users)
3. Migrate `people` data (directory)
4. Merge by email, handle conflicts
5. Update all foreign key references
6. Deprecate old tables

### 5.3 Normalized Scorecard Model

**Strategy**: Fix naming and improve structure

```sql
-- Rename and improve scorecard_parameters
ALTER TABLE scorecard_perameters RENAME TO scorecard_parameters;

-- Add missing indexes
CREATE INDEX idx_scorecard_parameters_scorecard_id ON scorecard_parameters(scorecard_id);
CREATE INDEX idx_scorecard_parameters_is_active ON scorecard_parameters(is_active);
CREATE INDEX idx_scorecard_parameters_display_order ON scorecard_parameters(display_order);
```

### 5.4 Improved Audit Assignments

**Strategy**: Use proper foreign keys and add missing fields

```sql
-- Update audit_assignments with proper FKs
ALTER TABLE audit_assignments
  DROP COLUMN IF EXISTS employee_email,
  DROP COLUMN IF EXISTS employee_name,
  DROP COLUMN IF EXISTS auditor_email,
  ADD COLUMN employee_id UUID NOT NULL REFERENCES employees(id),
  ADD COLUMN auditor_id UUID NOT NULL REFERENCES employees(id),
  ADD COLUMN assigner_id UUID REFERENCES employees(id),
  ADD CONSTRAINT fk_audit_assignments_scorecard 
    FOREIGN KEY (scorecard_id) REFERENCES scorecards(id),
  ADD CONSTRAINT fk_audit_assignments_audit
    FOREIGN KEY (audit_id) REFERENCES audits(id);

-- Update indexes
CREATE INDEX idx_audit_assignments_employee_id ON audit_assignments(employee_id);
CREATE INDEX idx_audit_assignments_auditor_id ON audit_assignments(auditor_id);
CREATE INDEX idx_audit_assignments_status ON audit_assignments(status);
CREATE INDEX idx_audit_assignments_scheduled_date ON audit_assignments(scheduled_date);
```

### 5.5 Materialized Views for Reporting

**Strategy**: Pre-compute common aggregations

```sql
-- Materialized view for audit statistics
CREATE MATERIALIZED VIEW audit_statistics AS
SELECT
  e.id AS employee_id,
  e.name AS employee_name,
  s.id AS scorecard_id,
  s.name AS scorecard_name,
  c.id AS channel_id,
  c.name AS channel_name,
  COUNT(*) AS total_audits,
  COUNT(*) FILTER (WHERE a.passing_status = 'pass') AS passed_audits,
  COUNT(*) FILTER (WHERE a.passing_status = 'fail') AS failed_audits,
  AVG(a.total_score) AS average_score,
  AVG(a.audit_duration) AS average_duration,
  MAX(a.submitted_at) AS last_audit_date
FROM audits a
JOIN employees e ON a.employee_id = e.id
JOIN scorecards s ON a.scorecard_id = s.id
LEFT JOIN channels c ON a.channel_id = c.id
WHERE a.deleted_at IS NULL
GROUP BY e.id, e.name, s.id, s.name, c.id, c.name;

CREATE UNIQUE INDEX ON audit_statistics(employee_id, scorecard_id, channel_id);

-- Refresh strategy (via cron or trigger)
CREATE OR REPLACE FUNCTION refresh_audit_statistics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY audit_statistics;
END;
$$ LANGUAGE plpgsql;
```

### 5.6 Event Sourcing for Audit History

**Strategy**: Track all audit changes for compliance

```sql
-- Audit event log
CREATE TABLE audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id),
  event_type TEXT NOT NULL, -- 'created', 'updated', 'status_changed', 'reversal_requested'
  actor_id UUID REFERENCES employees(id),
  changes JSONB, -- Before/after state
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_audit_events_audit_id ON audit_events(audit_id);
CREATE INDEX idx_audit_events_created_at ON audit_events(created_at DESC);
```

---

## 6. Migration Strategy

### Phase 1: Foundation (Weeks 1-2)
1. Create new `employees` table
2. Create reference tables (`roles`, `departments`, `teams`, `countries`)
3. Migrate `users` → `employees`
4. Migrate `people` → `employees` (merge by email)
5. Update application code to use `employees`

### Phase 2: Audit Unification (Weeks 3-4)
1. Create new `audits` table
2. Create `audit_errors` table
3. Migrate data from dynamic audit tables → `audits`
4. Update audit creation/update code
5. Create materialized views

### Phase 3: Relationship Fixes (Week 5)
1. Update `audit_assignments` with proper FKs
2. Fix `scorecard_parameters` naming
3. Add missing indexes
4. Update RLS policies

### Phase 4: Optimization (Week 6)
1. Create materialized views
2. Add performance indexes
3. Implement audit event logging
4. Performance testing

### Phase 5: Cleanup (Week 7)
1. Deprecate old tables
2. Remove unused columns
3. Update documentation
4. Final validation

---

## 7. Backward Compatibility Considerations

### 7.1 API Compatibility
- Maintain existing API endpoints during migration
- Use views/triggers to map old tables to new structure
- Gradual deprecation with warnings

### 7.2 Data Access Patterns
- Support both old and new table structures during transition
- Use database views to abstract changes
- Update client code incrementally

### 7.3 Feature Flags
- Use feature flags to control new vs old data access
- Allow rollback if issues arise
- A/B testing for performance validation

---

## 8. Performance Optimization Recommendations

### 8.1 Indexing Strategy
- **Composite indexes** for common query patterns
- **Partial indexes** for filtered queries (e.g., `WHERE is_active = true`)
- **GIN indexes** for JSONB columns used in queries
- **Covering indexes** for frequently accessed columns

### 8.2 Query Optimization
- **Batch operations** instead of N+1 queries
- **Pagination** for large result sets
- **Caching** for frequently accessed data
- **Read replicas** for reporting queries

### 8.3 Partitioning Strategy
- **Time-based partitioning** for audit tables (by `submitted_at`)
- **Hash partitioning** for large reference tables
- **List partitioning** by channel/scorecard if needed

---

## 9. Future Scalability Considerations

### 9.1 Multi-Tenancy Support
- Add `organization_id` to all tables
- Implement tenant isolation at database level
- Support for multiple organizations

### 9.2 Audit Data Archival
- Archive old audits to separate tables/database
- Implement retention policies
- Support for cold storage (S3, etc.)

### 9.3 Real-Time Analytics
- Consider TimescaleDB for time-series audit data
- Implement continuous aggregates
- Support for real-time dashboards

### 9.4 Graph Database Integration
- Consider Neo4j for organizational hierarchy
- Better support for complex relationships
- Improved query performance for hierarchy queries

---

## 10. Risk Assessment & Mitigation

### 10.1 Data Migration Risks
- **Risk**: Data loss during migration
- **Mitigation**: Comprehensive backups, validation scripts, rollback plan

### 10.2 Performance Degradation
- **Risk**: Slower queries during transition
- **Mitigation**: Gradual migration, performance monitoring, optimization

### 10.3 Application Downtime
- **Risk**: Service interruption during migration
- **Mitigation**: Blue-green deployment, feature flags, staged rollout

### 10.4 Data Integrity Issues
- **Risk**: Referential integrity violations
- **Mitigation**: Foreign key constraints, validation scripts, data quality checks

---

## 11. Conclusion

The proposed reorganization addresses key scalability and maintainability concerns:

1. **Unified audit model** eliminates schema fragmentation
2. **Consolidated employee model** improves data integrity
3. **Proper relationships** ensure referential integrity
4. **Performance optimizations** support growth
5. **Flexible architecture** allows future enhancements

The migration can be executed incrementally with minimal disruption, maintaining backward compatibility throughout the process.

---

## Appendix A: Current Table Summary

| Table | Primary Key | Key Relationships | RLS Enabled |
|-------|------------|-------------------|-------------|
| `users` | `id` (UUID) | References `auth.users` | No |
| `people` | `email` (no PK) | None (email-based) | Yes |
| `scorecards` | `id` (UUID) | None | Unknown |
| `scorecard_perameters` | `id` (UUID) | `scorecard_id` → `scorecards` | Unknown |
| `audit_assignments` | `id` (UUID) | Email-based (no FK) | Yes |
| Dynamic audit tables | `id` (UUID) | Email-based (no FK) | Yes |
| `notifications` | `id` (UUID) | `user_id` → `users` | No |
| `notification_subscriptions` | `id` (UUID) | `user_id` → `users` | Unknown |
| `events` | `id` (UUID) | Email-based | Unknown |
| `access_control_rules` | `id` (UUID) | None | Unknown |
| `user_access_rule` | `id` (UUID) | Email-based | Unknown |
| `role_hierarchy` | `id` (TEXT) | None | No |
| `api_access_logs` | `id` (UUID) | `user_id` (no FK) | Yes |
| `channels` | `id` (UUID) | None | Unknown |
| `intercom_admin_cache` | `id` (UUID) | None | Unknown |

---

## Appendix B: Recommended Indexes

### High Priority
- `audits(employee_id, submitted_at DESC)` - Employee audit history
- `audits(auditor_id, status, submitted_at DESC)` - Auditor workload
- `audits(scorecard_id, submitted_at DESC)` - Scorecard analytics
- `audit_assignments(auditor_id, status)` - Assignment queries
- `employees(email)` - User lookups
- `employees(auth_user_id)` - Auth integration

### Medium Priority
- `audits(channel_id, submitted_at DESC)` - Channel analytics
- `audits(passing_status, submitted_at DESC)` - Pass/fail reports
- `audit_errors(audit_id, parameter_id)` - Error breakdown
- `employees(role_id, is_active)` - Role-based queries

### Low Priority
- `audits(interaction_id)` - Interaction lookup
- `audits(reversal_requested_at)` - Reversal workflow
- `employees(supervisor_id)` - Hierarchy queries

---

*Document Version: 1.0*  
*Last Updated: 2025-01-25*  
*Author: AI Analysis*
