-- Migration: Add massive_audit_job_id to audit_assignments
-- Links audit assignments created by Massive AI Audit (n8n/callback) to the batch job

ALTER TABLE public.audit_assignments
ADD COLUMN IF NOT EXISTS massive_audit_job_id UUID REFERENCES public.massive_ai_audit_jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_assignments_massive_audit_job_id
ON public.audit_assignments(massive_audit_job_id)
WHERE massive_audit_job_id IS NOT NULL;

COMMENT ON COLUMN public.audit_assignments.massive_audit_job_id IS 'Set when assignment is created by Massive AI Audit (n8n callback) for results filtering';
