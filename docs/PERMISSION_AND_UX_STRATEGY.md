# Permission System & UX Strategy

This document describes the current permission/role system, root causes of reported issues, and a strategy to improve UX so users do not face sidebar flicker, access denials on pages they’re allowed to use, or unexpected logouts.

---

## 1. Current Permission System Overview

### 1.1 Data model (Supabase)

- **`people`** – Source of truth for user profile and **role** (e.g. Employee, Quality Analyst, Admin, Super Admin). Role is used for both sidebar visibility and API permission checks.
- **`access_control_rules`** – Role-based rules: `resource_name`, `rule_type` (page/feature/api_endpoint/action), `allowed_roles`, `min_role_level`, `is_active`.
- **`user_access_rule`** – Per-user overrides: `user_email`, `resource_name`, `rule_type`, `access_type` (allow/deny), `is_active`. Individual ALLOW can grant access even if role would not; individual DENY always blocks.

### 1.2 Business logic (backend)

- **Order of evaluation:**  
  1. Individual DENY → deny  
  2. Individual ALLOW → allow  
  3. Role rule (allowed_roles / min_role_level) → allow or deny  
  4. No rule → **deny**
- **Role source:** `getUserRole(userEmail)` reads from `people` first, then falls back to `users.role`. All permission APIs use this.
- **Caching:** Permission results are cached per user/resource/type (e.g. 5 min TTL) to avoid repeated DB hits. Cache is cleared when rules or user rules change.

### 1.3 Frontend flow

- **Sidebar**
  - Renders as soon as HTML is ready, using `sidebarState.loadUserInfo()` (localStorage).
  - If **no userInfo / no role:** `router.getSidebarRoutes(userRole)` is conservative and only shows routes with `roles: ['all']`.
  - Permissions are fetched in the background via `/api/permissions/check-batch`; when they return, `userInfoUpdated` is dispatched and the sidebar is re-rendered with permission-aware visibility.
  - So there are effectively two passes: first paint (role from cache or nothing), then a second paint when permissions (and sometimes role) arrive.
- **Sensitive pages (e.g. Permission Management)**
  - **Server:** Routes are protected with `verifyAuth` and `requirePermission('settings/permissions', 'page')`.
  - **Client:** `admin-check.ts` runs after a 500 ms delay and calls `/api/permissions/check` for `settings/permissions`. On `hasAccess: false` it shows an alert and redirects to `/`. The page uses the same permission API for loading data.
- **Auth**
  - `api-client` on **401** attempts token refresh; if refresh fails it redirects to the auth page. So any 401 (e.g. slow token, or server rejecting token) can look like “user is logged out”.

---

## 2. Root Cause Analysis

### 2.1 Sidebar: role-specific options sometimes not showing, then showing after reload

- **Cause:** Race between:
  1. Sidebar init running with `loadUserInfo()` → often **null** or **no role** on first load (before auth-checker has run or before profile is fetched).
  2. `router.getSidebarRoutes(undefined)` only returns routes with `roles: ['all']`, so role-specific items are hidden on first paint.
  3. Later, `userInfoUpdated` fires (from auth-checker or sidebar profile load) and/or permission batch returns → sidebar re-renders with correct role/permissions.
- **Why “reload fixes it”:** Reload can allow auth-checker to run first and write `userInfo` to localStorage, so when the sidebar loads it already has a role and shows the right items on first paint (or after a single permission refresh).
- **Additional factor:** If the permission batch request is slow or fails, the first sidebar state is “role-only”; when permissions finally load, a second refresh happens, which can feel like “options appearing after a while”.

### 2.2 Users with permission not properly getting into the page (e.g. Permission Management)

- **Server side:** Access is correct if:
  - `people.role` is set and matches a role in the rule’s `allowed_roles`, or
  - There is an individual ALLOW in `user_access_rule` for that user and resource.
- **Client side:**
  - **401 from `/api/permissions/check`:** If the permission check runs before the session/token is fully ready, the API can return 401. The api-client then tries refresh and, on failure, **redirects to login**. The user experiences this as “logged out” or “can’t get into the page” even though they have permission.
  - **Timing:** The 500 ms delay in admin-check may not be enough on slow networks or heavy pages; the token might not be attached or refreshed yet.
  - **403:** If the server correctly denies (e.g. no rule or role mismatch), admin-check shows “Access Denied” and redirects to `/`. That is correct behavior; the problem is when we get **401** instead of a proper permission result.

### 2.3 Users being logged out unexpectedly

- **401 handling in api-client:** Any 401 triggers refresh; if refresh fails, redirect to auth page. So:
  - Expired or invalid token → 401 → redirect.
  - Temporary server/network issue → 401 → redirect.
  - Permission check (or any API) called before token is ready → 401 → redirect.
