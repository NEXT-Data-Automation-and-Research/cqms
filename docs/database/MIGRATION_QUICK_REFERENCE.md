# Database Migration Quick Reference
## Executive Summary & Key Decisions

**Date**: January 26, 2025  
**Status**: Ready for Implementation

---

## 🎯 Core Problem Statement

**Current Issues:**
1. **Schema Fragmentation**: Dynamic audit tables (one per scorecard) create maintenance nightmares
2. **Dual Identity**: Separate `users` and `people` tables with no relationships
3. **Weak Integrity**: Email-based joins without foreign keys
4. **Performance**: Sequential queries across multiple tables
5. **Scalability**: Cannot efficiently handle millions of records

**Solution**: Unified schema with proper relationships, single audit table, materialized views

---

## 📊 Current vs Proposed Architecture

### Current Architecture
```
users (auth)          people (directory)
   ↓                      ↓
   └─────────┬────────────┘
             │ (email-based joins, no FK)
             ↓
    Dynamic Audit Tables (one per scorecard)
    - email_audit
    - chat_audit
    - ... (many more)
```

### Proposed Architecture
```
employees (unified)
   ↓ (FK)
   ├──→ audits (unified, all scorecards)
   ├──→ audit_assignments (FK relationships)
   └──→ notifications (FK relationships)

Reference Tables:
- roles, departments, teams, channels, countries

Performance:
- Materialized views for analytics
- Comprehensive indexing
- JSONB for flexible scorecard data
```

---

## 🔑 Key Design Decisions

### 1. Unified Employees Table
**Decision**: Merge `users` + `people` → `employees`

**Rationale**:
- Single source of truth
- Proper foreign key relationships
- Eliminates data duplication
- Supports organizational hierarchy

**Migration**: Email-based merge with conflict resolution

### 2. Unified Audits Table
**Decision**: Single `audits` table replacing all dynamic tables

**Rationale**:
- Eliminates schema fragmentation
- Enables efficient cross-scorecard queries
- Proper foreign keys
- JSONB for flexible scorecard-specific data

**Migration**: ETL script per dynamic table → unified table

### 3. JSONB for Parameter Scores
**Decision**: Store scorecard-specific data in JSONB `parameter_scores`

**Rationale**:
- Flexibility without schema changes
- Efficient querying with GIN indexes
- Maintains performance
- Easy to extend

**Structure**:
```json
{
  "field_id_1": 5,
  "field_id_2": 0,
  "field_id_3": 2
}
```

### 4. Materialized Views
**Decision**: Pre-compute common aggregations

**Rationale**:
- Instant analytics without complex queries
- Refresh on schedule (hourly) or trigger
- 10x faster than real-time aggregation

**Views**:
- `audit_statistics` - Employee/scorecard/channel aggregations
- `auditor_performance` - Auditor metrics

---

## 📋 Migration Phases Overview

### Phase 1: Foundation (Weeks 1-2)
- Create reference tables
- Create `employees` table
- Migrate `users` + `people` → `employees`
- Backward compatibility views
- **Risk**: Low | **Impact**: High

### Phase 2: Audit Unification (Weeks 3-5)
- Create `audits` table
- Migrate dynamic tables → `audits`
- Backward compatibility views
- **Risk**: Medium | **Impact**: Critical

### Phase 3: Relationships (Week 5-6)
- Update `audit_assignments` with FKs
- Fix table naming
- Remove email-based joins
- **Risk**: Low | **Impact**: Medium

### Phase 4: Optimization (Week 6-7)
- Materialized views
- Index optimization
- Query optimization
- **Risk**: Low | **Impact**: High

### Phase 5: Cleanup (Week 7-8)
- Remove old tables
- Archive data
- Final validation
- **Risk**: Low | **Impact**: Low

---

## 🚀 Quick Start Guide

### Step 1: Review & Approve
- [ ] Team review of full proposal
- [ ] Approve migration strategy
- [ ] Set up staging environment

### Step 2: Phase 1 Execution
```sql
-- 1. Create reference tables
-- See DATABASE_MIGRATION_STRATEGY_2025.md Section 2.2

-- 2. Create employees table
-- See DATABASE_MIGRATION_STRATEGY_2025.md Section 2.1

-- 3. Migrate data
INSERT INTO employees (...) SELECT ... FROM users;
INSERT INTO employees (...) SELECT ... FROM people ON CONFLICT ...;

-- 4. Create compatibility views
CREATE VIEW users_compat AS SELECT ... FROM employees;
CREATE VIEW people_compat AS SELECT ... FROM employees;
```

