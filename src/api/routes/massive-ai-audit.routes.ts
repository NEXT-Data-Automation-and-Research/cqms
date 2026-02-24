/**
 * Massive AI Audit API
 * POST /api/massive-ai-audit/start — create job and trigger n8n (one payload per agent, 2s delay)
 * GET /api/massive-ai-audit/jobs/:id — get job (progress + details)
 * PATCH /api/massive-ai-audit/jobs/:id/progress — update progress (called by n8n/edge function; service auth)
 * POST /api/massive-ai-audit/jobs/:id/cancel — cancel a running/queued/scheduled job
 */

import { Router, Request, Response } from 'express';
import { verifyAuth } from '../middleware/auth.middleware.js';
import type { SupabaseRequest } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/permission.middleware.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { createLogger } from '../../utils/logger.js';
import { sanitizeErrorMessage } from '../middleware/error-handler.middleware.js';

const ALLOWED_ROLES = ['Quality Analyst', 'Admin', 'Super Admin'] as const;

const router = Router();
const logger = createLogger('MassiveAIAudit');

const DELAY_MS = 2000;

/** Maximum number of massive AI audits that can run concurrently (queued + running). */
const MAX_CONCURRENT_AUDITS = 2;

/** Jobs in queued/running longer than this are marked failed to free slots (e.g. n8n never reported completion). */
const STALE_JOB_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

/** In-memory set of cancelled job IDs so the trigger loop can abort early. */
const cancelledJobIds = new Set<string>();

/** Count jobs currently occupying a slot (queued or running). Uses admin client to see all jobs. */
async function getActiveAuditCount(): Promise<number> {
  try {
    const admin = getServerSupabase();
    const { count, error } = await admin
      .from('massive_ai_audit_jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['queued', 'running']);
    if (error) {
      logger.warn('getActiveAuditCount failed', { error: error.message });
      return 0;
    }
    return typeof count === 'number' ? count : 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('getActiveAuditCount failed', { error: message });
    return 0;
  }
}

/**
 * When a job finishes (completed/failed/cancelled), check if there is a scheduled job waiting
 * and a free slot to run it. If so, move it to 'queued' and kick off the trigger loop.
 */
async function startNextScheduledJob(): Promise<void> {
  try {
    const activeCount = await getActiveAuditCount();
    if (activeCount >= MAX_CONCURRENT_AUDITS) return;

    const admin = getServerSupabase();
    const { data: next, error: fetchErr } = await admin
      .from('massive_ai_audit_jobs')
      .select('id, scorecard_id, start_date, end_date, payload_snapshot')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true, nullsFirst: false })
      .limit(1)
      .single();

    if (fetchErr || !next?.id) return;

    // Atomically move to queued (only if still scheduled — avoids race)
    const { error: upd } = await admin
      .from('massive_ai_audit_jobs')
      .update({ status: 'queued', scheduled_at: null })
      .eq('id', next.id)
      .eq('status', 'scheduled');
    if (upd) return;

    logger.info('massive-ai-audit: auto-starting scheduled job', { jobId: next.id });

    const snapshot = (next.payload_snapshot ?? {}) as {
      intercom_admin_ids?: string[];
      agents?: Array<{ intercom_admin_id?: string; email?: string; name?: string }>;
      notify_me_when_done?: boolean;
      notify_results_to_audited_people?: boolean;
    };
    const intercomAdminIds = Array.isArray(snapshot.intercom_admin_ids) ? snapshot.intercom_admin_ids : [];
    if (intercomAdminIds.length === 0) return;

    const edgeFunctionUrl = getMassiveAiAuditTriggerUrl();
    const triggerKey = getMassiveAiAuditTriggerKey();
    if (!edgeFunctionUrl || !triggerKey) return;

    setImmediate(() => {
      triggerMassiveAuditLoop(next.id, {
        scorecard_id: next.scorecard_id,
        start_date: next.start_date,
        end_date: next.end_date,
        intercom_admin_ids: intercomAdminIds,
        agents: Array.isArray(snapshot.agents) ? snapshot.agents : [],
        notify_me_when_done: Boolean(snapshot.notify_me_when_done),
        notify_results_to_audited_people: Boolean(snapshot.notify_results_to_audited_people),
        edgeFunctionUrl,
        supabaseKey: triggerKey,
      }).catch((err) => logger.error('massive-ai-audit auto-start error', { jobId: next.id, error: err }));
    });
  } catch (err) {
    logger.error('startNextScheduledJob error', err);
  }
}

/**
 * Mark jobs stuck in queued/running for too long as failed so they stop blocking the concurrency limit.
 * (e.g. n8n crashed, never called progress API, or server restarted.)
 */
async function markStaleRunningJobs(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - STALE_JOB_THRESHOLD_MS).toISOString();
    const admin = getServerSupabase();
    const { data: updated, error } = await admin
      .from('massive_ai_audit_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message:
          'Marked failed automatically: no progress update within 24 hours (stale job recovery).',
      })
      .in('status', ['queued', 'running'])
      .lt('created_at', cutoff)
      .select('id');

    if (error) {
      logger.warn('markStaleRunningJobs failed', { error: error.message });
      return;
    }
    if (updated && updated.length > 0) {
      logger.info('massive-ai-audit: marked stale jobs as failed', {
        count: updated.length,
        jobIds: updated.map((r: { id: string }) => r.id),
      });
      setImmediate(() => startNextScheduledJob().catch((e) => logger.error('startNextScheduledJob after stale', e)));
    }
  } catch (err) {
    logger.error('markStaleRunningJobs error', err);
  }
}

