# Analytics Feature — Implementation Proposal

**Document version:** 1.1  
**Date:** January 29, 2025  
**Status:** Proposal for approval

---

## 0. Design principles (non-negotiable)

Two principles govern this feature:

1. **Fully automatic and invisible**  
   Analytics collection must be **fully automatic**. The user must **not** be asked to do anything, see any UI, or notice any change in behavior (no modals, no consent banners for this feature, no extra clicks). Collection runs in the background on load and on page leave; no user action is required. The process should feel like it does not exist from the user’s perspective.

2. **Strict data sanitization — no false data**  
   Only **valid, sanitized** data may be written to the database. Invalid, malformed, or suspicious payloads must be **rejected** (not partially stored). The server **never** trusts the client for identity or critical fields; it validates types, bounds, and allowlists and overwrites sensitive fields from the authenticated session. The system must be **strict** so that analytics data stays trustworthy and no garbage or spoofed data enters the DB.

---

## 1. Overview

This proposal describes a **seamless** implementation of two analytics layers in the CQMS platform:

| Type | Purpose | Primary consumers |
|------|---------|-------------------|
| **User analytics** | How users use the app: which pages, how long (exact seconds), when, and in what order | Product, UX, support |
| **Platform analytics** | Aggregate metrics about the platform: usage, performance, adoption, health | Engineering, ops, leadership |

Both layers share the same collection pipeline and storage where it makes sense, so implementation stays minimal and consistent.

---

## 2. User Analytics (Detailed)

### 2.1 Goals

- **Page usage:** Which pages (by route/slug) are visited and how often.
- **Time on page:** Exact duration in **seconds** per page view.
- **Timing:** When each view started and ended (timestamps).
- **Session context:** Same user session across pages (session id, optional device info).

No PII beyond what you already have (e.g. `user_id` in auth); focus on behavior and timing.

### 2.2 Data captured per page view

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | UUID | From auth (nullable for anonymous if you support it later). |
| `session_id` | UUID | Stable for the browser session (e.g. generated once, stored in `sessionStorage`). |
| `page_slug` | string | From `route-config` (e.g. `home`, `dashboard`, `audit-reports`). |
| `page_path` | string | Full path (e.g. `/home`, `/dashboard`). |
| `view_started_at` | timestamp | When the user landed on the page. |
| `view_ended_at` | timestamp | When they left (or last heartbeat). |
| **`time_on_page_seconds`** | integer | `view_ended_at - view_started_at`, in seconds. |
| `referrer` | string | `document.referrer` (optional). |
| `device_info` | JSON | Optional; reuse existing `device_info` if you already collect it. |

Time is calculated **per view**: one row per page view with `view_started_at`, `view_ended_at`, and `time_on_page_seconds`.

### 2.3 Seamless collection strategy (no extra clicks)

The app uses **full page loads** and a central **route config** with slugs. Collection can be:

1. **On load (every page)**  
   - Generate or read `session_id` from `sessionStorage`.  
   - Resolve current route → `page_slug` + `page_path` (using existing `route-config` / router).  
   - **Flush previous page:**  
     - Read from `sessionStorage`: `previous_page_slug`, `previous_view_started_at`.  
     - If present, compute `time_on_page_seconds = now - previous_view_started_at`, send **page view end** event (or one “page view” record with `view_ended_at = now` and `time_on_page_seconds`).  
   - **Start new view:**  
     - Write to `sessionStorage`: `current_page_slug`, `current_page_path`, `view_started_at = now`.

2. **On leave (optional but recommended)**  
   - Use `pagehide` / `visibilitychange` (hidden) and `sendBeacon` to send the **current** page view with `view_ended_at = now` and `time_on_page_seconds`.  
   - Ensures last page in a tab/session is not lost when user closes tab or navigates away.

3. **No change to navigation flow**  
   - No need to change `navigateWithTransition` or `window.location` usage.  
   - A small **analytics client** (one script/module) runs on every authenticated page: on load it flushes previous + starts current; on pagehide/visibility hidden it sends current.  
   - Back/forward: still full reloads; “previous” view is flushed on next load as in step 1.

This gives **exact seconds per page** and **exact timestamps** without users doing anything extra.

### 2.4 Optional: heartbeat for long-lived pages

For pages that stay open for a long time without navigation (e.g. a single-page view), you can:

- Send a **heartbeat** every N seconds (e.g. 30–60) with `page_slug` and `view_started_at`.  
- On next navigation (or pagehide), `time_on_page_seconds` is still `view_ended_at - view_started_at`; heartbeats can be used later for “active time” or fraud detection if needed.

