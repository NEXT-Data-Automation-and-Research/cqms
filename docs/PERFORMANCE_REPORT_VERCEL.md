# Performance Report: Works Locally but Not on Vercel

## What you're seeing

- **Local:** Performance Report loads all data correctly.
- **Vercel (hosted):** The same page doesn't load data for anyone, including you.

## Root cause: session is per-origin

Auth state is stored **per origin** (in the browser):

- `http://localhost:3000` has its own `localStorage` (and thus its own Supabase session).
- `https://your-app.vercel.app` has a **different** `localStorage` and no access to localhost's data.

So:

1. When you log in on **localhost**, the Supabase JWT is stored only for `localhost`.
2. When you open the **Vercel** URL, that origin has no Supabase session (unless you've logged in there).
3. The Performance Report uses the **Supabase client** with that JWT for every query.
4. **Row Level Security (RLS)** on `people`, `audit_assignments`, and audit tables requires an **authenticated** user (`auth.role() = 'authenticated'`).
5. With **no (or invalid) JWT** on the Vercel origin, RLS allows **no rows** → the report shows no data.

So the hosted version "does not load the data for other users including me" because, on that origin, the app is effectively **unauthenticated** for Supabase, and RLS correctly returns no rows.

## What to do

### 1. Log in on the hosted URL (required)

- Open **https://your-app.vercel.app** (or your real Vercel URL).
- Log in there (Google or email, same as local).
- Then open the Performance Report again and refresh.

After that, the Vercel origin has its own valid session and RLS will return data for that user.

### 2. Apply the "admin read all" RLS migration

Admins and supervisors need permission to read **all** `audit_assignments`. Apply this migration on your Supabase project:

- **File:** `src/db/migrations/033_admins_can_read_all_audit_assignments.sql`
- **How:** Supabase Dashboard → SQL Editor → paste the migration and run, or use your usual migration workflow.

After this, when an admin is logged in on the hosted site, the Performance Report will load all assignments.

### 3. Ensure Vercel env vars are set

The client gets Supabase config from `/api/env`. If `SUPABASE_URL` or `SUPABASE_ANON_KEY` are missing on Vercel, the client may not initialize correctly.

In the Vercel project → **Settings → Environment Variables**, add for Production/Preview:

- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_ANON_KEY` = your Supabase anon (public) key

Redeploy after changing env vars. Vercel sets `VERCEL_URL` automatically; the app uses it for OAuth redirects when `PUBLIC_APP_URL` / `APP_URL` are not set.

### 4. Optional: same domain for local and prod

If you want to avoid "log in again on Vercel," you'd need the same logical "app" to be on one domain (e.g. use a custom domain for Vercel and use that consistently, or use that domain in dev via hosts). Session still cannot be shared between `localhost` and `*.vercel.app` because they are different origins.

## Code / data flow (for reference)

- **Performance page** (`src/features/performance/presentation/performance.html`):
  - Uses `initSupabase()` then `getSecureSupabase(false)` and sets `window.supabaseClient`.
  - Reads from `people`, `audit_assignments`, `scorecards`, `scorecard_perameters`, and dynamic audit tables.
- **RLS:**
  - `people`: "Authenticated users can read all users" → needs valid JWT.
  - `audit_assignments`: after migration 033, admins/supervisors can read all rows; others only where they are auditor, employee, or assigner.
  - Audit tables: "Authenticated users can read audits" → needs valid JWT.
- **Auth storage:** Supabase uses `localStorage` (e.g. key `supabase.auth.token`) and the auth checker / app also use `userInfo` in `localStorage`. All of this is per-origin.

## UX improvement in the app

The Performance Report shows a message when it loads **no data** and detects **no Supabase session**, with a **Log in on this site** link to the auth page. After logging in on the hosted URL and refreshing, the report loads correctly.
