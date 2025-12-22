# Google OAuth URI Configuration Guide

## Overview

This guide explains exactly what URIs to configure in Google Cloud Console for Supabase Google Sign-In, ensuring it works for both local development and production (even if production URL isn't set yet).

## Understanding the OAuth Flow

When using Supabase Google Sign-In, the flow is:
1. User clicks "Sign in with Google" on your app
2. User is redirected to Google OAuth
3. Google redirects to **Supabase callback** (`https://YOUR_PROJECT.supabase.co/auth/v1/callback`)
4. Supabase processes the auth and redirects to your app's redirect URI
5. Your app handles the callback

## Required URIs in Google Cloud Console

### Step 1: Get Your Supabase Project URL

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Copy your **Project URL** (e.g., `https://xijmkmvsumeoqarpmpvi.supabase.co`)

### Step 2: Configure Google Cloud Console

Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → Your OAuth 2.0 Client ID

#### Authorized JavaScript origins

**Purpose:** Where your app runs (browser-based requests)

Add these URIs:

```
http://localhost:4000
https://YOUR_PROJECT_REF.supabase.co
```

**Note:** Add your production URL later when you have it:
```
https://your-production-domain.com
```

**Example:**
```
http://localhost:4000
https://xijmkmvsumeoqarpmpvi.supabase.co
```

#### Authorized redirect URIs

**Purpose:** Where Google redirects after authentication

**CRITICAL:** You MUST include the Supabase callback URL:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

**Example:**
```
https://xijmkmvsumeoqarpmpvi.supabase.co/auth/v1/callback
```

**Important Notes:**
- ✅ **Supabase callback is REQUIRED** - This is where Google redirects first
- ✅ **Supabase handles the redirect** - It then redirects to your app
- ❌ **Do NOT add** `http://localhost:4000/src/auth/presentation/auth-page.html` here
- ❌ **Do NOT add** your production callback URL here
- ✅ **Only Supabase callback** - Supabase manages the redirect chain

## Why Only Supabase Callback?

When using Supabase OAuth:
- Google → Supabase callback → Your app
- Supabase is the intermediary
- Your app's `redirectTo` in code is handled by Supabase, not Google
- Google only needs to know about Supabase's callback

## Current Code Configuration

Your code uses:
```typescript
redirectTo: `${window.location.origin}/src/auth/presentation/auth-page.html`
```

This means:
- **Local:** `http://localhost:4000/src/auth/presentation/auth-page.html`
- **Production:** `https://yourdomain.com/src/auth/presentation/auth-page.html`

But Google doesn't need to know about these - Supabase handles it!

## Complete Setup Checklist

### ✅ Google Cloud Console

**Authorized JavaScript origins:**
- [ ] `http://localhost:4000`
- [ ] `https://YOUR_PROJECT_REF.supabase.co`
- [ ] (Later) `https://your-production-domain.com`

**Authorized redirect URIs:**
- [ ] `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] (That's it! No other redirect URIs needed)

### ✅ Supabase Dashboard

1. Go to **Authentication** → **Providers** → **Google**
2. Enable Google provider
3. Add your **Client ID** and **Client Secret** from Google Cloud Console
4. **Redirect URLs** (in Supabase):
   - `http://localhost:4000/src/auth/presentation/auth-page.html`
   - `https://your-production-domain.com/src/auth/presentation/auth-page.html` (add later)

## Adding Production URL Later

When you have your production URL:

### 1. Update Google Cloud Console

**Authorized JavaScript origins:**
- Add: `https://your-production-domain.com`

**Authorized redirect URIs:**
- ✅ **No changes needed** - Supabase callback already covers it

### 2. Update Supabase Dashboard

**Redirect URLs:**
- Add: `https://your-production-domain.com/src/auth/presentation/auth-page.html`

### 3. No Code Changes Needed

Your code uses `window.location.origin`, so it automatically works for any domain!

## Common Mistakes to Avoid

### ❌ Wrong: Adding app redirect URLs to Google

**Don't add these to Google:**
```
http://localhost:4000/src/auth/presentation/auth-page.html
https://yourdomain.com/src/auth/presentation/auth-page.html
```

**Why:** Google redirects to Supabase first, not directly to your app.

### ✅ Correct: Only Supabase callback in Google

**Add only this to Google:**
```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

### ❌ Wrong: Missing Supabase callback

If you don't add the Supabase callback URL, authentication will fail with:
```
redirect_uri_mismatch error
```

### ✅ Correct: Supabase callback is mandatory

Always include:
```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

## Testing Your Configuration

### Local Development Test

1. Start your dev server: `npm run dev`
2. Go to `http://localhost:4000`
3. Click "Continue with Google"
4. Should redirect to Google → Supabase → Back to your app

### Production Test (when ready)

1. Deploy your app
2. Go to your production URL
3. Click "Continue with Google"
4. Should redirect to Google → Supabase → Back to your app

## Troubleshooting

### Error: "redirect_uri_mismatch"

**Cause:** Supabase callback URL not in Google Cloud Console

**Fix:** Add `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` to Authorized redirect URIs

### Error: "Origin not allowed"

**Cause:** Your app's origin not in Authorized JavaScript origins

**Fix:** Add your origin (e.g., `http://localhost:4000`) to Authorized JavaScript origins

### Authentication works locally but not in production

**Check:**
1. Is production URL in Google Cloud Console's Authorized JavaScript origins?
2. Is production redirect URL in Supabase Dashboard?
3. Wait 5 minutes for Google settings to propagate

## Summary

**Google Cloud Console needs:**
- **JavaScript origins:** Your app URLs (localhost + production)
- **Redirect URIs:** Only Supabase callback URL

**Supabase Dashboard needs:**
- **Redirect URLs:** Your app's callback pages (localhost + production)

**Your code:**
- Already configured correctly with `window.location.origin`
- No changes needed when adding production URL

## Quick Reference

```
Google Cloud Console:
├── Authorized JavaScript origins:
│   ├── http://localhost:4000
│   ├── https://YOUR_PROJECT.supabase.co
│   └── https://your-production-domain.com (add later)
│
└── Authorized redirect URIs:
    └── https://YOUR_PROJECT.supabase.co/auth/v1/callback

Supabase Dashboard:
└── Redirect URLs:
    ├── http://localhost:4000/src/auth/presentation/auth-page.html
    └── https://your-production-domain.com/src/auth/presentation/auth-page.html (add later)
```