Heartbeat is **optional** for v1; the above load + pagehide strategy already gives accurate time-on-page.

---

## 3. Platform Analytics (Aggregate)

### 3.1 Goals

- **Usage:** DAU/WAU/MAU, page views per day, top pages, sessions per user.  
- **Adoption:** Which features (pages) are used most, by role if desired.  
- **Performance:** API latency, error rates, frontend metrics (e.g. LCP, FID, CLS) if you add them.  
- **Health:** Uptime, error spikes, slow endpoints.

These are **derived** from the same raw data (page views, sessions, optional API logs) plus any extra instrumentation you add (API middleware, frontend Web Vitals).

### 3.2 Data sources

| Source | Used for |
|--------|----------|
| **User analytics (page views + sessions)** | DAU/WAU/MAU, time-on-page per page/slug, top pages, sessions per user, feature adoption. |
| **API access / performance logs** | Request count, latency, errors, slow endpoints (you already have or can add middleware). |
| **Optional: frontend metrics** | LCP, FID, CLS, load time — can be sent with the same beacon/batch as page views. |
| **Optional: server metrics** | CPU, memory, etc. (if you run your own server). |

So: **one** client-side pipeline (page view + optional heartbeats + optional Web Vitals) and **one** server-side pipeline (API logs) feed **platform** analytics via aggregation (e.g. daily rollups, materialized views, or pre-aggregated tables).

### 3.3 Example platform metrics (all derivable)

- **User:** DAU, WAU, MAU; total page views; avg session duration; avg time per page (by slug); top 10 pages; new vs returning (e.g. by `session_id` or cookie).  
- **Platform:** Requests per minute; P95/P99 API latency; error rate; uptime.  
- **Product:** Adoption per route/slug; time-on-page per feature; funnel (e.g. home → dashboard → create-audit).

No separate “platform analytics SDK” for the client — same events, aggregated differently.

---

## 4. Architecture (Seamless Integration)

### 4.1 High-level flow

```
[Browser]  →  Analytics client (on load + pagehide)
                   →  POST /api/analytics/events  (batch: page-view end + page-view start)
[API]      →  Validate auth, sanitize, enqueue or write to DB
[DB]       →  user_page_views (+ optional user_sessions, user_actions)
[Backend]  →  Aggregation jobs or views → platform analytics
[Dashboard] →  User analytics UI (per-user, per-page, time) + Platform analytics UI (aggregates)
```

### 4.2 Where it plugs in (existing codebase)

- **Route resolution:** Use existing `route-config` and router (e.g. `getActiveRoute()` or path → slug map). No new routing logic.  
- **Auth:** Reuse existing auth (e.g. Supabase). Only send events when user is authenticated; optionally skip or anonymize for non-authenticated.  
- **Navigation:** No change. Analytics runs on **every** page load and on **pagehide**; no need to hook into `navigateWithTransition`.  
- **API:** New route: `POST /api/analytics/events` (or `/api/analytics/page-views`). Body: array of events (e.g. `{ type: 'page_view', ... }`).  
- **Feature flag:** Use existing `ANALYTICS_ENABLED` from `env.template` so you can turn collection off in dev or per environment.

### 4.3 Database (minimal for v1)

Reuse the schema from `docs/analytics/ANALYTICS_APM_CRASHLYTICS_PLAN.md` where it fits:

- **`user_page_views`**  
  - `id`, `user_id`, `session_id`, `page_slug`, `page_path`, `referrer`,  
  - `view_started_at`, `view_ended_at`, **`time_on_page_seconds`**,  
  - optional: `scroll_depth`, `device_info`, `created_at`.

- **`user_sessions`** (optional for v1)  
  - `id`, `user_id`, `session_start`, `session_end`, `session_duration_seconds`, `pages_visited[]`, etc.  
  - Can be derived from `user_page_views` by `session_id` if you prefer to add later.

- **Platform analytics:**  
  - Either **materialized views** / **scheduled SQL** on top of `user_page_views` (and API logs), or  
  - **Pre-aggregated tables** (e.g. `daily_page_stats`, `daily_active_users`) refreshed by a small job.  
  - Same DB; no separate “platform analytics DB” for v1.

### 4.4 Privacy and compliance

- Store only what’s needed: `user_id`, `session_id`, `page_slug`, `page_path`, timestamps, optional `referrer`/`device_info`.  
- No need to log full URL query strings or form data for this feature.  
- Use existing RLS and auth so only authorized roles (e.g. Admin/Super Admin) can read analytics.  
- Document retention (e.g. 90 days raw, 1 year aggregated) and add to your privacy docs.

