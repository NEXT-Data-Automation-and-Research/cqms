# Database Schema Comparison
## Current vs Proposed Architecture

**Date**: January 26, 2025

---

## 📊 Current Schema Overview

### Core Tables

```
┌─────────────────┐         ┌─────────────────┐
│     users       │         │     people      │
├─────────────────┤         ├─────────────────┤
│ id (PK)         │         │ email (no PK!)   │
│ email           │         │ name            │
│ full_name       │         │ role            │
│ avatar_url      │         │ department      │
│ provider        │         │ employee_id     │
│ device_info     │         │ channel         │
│ ...             │         │ team            │
└─────────────────┘         │ supervisor      │
                             │ ...             │
                             └─────────────────┘
                                    │
                                    │ (email-based joins)
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
            ┌───────────────┐              ┌───────────────┐
            │ audit_assign  │              │ Dynamic Audit │
            │   ments       │              │    Tables     │
            ├───────────────┤              ├───────────────┤
            │ employee_email│              │ email_audit   │
            │ auditor_email │              │ chat_audit    │
            │ scorecard_id  │              │ call_audit    │
            │ status        │              │ ... (many)    │
            │ ...           │              │               │
            └───────────────┘              └───────────────┘
```

### Issues with Current Schema

1. **No Primary Key on `people`**
   - Uses email as identifier
   - No referential integrity

2. **Email-based Relationships**
   - No foreign keys
   - Fragile joins
   - Performance issues

3. **Dynamic Audit Tables**
   - One table per scorecard
   - Schema fragmentation
   - Complex reporting

4. **Duplicate Data**
   - `users` and `people` overlap
   - No single source of truth

---

## 🎯 Proposed Schema Overview

### Unified Architecture

```
                    ┌─────────────────────────┐
                    │      employees          │
                    │   (Unified Table)       │
                    ├─────────────────────────┤
                    │ id (PK)                 │
                    │ auth_user_id (FK)        │
                    │ email (UNIQUE)          │
                    │ name                    │
                    │ role_id (FK)            │
                    │ department_id (FK)       │
                    │ channel_id (FK)          │
                    │ team_id (FK)            │
                    │ supervisor_id (FK)       │
                    │ ...                     │
                    └─────────────────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
        ┌───────▼──────┐    │    ┌──────▼──────┐
        │   audits     │    │    │audit_assign  │
        │  (Unified)   │    │    │   ments      │
        ├──────────────┤    │    ├──────────────┤
        │ id (PK)      │    │    │ employee_id  │
        │ employee_id  │◄───┘    │   (FK)       │
        │ auditor_id   │         │ auditor_id   │
        │   (FK)       │         │   (FK)       │
        │ scorecard_id │         │ scorecard_id │
        │   (FK)       │         │   (FK)       │
        │ channel_id   │         │ ...          │
        │   (FK)       │         └──────────────┘
        │ parameter_   │
        │   scores     │
        │   (JSONB)    │
        │ ...          │
        └──────────────┘
                │
                │
        ┌───────▼──────────────┐
        │  Reference Tables    │
        ├──────────────────────┤
        │ roles                │
        │ departments           │
        │ teams                 │
        │ channels              │
        │ countries             │
        └──────────────────────┘
```

### Key Improvements

1. **Unified `employees` Table**
   - Single source of truth
   - Proper primary key
   - Foreign key relationships

2. **Unified `audits` Table**
   - All scorecards in one table
   - JSONB for flexible data
   - Proper foreign keys

3. **Reference Tables**
   - Normalized data
   - Proper relationships
   - Easy to maintain

4. **Materialized Views**
   - Pre-computed aggregations
   - Fast analytics
   - Automatic refresh

---

## 🔄 Table-by-Table Comparison

### Users/People → Employees

#### Before: Dual Tables
```sql
-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  ...
);

-- people table
CREATE TABLE people (
  email TEXT, -- NO PRIMARY KEY!
  name TEXT,
  role TEXT,
  ...
);
```

#### After: Unified Table
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY,
  auth_user_id UUID UNIQUE REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role_id UUID REFERENCES roles(id),
  department_id UUID REFERENCES departments(id),
  ...
);
```

**Benefits:**
- ✅ Single source of truth
- ✅ Proper primary key
- ✅ Foreign key relationships
- ✅ No data duplication

---

### Dynamic Audit Tables → Unified Audits

#### Before: Multiple Tables
```sql
-- One table per scorecard
CREATE TABLE email_audit (
  id UUID PRIMARY KEY,
  employee_email TEXT, -- No FK
  auditor_email TEXT,   -- No FK
  field_id_1 INTEGER,
  field_id_2 INTEGER,
  ...
);

CREATE TABLE chat_audit (
  id UUID PRIMARY KEY,
  employee_email TEXT, -- No FK
  auditor_email TEXT,   -- No FK
  field_id_1 INTEGER,
  field_id_3 INTEGER,   -- Different fields!
  ...
);

