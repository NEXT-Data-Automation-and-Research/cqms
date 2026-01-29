# Reversal Management - Database Connections & Business Logic

## Overview
The Reversal Management page handles the complete lifecycle of audit reversal requests, from submission by agents to final approval/rejection by auditors and quality control teams.

## Database Tables Required

### 1. **reversal_requests** (Primary Table) ✅ CREATED
**Purpose**: Central table storing all reversal request data

**Schema**:
- `id` (UUID, Primary Key)
- `audit_id` (TEXT, NOT NULL) - References the audit record in scorecard table
- `scorecard_table_name` (TEXT, NOT NULL) - Name of the scorecard table containing the audit
- `requested_by_email` (TEXT, NOT NULL) - Email of agent requesting reversal
- `requested_at` (TIMESTAMPTZ, NOT NULL) - When reversal was requested
- `employee_email` (TEXT) - Email of employee whose audit is being reversed (may differ from requester)
- `employee_name` (TEXT) - Name of employee whose audit is being reversed
- `reversal_type` (TEXT, NOT NULL) - Type: "Clarification Requested" or "Revision Requested"
- `justification` (TEXT, NOT NULL) - Agent's justification for reversal
- `metrics_parameters` (JSONB) - Parameters being disputed
- `attachments` (TEXT[]) - Array of attachment URLs
- `original_score` (NUMERIC) - Score before reversal request
- `new_score` (NUMERIC) - Score after reversal (if approved)
- `final_decision` (TEXT) - 'approved' | 'rejected' | NULL
- `final_decision_at` (TIMESTAMPTZ) - When decision was made
- `final_decision_by_name` (TEXT) - Name of person who made decision
- `final_decision_by_email` (TEXT) - Email of decision maker
- `sla_hours` (NUMERIC) - Hours taken to respond
- `within_auditor_scope` (BOOLEAN) - Whether reversal is within auditor's scope
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexes**:
- `idx_reversal_requests_requested_by_email` - For filtering by requester
- `idx_reversal_requests_employee_email` - For filtering by employee (subject of audit)
- `idx_reversal_requests_emails` - Composite index for the common OR query pattern
- `idx_reversal_requests_audit_id` - For lookup by audit
- `idx_reversal_requests_scorecard_table` - For filtering by scorecard type
- `idx_reversal_requests_requested_at` - For date-based queries
- `idx_reversal_requests_final_decision` - For filtering by status

### 2. **reversal_workflow_states** (Workflow Tracking) ✅ CREATED
**Purpose**: Tracks workflow state transitions for each reversal request

**Schema**:
- `id` (UUID, Primary Key)
- `reversal_request_id` (UUID, NOT NULL, FK → reversal_requests.id)
- `state` (TEXT, NOT NULL) - Current workflow state
- `is_current` (BOOLEAN, NOT NULL) - Whether this is the current state
- `created_at` (TIMESTAMPTZ)

**Workflow States**:
- `submitted` - Initial submission by agent
- `team_lead_review` - Under team lead review
- `team_lead_approved` - Approved by team lead, awaiting QC
- `team_lead_rejected` - Rejected by team lead
- `qa_review` - Under QA/QC review
- `cqc_review` - Under CQC review
- `cqc_sent_back` - Sent back by CQC for revision
- `agent_re_review` - Agent needs to re-review
- `approved` - Final approval
- `rejected` - Final rejection
- `acknowledged` - Agent has acknowledged the decision

**Indexes**:
- `idx_reversal_workflow_states_request_id` - For lookup by reversal request
- `idx_reversal_workflow_states_is_current` - For finding current states
- `idx_reversal_workflow_states_state` - For filtering by state

### 3. **scorecards** (Reference Table) ✅ EXISTS
**Purpose**: Provides metadata about scorecards and their associated audit tables

**Key Fields Used**:
- `id` - Scorecard identifier
- `name` - Display name
- `table_name` - Name of the audit table (e.g., 'fnchat_cfd_v4_0_v2')
- `is_active` - Whether scorecard is active
- `passing_threshold` - Threshold for passing audits

### 4. **Scorecard Audit Tables** (Dynamic Tables) ✅ EXIST
**Purpose**: Store actual audit data

**Examples**:
- `fnchat_cfd_v4_0_v2` - Chat CFD scorecard audits
- `fnchat_cfd` - Older version of chat CFD audits
- (Other scorecard-specific tables as defined in scorecards.table_name)

**Key Fields Used**:
- `id` - Audit record ID
- `employee_email` - Agent email
- `employee_name` - Agent name
- `auditor_email` - Auditor email
- `auditor_name` - Auditor name
- `interaction_id` - Interaction identifier
- `submitted_at` - When audit was submitted
- `average_score` - Current audit score
- `passing_status` - Pass/fail status
- `acknowledgement_status` - Agent acknowledgement status
- `reversal_requested_at` - (Old structure) When reversal was requested
- `reversal_approved` - (Old structure) Approval status
- `reversal_responded_at` - (Old structure) When reversal was responded to

