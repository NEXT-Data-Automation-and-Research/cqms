# APIs in CQMS – Simple Explanation

This doc explains **what APIs we have** and **what they’re for**. For a full list of every endpoint, see [API_LIST.md](./API_LIST.md).

---

## What are these APIs?

The app has a **backend (Node/Express)** that exposes **REST APIs** under `/api/`. The frontend calls these to do things that need the server (auth, permissions, writing to the database, calling external services, etc.). Data is stored in **Supabase** (Postgres + Auth + Realtime); the backend talks to Supabase and sometimes to other services (e.g. n8n).

---

## How they’re organized

- **All URLs** start with `/api/`, e.g. `/api/users/me`, `/api/notifications`.
- **Routes are grouped by feature.** Each group is mounted in `api/index.ts` (and `server-commonjs.ts` for local dev):
  - `/api/auth` – login events
  - `/api/users` – current user profile and create user
  - `/api/people` – user/people management (admin)
  - `/api/notifications` – in-app notifications
  - `/api/notification-subscriptions` – push notification subscriptions
  - `/api/permissions` – permission checks and rule management
  - `/api/analytics` – page views and activity
  - `/api/admin` – impersonation and admin logs
  - `/api/platform-notifications` – announcements (banner-style)
  - `/api/cache` – cache clear for admins
  - `/api/active-users` – active users dashboard data
  - `/api/webhooks` – e.g. forwarding audit submissions to n8n

- **A few endpoints** are not under a feature router: `/api/csrf`, `/api/env`, `/api/version` (bootstrap/version info).

---

## What each group is for

| Group | Purpose |
|-------|--------|
| **auth** | Record when a user logs in (e.g. for analytics/audit). |
| **users** | Get/update the current user’s profile; create a user after signup. |
| **people** | Admins manage the “people” list (roles, departments, etc.). |
| **notifications** | List, create, update, delete in-app notifications; send test/send; list users and subscriptions. |
| **notification-subscriptions** | Register/unregister push notification endpoints (browser push). |
| **permissions** | Check what the user is allowed to do; manage access rules and user-specific rules (for admins). |
| **analytics** | Send page-view events; get “my activity”; admins get summary, by-page, and by-user analytics. |
| **admin** | Impersonate a user (magic link), list impersonation logs, end impersonation. |
| **platform-notifications** | Show/dismiss announcements; admins create/update/delete announcements. |
| **cache** | Admins trigger a full cache clear and see history; clients check latest cache version. |
| **active-users** | Dashboard of who’s active (assignments, submissions, reversals, etc.) and per-date activity. |
| **webhooks** | Receive audit submissions and forward them to n8n (or another webhook). |

---

## Security in short

- **Most endpoints** require the user to be **logged in** (JWT in `Authorization` header).
- **State-changing requests** (POST, PUT, PATCH, DELETE) also need a **CSRF token** (obtained from `GET /api/csrf`).
- **Admin or permission checks** apply on top of login where needed (e.g. people, admin, permissions, cache, analytics admin, platform-notifications admin).

---

## Which APIs do **not** require login? (Unauthenticated / public)

**“Authorized”** here means: the request must include a valid **JWT** in the `Authorization: Bearer <token>` header (i.e. the user must be logged in). If you call an endpoint **without** being logged in, you get **401 Unauthorized** on most routes.

These **four** endpoints **do not** require login — they work without a JWT:

| Endpoint | Why it’s public |
|----------|------------------|
| **GET /api/env** | Returns safe config for the client (e.g. Supabase URL, anon key, app URL) so the app can bootstrap before or without a user. |
| **GET /api/version** | Returns app version/build info; no user data, safe to expose. |
| **GET /api/csrf** | Used to obtain a CSRF token. Can be called without a token; when you do send a token, the server ties the CSRF token to that session. |
| **GET /api/permissions/resources** | Returns the list of permission resource names (for UI dropdowns/labels). It’s a static registry, no per-user data. |

**All other `/api/*` endpoints** require the user to be logged in (JWT). If you call them without a valid token, the server responds with **401** and the client typically redirects to the login page.

---

## Is it OK that these four are public?

**Yes.** Having these four endpoints unauthenticated is intentional and safe, as long as you keep one rule:

