-- Migration: Create massive_ai_audit_jobs table for Massive AI Audit feature
-- Tracks each batch run (agents + date range + scorecard); progress updated by n8n/callback

CREATE TABLE IF NOT EXISTS public.massive_ai_audit_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  scorecard_id TEXT NOT NULL REFERENCES public.scorecards(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  total_agents INT NOT NULL DEFAULT 0,
  total_conversations INT,
  completed_agents INT NOT NULL DEFAULT 0,
  completed_conversations INT NOT NULL DEFAULT 0,
  payload_snapshot JSONB,
  error_message TEXT,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_massive_ai_audit_jobs_created_by ON public.massive_ai_audit_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_massive_ai_audit_jobs_status ON public.massive_ai_audit_jobs(status);
CREATE INDEX IF NOT EXISTS idx_massive_ai_audit_jobs_created_at ON public.massive_ai_audit_jobs(created_at DESC);

COMMENT ON TABLE public.massive_ai_audit_jobs IS 'Tracks Massive AI Audit batch jobs; progress updated by n8n or edge function callback';

ALTER TABLE public.massive_ai_audit_jobs ENABLE ROW LEVEL SECURITY;

-- Users can read their own jobs (created_by = current user email)
CREATE POLICY "Users can read own massive_ai_audit_jobs"
ON public.massive_ai_audit_jobs FOR SELECT
TO authenticated
USING (created_by = (auth.jwt() ->> 'email'));

-- Users can insert jobs (created_by must match current user)
CREATE POLICY "Users can insert own massive_ai_audit_jobs"
ON public.massive_ai_audit_jobs FOR INSERT
TO authenticated
WITH CHECK (created_by = (auth.jwt() ->> 'email'));

-- Updates (progress) are done server-side with service role; no policy needed for user UPDATE
