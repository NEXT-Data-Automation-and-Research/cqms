# API List – CQMS Codebase & Database

This document lists all **backend REST APIs** (Express routes) and **Supabase/database** usage derived from the codebase. The Supabase MCP was unavailable (fetch failed), so database tables and RPCs are inferred from code and migrations.

---

## 1. REST APIs (Express)

All APIs are under `/api/` and are mounted in `api/index.ts` and `src/server-commonjs.ts`. Unless noted, endpoints require authentication (`verifyAuth`).

### 1.1 Core / Bootstrap

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/csrf` | Get CSRF token (via response headers) | Optional (same session for CSRF) |
| GET | `/api/env` | Safe env vars for client (e.g. Supabase URL, anon key) | No |
| GET | `/api/version` | App version / build info | No |

---

### 1.2 Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login-event` | Record login event (e.g. for analytics/audit) | Yes |

---

### 1.3 Users

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/users/me` | Current user profile | Yes |
| PUT | `/api/users/me` | Update current user (name, avatar, prefs, device_info) | Yes |
| POST | `/api/users` | Create user profile (e.g. after signup) | Yes |

---

### 1.4 People (User Management – Admin)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/people` | List all people | Yes + Admin |
| GET | `/api/people/:email` | Get person by email | Yes + Admin |
| POST | `/api/people` | Create person | Yes + Admin |
| PUT | `/api/people/:email` | Update person by email | Yes + Admin |
| POST | `/api/people/bulk-update` | Bulk update people | Yes + Admin |

---

### 1.5 Notifications

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/notifications` | List user notifications (optional ?status, ?limit, ?offset) | Yes |
| POST | `/api/notifications` | Create notification | Yes |
| PATCH | `/api/notifications/:id` | Update notification (e.g. mark read) | Yes |
| DELETE | `/api/notifications/:id` | Delete notification | Yes |
| POST | `/api/notifications/test` | Send test notification | Yes |
| POST | `/api/notifications/send` | Send notification(s) | Yes |
| GET | `/api/notifications/users` | Users for notification targeting | Yes |
| GET | `/api/notifications/subscriptions` | Notification subscriptions | Yes |

---

### 1.6 Notification Subscriptions (Push)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/notification-subscriptions` | List subscriptions (?is_active) | Yes |
| POST | `/api/notification-subscriptions` | Create subscription (push endpoint, keys, etc.) | Yes |
| DELETE | `/api/notification-subscriptions/:id` | Delete subscription | Yes |

---

### 1.7 Permissions

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/permissions/check` | Check single permission | Yes |
| GET | `/api/permissions/resources` | List permission resources (no auth) | No |
| POST | `/api/permissions/check-batch` | Check multiple permissions | Yes |
| GET | `/api/permissions/user` | Current user’s permissions | Yes |
| GET | `/api/permissions/rules` | List access control rules | Yes + permission |
| POST | `/api/permissions/rules` | Create rule | Yes + permission |
| PUT | `/api/permissions/rules/:id` | Update rule | Yes + permission |
| DELETE | `/api/permissions/rules/:id` | Delete rule | Yes + permission |
| GET | `/api/permissions/user-rules` | List user access rules | Yes + permission |
| GET | `/api/permissions/user-rules/:email` | User rules by email | Yes + permission |
| POST | `/api/permissions/user-rules` | Create user rule | Yes + permission |
| PUT | `/api/permissions/user-rules/:id` | Update user rule | Yes + permission |
| DELETE | `/api/permissions/user-rules/:id` | Delete user rule | Yes + permission |
| GET | `/api/permissions/debug` | Debug permission state | Yes |
| POST | `/api/permissions/test` | Test permission evaluation | Yes + permission |
| POST | `/api/permissions/clear-cache` | Clear permission cache | Yes + permission |
| GET | `/api/permissions/user-access/:email` | Full access summary for email | Yes + permission |

---

### 1.8 Analytics

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/analytics/events` | Ingest page view events (batch) | Yes |
| GET | `/api/analytics/me` | Current user’s page views (?days, ?limit) | Yes |
| GET | `/api/analytics/admin/summary` | Platform summary (?days) | Yes + Admin/Super Admin |
| GET | `/api/analytics/admin/by-page` | Aggregated by page_slug (?days) | Yes + Admin/Super Admin |
| GET | `/api/analytics/admin/by-user/:userId` | Page views for user (?days, ?limit) | Yes + Admin/Super Admin |

---

### 1.9 Admin (Impersonation, etc.)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/admin/impersonate` | Generate magic link to impersonate user | Yes + permission (settings/impersonation) |
| GET | `/api/admin/impersonation-logs` | List impersonation logs (?limit, ?offset) | Yes + permission |
| POST | `/api/admin/end-impersonation` | Log end of impersonation session | Yes |

---

