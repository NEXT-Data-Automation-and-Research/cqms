/**
 * Analytics API routes
 * POST /api/analytics/events — ingest page view events (strict validation, no false data)
 * GET /api/analytics/me — current user's page views (my activity)
 * GET /api/analytics/admin/summary — platform summary (Admin/Super Admin only)
 * GET /api/analytics/admin/by-page — aggregated by page_slug (Admin/Super Admin only)
 * GET /api/analytics/admin/by-user/:userId — page views for a user (Admin/Super Admin only)
 */

import { Router, Response } from 'express';
import { verifyAuth } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/permission.middleware.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';
import { getAuthenticatedServerSupabase } from '../utils/authenticated-server-supabase.js';
import {
  getAllowedSlugForPath,
  ANALYTICS_LIMITS,
} from '../../core/analytics/analytics-allowlist.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('AnalyticsAPI');
const router = Router();

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const MAX_LIMIT = 500;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

function isValidUUID(s: string): boolean {
  return typeof s === 'string' && UUID_REGEX.test(s.trim());
}

function parseTimestamp(s: string): number | null {
  if (typeof s !== 'string') return null;
  const n = Date.parse(s.trim());
  return Number.isFinite(n) ? n : null;
}

function sanitizeString(s: string | undefined, maxLen: number): string {
  if (s == null || typeof s !== 'string') return '';
  return s.trim().slice(0, maxLen).replace(/[\x00-\x1f]/g, '');
}

interface PageViewEvent {
  client_event_id?: string;
  session_id: string;
  page_path: string;
  view_started_at: string;
  view_ended_at: string;
  referrer?: string;
  device_info?: Record<string, unknown>;
}

function validateEvent(raw: unknown, userId: string): { valid: true; row: Record<string, unknown> } | { valid: false; status: number; message: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { valid: false, status: 400, message: 'Each event must be an object' };
  }

  const e = raw as Record<string, unknown>;
  const session_id = typeof e.session_id === 'string' ? e.session_id.trim() : '';
  const page_path = typeof e.page_path === 'string' ? e.page_path.trim() : '';
  const view_started_at = typeof e.view_started_at === 'string' ? e.view_started_at : '';
  const view_ended_at = typeof e.view_ended_at === 'string' ? e.view_ended_at : '';

  if (!isValidUUID(session_id)) {
    return { valid: false, status: 400, message: 'Invalid or missing session_id (must be UUID)' };
  }
  const page_slug = getAllowedSlugForPath(page_path);
  if (!page_slug) {
    return { valid: false, status: 400, message: 'page_path not allowed or unknown route' };
  }
  if (page_path.length > ANALYTICS_LIMITS.PAGE_PATH_MAX_LENGTH) {
    return { valid: false, status: 400, message: 'page_path too long' };
  }

  const startedMs = parseTimestamp(view_started_at);
  const endedMs = parseTimestamp(view_ended_at);
  if (startedMs == null || endedMs == null) {
    return { valid: false, status: 400, message: 'Invalid view_started_at or view_ended_at (ISO 8601 required)' };
  }
  if (endedMs < startedMs) {
    return { valid: false, status: 400, message: 'view_ended_at must be >= view_started_at' };
  }

  const now = Date.now();
  const maxPast = ANALYTICS_LIMITS.TIMESTAMP_MAX_PAST_HOURS * 60 * 60 * 1000;
  const maxFuture = ANALYTICS_LIMITS.TIMESTAMP_MAX_FUTURE_SECONDS * 1000;
  if (startedMs < now - maxPast) {
    return { valid: false, status: 400, message: 'view_started_at too far in the past' };
  }
  if (startedMs > now + maxFuture || endedMs > now + maxFuture) {
    return { valid: false, status: 400, message: 'Timestamps cannot be in the future' };
  }

  const timeOnPageSeconds = Math.floor((endedMs - startedMs) / 1000);
  if (timeOnPageSeconds < 0 || timeOnPageSeconds > ANALYTICS_LIMITS.TIME_ON_PAGE_MAX_SECONDS) {
    return { valid: false, status: 400, message: 'time_on_page_seconds out of bounds (0–86400)' };
  }

  let client_event_id: string | null = null;
  if (e.client_event_id != null) {
    if (typeof e.client_event_id !== 'string' || !isValidUUID(e.client_event_id)) {
      return { valid: false, status: 400, message: 'client_event_id must be a valid UUID if present' };
    }
    client_event_id = e.client_event_id.trim();
  }

  const referrer = sanitizeString(e.referrer as string | undefined, ANALYTICS_LIMITS.REFERRER_MAX_LENGTH);
  let device_info: Record<string, unknown> | null = null;
  if (e.device_info != null && typeof e.device_info === 'object' && !Array.isArray(e.device_info)) {
    const str = JSON.stringify(e.device_info);
    if (str.length <= ANALYTICS_LIMITS.DEVICE_INFO_MAX_BYTES) {
      device_info = e.device_info as Record<string, unknown>;
    }
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    session_id,
    page_slug,
    page_path: page_path.slice(0, ANALYTICS_LIMITS.PAGE_PATH_MAX_LENGTH),
    view_started_at: new Date(startedMs).toISOString(),
    view_ended_at: new Date(endedMs).toISOString(),
    time_on_page_seconds: timeOnPageSeconds,
    referrer: referrer || null,
    device_info: device_info ?? null,
    ...(client_event_id ? { client_event_id } : {}),
  };

  return { valid: true, row };
}

