# Vercel + Supabase Auth (redirects)

How OAuth redirects work for **local dev** vs **production (Vercel)**.

## Local development (localhost)

- The app **always uses the current origin** for OAuth `redirectTo` when you're on `localhost` or `127.0.0.1`, so login stays on localhost.
- **Do not** set `PUBLIC_APP_URL` in your local `.env` if you want to stay on localhost after sign-in (setting it used to redirect you to the hosted site).
- In Supabase: **Authentication** → **URL Configuration** → **Redirect URLs**, add your local URL so Supabase allows the callback, e.g.:
  - `http://localhost:3000/**`
  - `http://localhost:3000/src/auth/presentation/auth-page.html`
  (Use your actual port if different.)

## Production (Vercel)

When you host on Vercel, Google sign-in should redirect back to your Vercel URL, not localhost.

### 1. Supabase Dashboard (do this first)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **URL Configuration**.
3. Set **Site URL** to your live app URL, e.g. **`https://cqms-kohl.vercel.app`** (no trailing slash).
4. Under **Redirect URLs**, add:
   - `https://cqms-kohl.vercel.app/**`
   - `https://cqms-kohl.vercel.app/src/auth/presentation/auth-page.html`
5. **Save.**

### 2. App (automatic on Vercel)

- **On Vercel**: `PUBLIC_APP_URL` is set from `VERCEL_URL`; no env var needed. OAuth `redirectTo` uses that URL.
- **Other production hosts**: Set `APP_URL` or `PUBLIC_APP_URL` in env to your public app URL (e.g. `APP_URL=https://cqms-kohl.vercel.app`). Both are used; `APP_URL` also drives impersonation redirects.

## Summary

| Context | OAuth redirect behavior |
|--------|--------------------------|
| **Localhost** | Uses current origin (e.g. `http://localhost:3000`). Add localhost to Supabase Redirect URLs. Do not set `PUBLIC_APP_URL` locally if you want to stay on localhost. |
| **Vercel** | Uses `PUBLIC_APP_URL` (from `VERCEL_URL`). Set Supabase Site URL and Redirect URLs to your Vercel URL. |
