-- Migration: Create reversal_requests and reversal_workflow_states tables
-- Purpose: Support the new reversal management workflow with proper state tracking
-- Based on: docs/reversal/REVERSAL_DATABASE_CONNECTIONS.md

-- ============================================================================
-- 1. Create reversal_requests table (Primary reversal data storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reversal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id TEXT NOT NULL,
    scorecard_table_name TEXT NOT NULL,
    requested_by_email TEXT NOT NULL,
    requested_by_name TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    employee_email TEXT,
    employee_name TEXT,
    reversal_type TEXT NOT NULL,
    justification TEXT NOT NULL,
    metrics_parameters JSONB,
    attachments TEXT[],
    original_score NUMERIC,
    original_passing_status TEXT,
    original_parameters JSONB,
    original_feedback JSONB,
    new_score NUMERIC,
    new_passing_status TEXT,
    final_decision TEXT CHECK (final_decision IN ('approved', 'rejected')),
    final_decision_at TIMESTAMPTZ,
    final_decision_by_name TEXT,
    final_decision_by_email TEXT,
    sla_hours NUMERIC,
    within_auditor_scope BOOLEAN,
    team_lead_response TEXT,
    current_state_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE reversal_requests IS 'Central table storing all reversal request data';
COMMENT ON COLUMN reversal_requests.employee_email IS 'Email of the employee whose audit is being reversed. May differ from requested_by_email when a team lead submits on behalf of an employee.';
COMMENT ON COLUMN reversal_requests.employee_name IS 'Name of the employee whose audit is being reversed.';

-- ============================================================================
-- 2. Create reversal_workflow_states table (Workflow state tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reversal_workflow_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reversal_request_id UUID NOT NULL REFERENCES reversal_requests(id) ON DELETE CASCADE,
    state TEXT NOT NULL CHECK (state IN (
        'submitted',
        'team_lead_review',
        'team_lead_approved',
        'team_lead_rejected',
        'qa_review',
        'cqc_review',
        'cqc_sent_back',
        'agent_re_review',
        'approved',
        'rejected',
        'acknowledged'
    )),
    is_current BOOLEAN NOT NULL DEFAULT false,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    entered_by_email TEXT,
    entered_by_name TEXT,
    previous_state_id UUID REFERENCES reversal_workflow_states(id),
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE reversal_workflow_states IS 'Tracks workflow state transitions for each reversal request';

-- ============================================================================
-- 3. Add foreign key for current_state_id after workflow_states table exists
-- ============================================================================
ALTER TABLE reversal_requests 
    ADD CONSTRAINT fk_reversal_requests_current_state 
    FOREIGN KEY (current_state_id) 
    REFERENCES reversal_workflow_states(id) 
    ON DELETE SET NULL;

-- ============================================================================
-- 4. Create indexes for optimal query performance
-- ============================================================================

-- reversal_requests indexes
CREATE INDEX IF NOT EXISTS idx_reversal_requests_requested_by_email 
    ON reversal_requests(requested_by_email);

CREATE INDEX IF NOT EXISTS idx_reversal_requests_employee_email 
    ON reversal_requests(employee_email);

CREATE INDEX IF NOT EXISTS idx_reversal_requests_emails 
    ON reversal_requests(requested_by_email, employee_email);

CREATE INDEX IF NOT EXISTS idx_reversal_requests_audit_id 
    ON reversal_requests(audit_id);

CREATE INDEX IF NOT EXISTS idx_reversal_requests_scorecard_table 
    ON reversal_requests(scorecard_table_name);

CREATE INDEX IF NOT EXISTS idx_reversal_requests_requested_at 
    ON reversal_requests(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_reversal_requests_final_decision 
    ON reversal_requests(final_decision);

-- reversal_workflow_states indexes
CREATE INDEX IF NOT EXISTS idx_reversal_workflow_states_request_id 
    ON reversal_workflow_states(reversal_request_id);

CREATE INDEX IF NOT EXISTS idx_reversal_workflow_states_is_current 
    ON reversal_workflow_states(is_current) WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_reversal_workflow_states_state 
    ON reversal_workflow_states(state);

-- ============================================================================
-- 5. Enable Row Level Security (RLS)
-- ============================================================================
ALTER TABLE reversal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reversal_workflow_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reversal_requests
-- Allow authenticated users to read reversal requests they're involved with
CREATE POLICY "Users can view their own reversal requests" ON reversal_requests
    FOR SELECT
    TO authenticated
    USING (
        requested_by_email = auth.jwt() ->> 'email'
        OR employee_email = auth.jwt() ->> 'email'
    );

-- Allow all authenticated users to read all requests (for auditors/managers - RLS may be refined later)
CREATE POLICY "Authenticated users can view all reversal requests" ON reversal_requests
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert reversal requests
CREATE POLICY "Authenticated users can create reversal requests" ON reversal_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update reversal requests
CREATE POLICY "Authenticated users can update reversal requests" ON reversal_requests
    FOR UPDATE
    TO authenticated
    USING (true);

-- RLS Policies for reversal_workflow_states
-- Allow authenticated users to read all workflow states
CREATE POLICY "Authenticated users can view workflow states" ON reversal_workflow_states
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert workflow states
CREATE POLICY "Authenticated users can create workflow states" ON reversal_workflow_states
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to update workflow states
CREATE POLICY "Authenticated users can update workflow states" ON reversal_workflow_states
    FOR UPDATE
    TO authenticated
    USING (true);
