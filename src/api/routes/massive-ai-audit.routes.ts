/**
 * Massive AI Audit API
 * POST /api/massive-ai-audit/start — create job and trigger n8n (one payload per agent, 2s delay)
 * GET /api/massive-ai-audit/jobs/:id — get job (progress + details)
 * PATCH /api/massive-ai-audit/jobs/:id/progress — update progress (called by n8n/edge function; service auth)
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
 * Body: scorecard_id, start_date, end_date, intercom_admin_ids[], notify_me_when_done?, notify_results_to_audited_people?
 * Creates job, returns job_id immediately, then async sends one request per agent to n8n with 2s delay.
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
    const agentsSnapshot = body.agents ?? null;

    const payloadSnapshot = {
      intercom_admin_ids: intercomAdminIds,
      agents: agentsSnapshot,
      notify_me_when_done: notifyMe,
      notify_results_to_audited_people: notifyPeople,
    };

    const { data: job, error: insertError } = await supabase
      .from('massive_ai_audit_jobs')
      .insert({
        created_by: userEmail,
        scorecard_id: scorecardId,
        start_date: startDate,
        end_date: endDate,
        status: 'queued',
        total_agents: intercomAdminIds.length,
        completed_agents: 0,
        completed_conversations: 0,
        payload_snapshot: payloadSnapshot,
      })
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

/** One request per agent to edge function (which forwards to n8n), 2s delay between each */
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
      .select('id, created_at, created_by, scorecard_id, start_date, end_date, status, total_agents, total_conversations, completed_agents, completed_conversations, error_message, completed_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (createdBy) query = query.eq('created_by', createdBy);
    if (status && ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(status)) {
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
    if (status && ['queued', 'running', 'completed', 'failed', 'cancelled'].includes(status)) {
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
      .select('id, created_at, created_by, scorecard_id, start_date, end_date, status, total_agents, total_conversations, completed_agents, completed_conversations, payload_snapshot, error_message, completed_at')
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
        if (autoComplete && newCompleted >= (job.total_agents ?? 0) && !['completed', 'failed', 'cancelled'].includes(job.status)) {
          updates.status = 'completed';
          updates.completed_at = new Date().toISOString();
        }

        const { error: updErr } = await admin.from('massive_ai_audit_jobs').update(updates).eq('id', id);
        if (updErr) {
          logger.error('Progress fallback update failed', { id, error: updErr });
          res.status(500).json({ success: false, error: updErr.message });
          return;
        }

        res.status(200).json({ success: true, completed_agents: newCompleted });
        return;
      }

      res.status(200).json({ success: true, ...((updated as Record<string, unknown>) ?? {}) });
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

export default router;