---

## 4.5 Data sanitization and validation (strict — no false data)

To keep the database free of false or malicious data, the following rules are **mandatory**. Invalid payloads are **rejected in full** (no partial inserts).

### 4.5.1 Never trust the client for identity

- **`user_id`**  
  - **Never** taken from the request body.  
  - **Always** set server-side from the authenticated session (e.g. JWT or Supabase auth).  
  - If the request is unauthenticated, reject the entire payload (401) or do not persist analytics for that request.
- **`user_role`** (if stored)  
  - **Never** taken from the client.  
  - **Always** resolved server-side from the same auth/session or from the `users` table.

### 4.5.2 Server-side validation (every request)

Before writing anything to the DB, the API must validate and sanitize as follows. If **any** check fails, return **400** (or **422**) and **do not** insert.

| Field | Rule | Action if invalid |
|-------|------|-------------------|
| **`page_slug`** | Required. Must be in the **allowlist** of known slugs (from `route-config` or a server-side copy). No free-form text. | Reject payload. |
| **`page_path`** | Required. Must match a known path for that slug (or a path allowlist / pattern). Max length (e.g. 500 chars). Trim and normalize. | Reject payload. |
| **`session_id`** | Required. Must be a valid UUID format. | Reject payload. |
| **`view_started_at`** | Required. ISO 8601. Must be within a reasonable window (e.g. not in the future; not more than 24 hours in the past for “current” view). | Reject payload. |
| **`view_ended_at`** | Required for “complete” page view. ISO 8601. Must be ≥ `view_started_at`. Must be within a reasonable window (e.g. not in the future). | Reject payload. |
| **`time_on_page_seconds`** | Integer. Must equal `view_ended_at - view_started_at` (in seconds) within a small tolerance (e.g. ±1 s). Must be ≥ 0 and ≤ a cap (e.g. 86400 = 24 hours). Server **recomputes** from timestamps and overwrites client value. | Reject payload or overwrite with server-computed value and reject if out of bounds. |
| **`referrer`** | Optional. If present: string, max length (e.g. 2048), trim. No script tags or control chars. | Strip/sanitize or reject payload. |
| **`device_info`** | Optional. If present: must be a JSON object; max size (e.g. 2 KB); no nested functions or dangerous keys. | Strip unknown keys / truncate or reject. |

**General:**  
- Reject requests with unknown or extra fields if you use a strict schema; or strip unknown fields and validate the rest.  
- Reject payloads that fail schema validation (e.g. wrong types, missing required fields).  
- Apply a **max batch size** (e.g. at most 2–5 events per request); reject larger batches with **400**.

### 4.5.3 Database-level constraints

Enforce integrity at the DB so that even a bug in the API cannot insert invalid rows:

- **CHECK** constraints: e.g. `time_on_page_seconds >= 0 AND time_on_page_seconds <= 86400`; `view_ended_at >= view_started_at`.  
- **NOT NULL** on required columns: `user_id`, `session_id`, `page_slug`, `page_path`, `view_started_at`, `view_ended_at`, `time_on_page_seconds`.  
- **Foreign key** on `user_id` to `auth.users` or `users` (if applicable).  
- **Enum or allowlist** for `page_slug` in application layer; optionally an enum type in DB if the list is small and stable.

### 4.5.4 Idempotency and deduplication

- **Client** can send a unique **event id** (e.g. UUID) per page-view event.  
- **Server** stores it in a unique column (e.g. `client_event_id UNIQUE`).  
- **Duplicate** requests (same `client_event_id`) are ignored (no second insert), so double-sends (e.g. load + pagehide for same view) do not create duplicate rows.

### 4.5.5 Rate limiting and abuse

- **Per user** (or per session): cap events per minute (e.g. 30–60).  
- **Per IP** (for unauthenticated or as a backstop): strict cap (e.g. 10 req/min).  
- Return **429** when over limit; do not persist events for that request.

### 4.5.6 Summary

- **Automatic and invisible:** no user-facing flow; collection on load and page leave only.  
- **Strict sanitization:** server overwrites identity; validates and allowlists all inputs; recomputes `time_on_page_seconds`; rejects invalid payloads in full.  
- **DB constraints:** CHECKs and NOT NULL so only valid rows can be stored.  
- **Idempotency:** client event id to avoid duplicates.  
- **Rate limiting:** to prevent abuse and keep data quality high.

