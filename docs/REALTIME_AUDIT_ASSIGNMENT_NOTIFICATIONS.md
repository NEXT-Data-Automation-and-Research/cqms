# Real-Time Audit Assignment Notifications

## Overview

When Person A assigns an audit to Person B (e.g. from Audit Distribution), Person B should see a **platform notification** in real time when they are on the platform—e.g. a pop-up/toast in the top-right and the notification bell updating. This uses **Supabase Realtime** (Postgres Changes) so no polling is required.

## How Supabase Realtime Fits

- **Postgres Changes**: Supabase Realtime can subscribe to `INSERT`/`UPDATE`/`DELETE` on a table. When rows change, subscribed clients receive the payload (e.g. `new`/`old`).
- **No filters on server**: Realtime does not support filtering by column (e.g. `auditor_email = current_user`) on the server. The client subscribes to all changes on `audit_assignments` and filters in the handler to only react when `auditor_email` matches the current user.
- **Where it runs**: To show the notification on **any page** (not only Home), the subscription is set up in a **shared** place that loads on every page—the **sidebar** initialization. The Home page only listens for a custom event to refresh its assigned-audits list.

## Current State (Before This Feature)

- **Home page** already had a Supabase Realtime subscription on `audit_assignments` (`setupAssignedAuditsRealtimeSubscription`):
  - On INSERT/UPDATE/DELETE it invalidated cache and called `loadAssignedAudits()`.
  - **No toast/pop-up** was shown.
  - The subscription ran **only on the Home page** and only when that page’s init ran, so users on other pages (e.g. Audit Distribution, Create Audit) did not get any live feedback.
- The **notification bell** (top-right) gets its list from `fetchAndCacheNotifications()` (scorecard tables + reversals). Pending assignments from `audit_assignments` were not merged into that list; only the assigned-audits list on Home was refreshed.

## Implementation Plan

### 1. Supabase: Realtime for `audit_assignments`

- Ensure the `audit_assignments` table is included in the Realtime **publication** (Supabase Dashboard: Database → Replication → add `audit_assignments` if missing).
- No code change required if Realtime is already enabled for this table (the existing Home subscription would have failed otherwise).

### 2. Shared realtime module (runs on every page)

- **New module**: `src/features/notifications/application/audit-assignment-realtime.ts`
  - Exports `setupAuditAssignmentRealtime(currentUserEmail: string)`.
  - Uses **authenticated** Supabase client to subscribe to `postgres_changes` on `public.audit_assignments` (event `*` or `INSERT`).
  - In the handler:
    - Normalize `auditor_email` and compare to `currentUserEmail`; if not equal, return.
    - On **INSERT**:
      - Show a **toast** (top-right): e.g. “You have been assigned a new audit” (optionally include employee name from `new.employee_name`).
      - Dispatch a **custom event** `auditAssignmentReceived` with `detail: { assignment: newRow }` so the Home page can refresh its list.
  - Cleans up the channel on `beforeunload` (or when tearing down).
- **Toast**: Use the existing `showToast()` from `src/utils/toast.ts` (dynamic import in the module).

### 3. Sidebar: start realtime on init (all pages)

- In **sidebar-loader**’s `initializeSidebarFeaturesAsync()`:
  - After Supabase is ready and user profile/counts are loaded, read `userInfo` from `sidebarState.loadUserInfo()`.
  - If `userInfo?.email` is present and the user is **not** an agent (e.g. `userInfo.role !== 'Employee'`), call `setupAuditAssignmentRealtime(userInfo.email)`.
  - This ensures every page that loads the sidebar (all main app pages) gets the subscription and thus the toast when an audit is assigned to the current user.

### 4. Home page: no duplicate subscription; refresh on event

- **Remove** the existing Supabase subscription setup from the Home page (`setupAssignedAuditsRealtimeSubscription` / `assignedAuditsRealtimeChannel`), so there is only **one** subscription (in the shared module).
- **Add** a listener for the custom event `auditAssignmentReceived`:
  - Invalidate the same caches as before (assigned audits cache, sessionStorage).
  - Call `loadAssignedAudits()` to refresh the list.
- Optionally invalidate the notification bell cache and call `loadNotifications()` so the bell count updates; if the bell list does not yet include pending assignments from `audit_assignments`, that can be a follow-up (separate change to `fetchAndCacheNotifications` to merge in pending assignments).

### 5. Implemented: show “Audit assigned” in the notification bell

- Today the bell is built from scorecard tables (completed audits) and reversals. To show “You have been assigned a new audit” in the dropdown:
  - In `fetchAndCacheNotifications()` (home-page or shared), also query `audit_assignments` where `auditor_email = currentUserEmail` and `status IN ('pending','in_progress')`, and merge these into the `notifications` array with a title like “Audit assigned”.
  - Then when the realtime handler runs, invalidate the notification cache and call `fetchAndCacheNotifications()` (or `loadNotifications()`) so the new assignment appears in the bell immediately.

## Summary

| Piece | Responsibility |
|-------|----------------|
| **Supabase** | Realtime enabled for `audit_assignments` (publication). |
| **Shared module** | One `postgres_changes` subscription; on INSERT for current user → toast + `auditAssignmentReceived` event. |
| **Sidebar** | Calls shared module on init (auditors only) so every page gets the subscription. |
| **Home page** | Listens for `auditAssignmentReceived`; invalidates cache and refreshes assigned-audits list; no duplicate subscription. |
| **Toast** | Top-right “You have been assigned a new audit” (existing toast utility). |

This gives Person B a **visible, real-time platform notification** (pop-up) when Person A assigns them an audit, using Supabase Realtime, and works no matter which page Person B is on.