| Endpoint | Why it's OK |
|----------|-------------|
| **GET /api/env** | Only **whitelisted** variables are returned (`NODE_ENV`, `APP_NAME`, `API_URL`, `PUBLIC_APP_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY`, `ANALYTICS_ENABLED`). No service-role key, no DB URLs with secrets, no third-party API keys. Supabase’s anon key is meant for client use; RLS protects data. |
| **GET /api/version** | No user data or secrets, only build/version info. |
| **GET /api/csrf** | Only returns a CSRF token (or headers). No sensitive data. Useful with or without a session. |
| **GET /api/permissions/resources** | Returns only the **list of resource names** (e.g. for dropdowns). No per-user rules, no secrets. |

**What you must keep doing:**  
Do **not** add sensitive env vars (e.g. `SUPABASE_SERVICE_ROLE_KEY`, `N8N_WEBHOOK_URL`, any API secrets) to the `SAFE_ENV_VARS` whitelist in `api/index.ts` and `server-commonjs.ts`. As long as only client-safe variables are exposed, this setup is fine.

---

## Database (Supabase)

The backend uses **Supabase** for:

- **Auth** – sign-in, sessions, magic links.
- **Tables** – e.g. `users`, `people`, `notifications`, `platform_notifications`, `user_page_views`, `cache_versions`, permission tables, audit/activity tables. See [API_LIST.md](./API_LIST.md) for the full list inferred from the codebase.
- **Realtime** – e.g. cache clear is broadcast via a table so all clients can invalidate cache.

So “APIs we use” includes both **our own REST APIs** (above) and **Supabase** (Auth + Postgres + Realtime). We don’t expose Supabase directly to the client for everything; the backend often wraps it behind `/api/*` for security and validation.

---

## Intercom – Supabase Edge Functions

The app integrates with **Intercom** (conversations, admins) via **Supabase Edge Functions**, not the Express `/api/` server. The frontend calls these at:

**Base URL:** `{SUPABASE_URL}/functions/v1/`

| Edge function | Query / usage | Purpose |
|---------------|----------------|---------|
| **intercom-proxy** | `?conversation_id=...&display_as=plaintext` or `display_as=html` | Fetch a single Intercom conversation by ID (e.g. on Audit View) to show chat content. |
| **intercom-proxy** | `?endpoint=admins` | Fetch Intercom admins (for search, assign auditor, “Pull from Intercom” flows in Create Audit / Audit Form). |
| **intercom-proxy** | `?endpoint=conversations&admin_id=...&updated_since=...&updated_before=...` (and variants) | Fetch conversations for an admin (pull conversations from Intercom). |
| **intercom-conversations** | (called from conversations panel) | List/fetch Intercom conversations (used in audit-form create-audit flows). |

**Why Edge Functions:** The Intercom API is called from the Edge Function so that (1) the **Intercom API token** stays on the server (Supabase secrets), and (2) the browser avoids **CORS** by calling our Supabase function instead of Intercom directly.

**Where they’re used:** Audit View (load conversation by ID), Create Audit (pull conversations, search admins, assign Intercom admin), Audit Form (admins, conversations, conversation loader). The `people` table has `intercom_admin_id` and `intercom_admin_alias` for linking employees to Intercom admins.

**Note:** The Edge Function source (e.g. `intercom-proxy`, `intercom-conversations`) may be deployed in the Supabase project but is not present in this repo. If those functions are missing in Supabase, the Intercom-related UI (load conversation, pull conversations, search admins) will fail until the functions are deployed or restored.

---

## Google Meet note

The app has **Google Meet** logic (generate Meet links) in the codebase and the frontend calls `/api/google-meet/generate`, but the **Google Meet router is not mounted** in the main API entry file. So that feature won’t work until the route is added; details are in [API_LIST.md](./API_LIST.md).

---

**Summary:** We use **our own REST APIs** under `/api/` for auth, users, people, notifications, permissions, analytics, admin, announcements, cache, active users, and webhooks; **Supabase** for auth, database, and realtime; and **Supabase Edge Functions** (`intercom-proxy`, `intercom-conversations`) for Intercom (conversations and admins). The full endpoint list is in [API_LIST.md](./API_LIST.md).
