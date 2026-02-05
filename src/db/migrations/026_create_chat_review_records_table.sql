-- Migration: Create chat_review_records table for Chat Review Status (ATA)
-- Purpose: Record which conversations were reviewed per audit assignment.
-- When an auditor opens a conversation in Intercom (or reviews in-app), we store
-- a row here. One conversation per assignment can be marked 'audited' (the one scored).

-- ============================================================================
-- TABLE: chat_review_records
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.chat_review_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_assignment_id TEXT NOT NULL REFERENCES public.audit_assignments(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    review_status TEXT NOT NULL DEFAULT 'reviewed' CHECK (review_status IN ('reviewed', 'audited')),
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewer_email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (audit_assignment_id, conversation_id)
);

COMMENT ON TABLE public.chat_review_records IS 'Tracks which conversations were reviewed per audit assignment for ATA and reporting.';
COMMENT ON COLUMN public.chat_review_records.review_status IS 'reviewed = opened/reviewed; audited = the one conversation that was scored for this assignment.';

CREATE INDEX IF NOT EXISTS idx_chat_review_records_assignment
    ON public.chat_review_records(audit_assignment_id);
CREATE INDEX IF NOT EXISTS idx_chat_review_records_conversation
    ON public.chat_review_records(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_review_records_reviewer
    ON public.chat_review_records(reviewer_email);
CREATE INDEX IF NOT EXISTS idx_chat_review_records_reviewed_at
    ON public.chat_review_records(reviewed_at);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.chat_review_records ENABLE ROW LEVEL SECURITY;

-- Select: same visibility as audit_assignments (auditor, employee, or assigner)
CREATE POLICY "Users can read chat review records for their assignments"
ON public.chat_review_records FOR SELECT
TO authenticated
USING (
    auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.audit_assignments aa
        WHERE aa.id = chat_review_records.audit_assignment_id
        AND (
            aa.auditor_email = (auth.jwt() ->> 'email')
            OR aa.employee_email = (auth.jwt() ->> 'email')
            OR aa.assigned_by = (auth.jwt() ->> 'email')
        )
    )
);

-- Insert: only the auditor for that assignment can record a review
CREATE POLICY "Auditors can insert chat review records for their assignments"
ON public.chat_review_records FOR INSERT
TO authenticated
WITH CHECK (
    auth.role() = 'authenticated'
    AND reviewer_email = (auth.jwt() ->> 'email')
    AND EXISTS (
        SELECT 1 FROM public.audit_assignments aa
        WHERE aa.id = audit_assignment_id
        AND aa.auditor_email = (auth.jwt() ->> 'email')
    )
);

-- Update: only the auditor can update (e.g. set review_status to 'audited' on submit)
CREATE POLICY "Auditors can update chat review records for their assignments"
ON public.chat_review_records FOR UPDATE
TO authenticated
USING (
    auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.audit_assignments aa
        WHERE aa.id = chat_review_records.audit_assignment_id
        AND aa.auditor_email = (auth.jwt() ->> 'email')
    )
)
WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
        SELECT 1 FROM public.audit_assignments aa
        WHERE aa.id = chat_review_records.audit_assignment_id
        AND aa.auditor_email = (auth.jwt() ->> 'email')
    )
);

-- No DELETE policy: we don't allow deleting review records (audit trail). Omit DELETE or restrict.
-- If you need delete later (e.g. admin), add a separate policy.
