-- Migration: Create submitted_batches table
-- Purpose: Store submitted audit batches so agents can view, acknowledge, and request reversal

CREATE TABLE IF NOT EXISTS submitted_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT NOT NULL UNIQUE,
    auditor_name TEXT,
    auditor_email TEXT,
    employee_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
    audit_count INTEGER NOT NULL DEFAULT 0,
    average_score NUMERIC,
    overall_status TEXT,
    total_errors INTEGER DEFAULT 0,
    total_critical INTEGER DEFAULT 0,
    total_critical_fail INTEGER DEFAULT 0,
    audit_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledgement_status TEXT NOT NULL DEFAULT 'Pending',
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE submitted_batches IS 'Stores submitted audit batches for agent-facing view, acknowledgement, and reversal';
COMMENT ON COLUMN submitted_batches.employee_emails IS 'JSON array of unique employee emails from audits in this batch, used for filtering';
COMMENT ON COLUMN submitted_batches.audit_data IS 'Full audit array with displayData and payload for drill-in rendering';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_submitted_batches_batch_id ON submitted_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_submitted_batches_submitted_at ON submitted_batches(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submitted_batches_ack_status ON submitted_batches(acknowledgement_status);
CREATE INDEX IF NOT EXISTS idx_submitted_batches_employee_emails ON submitted_batches USING GIN (employee_emails);

-- Enable RLS
ALTER TABLE submitted_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Auth users can read submitted batches" ON submitted_batches
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Auth users can insert submitted batches" ON submitted_batches
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Auth users can update submitted batches" ON submitted_batches
    FOR UPDATE TO authenticated USING (true);
