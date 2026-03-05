-- Migration: Conversations table for pull-conversations by admin_id and time range
-- Purpose: Store conversation data (e.g. from Intercom export/sync) so the create-audit
-- page can fetch by admin_id and updated_at range instead of calling Intercom API.
-- Populate this table via your own sync/export process (e.g. Intercom Reporting Data Export).

-- ============================================================================
-- TABLE: conversations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.conversations IS 'Conversation records queryable by admin_id and updated_at range. Populate via your sync/export (e.g. Intercom).';
COMMENT ON COLUMN public.conversations.id IS 'Conversation id (e.g. Intercom conversation id).';
COMMENT ON COLUMN public.conversations.admin_id IS 'Admin/teammate id who participated (e.g. Intercom admin id).';
COMMENT ON COLUMN public.conversations.updated_at IS 'When the conversation was last updated (for time range filter).';
COMMENT ON COLUMN public.conversations.payload IS 'Full conversation object (same shape as API) for UI display.';

CREATE INDEX IF NOT EXISTS idx_conversations_admin_id_updated_at
    ON public.conversations(admin_id, updated_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');
