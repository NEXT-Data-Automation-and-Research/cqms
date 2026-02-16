-- Migration: Add use_for_massive_ai_audit flag to scorecards table
-- Only scorecards with this flag enabled will appear in the Massive AI Audit scorecard selection.

ALTER TABLE public.scorecards
ADD COLUMN IF NOT EXISTS use_for_massive_ai_audit BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.scorecards.use_for_massive_ai_audit IS 'When true, this scorecard appears in the Massive AI Audit scorecard picker';

CREATE INDEX IF NOT EXISTS idx_scorecards_use_for_massive_ai_audit
ON public.scorecards(use_for_massive_ai_audit)
WHERE use_for_massive_ai_audit = true;