-- ... many more tables
```

#### After: Single Table
```sql
CREATE TABLE audits (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES employees(id),
  auditor_id UUID REFERENCES employees(id),
  scorecard_id UUID REFERENCES scorecards(id),
  channel_id UUID REFERENCES channels(id),
  
  -- Flexible scorecard-specific data
  parameter_scores JSONB DEFAULT '{}',
  -- Example: {"field_id_1": 5, "field_id_2": 0}
  
  -- Common fields (normalized)
  interaction_date DATE,
  transcript TEXT,
  total_score NUMERIC,
  ...
);
```

**Benefits:**
- ✅ Single table for all audits
- ✅ Proper foreign keys
- ✅ Flexible JSONB for scorecard data
- ✅ Efficient cross-scorecard queries

---

### Audit Assignments

#### Before: Email-based
```sql
CREATE TABLE audit_assignments (
  id UUID PRIMARY KEY,
  employee_email TEXT, -- No FK
  employee_name TEXT,
  auditor_email TEXT,   -- No FK
  scorecard_id UUID,
  ...
);
```

#### After: Foreign Key-based
```sql
CREATE TABLE audit_assignments (
  id UUID PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES employees(id),
  auditor_id UUID NOT NULL REFERENCES employees(id),
  assigner_id UUID REFERENCES employees(id),
  scorecard_id UUID REFERENCES scorecards(id),
  ...
);
```

**Benefits:**
- ✅ Referential integrity
- ✅ Cascade delete/update
- ✅ No orphaned records
- ✅ Better performance

---

## 📈 Query Pattern Comparison

### Current: Multiple Queries

```typescript
// Get audits for an employee
async function getAudits(employeeEmail: string) {
  // 1. Discover all audit tables
  const tables = await rpc('get_audit_tables');
  
  // 2. Query each table (10-20 queries!)
  const results = await Promise.all(
    tables.map(table => 
      supabase.from(table.table_name)
        .select('*')
        .eq('employee_email', employeeEmail)
    )
  );
  
  // 3. Client-side aggregation
  return results.flat().sort(...);
}
```

**Performance:**
- 10-20 database queries
- 500-2000ms total time
- Client-side filtering
- No database optimization

### Proposed: Single Query

```typescript
// Get audits for an employee
async function getAudits(employeeId: string) {
  // Single optimized query
  return await supabase
    .from('audits')
    .select(`
      *,
      employee:employees!audits_employee_id_fkey(*),
      auditor:employees!audits_auditor_id_fkey(*),
      scorecard:scorecards(*),
      channel:channels(*)
    `)
    .eq('employee_id', employeeId)
    .is('deleted_at', null)
    .order('submitted_at', { ascending: false });
}
```

**Performance:**
- 1 database query
- 10-50ms total time
- Database-level filtering
- Optimized with indexes

**Improvement: 10-100x faster**

---

## 🎨 Data Model Relationships

### Current: Weak Relationships

```
users ──┐
        │ (email-based, no FK)
        ├──→ audit_assignments
people ─┘    (email-based, no FK)
        │
        └──→ Dynamic Audit Tables
             (email-based, no FK)
```

**Problems:**
- No referential integrity
- Orphaned records possible
- No cascade operations

### Proposed: Strong Relationships

```
employees (PK: id)
  │
  ├──→ audits.employee_id (FK)
  ├──→ audits.auditor_id (FK)
  ├──→ audit_assignments.employee_id (FK)
  ├──→ audit_assignments.auditor_id (FK)
  └──→ employees.supervisor_id (FK, self-reference)

scorecards (PK: id)
  └──→ audits.scorecard_id (FK)

channels (PK: id)
  └──→ audits.channel_id (FK)

roles (PK: id)
  └──→ employees.role_id (FK)
```

**Benefits:**
- ✅ Referential integrity enforced
- ✅ Cascade delete/update
- ✅ No orphaned records
- ✅ Database-level validation

---

## 📊 Index Strategy Comparison

### Current: Limited Indexing

```sql
-- Basic indexes on individual tables
CREATE INDEX idx_email_audit_submitted_at ON email_audit(submitted_at);
CREATE INDEX idx_chat_audit_submitted_at ON chat_audit(submitted_at);
-- ... repeated for each table
```

**Problems:**
- Indexes duplicated across tables
- Cannot index across tables
- Inefficient for cross-scorecard queries

### Proposed: Comprehensive Indexing

```sql
-- Composite indexes for common queries
CREATE INDEX idx_audits_employee_scorecard_date 
ON audits(employee_id, scorecard_id, interaction_date DESC);

-- Partial indexes for filtered queries
CREATE INDEX idx_audits_active_submitted 
ON audits(submitted_at DESC) 
WHERE status = 'submitted' AND deleted_at IS NULL;

-- GIN indexes for JSONB
CREATE INDEX idx_audits_parameter_scores 
ON audits USING GIN(parameter_scores);

-- Full-text search
CREATE INDEX idx_audits_transcript_search 
ON audits USING GIN(to_tsvector('english', transcript));
```

**Benefits:**
- ✅ Optimized for common queries
- ✅ Partial indexes reduce size
- ✅ JSONB indexes for flexible queries
- ✅ Full-text search capability

---

## 🔍 Query Examples

### Example 1: Get Employee Audits

#### Current
```sql
-- Query 1: email_audit
SELECT * FROM email_audit WHERE employee_email = 'user@example.com';