### Step 3: Update Application Code
```typescript
// Feature flag
const USE_UNIFIED_EMPLOYEES = process.env.USE_UNIFIED_EMPLOYEES === 'true';

// Adapter pattern
async function getEmployee(email: string) {
  if (USE_UNIFIED_EMPLOYEES) {
    return await getFromEmployees(email);
  } else {
    return await getFromUsersAndPeople(email);
  }
}
```

### Step 4: Validate & Test
- [ ] Compare record counts
- [ ] Validate data integrity
- [ ] Performance testing
- [ ] Application testing

### Step 5: Enable Feature Flag
```bash
# Enable in production
export USE_UNIFIED_EMPLOYEES_TABLE=true
```

---

## 📈 Expected Performance Improvements

| Operation | Current | After Migration | Improvement |
|-----------|---------|----------------|-------------|
| Audit Report Query | 2-5 seconds | < 500ms | **10x faster** |
| Employee Lookup | 50-100ms | < 10ms | **10x faster** |
| Query Count (Reports) | 10-20 queries | 1 query | **20x reduction** |
| Cross-Scorecard Query | Not possible | Single query | **New capability** |

---

## ⚠️ Critical Considerations

### Data Integrity
- ✅ Foreign key constraints ensure referential integrity
- ✅ Check constraints validate data
- ✅ Unique constraints prevent duplicates
- ✅ Soft delete preserves data

### Backward Compatibility
- ✅ Database views maintain old API
- ✅ Feature flags control rollout
- ✅ Gradual migration reduces risk
- ✅ Easy rollback if needed

### Performance
- ✅ Comprehensive indexing strategy
- ✅ Materialized views for aggregations
- ✅ JSONB with GIN indexes
- ✅ Partitioning-ready structure

### Scalability
- ✅ Single table scales better than multiple
- ✅ Proper indexes support growth
- ✅ Partitioning for time-series data
- ✅ Archive strategy for old data

---

## 🔄 Rollback Plan

**If Issues Arise:**

1. **Disable Feature Flags**
   ```bash
   export USE_UNIFIED_EMPLOYEES_TABLE=false
   export USE_UNIFIED_AUDITS_TABLE=false
   ```

2. **Stop New Writes**
   - Application automatically uses old schema
   - No data loss

3. **Validate Data**
   - Run validation scripts
   - Compare record counts
   - Check data integrity

4. **Fix & Retry**
   - Fix issues in staging
   - Re-test migration
   - Re-attempt in production

**Rollback Time**: < 15 minutes

---

## 📞 Support & Resources

### Documentation
- **Full Strategy**: `DATABASE_MIGRATION_STRATEGY_2025.md`
- **Scalability Analysis**: `DATABASE_SCALABILITY_ANALYSIS.md`
- **Reorganization Proposal**: `DATABASE_REORGANIZATION_PROPOSAL.md`

### Key Files
- Migration scripts: `src/db/migrations/`
- Schema definitions: `src/db/schema.ts`
- Drizzle config: `drizzle.config.ts`

### Validation Scripts
- See Section 3.4 in full strategy document
- Run before and after each phase
- Monitor data integrity continuously

---

## ✅ Success Criteria

### Phase 1 Success
- [ ] All users migrated to `employees`
- [ ] All people migrated to `employees`
- [ ] Backward compatibility views working
- [ ] Application using new table (via feature flag)
- [ ] Zero data loss
- [ ] Performance maintained or improved

### Phase 2 Success
- [ ] All audit tables migrated to `audits`
- [ ] JSONB parameter_scores structure validated
- [ ] Backward compatibility views working
- [ ] Application using new table (via feature flag)
- [ ] Query performance improved (10x faster)
- [ ] Zero data loss

### Final Success
- [ ] All phases completed
- [ ] Old tables archived
- [ ] Feature flags removed
- [ ] Documentation updated
- [ ] Team trained on new schema
- [ ] Performance targets met

---

## 🎯 Next Actions

### This Week
1. Review full strategy document
2. Get team approval
3. Set up staging environment
4. Create backup strategy

### Next 2 Weeks
1. Execute Phase 1 (Foundation)
2. Validate results
3. Begin Phase 2 planning

### Next 2 Months
1. Complete all migration phases
2. Optimize performance
3. Archive old data
4. Update documentation

---

**For detailed information, see**: `DATABASE_MIGRATION_STRATEGY_2025.md`
