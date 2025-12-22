# Authentication Guide

## Overview

This application uses **Supabase Authentication** with **Google Sign-In** for user authentication. It also includes a **dev bypass** feature for testing without real authentication.

## How It Works

### Production (Real Users)
1. User clicks "Continue with Google" button
2. Redirected to Google OAuth
3. User signs in with Google account
4. Redirected back to app with Supabase session
5. User is authenticated and can access the app

### Development (Testing)
1. Enable dev mode: `localStorage.setItem('isDev', 'true')`
2. Dev bypass section appears on login page
3. Enter test email and click "Bypass Auth"
4. Instantly authenticated without Google sign-in

## Setup Instructions

### 1. Configure Supabase Google OAuth

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** and click **Enable**
5. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
6. Add redirect URLs:
   - Development: `http://localhost:4000/src/auth/presentation/auth-page.html`
   - Production: `https://yourdomain.com/src/auth/presentation/auth-page.html`

### 2. Get Google OAuth Credentials

**📖 See [GET_GOOGLE_CREDENTIALS.md](./GET_GOOGLE_CREDENTIALS.md) for detailed step-by-step instructions.**

**Quick Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Complete **OAuth consent screen** setup
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. Application type: **Web application**
7. **Authorized JavaScript origins:**
   - `http://localhost:4000`
   - `https://YOUR_PROJECT_REF.supabase.co`
   - (Add production URL later: `https://your-production-domain.com`)
8. **Authorized redirect URIs:**
   - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback` ⚠️ **REQUIRED**
9. Copy **Client ID** and **Client Secret** (save secret immediately!)
10. Add them to Supabase Dashboard → Authentication → Providers → Google

**📖 See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) for detailed URI configuration guide.**

### 3. Environment Variables

Make sure your `.env` file has:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Usage

### For Users (Production)

1. Visit the login page
2. Click **"Continue with Google"**
3. Sign in with Google account
4. Automatically redirected to the app

### For Developers (Testing)

#### Enable Dev Mode
```javascript
// In browser console
localStorage.setItem('isDev', 'true');
```

#### Use Dev Bypass
1. Refresh the login page
2. You'll see a "Dev Mode: Bypass Authentication" section
3. Enter any test email (e.g., `test@example.com`)
4. Click **"Bypass Auth (Dev Only)"**
5. Instantly authenticated!

#### Disable Dev Mode
```javascript
localStorage.setItem('isDev', 'false');
// or
localStorage.removeItem('isDev');
```

## Code Functions

### Authentication Functions

Located in `src/utils/auth.ts`:

- **`signInWithGoogle()`** - Initiates Google OAuth sign-in
- **`signOut()`** - Signs out current user
- **`getCurrentSupabaseUser()`** - Gets authenticated user from Supabase
- **`checkSupabaseAuthentication()`** - Checks if user is authenticated
- **`handleGoogleOAuthCallback()`** - Handles OAuth callback after Google redirect
- **`getUserInfo()`** - Gets user info (works with both Supabase and dev bypass)
- **`enableDevBypassAuthentication(email)`** - Enables dev bypass for testing
- **`isDevBypassActive()`** - Checks if dev bypass is currently active

### Auth Checker

Located in `src/auth-checker.ts`:

- **`isAuthenticated()`** - Checks authentication (async)
- **`getCurrentUser()`** - Gets current user (async)
- **`redirectToLogin()`** - Redirects to login page
- **`initAuthCheck()`** - Initializes auth check on page load

## User Data Structure

After authentication, user data is stored in two places:

### 1. localStorage (for app compatibility)
```typescript
{
  id: string;           // User ID
  email: string;        // User email
  name: string;         // User full name
  picture: string;      // Profile picture URL
  provider: 'google' | 'dev-bypass';
  isDev?: boolean;      // Only present for dev bypass
}
```

### 2. Supabase Database (for notifications and future features)
User profile is automatically saved to `user_profiles` table with:
- Basic user information (email, name, avatar)
- **Notification preferences** (email, push, in-app)
- **Device/browser information** (for web push targeting)
- **Activity tracking** (last login, last logout)
- **Timezone** (for scheduled notifications)

See `SUPABASE_DATABASE_SCHEMA.md` for complete database structure.

## Authentication Flow

### Google Sign-In Flow

```
1. User clicks "Continue with Google"
   ↓
2. signInWithGoogle() called
   ↓
3. Redirected to Google OAuth
   ↓
4. User signs in with Google
   ↓
5. Google redirects back to auth-page.html?code=...
   ↓
6. handleGoogleOAuthCallback() processes the code
   ↓
7. Supabase creates session
   ↓
8. User info saved to localStorage
   ↓
9. Redirected to main app (/)
   ↓
10. auth-checker.ts verifies authentication
   ↓
11. User can access the app
```

### Dev Bypass Flow

```
1. Developer sets isDev=true
   ↓
2. Dev bypass section appears
   ↓
3. Developer enters test email
   ↓
4. enableDevBypassAuthentication() called
   ↓
5. Fake user info saved to localStorage
   ↓
6. Redirected to main app (/)
   ↓
7. auth-checker.ts detects dev bypass
   ↓
8. Developer can access the app
```

## Security Notes

### Production
- ✅ Always use real Google OAuth in production
- ✅ Dev bypass only works when `isDev=true` in localStorage
- ✅ Supabase handles all authentication securely
- ✅ Sessions are managed by Supabase

### Development
- ⚠️ Dev bypass is for testing only
- ⚠️ Never commit code with `isDev=true` hardcoded
- ⚠️ Dev bypass creates fake sessions - not secure
- ⚠️ Use real authentication when testing production-like scenarios

## Troubleshooting

### "Supabase not initialized" error
- **Solution**: Wait a moment for Supabase to initialize, then try again
- **Check**: Verify Supabase credentials in `.env` file

### Google Sign-In not working
- **Check**: Google OAuth credentials in Supabase Dashboard
- **Check**: Redirect URLs are correct
- **Check**: Google Cloud Console has correct redirect URI

### Dev bypass not appearing
- **Check**: `localStorage.getItem('isDev') === 'true'`
- **Solution**: Run `localStorage.setItem('isDev', 'true')` in console

### User not authenticated after Google sign-in
- **Check**: OAuth callback is handling correctly
- **Check**: Supabase session is being created
- **Check**: Browser console for errors

## Testing Different Users

### With Dev Bypass
1. Enable dev mode
2. Enter different emails in dev bypass
3. Each email creates a different fake user
4. Useful for testing user-specific features

### With Real Authentication
1. Use different Google accounts
2. Each account is a real Supabase user
3. Test actual authentication flow
4. Verify user data in Supabase Dashboard

## Best Practices

1. **Always test with real authentication** before deploying
2. **Use dev bypass** for quick UI/UX testing
3. **Clear localStorage** when switching between dev and production
4. **Check Supabase Dashboard** to verify user creation
5. **Test OAuth flow** in incognito mode to catch issues

## Example Usage

### Check if user is authenticated
```typescript
import { isAuthenticated } from './auth-checker';

const authenticated = await isAuthenticated();
if (authenticated) {
  // User is logged in
}
```

### Get current user
```typescript
import { getCurrentUser } from './auth-checker';

const user = await getCurrentUser();
console.log('Current user:', user?.email);
```

### Sign out
```typescript
import { signOut } from './utils/auth';

await signOut();
// User is now signed out
```

