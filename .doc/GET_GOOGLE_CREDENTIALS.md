# How to Get Google OAuth Credentials (Step-by-Step)

## Overview

You need to get **Client ID** and **Client Secret** from Google Cloud Console to configure Supabase Google Sign-In.

## Step-by-Step Instructions

### Step 1: Go to Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account

### Step 2: Create or Select a Project

1. Click the **project dropdown** at the top (next to "Google Cloud")
2. Either:
   - **Select an existing project**, OR
   - **Click "New Project"** to create one
     - Enter project name (e.g., "Web QMS")
     - Click "Create"

### Step 3: Enable Google+ API (if needed)

1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API" or "Google Identity"
3. Click on it and click **Enable** (if not already enabled)

**Note:** Modern Google OAuth might not require this, but it's good to have.

### Step 4: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (unless you have a Google Workspace)
3. Click **Create**
4. Fill in required fields:
   - **App name**: Your app name (e.g., "Web QMS")
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **Save and Continue**
6. On **Scopes** page, click **Save and Continue**
7. On **Test users** page (if External), click **Save and Continue**
8. Review and click **Back to Dashboard**

### Step 5: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** at the top
3. Select **OAuth client ID**

### Step 6: Configure OAuth Client

1. **Application type**: Select **Web application**
2. **Name**: Give it a name (e.g., "Web QMS - Supabase Auth")

### Step 7: Add Authorized JavaScript Origins

In the **Authorized JavaScript origins** section, click **+ Add URI** and add:

```
http://localhost:4000
https://YOUR_PROJECT_REF.supabase.co
```

**To find your Supabase project reference:**
- Go to [Supabase Dashboard](https://app.supabase.com/)
- Select your project
- Go to **Settings** → **API**
- Copy the **Project URL** (e.g., `https://mdaffwklbdfthqcjbuyw.supabase.co`)
- Use the part before `.supabase.co` as your project reference

**Example:**
If your Supabase URL is `https://mdaffwklbdfthqcjbuyw.supabase.co`, add:
```
https://mdaffwklbdfthqcjbuyw.supabase.co
```

### Step 8: Add Authorized Redirect URIs

In the **Authorized redirect URIs** section, click **+ Add URI** and add:

```
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

**Example:**
If your Supabase URL is `https://mdaffwklbdfthqcjbuyw.supabase.co`, add:
```
https://mdaffwklbdfthqcjbuyw.supabase.co/auth/v1/callback
```

### Step 9: Create and Copy Credentials

1. Click **Create**
2. A popup will appear with:
   - **Your Client ID** (long string ending in `.apps.googleusercontent.com`)
   - **Your Client Secret** (shorter string)
3. **IMPORTANT:** Copy both values immediately - you won't see the secret again!
4. Click **OK**

### Step 10: Add Credentials to Supabase

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** in the list
5. Click the toggle to **Enable** it
6. Enter:
   - **Client ID (for OAuth)**: Paste your Google Client ID
   - **Client Secret (for OAuth)**: Paste your Google Client Secret
7. **Callback URL**: This should already be filled with your Supabase callback URL
   - It should look like: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
8. Click **Save**

## Quick Reference: Where to Find Each Value

### Google Client ID
- **Location**: Google Cloud Console → APIs & Services → Credentials
- **Format**: `493858938668-vlbfke01aj856qrdunmf8mfm5ltslqa7.apps.googleusercontent.com`
- **Where to use**: Supabase Dashboard → Authentication → Providers → Google → Client ID

### Google Client Secret
- **Location**: Google Cloud Console → APIs & Services → Credentials
- **Format**: `GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Where to use**: Supabase Dashboard → Authentication → Providers → Google → Client Secret
- **⚠️ Warning**: Copy it immediately when created - you can't see it again!

### Supabase Project Reference
- **Location**: Supabase Dashboard → Settings → API
- **Format**: `mdaffwklbdfthqcjbuyw` (from URL `https://mdaffwklbdfthqcjbuyw.supabase.co`)
- **Where to use**: 
  - Google Cloud Console → Authorized JavaScript origins
  - Google Cloud Console → Authorized redirect URIs

## Troubleshooting

### "I can't find OAuth client ID option"

**Solution:**
1. Make sure you've completed the OAuth consent screen setup first
2. Go to **APIs & Services** → **OAuth consent screen** and complete it
3. Then go back to **Credentials** → **Create Credentials**

### "I lost my Client Secret"

**Solution:**
1. Go to Google Cloud Console → **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID
3. Click the **pencil icon** (edit) next to it
4. You can't see the secret, but you can:
   - **Reset the secret** (creates a new one)
   - **Delete and recreate** the client ID

### "redirect_uri_mismatch error"

**Solution:**
1. Check that you added the Supabase callback URL to Google Cloud Console
2. Format must be exactly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Wait 5 minutes for changes to propagate

### "I don't see my Supabase project URL"

**Solution:**
1. Go to Supabase Dashboard
2. Select your project
3. Go to **Settings** → **API**
4. The **Project URL** is at the top
5. Copy everything before `.supabase.co` as your project reference

## Visual Guide

### Google Cloud Console Navigation

```
Google Cloud Console
├── Project Selector (top bar)
├── ☰ Menu
│   └── APIs & Services
│       ├── OAuth consent screen (do this first!)
│       └── Credentials
│           └── + Create Credentials
│               └── OAuth client ID
```

### Supabase Dashboard Navigation

```
Supabase Dashboard
├── Select Project
├── Authentication (left sidebar)
│   └── Providers
│       └── Google
│           ├── Enable toggle
│           ├── Client ID (for OAuth)
│           ├── Client Secret (for OAuth)
│           └── Callback URL (auto-filled)
```

## Summary Checklist

- [ ] Created/selected project in Google Cloud Console
- [ ] Completed OAuth consent screen setup
- [ ] Created OAuth 2.0 Client ID (Web application)
- [ ] Added `http://localhost:4000` to Authorized JavaScript origins
- [ ] Added Supabase URL to Authorized JavaScript origins
- [ ] Added Supabase callback URL to Authorized redirect URIs
- [ ] Copied Client ID and Client Secret
- [ ] Enabled Google provider in Supabase
- [ ] Added Client ID to Supabase
- [ ] Added Client Secret to Supabase
- [ ] Verified Callback URL in Supabase matches Google configuration

## Next Steps

After completing these steps:
1. Test locally: `npm run dev` → Go to `http://localhost:4000`
2. Try signing in with Google
3. If it works, you're all set!
4. When you have a production URL, add it to Google Cloud Console

## Need Help?

- **Google Cloud Console**: [Google Cloud Documentation](https://cloud.google.com/docs)
- **Supabase Auth**: [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- **OAuth Flow**: See `GOOGLE_OAUTH_SETUP.md` for URI configuration details

