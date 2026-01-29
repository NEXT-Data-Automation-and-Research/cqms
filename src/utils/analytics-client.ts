/**
 * Analytics client — automatic, invisible page view tracking.
 * Runs on load (flush previous + start current) and on pagehide (send current).
 * No UI; user never sees or triggers anything.
 */

import { getSupabase } from './supabase-init.js';

const STORAGE_PREFIX = 'cqms_analytics_';
const SESSION_ID_KEY = `${STORAGE_PREFIX}session_id`;
const PREVIOUS_PAGE_PATH_KEY = `${STORAGE_PREFIX}previous_page_path`;
const PREVIOUS_VIEW_STARTED_KEY = `${STORAGE_PREFIX}previous_view_started_at`;
const CURRENT_PAGE_PATH_KEY = `${STORAGE_PREFIX}current_page_path`;
const CURRENT_VIEW_STARTED_KEY = `${STORAGE_PREFIX}current_view_started_at`;

let cachedAuthToken: string | null = null;
let cachedCsrfToken: string | null = null;

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_ID_KEY);
    if (!id || !isValidUUID(id)) {
      id = crypto.randomUUID ? crypto.randomUUID() : simpleUUID();
      sessionStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID ? crypto.randomUUID() : simpleUUID();
  }
}

function simpleUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isValidUUID(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function clientEventId(): string {
  return crypto.randomUUID ? crypto.randomUUID() : simpleUUID();
}

async function getAuthToken(): Promise<string | null> {
  if (cachedAuthToken) return cachedAuthToken;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  cachedAuthToken = session.access_token;
  return cachedAuthToken;
}

async function getCSRFToken(authToken: string): Promise<string | null> {
  if (cachedCsrfToken) return cachedCsrfToken;
  try {
    const res = await fetch('/api/csrf', {
      method: 'GET',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const token = res.headers.get('X-CSRF-Token') || res.headers.get('x-csrf-token');
    if (token) {
      cachedCsrfToken = token;
      return token;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function isAnalyticsEnabled(): boolean {
  const env = (typeof window !== 'undefined' && (window as unknown as { env?: { ANALYTICS_ENABLED?: string } }).env);
  if (env && typeof env.ANALYTICS_ENABLED === 'string') {
    return env.ANALYTICS_ENABLED.toLowerCase() !== 'false';
  }
  return true;
}

async function sendEvents(events: Array<Record<string, unknown>>): Promise<void> {
  if (events.length === 0) return;
  const authToken = await getAuthToken();
  if (!authToken) return;
  const csrf = await getCSRFToken(authToken);
  if (!csrf) return;

  const body = JSON.stringify({ events });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
    'X-CSRF-Token': csrf,
  };

  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers,
      body,
      keepalive: false,
    });
  } catch {
    /* silent; do not block UX */
  }
}

async function sendEventsKeepalive(events: Array<Record<string, unknown>>): Promise<void> {
  if (events.length === 0) return;
  const authToken = await getAuthToken();
  if (!authToken) return;
  const csrf = await getCSRFToken(authToken);
  if (!csrf) return;

  const body = JSON.stringify({ events });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
    'X-CSRF-Token': csrf,
  };

  try {
    fetch('/api/analytics/events', {
      method: 'POST',
      headers,
      body,
      keepalive: true,
    });
  } catch {
    /* silent */
  }
}

function nowISO(): string {
  return new Date().toISOString();
}

function onLoad(): void {
  if (!isAnalyticsEnabled()) return;

  const path = typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  const sessionId = getOrCreateSessionId();
  const now = nowISO();

  const previousPath = sessionStorage.getItem(CURRENT_PAGE_PATH_KEY);
  const previousStarted = sessionStorage.getItem(CURRENT_VIEW_STARTED_KEY);

  if (previousPath && previousStarted) {
    const startedMs = Date.parse(previousStarted);
    if (Number.isFinite(startedMs)) {
      const endedMs = Date.now();
      const timeOnPageSeconds = Math.max(0, Math.min(86400, Math.floor((endedMs - startedMs) / 1000)));
      const event = {
        client_event_id: clientEventId(),
        session_id: sessionId,
        page_path: previousPath,
        view_started_at: previousStarted,
        view_ended_at: new Date(endedMs).toISOString(),
        referrer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined,
      };
      sendEvents([event]);
    }
  }

  sessionStorage.setItem(CURRENT_PAGE_PATH_KEY, path);
  sessionStorage.setItem(CURRENT_VIEW_STARTED_KEY, now);
}

function onPageHide(): void {
  if (!isAnalyticsEnabled()) return;

  const path = sessionStorage.getItem(CURRENT_PAGE_PATH_KEY);
  const started = sessionStorage.getItem(CURRENT_VIEW_STARTED_KEY);
  if (!path || !started) return;

  const startedMs = Date.parse(started);
  if (!Number.isFinite(startedMs)) return;

  const sessionId = getOrCreateSessionId();
  const endedMs = Date.now();
  const timeOnPageSeconds = Math.max(0, Math.min(86400, Math.floor((endedMs - startedMs) / 1000)));

  const event = {
    client_event_id: clientEventId(),
    session_id: sessionId,
    page_path: path,
    view_started_at: started,
    view_ended_at: new Date(endedMs).toISOString(),
    referrer: typeof document !== 'undefined' ? (document.referrer || undefined) : undefined,
  };

  sendEventsKeepalive([event]);
}

/**
 * Initialize analytics: run on load and register pagehide/visibilitychange.
 * Defers until DOMContentLoaded so Supabase/auth-checker can initialize first.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!isAnalyticsEnabled()) return;

  window.addEventListener('pagehide', onPageHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onPageHide();
  });

  const run = (): void => {
    const supabase = getSupabase();
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }: { data: { session: unknown } }) => {
      if (!data.session) return;
      onLoad();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
}

initAnalytics();