### 5. **reversal_change_log** (Logging Table) ✅ EXISTS
**Purpose**: Audit log of all reversal changes (read-only for reversal page)

## Business Logic Flow

### Data Loading Process

1. **Load Scorecards** (`loadScorecards()`)
   - Fetches all active scorecards from `scorecards` table
   - Used to map `scorecard_table_name` to display names

2. **Load Reversal Requests** (Primary Path)
   - Query `reversal_requests` table
   - Filter by `requested_by_email` if user is an agent
   - Order by `requested_at` DESC
   - Fetch workflow states from `reversal_workflow_states` for all requests
   - Filter by workflow state if `onlyPending = true`

3. **Load Audit Data** (Batch Fetch)
   - Group reversal requests by `scorecard_table_name`
   - Batch fetch audit records from respective scorecard tables
   - Merge reversal request data with audit data
   - Add scorecard metadata

4. **Backward Compatibility** (Fallback Path)
   - Query scorecard tables directly for reversals with `reversal_requested_at IS NOT NULL`
   - Only used if reversal not found in `reversal_requests` table
   - Ensures old reversals still appear

### Role-Based Filtering

**Agents (Employees)**:
- See reversals where they are involved in one of two ways:
  1. They requested the reversal (`requested_by_email = user.email`), OR
  2. The reversal is for their audit (`employee_email = user.email`)
- This allows employees to see reversals submitted on their behalf by team leads/managers
- See pending, approved, and rejected reversals (until acknowledged)

**Auditors/Managers/Admins**:
- See all reversals (RLS handles access control)
- Filter by workflow state (pending vs all)
- Can process reversals (approve/reject)

### Workflow State Management

**Pending States** (shown in "Pending" view):
- `submitted`
- `team_lead_review`
- `team_lead_approved`
- `qa_review`
- `cqc_review`
- `cqc_sent_back`
- `agent_re_review`

**Final States** (excluded from pending view):
- `approved`
- `rejected`
- `acknowledged`

### Data Merging Strategy

When displaying reversals, the system merges:
1. **Audit Data** (from scorecard table) - Base audit information
2. **Reversal Request Data** (from `reversal_requests`) - Overrides audit reversal fields
3. **Workflow State** (from `reversal_workflow_states`) - Current state
4. **Scorecard Metadata** (from `scorecards`) - Display name and threshold

**Priority**: `reversal_requests` data takes precedence over old audit table fields

## Database Operations

### Read Operations
- `SELECT * FROM reversal_requests` - Get all reversal requests
- `SELECT * FROM reversal_workflow_states WHERE reversal_request_id IN (...) AND is_current = true` - Get current states
- `SELECT * FROM scorecards WHERE is_active = true` - Get active scorecards
- `SELECT * FROM {scorecard_table_name} WHERE id IN (...)` - Batch fetch audits

### Write Operations (Future)
- `INSERT INTO reversal_requests` - Create new reversal request
- `UPDATE reversal_requests SET final_decision = ...` - Process reversal
- `INSERT INTO reversal_workflow_states` - Add new workflow state
- `UPDATE reversal_workflow_states SET is_current = false` - Mark old state as not current
- `UPDATE {scorecard_table_name} SET average_score = ..., passing_status = ...` - Update audit if approved

## Required Tables Summary

| Table Name | Status | Purpose | Critical |
|------------|--------|---------|----------|
| `reversal_requests` | ✅ Created | Primary reversal data storage | **YES** |
| `reversal_workflow_states` | ✅ Created | Workflow state tracking | **YES** |
| `scorecards` | ✅ Exists | Scorecard metadata | **YES** |
| `{scorecard_table_name}` | ✅ Exists | Audit data (dynamic) | **YES** |
| `reversal_change_log` | ✅ Exists | Audit logging | No |

## Data Flow Diagram

```
Agent Requests Reversal
    ↓
INSERT INTO reversal_requests
    ↓
INSERT INTO reversal_workflow_states (state='submitted')
    ↓
Team Lead Reviews
    ↓
UPDATE reversal_workflow_states (state='team_lead_review')
    ↓
QA/QC Reviews
    ↓
UPDATE reversal_workflow_states (state='qa_review' or 'cqc_review')
    ↓
Final Decision
    ↓
UPDATE reversal_requests (final_decision='approved'/'rejected')
    ↓
UPDATE reversal_workflow_states (state='approved'/'rejected')
    ↓
IF approved: UPDATE {scorecard_table} (average_score, passing_status)
    ↓
Agent Acknowledges
    ↓
UPDATE reversal_workflow_states (state='acknowledged')
```

## Notes

1. **Backward Compatibility**: The system supports both new (`reversal_requests`) and old (scorecard table columns) structures
2. **Performance**: Uses batch queries and parallel fetching for optimal performance
3. **Workflow**: State transitions are tracked historically in `reversal_workflow_states`
4. **Data Integrity**: Foreign key constraint ensures workflow states reference valid reversal requests