---

## 5. Implementation Plan (Phased)

### Phase 1 — Foundation (User analytics: collection + storage)

- **Backend**  
  - Migration: create `user_page_views` (and optionally `user_sessions`) with **CHECK constraints** and NOT NULL per §4.5.3.  
  - `POST /api/analytics/events` (or `/page-views`):  
    - **Auth:** Set `user_id` (and `user_role` if stored) **only** from session; never from body.  
    - **Validation:** Apply full §4.5.2 (allowlist for `page_slug`/`page_path`, timestamp bounds, server-computed `time_on_page_seconds`, max lengths). Reject invalid payloads with 400/422; no partial writes.  
    - **Idempotency:** Use `client_event_id` (or similar) to deduplicate; ignore duplicate event ids.  
    - **Rate limiting:** Per user/session and per IP per §4.5.5.  
  - Respect `ANALYTICS_ENABLED`; when disabled, return 204 or 200 without persisting.
- **Frontend**  
  - **Analytics client** (single module, **no UI**, no user interaction):  
    - On load: read previous page from `sessionStorage`, send “page view end” with `time_on_page_seconds`; then write current page + `view_started_at`.  
    - On `pagehide` / `visibilitychange` (hidden): send current page view with `view_ended_at` and `time_on_page_seconds` via `sendBeacon`.  
  - Include script on all authenticated pages (e.g. via shared layout or one line in your main app shell). **User must not see or trigger anything.**  
  - Resolve `page_slug`/`page_path` from current path + `route-config` (or server-provided meta); client sends only allowlisted slugs/paths in practice (server still re-validates).
- **Config**  
  - `ANALYTICS_ENABLED`, optional `ANALYTICS_SAMPLE_RATE`, `ANALYTICS_BATCH_INTERVAL_MS` (for batching if you send multiple events in one request).
- **Deliverable:** Every authenticated page view stored with exact `time_on_page_seconds` and timestamps; **automatic and invisible**; **no false data** (strict validation and DB constraints).

**Effort (estimate):** ~3–5 days (1 backend dev + 1 frontend dev, or 1 full-stack).

---

### Phase 2 — User analytics UI (optional but recommended)

- **Views / API**  
  - Endpoints such as:  
    - “My activity” (current user): list recent page views with slug, path, started/ended, `time_on_page_seconds`.  
    - Admin: same per user (by `user_id`) or by `page_slug` (all users for a page).
- **Dashboard**  
  - Simple tables or charts: “Time per page (seconds)”, “Pages visited”, “Last 7 days”.  
  - Filters: date range, page slug, user (if admin).
- **Deliverable:** Product/Support can see how users use the platform and exact timing.

**Effort (estimate):** ~2–4 days.

---

### Phase 3 — Platform analytics (aggregates)

- **Aggregation**  
  - Daily (or hourly) job or materialized view:  
    - DAU/WAU/MAU from `user_page_views` / `user_sessions`.  
    - Per-page: total views, avg `time_on_page_seconds`, unique users.  
  - Optional: API log aggregation (request count, latency percentiles, errors).
- **API**  
  - Endpoints like:  
    - `GET /api/analytics/platform/summary?from=&to=` (DAU, page views, top pages).  
    - `GET /api/analytics/platform/pages?from=&to=` (per-page stats).
- **Dashboard**  
  - Platform overview: DAU, top pages, avg time on page, optional API health.  
  - Access: Admin/Super Admin only.
- **Deliverable:** Leadership/Engineering see platform-wide usage and health.

**Effort (estimate):** ~3–5 days.

---

### Phase 4 — Optional enhancements

- **Heartbeat** for long-lived pages (active time, better accuracy on single-tab long sessions).  
- **User actions** (e.g. button clicks, key actions) with same pipeline and `user_actions` table.  
- **API performance** middleware and storage (if not already present) and wiring into platform analytics.  
- **Frontend Web Vitals** (LCP, FID, CLS) sent with page view or separate event.  
- **Retention / funnels** (e.g. weekly retention, home → dashboard → create audit).

**Effort:** Depends on scope; ~2–5 days per major addition.

---

## 6. Offer Summary

| Item | Description | Estimated effort |
|------|-------------|------------------|
| **User analytics (collection)** | Page views with exact `time_on_page_seconds` and timestamps, seamless (on load + pagehide), no UI change | 3–5 days |
| **User analytics (UI)** | “My activity” + admin views per user/page | 2–4 days |
| **Platform analytics** | Aggregations (DAU, top pages, avg time), APIs + dashboard | 3–5 days |
| **Optional** | Heartbeats, actions, API metrics, Web Vitals, retention | 2–5 days each |