/** Edge function URL: optional explicit URL, else derived from SUPABASE_URL. */
function getMassiveAiAuditTriggerUrl(): string | null {
  const explicit = process.env.MASSIVE_AI_AUDIT_EDGE_FUNCTION_URL?.trim();
  if (explicit) return explicit;
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/functions/v1/massive-ai-audit-trigger`;
}

/** Key for Bearer auth when calling the edge function (optional; else use main Supabase key). */
function getMassiveAiAuditTriggerKey(): string | null {
  const explicit = process.env.MASSIVE_AI_AUDIT_EDGE_FUNCTION_KEY?.trim();
  if (explicit) return explicit;
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? null;
}

/** Validate YYYY-MM-DD */
function isDateString(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** Progress update auth: require header x-massive-ai-audit-key matching env (or Bearer for service key) */
function progressUpdateAuth(req: Request, res: Response, next: () => void): void {
  const key = process.env.MASSIVE_AI_AUDIT_SERVICE_KEY;
  if (!key) {
    logger.warn('MASSIVE_AI_AUDIT_SERVICE_KEY not set; progress updates disabled');
    res.status(503).json({ success: false, error: 'Progress updates not configured' });
    return;
  }
  const headerKey = req.headers['x-massive-ai-audit-key'] ?? req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (headerKey !== key) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
}

/**
 * POST /api/massive-ai-audit/start
 * Body: scorecard_id, start_date, end_date, intercom_admin_ids[], notify_me_when_done?,
 *       notify_results_to_audited_people?, schedule_for_later? (boolean)
 *
 * Concurrency: max 2 audits running at once (queued + running).
 *  - If limit reached and schedule_for_later is false/absent → 429 with code MAX_CONCURRENT_AUDITS.
 *  - If limit reached and schedule_for_later is true → create job with status 'scheduled';
 *    it will auto-start when a slot opens.
 */
router.post('/start', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    const userEmail = supabaseReq.user?.email;
    if (!supabase || !userEmail) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const body = req.body ?? {};
    const scorecardId = body.scorecard_id ?? body.scorecardId;
    const startDate = body.start_date ?? body.startDate;
    const endDate = body.end_date ?? body.endDate;
    let intercomAdminIds: string[] = body.intercom_admin_ids ?? body.intercomAdminIds ?? [];
    if (!Array.isArray(intercomAdminIds)) {
      intercomAdminIds = [];
    }
    intercomAdminIds = intercomAdminIds.map((id: unknown) => String(id).trim()).filter(Boolean);

    if (!scorecardId || typeof scorecardId !== 'string') {
      res.status(400).json({ success: false, error: 'scorecard_id is required' });
      return;
    }
    if (!isDateString(startDate) || !isDateString(endDate)) {
      res.status(400).json({ success: false, error: 'start_date and end_date are required (YYYY-MM-DD)' });
      return;
    }
    if (intercomAdminIds.length === 0) {
      res.status(400).json({ success: false, error: 'intercom_admin_ids must be a non-empty array' });
      return;
    }

    const notifyMe = Boolean(body.notify_me_when_done ?? body.notifyMeWhenDone);
    const notifyPeople = Boolean(body.notify_results_to_audited_people ?? body.notifyResultsToAuditedPeople);
    const scheduleForLater = Boolean(body.schedule_for_later ?? body.scheduleForLater);
    const agentsSnapshot = body.agents ?? null;

    const payloadSnapshot = {
      intercom_admin_ids: intercomAdminIds,
      agents: agentsSnapshot,
      notify_me_when_done: notifyMe,
      notify_results_to_audited_people: notifyPeople,
    };

    // ── Concurrency check ────────────────────────────────────────
    const activeCount = await getActiveAuditCount();
    const limitReached = activeCount >= MAX_CONCURRENT_AUDITS;

    if (limitReached && !scheduleForLater) {
      res.status(429).json({
        success: false,
        error: `${activeCount} massive AI audit(s) are already running. More than ${MAX_CONCURRENT_AUDITS} running at the same time is not allowed. Cancel a running audit or schedule this one for later.`,
        code: 'MAX_CONCURRENT_AUDITS',
        running_count: activeCount,
      });
      return;
    }

    // Determine initial status
    const initialStatus = limitReached ? 'scheduled' : 'queued';

    const insertRow: Record<string, unknown> = {
      created_by: userEmail,
      scorecard_id: scorecardId,
      start_date: startDate,
      end_date: endDate,
      status: initialStatus,
      total_agents: intercomAdminIds.length,
      completed_agents: 0,
      completed_conversations: 0,
      payload_snapshot: payloadSnapshot,
    };
    if (initialStatus === 'scheduled') {
      insertRow.scheduled_at = new Date().toISOString();
    }

    const { data: job, error: insertError } = await supabase
      .from('massive_ai_audit_jobs')
      .insert(insertRow)
      .select('id, status, total_agents')
      .single();

    if (insertError || !job) {
      logger.error('Failed to create massive_ai_audit_job', { error: insertError });
      res.status(500).json({
        success: false,
        error: insertError?.message ?? 'Failed to create job',
      });
      return;
    }

    const jobId = job.id;

    // If scheduled, respond and exit — the job will auto-start when a slot opens
    if (initialStatus === 'scheduled') {
      logger.info('massive-ai-audit: job scheduled (queue full)', { jobId, activeCount });
      res.status(200).json({
        success: true,
        job_id: jobId,
        status: 'scheduled',
        scheduled: true,
        total_agents: job.total_agents,
      });
      return;
    }

    res.status(200).json({
      success: true,
      job_id: jobId,
      status: job.status,
      total_agents: job.total_agents,
    });

    // Fire-and-forget: call edge function (which forwards to n8n) one payload per agent with 2s delay
    const edgeFunctionUrl = getMassiveAiAuditTriggerUrl();
    const triggerKey = getMassiveAiAuditTriggerKey();
    if (!edgeFunctionUrl || !triggerKey) {
      logger.warn('Edge function URL or Supabase key not set; massive-ai-audit triggers skipped for job ' + jobId);
      return;
    }

    setImmediate(() => {
      triggerMassiveAuditLoop(jobId, {
        scorecard_id: scorecardId,
        start_date: startDate,
        end_date: endDate,
        intercom_admin_ids: intercomAdminIds,
        agents: Array.isArray(agentsSnapshot) ? agentsSnapshot : [],
        notify_me_when_done: notifyMe,
        notify_results_to_audited_people: notifyPeople,
        edgeFunctionUrl,
        supabaseKey: triggerKey,
      }).catch((err) => logger.error('massive-ai-audit trigger loop error', { jobId, error: err }));
    });
  } catch (error: unknown) {
    logger.error('massive-ai-audit start error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/** One request per agent to edge function (which forwards to n8n), 2s delay between each.
 *  Checks cancelledJobIds before each agent to abort early when the job is cancelled. */
async function triggerMassiveAuditLoop(
  jobId: string,
  params: {
    scorecard_id: string;
    start_date: string;
    end_date: string;
    intercom_admin_ids: string[];
    agents: Array<{ intercom_admin_id?: string; email?: string; name?: string }>;
    notify_me_when_done: boolean;
    notify_results_to_audited_people: boolean;
    edgeFunctionUrl: string;
    supabaseKey: string;
  }
): Promise<void> {
  const admin = getServerSupabase();
  try {
    await admin
      .from('massive_ai_audit_jobs')
      .update({ status: 'running' })
      .eq('id', jobId)
      .eq('status', 'queued');
  } catch {
    // ignore
  }

  for (let i = 0; i < params.intercom_admin_ids.length; i++) {
    // Abort if the job was cancelled while looping
    if (cancelledJobIds.has(jobId)) {
      logger.info('massive-ai-audit: trigger loop aborted (job cancelled)', { jobId, stoppedAtIndex: i });
      cancelledJobIds.delete(jobId);
      return;
    }

    const singleId = params.intercom_admin_ids[i];
    // Resolve agent name/email from agents snapshot
    const agentInfo = (params.agents || []).find(
      (a) => String(a.intercom_admin_id) === singleId
    );
    const payload = {
      job_id: jobId,
      scorecard_id: params.scorecard_id,
      start_date: params.start_date,
      end_date: params.end_date,
      intercom_admin_ids: [singleId],
      agent_email: agentInfo?.email || '',
      agent_name: agentInfo?.name || '',
      notify_me_when_done: params.notify_me_when_done,
      notify_results_to_audited_people: params.notify_results_to_audited_people,
    };
    logger.info('massive-ai-audit: sending payload to edge function', {
      jobId,
      adminId: singleId,
      index: i + 1,
      total: params.intercom_admin_ids.length,
      payload,
      edgeFunctionUrl: params.edgeFunctionUrl,
    });
    try {
      const res = await fetch(params.edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${params.supabaseKey}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      let bodySnippet = text?.slice(0, 500) ?? '';
      if (res.ok) {
        logger.info('massive-ai-audit: edge function response SUCCESS', {
          jobId,
          adminId: singleId,
          status: res.status,
          body: bodySnippet,
        });
      } else {
        logger.error('massive-ai-audit: edge function response FAILED', {
          jobId,
          adminId: singleId,
          status: res.status,
          body: bodySnippet,
        });
      }
    } catch (err) {
      logger.error('massive-ai-audit-trigger fetch error', { jobId, adminId: singleId, error: err });
    }
    if (i < params.intercom_admin_ids.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }
}

/**
 * GET /api/massive-ai-audit/creators
 * Returns distinct created_by (who ran the audit) for visible jobs, for filter dropdowns.
 */
router.get('/creators', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { data: rows, error } = await supabase
      .from('massive_ai_audit_jobs')
      .select('created_by')
      .limit(500);
    if (error) {
      logger.error('Failed to list creators', { error });
      res.status(500).json({ error: error.message });
      return;
    }
    const creators = [...new Set((rows ?? []).map((r: { created_by: string }) => r.created_by).filter(Boolean))].sort();
    res.status(200).json({ creators });
  } catch (error: unknown) {
    logger.error('massive-ai-audit creators error', error);
    res.status(500).json({
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * GET /api/massive-ai-audit/jobs
 * Lists massive AI audit jobs visible to the current user (RLS: own jobs, or all for Admin/Super Admin/Quality Analyst).
 * Query params: created_by, status, scorecard_id, from_date, to_date (filter by job created_at range, ISO date).
 */
router.get('/jobs', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const createdBy = typeof req.query.created_by === 'string' ? req.query.created_by.trim() : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
    const scorecardId = typeof req.query.scorecard_id === 'string' ? req.query.scorecard_id.trim() : undefined;
    const fromDate = typeof req.query.from_date === 'string' ? req.query.from_date.trim() : undefined;
    const toDate = typeof req.query.to_date === 'string' ? req.query.to_date.trim() : undefined;

    let query = supabase
      .from('massive_ai_audit_jobs')
      .select('id, created_at, created_by, scorecard_id, start_date, end_date, status, total_agents, total_conversations, completed_agents, completed_conversations, error_message, completed_at, scheduled_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (createdBy) query = query.eq('created_by', createdBy);
    if (status && ['queued', 'running', 'completed', 'failed', 'cancelled', 'scheduled'].includes(status)) {
      query = query.eq('status', status);
    }
    if (scorecardId) query = query.eq('scorecard_id', scorecardId);
    if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      query = query.gte('created_at', fromDate + 'T00:00:00.000Z');
    }
    if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      query = query.lte('created_at', toDate + 'T23:59:59.999Z');
    }

    const { data: jobs, error } = await query;

    if (error) {
      logger.error('Failed to list jobs', { error });
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json(jobs ?? []);
  } catch (error: unknown) {
    logger.error('massive-ai-audit list jobs error', error);
    res.status(500).json({
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * GET /api/massive-ai-audit/scorecards
 * Returns scorecards that appear in visible massive AI audit jobs (for filter dropdown).
 */
router.get('/scorecards', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const { data: jobs, error: jobsErr } = await supabase
      .from('massive_ai_audit_jobs')
      .select('scorecard_id')
      .not('scorecard_id', 'is', null);
    if (jobsErr) {
      res.status(500).json({ error: jobsErr.message });
      return;
    }
    const ids = [...new Set((jobs ?? []).map((j: { scorecard_id: string }) => j.scorecard_id).filter(Boolean))];
    if (ids.length === 0) {
      res.status(200).json([]);
      return;
    }
    const { data: scorecards, error: scErr } = await supabase
      .from('scorecards')
      .select('id, name')
      .in('id', ids)
      .order('name');
    if (scErr) {
      res.status(500).json({ error: scErr.message });
      return;
    }
    res.status(200).json(scorecards ?? []);
  } catch (error: unknown) {
    logger.error('massive-ai-audit scorecards error', error);
    res.status(500).json({
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * Aggregate errors from parameters_result (same shape as frontend errorsFrom).
 */
function aggregateErrorsFromParams(params: unknown): { total: number; criticalFail: number; critical: number; significant: number; major: number; minor: number } {
  const out = { total: 0, criticalFail: 0, critical: 0, significant: 0, major: 0, minor: 0 };
  if (!Array.isArray(params)) return out;
  (params as Array<{ measurement?: number; error_category?: string; is_fail_all?: boolean }>).forEach((p) => {
    const m = Number(p?.measurement) || 0;
    if (m > 0) {
      out.total += m;
      const cat = String(p?.error_category || '').toLowerCase();
      if (p?.is_fail_all) out.criticalFail += m;
      else if (cat.includes('critical')) out.critical += m;
      else if (cat.includes('significant')) out.significant += m;
      else if (cat.includes('major')) out.major += m;
      else if (cat.includes('minor')) out.minor += m;
      else out.significant += m;
    }
  });
  return out;
}

/**
 * GET /api/massive-ai-audit/analytics
 * Aggregated stats, trend by day, and top failing parameters. Same query params as GET /jobs.
 */
router.get('/analytics', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const createdBy = typeof req.query.created_by === 'string' ? req.query.created_by.trim() : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
    const scorecardId = typeof req.query.scorecard_id === 'string' ? req.query.scorecard_id.trim() : undefined;
    const fromDate = typeof req.query.from_date === 'string' ? req.query.from_date.trim() : undefined;
    const toDate = typeof req.query.to_date === 'string' ? req.query.to_date.trim() : undefined;

    let jobsQuery = supabase
      .from('massive_ai_audit_jobs')
      .select('id, start_date, end_date');
    if (createdBy) jobsQuery = jobsQuery.eq('created_by', createdBy);
    if (status && ['queued', 'running', 'completed', 'failed', 'cancelled', 'scheduled'].includes(status)) {
      jobsQuery = jobsQuery.eq('status', status);
    }
    if (scorecardId) jobsQuery = jobsQuery.eq('scorecard_id', scorecardId);
    if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      jobsQuery = jobsQuery.gte('created_at', fromDate + 'T00:00:00.000Z');
    }
    if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      jobsQuery = jobsQuery.lte('created_at', toDate + 'T23:59:59.999Z');
    }

    const { data: jobs, error: jobsError } = await jobsQuery;

    if (jobsError) {
      res.status(500).json({ error: jobsError.message });
      return;
    }

    const jobIds = (jobs ?? []).map((j: { id: string }) => j.id);

    // Map job_id -> conversation date range (start_date) so the trend
    // reflects when conversations happened, not when the audit batch ran.
    const jobStartDateMap = new Map<string, string>();
    for (const j of (jobs ?? []) as Array<{ id: string; start_date?: string; end_date?: string }>) {
      if (j.start_date) jobStartDateMap.set(j.id, String(j.start_date).slice(0, 10));
    }
    if (jobIds.length === 0) {
      res.status(200).json({
        summary: { totalConversations: 0, passed: 0, failed: 0, passRatePct: 0, avgScore: null, totalErrors: 0, criticalFail: 0, critical: 0, significant: 0, major: 0, minor: 0 },
        trend: [],
        topFailingParameters: [],
        byEmployee: [],
        byScorecard: [],
        scoreDistribution: [],
        severityBreakdown: { criticalFail: 0, critical: 0, significant: 0, major: 0, minor: 0 },
        errorCountDistribution: [],
        failAllStats: { totalConversationsWithFailAll: 0, failAllRatePct: 0, failAllCriteria: [] },
        criteriaDetails: [],
        riskMatrix: [],
      });
      return;
    }

    const admin = getServerSupabase();
    const RESULTS_PAGE = 1000;
    let results: Array<Record<string, unknown>> = [];
    let rFrom = 0;

    while (true) {
      const { data: rPage, error: rErr } = await admin
        .from('massive_ai_audit_results')
        .select('id, job_id, final_score, pass_fail, parameters_result, created_at, audit_date, employee_email, employee_name, scorecard_id')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
        .range(rFrom, rFrom + RESULTS_PAGE - 1);

      if (rErr) {
        res.status(500).json({ error: rErr.message });
        return;
      }
      const rows = (rPage ?? []) as Array<Record<string, unknown>>;
      results = results.concat(rows);
      if (rows.length < RESULTS_PAGE) break;
      rFrom += RESULTS_PAGE;
    }

    type DayKey = string;
    type DayBucket = {
      total: number;
      passed: number;
      failed: number;
      scoreSum: number;
      scoreCount: number;
      totalErrors: number;
      criteriaCount: Map<string, number>;
    };
    const trendByDay = new Map<DayKey, DayBucket>();
    let summaryPassed = 0;
    let summaryFailed = 0;
    let summaryScoreSum = 0;
    let summaryScoreCount = 0;
    let summaryTotalErrors = 0;
    const summaryErr = { criticalFail: 0, critical: 0, significant: 0, major: 0, minor: 0 };
    const paramFailCount = new Map<string, { count: number; measurement: number }>();
    type AgentBucket = { total: number; passed: number; failed: number; scoreSum: number; scoreCount: number; totalErrors: number; failAllCount: number; displayName?: string };
    const byEmployeeMap = new Map<string, AgentBucket>();
    const byScorecardMap = new Map<string, AgentBucket>();
    const scoreDistBuckets = new Array(10).fill(0);
    const errorCountDist = new Map<number, number>();
    let failAllConversations = 0;
    const failAllCriteriaMap = new Map<string, number>();
    type CriteriaDetail = { timesEvaluated: number; timesFailed: number; totalMeasurement: number; penaltySum: number; penaltyCount: number; severity: string };
    const criteriaDetailMap = new Map<string, CriteriaDetail>();

    for (const r of results) {
      // Use the job's start_date (conversation period) for trending, not audit run date
      const jobId = r.job_id as string;
      const jobDate = jobId ? jobStartDateMap.get(jobId) : undefined;
      const day = jobDate || (r.audit_date ? String(r.audit_date).slice(0, 10) : '') || (r.created_at ? String(r.created_at).slice(0, 10) : '');
      if (day) {
        if (!trendByDay.has(day)) {
          trendByDay.set(day, { total: 0, passed: 0, failed: 0, scoreSum: 0, scoreCount: 0, totalErrors: 0, criteriaCount: new Map() });
        }
        const bucket = trendByDay.get(day)!;
        bucket.total += 1;
        if (r.pass_fail === 'passed') bucket.passed += 1;
        if (r.pass_fail === 'failed') bucket.failed += 1;
        const sc = r.final_score != null ? Number(r.final_score) : null;
        if (sc != null) {
          bucket.scoreSum += sc;
          bucket.scoreCount += 1;
        }
        const e = aggregateErrorsFromParams(r.parameters_result);
        bucket.totalErrors += e.total;
        const params = Array.isArray(r.parameters_result) ? r.parameters_result : [];
        (params as Array<{ error_name?: string; measurement?: number }>).forEach((p) => {
          const m = Number(p?.measurement) || 0;
          if (m > 0) {
            const name = String(p?.error_name || 'Parameter').trim() || 'Parameter';
            bucket.criteriaCount.set(name, (bucket.criteriaCount.get(name) || 0) + m);
          }
        });
      }

      if (r.pass_fail === 'passed') summaryPassed += 1;
      if (r.pass_fail === 'failed') summaryFailed += 1;
      const sc = r.final_score != null ? Number(r.final_score) : null;
      if (sc != null) {
        summaryScoreSum += sc;
        summaryScoreCount += 1;
      }
      const err = aggregateErrorsFromParams(r.parameters_result);
      summaryTotalErrors += err.total;
      summaryErr.criticalFail += err.criticalFail;
      summaryErr.critical += err.critical;
      summaryErr.significant += err.significant;
      summaryErr.major += err.major;
      summaryErr.minor += err.minor;

      const params = Array.isArray(r.parameters_result) ? r.parameters_result : [];
      (params as Array<{ error_name?: string; measurement?: number }>).forEach((p) => {
        const m = Number(p?.measurement) || 0;
        if (m > 0) {
          const name = String(p?.error_name || 'Parameter').trim() || 'Parameter';
          if (!paramFailCount.has(name)) paramFailCount.set(name, { count: 0, measurement: 0 });
          const entry = paramFailCount.get(name)!;
          entry.count += 1;
          entry.measurement += m;
        }
      });

      // Score distribution histogram (10 buckets: 0-10, 10-20, ... 90-100)
      if (sc != null) {
        const bucketIdx = Math.min(9, Math.max(0, Math.floor(sc / 10)));
        scoreDistBuckets[bucketIdx] += 1;
      }

      // Error count distribution per conversation
      const convErrorCount = err.total;
      const errKey = Math.min(convErrorCount, 5);
      errorCountDist.set(errKey, (errorCountDist.get(errKey) || 0) + 1);

      // Fail-all tracking
      let convHasFailAll = false;
      const allParams = Array.isArray(r.parameters_result) ? r.parameters_result : [];
      (allParams as Array<{ error_name?: string; measurement?: number; is_fail_all?: boolean; penalty_points?: number; error_category?: string }>).forEach((p) => {
        const m = Number(p?.measurement) || 0;
        const name = String(p?.error_name || 'Parameter').trim() || 'Parameter';
        // Criteria details: track every evaluated criteria
        if (!criteriaDetailMap.has(name)) {
          criteriaDetailMap.set(name, { timesEvaluated: 0, timesFailed: 0, totalMeasurement: 0, penaltySum: 0, penaltyCount: 0, severity: String(p?.error_category || '').toLowerCase() });
        }
        const cd = criteriaDetailMap.get(name)!;
        cd.timesEvaluated += 1;
        if (m > 0) {
          cd.timesFailed += 1;
          cd.totalMeasurement += m;
        }
        const pp = Number(p?.penalty_points) || 0;
        if (pp > 0) {
          cd.penaltySum += pp;
          cd.penaltyCount += 1;
        }
        if (!cd.severity && p?.error_category) cd.severity = String(p.error_category).toLowerCase();

        if (p?.is_fail_all && m > 0) {
          convHasFailAll = true;
          failAllCriteriaMap.set(name, (failAllCriteriaMap.get(name) || 0) + m);
        }
      });
      if (convHasFailAll) failAllConversations += 1;

      const empKey = (String(r.employee_email || r.employee_name || '').trim() || 'Unknown').toLowerCase();
      if (!byEmployeeMap.has(empKey)) {
        byEmployeeMap.set(empKey, {
          total: 0,
          passed: 0,
          failed: 0,
          scoreSum: 0,
          scoreCount: 0,
          totalErrors: 0,
          failAllCount: 0,
          displayName: String(r.employee_name || r.employee_email || 'Unknown').trim() || 'Unknown',
        });
      }
      const empBucket = byEmployeeMap.get(empKey)!;
      empBucket.total += 1;
      if (r.pass_fail === 'passed') empBucket.passed += 1;
      if (r.pass_fail === 'failed') empBucket.failed += 1;
      const rSc = r.final_score != null ? Number(r.final_score) : null;
      if (rSc != null) {
        empBucket.scoreSum += rSc;
        empBucket.scoreCount += 1;
      }
      const rErr = aggregateErrorsFromParams(r.parameters_result);
      empBucket.totalErrors += rErr.total;
      if (convHasFailAll) empBucket.failAllCount += 1;

      const scId = String(r.scorecard_id || '').trim() || 'unknown';
      if (!byScorecardMap.has(scId)) {
        byScorecardMap.set(scId, { total: 0, passed: 0, failed: 0, scoreSum: 0, scoreCount: 0, totalErrors: 0, failAllCount: 0 });
      }
      const scBucket = byScorecardMap.get(scId)!;
      scBucket.total += 1;
      if (r.pass_fail === 'passed') scBucket.passed += 1;
      if (r.pass_fail === 'failed') scBucket.failed += 1;
      if (rSc != null) {
        scBucket.scoreSum += rSc;
        scBucket.scoreCount += 1;
      }
      scBucket.totalErrors += rErr.total;
    }

    const totalConv = results.length;
    const passRatePct = totalConv > 0 ? Math.round((summaryPassed / totalConv) * 100) : 0;
    const avgScore = summaryScoreCount > 0 ? Math.round(summaryScoreSum / summaryScoreCount) : null;

    const trend = Array.from(trendByDay.entries())
      .map(([date, b]) => {
        const criteria = Array.from(b.criteriaCount.entries())
          .map(([errorName, count]) => ({ errorName, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        return {
          date,
          total: b.total,
          passed: b.passed,
          failed: b.failed,
          passRatePct: b.total > 0 ? Math.round((b.passed / b.total) * 100) : 0,
          avgScore: b.scoreCount > 0 ? Math.round(b.scoreSum / b.scoreCount) : null,
          totalErrors: b.totalErrors,
          criteria,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    const topFailingParameters = Array.from(paramFailCount.entries())
      .map(([errorName, v]) => ({ errorName, count: v.count, totalMeasurement: v.measurement }))
      .sort((a, b) => b.totalMeasurement - a.totalMeasurement)
      .slice(0, 20);

    const byEmployee = Array.from(byEmployeeMap.entries())
      .map(([key, b]) => ({
        employeeKey: key,
        employeeName: b.displayName || key,
        total: b.total,
        passed: b.passed,
        failed: b.failed,
        passRatePct: b.total > 0 ? Math.round((b.passed / b.total) * 100) : 0,
        avgScore: b.scoreCount > 0 ? Math.round(b.scoreSum / b.scoreCount) : null,
        totalErrors: b.totalErrors,
        avgErrorsPerConvo: b.total > 0 ? Math.round((b.totalErrors / b.total) * 10) / 10 : 0,
        failAllCount: b.failAllCount,
      }))
      .sort((a, b) => b.failed - a.failed || b.totalErrors - a.totalErrors)
      .slice(0, 50);

    const scorecardIds = [...new Set(byScorecardMap.keys())].filter((id) => id !== 'unknown');
    let scorecardNames: Record<string, string> = {};
    if (scorecardIds.length > 0) {
      const { data: scRows } = await admin
        .from('scorecards')
        .select('id, name')
        .in('id', scorecardIds);
      (scRows ?? []).forEach((row: { id: string; name?: string }) => {
        scorecardNames[row.id] = row.name || row.id;
      });
    }

    const byScorecard = Array.from(byScorecardMap.entries())
      .map(([scorecardId, b]) => ({
        scorecardId,
        scorecardName: scorecardNames[scorecardId] || scorecardId || 'Unknown',
        total: b.total,
        passed: b.passed,
        failed: b.failed,
        passRatePct: b.total > 0 ? Math.round((b.passed / b.total) * 100) : 0,
        avgScore: b.scoreCount > 0 ? Math.round(b.scoreSum / b.scoreCount) : null,
        totalErrors: b.totalErrors,
      }))
      .sort((a, b) => b.failed - a.failed || b.totalErrors - a.totalErrors);

    const scoreDistribution = scoreDistBuckets.map((count, i) => ({
      bucket: `${i * 10}-${(i + 1) * 10}`,
      count,
    }));

    const errorCountDistribution = [];
    for (let k = 0; k <= 5; k++) {
      errorCountDistribution.push({ errors: k === 5 ? '5+' : k, count: errorCountDist.get(k) || 0 });
    }

    const failAllStats = {
      totalConversationsWithFailAll: failAllConversations,
      failAllRatePct: totalConv > 0 ? Math.round((failAllConversations / totalConv) * 1000) / 10 : 0,
      failAllCriteria: Array.from(failAllCriteriaMap.entries())
        .map(([errorName, count]) => ({ errorName, count }))
        .sort((a, b) => b.count - a.count),
    };

    const criteriaDetails = Array.from(criteriaDetailMap.entries())
      .map(([errorName, cd]) => ({
        errorName,
        timesEvaluated: cd.timesEvaluated,
        timesFailed: cd.timesFailed,
        failureRatePct: cd.timesEvaluated > 0 ? Math.round((cd.timesFailed / cd.timesEvaluated) * 1000) / 10 : 0,
        avgPenaltyPoints: cd.penaltyCount > 0 ? Math.round((cd.penaltySum / cd.penaltyCount) * 10) / 10 : 0,
        totalMeasurement: cd.totalMeasurement,
        severity: cd.severity || 'unknown',
      }))
      .sort((a, b) => b.failureRatePct - a.failureRatePct || b.totalMeasurement - a.totalMeasurement);

    const riskMatrix = criteriaDetails
      .filter((c) => c.timesFailed > 0)
      .map((c) => ({
        errorName: c.errorName,
        frequency: c.timesFailed,
        avgPenaltyPoints: c.avgPenaltyPoints,
        severity: c.severity,
      }));

    res.status(200).json({
      summary: {
        totalConversations: totalConv,
        passed: summaryPassed,
        failed: summaryFailed,
        passRatePct,
        avgScore,
        totalErrors: summaryTotalErrors,
        criticalFail: summaryErr.criticalFail,
        critical: summaryErr.critical,
        significant: summaryErr.significant,
        major: summaryErr.major,
        minor: summaryErr.minor,
      },
      trend,
      topFailingParameters,
      byEmployee,
      byScorecard,
      scoreDistribution,
      severityBreakdown: summaryErr,
      errorCountDistribution,
      failAllStats,
      criteriaDetails,
      riskMatrix,
    });
  } catch (error: unknown) {
    logger.error('massive-ai-audit analytics error', error);
    res.status(500).json({
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * GET /api/massive-ai-audit/results
 * Lists massive AI audit results for jobs visible to the current user.
 * Query params: created_by, status, scorecard_id, from_date, to_date (same as GET /jobs).
 */
router.get('/results', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const createdBy = typeof req.query.created_by === 'string' ? req.query.created_by.trim() : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status.trim() : undefined;
    const scorecardId = typeof req.query.scorecard_id === 'string' ? req.query.scorecard_id.trim() : undefined;
    const fromDate = typeof req.query.from_date === 'string' ? req.query.from_date.trim() : undefined;
    const toDate = typeof req.query.to_date === 'string' ? req.query.to_date.trim() : undefined;

    let jobsQuery = supabase
      .from('massive_ai_audit_jobs')
      .select('id, payload_snapshot');
    if (createdBy) jobsQuery = jobsQuery.eq('created_by', createdBy);
    if (status && ['queued', 'running', 'completed', 'failed', 'cancelled', 'scheduled'].includes(status)) {
      jobsQuery = jobsQuery.eq('status', status);
    }
    if (scorecardId) jobsQuery = jobsQuery.eq('scorecard_id', scorecardId);
    if (fromDate && /^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
      jobsQuery = jobsQuery.gte('created_at', fromDate + 'T00:00:00.000Z');
    }
    if (toDate && /^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      jobsQuery = jobsQuery.lte('created_at', toDate + 'T23:59:59.999Z');
    }

    const { data: jobs, error: jobsError } = await jobsQuery;

    if (jobsError) {
      logger.error('Failed to fetch user jobs for results', { error: jobsError });
      res.status(500).json({ error: jobsError.message });
      return;
    }

    const jobIds = (jobs ?? []).map((j: { id: string }) => j.id);
    if (jobIds.length === 0) {
      res.status(200).json([]);
      return;
    }

    // Use admin client to bypass RLS; paginate in 1000-row pages (PostgREST max-rows)
    const adminClient = getServerSupabase();
    const RESULTS_PAGE = 1000;
    let results: Record<string, unknown>[] = [];
    let rFrom = 0;

    while (true) {
      const { data: rPage, error: rErr } = await adminClient
        .from('massive_ai_audit_results')
        .select('id, job_id, conversation_id, scorecard_id, employee_email, employee_name, audit_date, scorecard_data, final_score, confidence_score, ai_notes, parameters_result, status, pass_fail, created_at')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false })
        .range(rFrom, rFrom + RESULTS_PAGE - 1);

      if (rErr) {
        logger.error('Failed to list results', { error: rErr });
        res.status(500).json({ error: rErr.message });
        return;
      }

      const rows = rPage ?? [];
      results = results.concat(rows);
      if (rows.length < RESULTS_PAGE) break;
      rFrom += RESULTS_PAGE;
    }

    // Auto-resolve empty employee names from job payload_snapshot (safety net for old results)
    const jobMap = new Map<string, { agents?: Array<{ name?: string; email?: string }> }>();
    (jobs ?? []).forEach((j: { id: string; payload_snapshot?: { agents?: Array<{ name?: string; email?: string }> } }) => {
      if (j.payload_snapshot) jobMap.set(j.id, j.payload_snapshot);
    });

    const enriched = results.map((r: Record<string, unknown>) => {
      if ((!r.employee_name || r.employee_name === '') && r.job_id) {
        const snapshot = jobMap.get(r.job_id as string);
        const agents = snapshot?.agents;
        if (Array.isArray(agents) && agents.length > 0) {
          // For single-agent jobs, use the first agent; for multi-agent, best-effort first match
          const agent = agents[0];
          if (!r.employee_name || r.employee_name === '') r.employee_name = agent.name ?? '';
          if (!r.employee_email || r.employee_email === '') r.employee_email = agent.email ?? '';
        }
      }
      return r;
    });

    res.status(200).json(enriched);
  } catch (error: unknown) {
    logger.error('massive-ai-audit list results error', error);
    res.status(500).json({
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * GET /api/massive-ai-audit/jobs/:id
 * Returns job row for progress page (RLS: user sees own jobs or all if elevated role).
 */
router.get('/jobs/:id', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Job id required' });
      return;
    }

    const { data: job, error } = await supabase
      .from('massive_ai_audit_jobs')
      .select('id, created_at, created_by, scorecard_id, start_date, end_date, status, total_agents, total_conversations, completed_agents, completed_conversations, payload_snapshot, error_message, completed_at, scheduled_at')
      .eq('id', id)
      .single();

    if (error || !job) {
      res.status(error?.code === 'PGRST116' ? 404 : 500).json({
        error: error?.code === 'PGRST116' ? 'Job not found' : error?.message ?? 'Failed to load job',
      });
      return;
    }

    res.status(200).json(job);
  } catch (error: unknown) {
    logger.error('massive-ai-audit get job error', error);
    res.status(500).json({
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * GET /api/massive-ai-audit/jobs/:id/assignments
 * Returns audit assignments for this job. Access: owner or elevated role (RLS enforced via user client).
 */
router.get('/jobs/:id/assignments', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ error: 'Job id required' });
      return;
    }

    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    // Verify user can see this job (RLS: own job or elevated role)
    const { data: job, error: jobAccessError } = await supabase
      .from('massive_ai_audit_jobs')
      .select('id')
      .eq('id', id)
      .single();

    if (jobAccessError || !job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    const admin = getServerSupabase();

    // Paginate through all results — PostgREST max-rows is 1000
    const PAGE_SIZE = 1000;
    let allAssignments: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const { data: page, error: pageError } = await admin
        .from('massive_ai_audit_results')
        .select('id, conversation_id, scorecard_id, employee_email, employee_name, audit_date, scorecard_data, final_score, confidence_score, ai_notes, parameters_result, status, pass_fail, created_at, created_by')
        .eq('job_id', id)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (pageError) {
        logger.error('Assignments fetch failed', { id, error: pageError });
        res.status(500).json({ error: pageError.message });
        return;
      }

      const rows = page ?? [];
      allAssignments = allAssignments.concat(rows);
      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    logger.info(`Assignments fetched for job ${id}: ${allAssignments.length} results`);
    res.status(200).json(allAssignments);
  } catch (error: unknown) {
    logger.error('massive-ai-audit get assignments error', error);
    res.status(500).json({
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * PATCH /api/massive-ai-audit/jobs/:id/progress
 * Body options:
 *   - increment_completed_agents: number  — atomically increment completed_agents by N (preferred)
 *   - completed_agents: number            — set completed_agents to absolute value (legacy)
 *   - total_conversations: number         — set total_conversations
 *   - completed_conversations: number     — set completed_conversations
 *   - status: string                      — force status ('queued'|'running'|'completed'|'failed'|'cancelled')
 *   - auto_complete: boolean (default true) — when using increment, auto-set status='completed' if all agents done
 * Auth: x-massive-ai-audit-key or Authorization Bearer (MASSIVE_AI_AUDIT_SERVICE_KEY)
 */
router.patch('/jobs/:id/progress', progressUpdateAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Job id required' });
      return;
    }

    const body = req.body ?? {};
    const admin = getServerSupabase();

    // Preferred path: atomic increment of completed_agents
    if (typeof body.increment_completed_agents === 'number' && body.increment_completed_agents > 0) {
      const incr = body.increment_completed_agents;
      const autoComplete = body.auto_complete !== false; // default true

      // Use raw SQL for atomic increment + conditional status update
      const { data: updated, error: rpcErr } = await admin.rpc('increment_massive_audit_progress', {
        p_job_id: id,
        p_increment: incr,
        p_auto_complete: autoComplete,
      });

      if (rpcErr) {
        // Fallback: if RPC doesn't exist yet, do it with two queries
        logger.warn('RPC increment_massive_audit_progress not found, using fallback', { error: rpcErr.message });

        // Read current state
        const { data: job, error: readErr } = await admin
          .from('massive_ai_audit_jobs')
          .select('completed_agents, total_agents, status')
          .eq('id', id)
          .single();

        if (readErr || !job) {
          res.status(500).json({ success: false, error: readErr?.message ?? 'Job not found' });
          return;
        }

        const newCompleted = (job.completed_agents ?? 0) + incr;
        const updates: Record<string, unknown> = { completed_agents: newCompleted };

        // Auto-complete: if all agents done and not already completed/failed
        let justCompleted = false;
        if (autoComplete && newCompleted >= (job.total_agents ?? 0) && !['completed', 'failed', 'cancelled'].includes(job.status)) {
          updates.status = 'completed';
          updates.completed_at = new Date().toISOString();
          justCompleted = true;
        }

        const { error: updErr } = await admin.from('massive_ai_audit_jobs').update(updates).eq('id', id);
        if (updErr) {
          logger.error('Progress fallback update failed', { id, error: updErr });
          res.status(500).json({ success: false, error: updErr.message });
          return;
        }

        res.status(200).json({ success: true, completed_agents: newCompleted });
        if (justCompleted) setImmediate(() => startNextScheduledJob());
        return;
      }

      res.status(200).json({ success: true, ...((updated as Record<string, unknown>) ?? {}) });
      // RPC may have auto-completed — check and start next if so
      setImmediate(() => startNextScheduledJob());
      return;
    }

    // Legacy path: absolute value updates
    const updates: Record<string, unknown> = {};
    if (typeof body.total_conversations === 'number') updates.total_conversations = body.total_conversations;
    if (typeof body.completed_agents === 'number') updates.completed_agents = body.completed_agents;
    if (typeof body.completed_conversations === 'number') updates.completed_conversations = body.completed_conversations;
    if (typeof body.status === 'string' && ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(body.status)) {
      updates.status = body.status;
      if (body.status === 'completed' || body.status === 'failed') {
        updates.completed_at = new Date().toISOString();
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(200).json({ success: true });
      return;
    }

    const { error } = await admin.from('massive_ai_audit_jobs').update(updates).eq('id', id);

    if (error) {
      logger.error('Progress update failed', { id, error });
      res.status(500).json({ success: false, error: error.message });
      return;
    }

    res.status(200).json({ success: true });

    // If a job just reached a terminal state, try starting next scheduled job
    const terminalStatuses = ['completed', 'failed', 'cancelled'];
    if (typeof updates.status === 'string' && terminalStatuses.includes(updates.status)) {
      setImmediate(() => startNextScheduledJob());
    }
  } catch (error: unknown) {
    logger.error('massive-ai-audit progress error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * GET /api/massive-ai-audit/my-results
 * Returns all massive AI audit results where the logged-in user was the audited employee.
 * This is the employee-facing endpoint — no job ownership check, purely email-based.
 */
router.get('/my-results', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const userEmail = supabaseReq.user?.email;
    if (!userEmail) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const admin = getServerSupabase();
    const normalizedEmail = userEmail.toLowerCase().trim();

    // Paginate in 1000-row pages (PostgREST max-rows)
    const MY_PAGE = 1000;
    let myResults: Record<string, unknown>[] = [];
    let myFrom = 0;

    while (true) {
      const { data: myPage, error: myErr } = await admin
        .from('massive_ai_audit_results')
        .select('id, job_id, conversation_id, scorecard_id, employee_email, employee_name, audit_date, scorecard_data, final_score, confidence_score, ai_notes, parameters_result, status, pass_fail, created_at')
        .ilike('employee_email', normalizedEmail)
        .order('created_at', { ascending: false })
        .range(myFrom, myFrom + MY_PAGE - 1);

      if (myErr) {
        logger.error('Failed to fetch my-results', { error: myErr, email: normalizedEmail });
        res.status(500).json({ error: myErr.message });
        return;
      }

      const rows = myPage ?? [];
      myResults = myResults.concat(rows);
      if (rows.length < MY_PAGE) break;
      myFrom += MY_PAGE;
    }

    // Fetch job metadata for date ranges / context
    const jobIds = [...new Set(myResults.map((r: { job_id?: string }) => r.job_id).filter(Boolean))];
    let jobMap: Record<string, { start_date?: string; end_date?: string; created_at?: string; status?: string }> = {};
    if (jobIds.length > 0) {
      const { data: jobs } = await admin
        .from('massive_ai_audit_jobs')
        .select('id, start_date, end_date, created_at, status, completed_at')
        .in('id', jobIds);
      (jobs ?? []).forEach((j: { id: string; start_date?: string; end_date?: string; created_at?: string; status?: string; completed_at?: string }) => {
        jobMap[j.id] = j;
      });
    }

    res.status(200).json({ results: myResults, jobs: jobMap });
  } catch (error: unknown) {
    logger.error('massive-ai-audit my-results error', error);
    res.status(500).json({
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * POST /api/massive-ai-audit/jobs/:id/complete
 * Mark a running or queued job as completed (user-facing).
 */
router.post('/jobs/:id/complete', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Job id required' });
      return;
    }

    const { data: job, error: accessErr } = await supabase
      .from('massive_ai_audit_jobs')
      .select('id, status')
      .eq('id', id)
      .single();

    if (accessErr || !job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    if (!['running', 'queued'].includes(job.status)) {
      res.status(400).json({ success: false, error: `Job is already ${job.status}` });
      return;
    }

    const admin = getServerSupabase();
    const { error: updErr } = await admin
      .from('massive_ai_audit_jobs')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['running', 'queued']);

    if (updErr) {
      logger.error('massive-ai-audit complete failed', { id, error: updErr });
      res.status(500).json({ success: false, error: updErr.message });
      return;
    }

    logger.info('massive-ai-audit: job marked complete', { jobId: id, previousStatus: job.status });
    res.status(200).json({ success: true, status: 'completed' });
    setImmediate(() => startNextScheduledJob());
  } catch (error: unknown) {
    logger.error('massive-ai-audit complete error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

/**
 * POST /api/massive-ai-audit/jobs/:id/cancel
 * Cancels a running, queued, or scheduled job.
 * Sets status to 'cancelled' and signals the trigger loop to stop sending new payloads.
 * Already-dispatched n8n workflows will still finish, but no new agents will be triggered.
 */
router.post('/jobs/:id/cancel', verifyAuth, requireRole(...ALLOWED_ROLES), async (req: Request, res: Response): Promise<void> => {
  try {
    const supabaseReq = req as SupabaseRequest;
    const supabase = supabaseReq.supabase;
    if (!supabase) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const id = req.params.id;
    if (!id) {
      res.status(400).json({ success: false, error: 'Job id required' });
      return;
    }

    // Verify user can see this job (RLS)
    const { data: job, error: accessErr } = await supabase
      .from('massive_ai_audit_jobs')
      .select('id, status')
      .eq('id', id)
      .single();

    if (accessErr || !job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) {
      res.status(400).json({ success: false, error: `Job is already ${job.status}` });
      return;
    }

    // Mark cancelled in DB (admin client to bypass RLS for UPDATE)
    const admin = getServerSupabase();
    const { error: updErr } = await admin
      .from('massive_ai_audit_jobs')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', id)
      .in('status', ['queued', 'running', 'scheduled']);

    if (updErr) {
      logger.error('massive-ai-audit cancel failed', { id, error: updErr });
      res.status(500).json({ success: false, error: updErr.message });
      return;
    }

    // Signal the in-memory trigger loop to abort
    cancelledJobIds.add(id);
    // Clean up after 5 minutes (in case the loop already finished)
    setTimeout(() => cancelledJobIds.delete(id), 5 * 60 * 1000);

    logger.info('massive-ai-audit: job cancelled', { jobId: id, previousStatus: job.status });

    res.status(200).json({ success: true, status: 'cancelled' });

    // A slot may have opened — start next scheduled job
    setImmediate(() => startNextScheduledJob());
  } catch (error: unknown) {
    logger.error('massive-ai-audit cancel error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? sanitizeErrorMessage(error, process.env.NODE_ENV === 'production') : 'Server error',
    });
  }
});

// ── Periodic scheduler: check every 30s for scheduled jobs that can start ──
const SCHEDULER_INTERVAL_MS = 30_000;
const STALE_JOBS_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let staleJobsTimer: ReturnType<typeof setInterval> | null = null;

function startSchedulerPolling(): void {
  if (schedulerTimer) return;
  // Run once immediately on load (in case slots freed while server was down)
  setImmediate(() => {
    startNextScheduledJob().catch((err) =>
      logger.error('massive-ai-audit scheduler: initial check error', err)
    );
  });
  schedulerTimer = setInterval(() => {
    startNextScheduledJob().catch((err) =>
      logger.error('massive-ai-audit scheduler: periodic check error', err)
    );
  }, SCHEDULER_INTERVAL_MS);
  logger.info(`massive-ai-audit: scheduler polling started (every ${SCHEDULER_INTERVAL_MS / 1000}s)`);

  // Run stale-job recovery so stuck queued/running jobs don't block the concurrency limit forever
  setImmediate(() => {
    markStaleRunningJobs().catch((err) =>
      logger.error('massive-ai-audit: initial stale-jobs check error', err)
    );
  });
  staleJobsTimer = setInterval(() => {
    markStaleRunningJobs().catch((err) =>
      logger.error('massive-ai-audit: stale-jobs check error', err)
    );
  }, STALE_JOBS_CHECK_INTERVAL_MS);
  logger.info(
    `massive-ai-audit: stale-job recovery started (every ${STALE_JOBS_CHECK_INTERVAL_MS / 60_000} min, threshold ${STALE_JOB_THRESHOLD_MS / 60 / 60 / 1000}h)`
  );
}

// Start polling when module is loaded (i.e. when server boots)
startSchedulerPolling();

export default router;