- **Visibility / cross-tab:** When the tab becomes visible again or when another tab logs out, the app re-checks auth; missing or cleared storage leads to redirect to login.
- **Session expiry:** If Supabase session expires and refresh fails (e.g. network), the user is sent to login.

So “logged out” can be either a real session end or an **over-eager redirect on 401** (e.g. during permission checks on sensitive pages).

---

## 3. Strategy and Principles

1. **Single source of truth for role:** Keep `people.role` as the canonical role; ensure it is loaded and written to `userInfo` (and localStorage) as early as possible so the sidebar and any client checks align with the server.
2. **Reduce sidebar flicker:** Prefer one stable paint: either wait for a minimal “auth ready” signal (e.g. userInfo with role from cache or from auth-checker) before first sidebar render, or show a short loading state for the sidebar until user + permissions are ready.
3. **Sensitive pages (Permission Management, etc.):**
   - **Never treat 401 as “no permission”.** Use a dedicated permission-check path that does **not** redirect to login on 401; instead retry after a short delay or after confirming the session is valid.
   - Run the client-side gate only after we’re confident the session is ready (e.g. after auth-checker has run and token is available).
4. **Auth resilience:**
   - For **permission-check** and **check-batch** calls, consider retrying once on 401 after a short delay (to allow token refresh) before treating as “unauthenticated” and redirecting.
   - Keep existing 401 → refresh → redirect behavior for normal API calls, but avoid redirecting on the first 401 when the only thing we’re doing is checking access.

---

## 4. Recommended Changes (Implementation)

### 4.1 Sidebar: More stable first paint

- **Option A (recommended):** Before rendering the first sidebar HTML, wait (with timeout, e.g. 1.5 s) for `userInfo` to be available from localStorage (e.g. after auth-checker has run). If it never arrives, render with current logic (role undefined → only “all” routes) so we don’t block forever.
- **Option B:** Keep current “render immediately” but show a short “Loading…” or skeleton for the nav until the first `userInfoUpdated` with role (or permission batch) has been processed, then replace with final sidebar.
- Ensure that when auth-checker completes and calls `ensureUserInfoSynced`, it dispatches `userInfoUpdated` so the sidebar can refresh once with both role and (when ready) permissions.

### 4.2 Sensitive pages: Don’t redirect to login on permission-check 401

- In **admin-check** (and similar gates for other sensitive pages):
  - Use a small wrapper that calls `/api/permissions/check` and:
    - On **403:** treat as “no access” → show access denied and redirect to `/` (or home).
    - On **401:** do **not** redirect to login immediately; either:
      - Retry once after 1–2 s (to allow token refresh), or
      - First ensure session exists (e.g. `getSession()` or auth-checker has run), then retry.
    - Only after a retry still returns 401 (or no token/session) should we redirect to login.
- This can be implemented either in the page’s admin-check or in a shared “permission gate” helper used by Permission Management and other sensitive pages.

### 4.3 API client: Optional “no redirect on 401” for permission checks

- Add an option (e.g. `skipRedirectOn401: true`) for specific calls that are used only for permission checks. When set, on 401 the client returns the error to the caller without redirecting; the caller (admin-check) can then retry or decide to redirect.
- Use this only for `/api/permissions/check` (and optionally check-batch) so that normal API calls still get the current “refresh then redirect” behavior.

### 4.4 Auth-checker and role availability

- Ensure `ensureUserInfoSynced` is always called after a successful auth and that it fetches `people` by email (with case-insensitive fallback) and writes full `userInfo` (including role) to localStorage and dispatches `userInfoUpdated`.
- This gives the sidebar and any client-side permission logic a consistent role as soon as the user is authenticated.

### 4.5 Backend: Consistency and cache

- Keep using `people` as the primary source for role in `getUserRole`.
- Ensure there is an `access_control_rules` row for `settings/permissions` (and other sensitive pages) so that users with the right role (or individual allow) get a clear allow/deny instead of “No matching permission rule found”.
- When adding or changing rules, keep using `permissionService.clearCache()` so users see updated access without waiting for TTL expiry.

---

## 5. Summary Table

| Issue | Root cause | Fix (summary) |
|-------|------------|----------------|
| Sidebar options missing then appearing | First paint with no role; permissions/role arrive later | Wait briefly for userInfo (with timeout) before first sidebar render, or show loading until first full update |
| Can’t access Permission Management despite having permission | 401 on permission check → api-client redirects to login | No redirect on first 401 for permission-check; retry after delay; only redirect if still 401 after retry / no session |
| Users “logged out” unexpectedly | 401 from API (e.g. permission check or expired token) → redirect | Same as above for permission checks; keep refresh + redirect for normal APIs; consider one retry on 401 for check-batch if used early |

Implementing the sidebar wait (or loading state), the admin-check 401 handling and retry, and the optional no-redirect for permission-check calls should address the three reported areas while keeping security and a single source of truth for role and permissions.