**Total for core (Phases 1–3):** ~8–14 days (about 2–3 weeks with one full-stack or small team).

---

## 7. Success Criteria

- **Automatic and invisible**  
  - User never sees analytics UI, modals, or consent for this feature; no extra clicks.  
  - Collection runs only on page load and page leave (and optional heartbeat); no user action required.
- **User analytics**  
  - Every relevant page view is recorded with correct `page_slug` and `page_path`.  
  - `time_on_page_seconds` is accurate (including last page in session via pagehide/beacon).  
  - No visible change to navigation or page load for the user.
- **Data quality (no false data)**  
  - Invalid or malformed payloads are rejected in full; no partial writes.  
  - `user_id` (and role) are never taken from the client; server sets them from auth.  
  - `page_slug`/`page_path` are allowlisted; `time_on_page_seconds` is server-validated or server-computed; DB constraints prevent invalid rows.
- **Platform analytics**  
  - DAU/WAU/MAU and top pages are available over configurable date ranges.  
  - Average time per page (in seconds) is available per page/slug.
- **Privacy & access**  
  - Only intended roles can access analytics; retention and data stored are documented.

---

## 8. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| **False or spoofed data in DB** | Server never trusts client for `user_id`/role; allowlist for `page_slug`/`page_path`; server recomputes/validates `time_on_page_seconds`; strict validation with full reject on failure; DB CHECK constraints; rate limiting. |
| Last page not recorded (tab close) | Use `pagehide` + `sendBeacon` so the last view is sent even when the tab is closed. |
| Duplicate or out-of-order events | Use `view_started_at` + `view_ended_at` + idempotency (e.g. client-generated `client_event_id` unique per event) so duplicates are ignored. |
| User notices or is bothered by analytics | No UI, no modals, no consent flow for this feature; collection is silent (load + pagehide only). |
| Performance impact | Batch events, send asynchronously, respect `ANALYTICS_ENABLED` and sampling. |
| Storage growth | Partition or TTL on raw table; retain aggregates longer. |

---

## 9. How data is stored (automatic)

**You do not need to enable anything.** Analytics is **on by default** and saves **automatically**.

### Flow

1. **Client (automatic)**  
   On every authenticated page (except login/index), a small script runs in the background. When the user **loads** a page, it sends the *previous* page view (with time on page in seconds). When they **leave** (navigate or close tab), it sends the *current* page view. No user action or UI.

2. **API**  
   The server receives `POST /api/analytics/events`, validates the payload (auth, allowlist, timestamps), and inserts rows into the **`user_page_views`** table using the Supabase project your app is configured with (e.g. CQMS staging).

3. **Database**  
   Rows are stored in the **Supabase project** pointed to by your app’s env: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Use CQMS staging env so data goes to CQMS staging.

### What you need

- **App connected to the right DB:** In the environment where you want analytics (e.g. staging), set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the **CQMS staging** project. Then all analytics writes go to CQMS staging.
- **Nothing to enable:** Collection and storage are on by default.

### How to disable

- **Server:** Set `ANALYTICS_ENABLED=false` in `.env`. The API will respond 204 and **not** persist any events.
- **Client (optional):** If you expose `ANALYTICS_ENABLED` via `/api/env` (it’s in `SAFE_ENV_VARS`), the client will skip sending when it’s `false`, so no requests are made.

### Summary

| Question | Answer |
|----------|--------|
| Do I need to enable anything? | **No.** It runs automatically when users use the app. |
| Where is data saved? | In the Supabase project your app uses (set via env; use CQMS staging for staging). |
| How do I turn it off? | Set `ANALYTICS_ENABLED=false` in `.env`. |

---

## 10. Next Steps

1. **Approve** this proposal (user vs platform split, data model, phased plan).  
2. **Confirm** scope for v1: e.g. Phase 1 only, or Phase 1 + 2, or Phase 1 + 2 + 3.  
3. **Implement** Phase 1 (foundation) and deploy behind `ANALYTICS_ENABLED`.  
4. **Validate** in staging: trigger page views and tab close, check `user_page_views` and `time_on_page_seconds`.  
5. **Add** Phase 2/3 as needed and iterate with optional enhancements (Phase 4).

If you want, the next step can be a concrete **technical spec** (exact API payloads, table DDL, and the exact analytics client interface) ready for implementation.