// In-memory rate limit: events per user per minute (simple, no Redis required for v1)
const userEventCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_EVENTS = 60;

function checkRateLimit(userId: string, eventsCount: number): boolean {
  const now = Date.now();
  let entry = userEventCounts.get(userId);
  if (!entry) {
    userEventCounts.set(userId, { count: eventsCount, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return eventsCount <= RATE_LIMIT_MAX_EVENTS;
  }
  if (now > entry.resetAt) {
    entry = { count: eventsCount, resetAt: now + RATE_LIMIT_WINDOW_MS };
    userEventCounts.set(userId, entry);
    return eventsCount <= RATE_LIMIT_MAX_EVENTS;
  }
  entry.count += eventsCount;
  return entry.count <= RATE_LIMIT_MAX_EVENTS;
}

/**
 * POST /api/analytics/events
 * Body: { events: PageViewEvent[] }
 * - user_id is NEVER read from body; set from auth only.
 * - Strict validation; reject entire payload on first invalid event.
 * - Idempotency: client_event_id unique; duplicates ignored.
 */
router.post('/events', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const analyticsEnabled = process.env.ANALYTICS_ENABLED !== 'false';
  if (!analyticsEnabled) {
    res.status(204).end();
    return;
  }

  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || !Array.isArray(body.events)) {
    res.status(400).json({ error: 'Bad Request', message: 'Body must be { events: array }' });
    return;
  }

  const events = body.events as unknown[];
  if (events.length === 0) {
    res.status(200).json({ accepted: 0 });
    return;
  }
  if (events.length > ANALYTICS_LIMITS.MAX_EVENTS_PER_REQUEST) {
    res.status(400).json({
      error: 'Bad Request',
      message: `At most ${ANALYTICS_LIMITS.MAX_EVENTS_PER_REQUEST} events per request`,
    });
    return;
  }

  if (!checkRateLimit(userId, events.length)) {
    res.status(429).json({ error: 'Too Many Requests', message: 'Rate limit exceeded' });
    return;
  }

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < events.length; i++) {
    const result = validateEvent(events[i], userId);
    if (!result.valid) {
      res.status(result.status).json({ error: 'Bad Request', message: result.message, index: i });
      return;
    }
    rows.push(result.row);
  }

  try {
    const supabase = getServerSupabase();
    for (const row of rows) {
      const { error } = await supabase.from('user_page_views').insert(row);
      if (error) {
        if (error.code === '23505') {
          // unique violation = duplicate client_event_id, idempotent
          continue;
        }
        logger.error('Analytics insert error', { error: error.message, code: error.code });
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to store event' });
        return;
      }
    }
    res.status(200).json({ accepted: rows.length });
  } catch (err: unknown) {
    logger.error('Analytics error', err);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to store events' });
  }
});

function parseDateRange(req: { query: Record<string, unknown> }): { from: string; to: string } {
  const days = Math.min(MAX_DAYS, Math.max(1, Number(req.query.days) || DEFAULT_DAYS));
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * GET /api/analytics/me
 * Current user's page views (my activity). Optional: ?days=7&limit=100
 */
router.get('/me', verifyAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'User not found' });
    return;
  }
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 100));
  const { from, to } = parseDateRange(req);

  try {
    // Use authenticated Supabase client to respect RLS policies
    const supabase = await getAuthenticatedServerSupabase(req);
    const { data, error } = await supabase
      .from('user_page_views')
      .select('id, page_slug, page_path, view_started_at, view_ended_at, time_on_page_seconds, created_at')
      .eq('user_id', userId)
      .gte('view_started_at', from)
      .lte('view_started_at', to)
      .order('view_started_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Analytics me error', { error: error.message, userId, from, to });
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load activity' });
      return;
    }
    logger.debug('Analytics me success', { userId, count: data?.length ?? 0, from, to });
    res.json({ page_views: data ?? [], from, to, limit });
  } catch (err: unknown) {
    logger.error('Analytics me error', { error: err, userId });
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load activity' });
  }
});

