-- Migration: Add 'scheduled' status for Massive AI Audit job queuing (max 2 concurrent)
-- When the concurrency limit is hit, jobs are created with status='scheduled' and scheduled_at set.
-- They auto-start (FIFO by scheduled_at) when a running job completes.

-- Expand the status check constraint to include 'scheduled'
ALTER TABLE public.massive_ai_audit_jobs
  DROP CONSTRAINT IF EXISTS massive_ai_audit_jobs_status_check;

ALTER TABLE public.massive_ai_audit_jobs
  ADD CONSTRAINT massive_ai_audit_jobs_status_check
  CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled', 'scheduled'));

-- Add scheduled_at column for FIFO ordering of scheduled jobs
ALTER TABLE public.massive_ai_audit_jobs
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

COMMENT ON COLUMN public.massive_ai_audit_jobs.scheduled_at
  IS 'Timestamp when the job was scheduled for later (status=scheduled); used for FIFO ordering when auto-starting.';

-- Partial index for quickly finding the next scheduled job
CREATE INDEX IF NOT EXISTS idx_massive_ai_audit_jobs_scheduled
  ON public.massive_ai_audit_jobs(scheduled_at ASC)
  WHERE status = 'scheduled';