-- Query 2: chat_audit
SELECT * FROM chat_audit WHERE employee_email = 'user@example.com';

-- Query 3: call_audit
SELECT * FROM call_audit WHERE employee_email = 'user@example.com';

-- ... repeat for all tables
-- Then UNION ALL in application code
```

#### Proposed
```sql
-- Single query
SELECT a.*, 
       e.name AS employee_name,
       aud.name AS auditor_name,
       s.name AS scorecard_name
FROM audits a
JOIN employees e ON a.employee_id = e.id
JOIN employees aud ON a.auditor_id = aud.id
JOIN scorecards s ON a.scorecard_id = s.id
WHERE e.email = 'user@example.com'
  AND a.deleted_at IS NULL
ORDER BY a.submitted_at DESC;
```

### Example 2: Cross-Scorecard Analytics

#### Current
```sql
-- Not possible efficiently
-- Would require UNION ALL of all tables
-- Then client-side aggregation
```

#### Proposed
```sql
-- Single efficient query
SELECT 
  s.name AS scorecard_name,
  COUNT(*) AS total_audits,
  AVG(a.percentage_score) AS avg_score,
  COUNT(*) FILTER (WHERE a.passing_status = 'pass') AS passed_count
FROM audits a
JOIN scorecards s ON a.scorecard_id = s.id
WHERE a.submitted_at >= '2025-01-01'
  AND a.deleted_at IS NULL
GROUP BY s.id, s.name
ORDER BY total_audits DESC;
```

### Example 3: Materialized View Usage

#### Current
```sql
-- Complex query repeated every time
-- Slow performance
SELECT ... FROM email_audit UNION ALL SELECT ... FROM chat_audit ...
```

#### Proposed
```sql
-- Instant results from materialized view
SELECT * FROM audit_statistics
WHERE employee_id = '...'
  AND quarter = 'Q1';
```

---

## 🎯 Migration Path Visualization

```
Phase 1: Foundation
┌─────────────┐
│   users     │──┐
└─────────────┘  │
                 ├──→ ┌──────────────┐
┌─────────────┐  │   │  employees   │
│   people    │──┘   │  (unified)   │
└─────────────┘      └──────────────┘
                            │
                            │ (backward compat views)
                            │
                     ┌──────▼──────┐
                     │ users_compat│
                     │people_compat│
                     └─────────────┘

Phase 2: Audit Unification
┌──────────────┐
│ email_audit  │──┐
├──────────────┤  │
│ chat_audit   │──┤
├──────────────┤  │
│ call_audit   │──┤
│ ...          │  │
└──────────────┘  │
                  ├──→ ┌──────────────┐
                  │    │    audits    │
                  │    │  (unified)   │
                  │    └──────────────┘
                  │           │
                  │           │ (backward compat views)
                  │           │
                  │    ┌──────▼────────┐
                  │    │email_audit_   │
                  │    │  compat      │
                  │    │chat_audit_   │
                  │    │  compat      │
                  │    └──────────────┘
                  │
                  └──→ (archived after validation)

Phase 3: Cleanup
┌──────────────┐
│ Old Tables   │──→ Archive Schema
└──────────────┘    (keep for 90 days)
```

---

## 📋 Checklist: Schema Migration

### Pre-Migration
- [ ] Backup all databases
- [ ] Review migration scripts
- [ ] Set up staging environment
- [ ] Create feature flags
- [ ] Document current schema

### Phase 1: Employees
- [ ] Create `employees` table
- [ ] Create reference tables
- [ ] Migrate `users` data
- [ ] Migrate `people` data
- [ ] Create compatibility views
- [ ] Validate data integrity
- [ ] Enable feature flag

### Phase 2: Audits
- [ ] Create `audits` table
- [ ] Migrate each dynamic table
- [ ] Validate JSONB structure
- [ ] Create compatibility views
- [ ] Validate data integrity
- [ ] Enable feature flag

### Phase 3: Relationships
- [ ] Update `audit_assignments`
- [ ] Add foreign keys
- [ ] Remove email columns
- [ ] Validate relationships
- [ ] Update application code

### Phase 4: Optimization
- [ ] Create materialized views
- [ ] Add indexes
- [ ] Set up refresh schedules
- [ ] Performance testing
- [ ] Query optimization

### Phase 5: Cleanup
- [ ] Final validation
- [ ] Remove feature flags
- [ ] Drop compatibility views
- [ ] Archive old tables
- [ ] Update documentation

---

## 🎓 Key Takeaways

1. **Unified Schema**: Single source of truth for employees and audits
2. **Proper Relationships**: Foreign keys ensure data integrity
3. **Flexible Design**: JSONB allows scorecard-specific data without schema changes
4. **Performance**: Materialized views and indexes optimize queries
5. **Scalability**: Single table scales better than multiple tables
6. **Migration Safety**: Backward compatibility views and feature flags ensure zero downtime

---

**For implementation details, see**: `DATABASE_MIGRATION_STRATEGY_2025.md`