### 1.10 Platform Notifications (Announcements)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/platform-notifications` | Active announcements for current user | Yes |
| GET | `/api/platform-notifications/count` | Unread/pending count | Yes |
| POST | `/api/platform-notifications/dismiss/:id` | Dismiss announcement | Yes |
| GET | `/api/platform-notifications/admin/all` | All announcements (admin) | Yes + Admin/Super Admin |
| POST | `/api/platform-notifications/admin` | Create announcement | Yes + Admin/Super Admin |
| PUT | `/api/platform-notifications/admin/:id` | Update announcement | Yes + Admin/Super Admin |
| DELETE | `/api/platform-notifications/admin/:id` | Delete announcement | Yes + Admin/Super Admin |

---

### 1.11 Cache Management

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/cache/clear` | Trigger platform-wide cache clear (body: reason, clearType) | Yes + Admin/Super Admin |
| GET | `/api/cache/history` | Cache clear history (?limit) | Yes + Admin/Super Admin |
| GET | `/api/cache/latest` | Latest cache version (for clients) | Yes |

---

### 1.12 Active Users Dashboard

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/active-users/users` | Aggregated activity per user (?days) | Yes + permission/role |
| GET | `/api/active-users/date-activity` | Activity summary for a date (?date=YYYY-MM-DD) | Yes + permission/role |

---

### 1.13 Webhooks

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/webhooks/audit-submission` | Forward audit submission to n8n webhook | Yes |

---

### 1.14 Google Meet (client calls, router not mounted in api/index.ts)

The client (`api-client.ts`, `event-modal-manager.ts`) calls these, but **the Google Meet router is not mounted** in `api/index.ts` or `src/server-commonjs.ts`. To enable them, add:

- `app.use('/api/google-meet', googleMeetRouter);`
- and import `googleMeetRouter` from `../src/api/routes/google-meet.routes.js`.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/google-meet/test` | Test Google Meet config | Yes |
| POST | `/api/google-meet/generate` | Generate Meet link (title, start/end, description, attendees) | Yes |

---

## 2. Database (Supabase) – Tables & RPCs

Inferred from server code and migrations. RLS and policies are defined in migrations.

### 2.1 Tables used by backend APIs / server code

| Table | Used in / Purpose |
|-------|-------------------|
| `users` | Auth profile, user list, notifications (users.routes, notifications.routes, auth-oauth, auth-user-profile, audit-reports, etc.) |
| `people` | Roles, profiles, admin/people CRUD, permissions, performance-analytics, auth-checker |
| `notifications` | Notifications CRUD, send, test |
| `notification_subscriptions` | Push subscription CRUD, notifications routes |
| `audit_assignments` | Active users aggregation, RLS policies |
| `fnchat_cfd_v4_0_v2` | Audit/chat data for active users and date-activity |
| `reversal_requests` | Active users aggregation |
| `calibration_results` | Active users aggregation |
| `ai_audit_results` | Active users aggregation |
| `impersonation_log` | Admin impersonation start/end and logs |
| `access_control_rules` | Permissions (rules CRUD) |
| `user_access_rule` | Permissions (user rules, debug, test, clear-cache, user-access) |
| `cache_versions` | Cache clear trigger, history, latest |
| `platform_notifications` | Announcements list, count, dismiss, admin CRUD |
| `user_page_views` | Analytics events, me, admin summary/by-page/by-user |
| `api_access_logs` | Audit middleware (API access logging) |
| `security_events` | Audit middleware (security event logging) |

### 2.2 RPCs (server-side)

| RPC | Purpose |
|-----|--------|
| `get_audit_tables` | Performance analytics – list audit tables (used in performance-analytics-repository) |

Additional RPCs may exist from migrations (e.g. `get_audit_tables`, chat review RPCs in 027–030); the above is what the **API/server code** calls.

---

## 3. External / third-party

- **Supabase**: Auth (login, magic link, session), Realtime (e.g. cache_versions), Postgres tables above.
- **n8n**: `POST /api/webhooks/audit-submission` forwards the payload to `N8N_WEBHOOK_URL` (server-side fetch).
- **Google (OAuth / Meet)**: OAuth for login; Google Meet link generation is implemented in `google-meet.routes.ts` but the router is not mounted (see §1.14).

---

## 4. Summary

- **REST APIs**: ~60+ endpoints across auth, users, people, notifications, permissions, analytics, admin, platform notifications, cache, active-users, and webhooks. Google Meet endpoints exist in code but are not mounted.
- **Database**: 17+ tables and at least one RPC (`get_audit_tables`) used by the server; all accessed via Supabase client (and optionally admin client) with RLS.

To get live project/database details (e.g. tables, migrations) from Supabase, use the Supabase MCP when it is available (e.g. `list_projects`, `list_tables`, `list_migrations`).