/**
 * GET /api/analytics/admin/summary
 * Platform summary: total views, unique users, DAU. Optional: ?days=7
 */
router.get(
  '/admin/summary',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { from, to } = parseDateRange(req);
    try {
      // Use authenticated client - RLS allows Admin/Super Admin to read all page views
      const supabase = await getAuthenticatedServerSupabase(req);
      const { data: views, error: viewsError } = await supabase
        .from('user_page_views')
        .select('user_id, view_started_at')
        .gte('view_started_at', from)
        .lte('view_started_at', to);

      if (viewsError) {
        logger.error('Analytics admin summary error', { error: viewsError.message, from, to });
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load summary' });
        return;
      }

      const list = views ?? [];
      const uniqueUserIds = new Set(list.map((r: { user_id: string }) => r.user_id));
      const byDay = new Map<string, Set<string>>();
      for (const r of list) {
        const day = (r.view_started_at as string).slice(0, 10);
        if (!byDay.has(day)) byDay.set(day, new Set());
        byDay.get(day)!.add(r.user_id);
      }
      const dauList = Array.from(byDay.entries()).map(([date, ids]) => ({ date, unique_users: ids.size }));
      const avgDau = dauList.length ? dauList.reduce((s, d) => s + d.unique_users, 0) / dauList.length : 0;

      res.json({
        from,
        to,
        total_page_views: list.length,
        unique_users: uniqueUserIds.size,
        daily_active_users: dauList,
        average_dau: Math.round(avgDau * 100) / 100,
      });
    } catch (err: unknown) {
      logger.error('Analytics admin summary error', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load summary' });
    }
  }
);

/**
 * GET /api/analytics/admin/by-page
 * Aggregated by page_slug: count, avg time_on_page_seconds. Optional: ?days=7
 */
router.get(
  '/admin/by-page',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { from, to } = parseDateRange(req);
    try {
      // Use authenticated client - RLS allows Admin/Super Admin to read all page views
      const supabase = await getAuthenticatedServerSupabase(req);
      const { data, error } = await supabase
        .from('user_page_views')
        .select('page_slug, page_path, time_on_page_seconds')
        .gte('view_started_at', from)
        .lte('view_started_at', to);

      if (error) {
        logger.error('Analytics admin by-page error', { error: error.message, from, to });
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load by-page' });
        return;
      }

      const list = data ?? [];
      const bySlug = new Map<string, { count: number; totalSeconds: number; page_path: string }>();
      for (const r of list) {
        const slug = r.page_slug as string;
        if (!bySlug.has(slug)) bySlug.set(slug, { count: 0, totalSeconds: 0, page_path: r.page_path as string });
        const row = bySlug.get(slug)!;
        row.count += 1;
        row.totalSeconds += Number(r.time_on_page_seconds) || 0;
      }
      const result = Array.from(bySlug.entries()).map(([page_slug, agg]) => ({
        page_slug,
        page_path: agg.page_path,
        view_count: agg.count,
        avg_time_on_page_seconds: agg.count ? Math.round((agg.totalSeconds / agg.count) * 100) / 100 : 0,
      }));
      result.sort((a, b) => b.view_count - a.view_count);

      res.json({ from, to, by_page: result });
    } catch (err: unknown) {
      logger.error('Analytics admin by-page error', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load by-page' });
    }
  }
);

/**
 * GET /api/analytics/admin/by-user/:userId
 * Page views for a specific user (Admin/Super Admin only). Optional: ?days=7&limit=100
 */
router.get(
  '/admin/by-user/:userId',
  verifyAuth,
  requireRole('Admin', 'Super Admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { userId } = req.params;
    if (!userId) {
      res.status(400).json({ error: 'Bad Request', message: 'userId required' });
      return;
    }
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 100));
    const { from, to } = parseDateRange(req);

    try {
      // Use authenticated client - RLS allows Admin/Super Admin to read all page views
      const supabase = await getAuthenticatedServerSupabase(req);
      const { data, error } = await supabase
        .from('user_page_views')
        .select('id, page_slug, page_path, view_started_at, view_ended_at, time_on_page_seconds, created_at')
        .eq('user_id', userId)
        .gte('view_started_at', from)
        .lte('view_started_at', to)
        .order('view_started_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Analytics admin by-user error', { error: error.message, userId, from, to });
        res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load user activity' });
        return;
      }
      logger.debug('Analytics admin by-user success', { userId, count: data?.length ?? 0 });
      res.json({ page_views: data ?? [], from, to, limit, user_id: userId });
    } catch (err: unknown) {
      logger.error('Analytics admin by-user error', err);
      res.status(500).json({ error: 'Internal Server Error', message: 'Failed to load user activity' });
    }
  }
);

export default router;
