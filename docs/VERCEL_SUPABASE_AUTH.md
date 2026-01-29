# Vercel + Supabase Auth (fix redirect to localhost)

When you host the app on Vercel, Google sign-in can redirect back to **localhost** instead of your Vercel URL. Fix it in two places.

## 1. Supabase Dashboard (required)

Your Supabase project decides where to send users after OAuth. If the production URL isn’t allowed, it falls back to the **Site URL** (often localhost).

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **URL Configuration**.
3. Set **Site URL** to your Vercel URL, e.g.:
   - `https://your-app.vercel.app`
   - or your custom domain.
4. Under **Redirect URLs**, add:
   - `https://your-app.vercel.app/**`
   - and optionally: `https://your-app.vercel.app/src/auth/presentation/auth-page.html`
5. Save.

After this, Supabase will redirect OAuth callbacks to your Vercel URL instead of localhost.

## 2. App (automatic on Vercel)

The app uses **PUBLIC_APP_URL** for the OAuth `redirectTo` when present, so the client tells Supabase to redirect to your production URL.

- **On Vercel**: `PUBLIC_APP_URL` is set automatically from `VERCEL_URL` (e.g. `https://your-app.vercel.app`). No env var needed.
- **Elsewhere**: Set `PUBLIC_APP_URL` in your environment to your public app URL (e.g. `https://cqms.example.com`) so sign-in redirects to that URL.

## Summary

| Step | Action |
|------|--------|
| Supabase | **Authentication → URL Configuration**: set **Site URL** and **Redirect URLs** to your Vercel (or production) URL. |
| Vercel | Nothing; `PUBLIC_APP_URL` is derived from `VERCEL_URL`. |
| Other hosts | Set `PUBLIC_APP_URL` in env to your public app URL. |
