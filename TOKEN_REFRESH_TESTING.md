# Token Refresh Testing Guide

## Where Token Expiration is Set

### Server-Side (Supabase Dashboard)
The actual JWT token expiration time is set in your **Supabase Dashboard**, not in the code:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Auth Settings** (NOT "User Sessions")
3. Find **"JWT Expiry"** setting (usually in the "JWT Settings" section)
4. Default is **3600 seconds (1 hour)**

**Important Distinction:**
- **"JWT Expiry"** (in Auth Settings) = How long access tokens are valid (controls when refresh happens)
- **"Refresh token reuse interval"** (in User Sessions) = Security setting to prevent replay attacks (NOT the refresh interval)
- **"Time-box user sessions"** = Forces re-login after a set time (Pro Plan only)
- **"Inactivity timeout"** = Forces re-login after inactivity (Pro Plan only)

**This is where the ~55 minutes comes from:**
- Default JWT expiry: 3600 seconds (1 hour)
- Supabase auto-refreshes when token is close to expiring
- Usually refreshes around 55 minutes (with 5-minute buffer)

### Client-Side Configuration
The client code has `autoRefreshToken: true` which enables automatic refresh, but the actual expiration time is controlled by Supabase server.

## Testing Token Refresh

### Method 1: Use Test Mode (Recommended for Quick Testing)

Add this to your browser console after logging in:

```javascript
// Force token refresh every 2 minutes for testing
window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL = 120; // 120 seconds = 2 minutes

// Or test with 30 seconds
window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL = 30; // 30 seconds

// Or test with 5 minutes
window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL = 300; // 5 minutes
```

Then make any Supabase call to trigger the refresh check:
```javascript
// This will check and refresh if needed
const { getAuthenticatedSupabase } = await import('/js/utils/authenticated-supabase.js');
const supabase = await getAuthenticatedSupabase();
```

### Method 2: Change Supabase Dashboard Settings (For Real Testing)

**To change JWT Expiry (the actual token expiration):**

1. Go to Supabase Dashboard → **Settings** → **Auth Settings**
2. Look for **"JWT Settings"** section (NOT "User Sessions")
3. Find **"JWT Expiry"** setting
4. Set it to a lower value:
   - **300 seconds** = 5 minutes
   - **180 seconds** = 3 minutes
   - **60 seconds** = 1 minute (very short, for quick testing)
5. Save settings
6. **Important**: Log out and log back in to get a new token with the new expiry
7. Wait for the token to expire/refresh

**Note**: The "Refresh token reuse interval" (10 seconds) in User Sessions is NOT what you need to change. That's a security setting to prevent replay attacks, not the token refresh interval.

**⚠️ WARNING**: Don't forget to change it back to 3600 seconds (1 hour) after testing!

### Method 3: Manually Trigger Refresh

You can manually trigger a token refresh in the browser console:

```javascript
// Get Supabase client
const { getSupabase } = await import('/js/utils/supabase-init.js');
const supabase = getSupabase();

// Manually refresh the session
const { data, error } = await supabase.auth.refreshSession();
console.log('Refresh result:', { data, error });
```

## How Test Mode Works

The test mode in `authenticated-supabase-auth.ts`:

1. Checks if `window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL` is set
2. If set, treats the session as "expiring" when its age exceeds the test interval
3. Forces a refresh even if the token hasn't actually expired yet
4. This allows you to test refresh behavior without waiting 55 minutes

## Example Test Scenarios

### Test 1: Quick Refresh (30 seconds)
```javascript
// In browser console
window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL = 30;
// Make any authenticated call - should refresh within 30 seconds
```

### Test 2: Medium Refresh (2 minutes)
```javascript
window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL = 120;
// Wait 2 minutes, then make a call - should refresh
```

### Test 3: Check Current Session Info
```javascript
const { getSupabase } = await import('/js/utils/supabase-init.js');
const supabase = getSupabase();
const { data: { session } } = await supabase.auth.getSession();

if (session) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at;
  const timeUntilExpiry = expiresAt - now;
  const minutesUntilExpiry = Math.floor(timeUntilExpiry / 60);
  
  console.log('Token expires in:', minutesUntilExpiry, 'minutes');
  console.log('Expires at:', new Date(expiresAt * 1000).toLocaleString());
}
```

## Disabling Test Mode

To disable test mode and return to normal behavior:

```javascript
window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL = null;
// Or refresh the page
```

## Current Configuration

- **Default JWT Expiry**: Set in Supabase Dashboard (usually 3600 seconds = 1 hour)
- **Auto Refresh**: Enabled (`autoRefreshToken: true`)
- **Refresh Buffer**: 60 seconds (1 minute) - refreshes when token expires in < 1 minute
- **Test Mode**: Available via `window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL`

## Files to Check

- **Supabase Client Config**: `src/utils/supabase-init.ts` (line 59: `autoRefreshToken: true`)
- **Auth Verification**: `src/utils/authenticated-supabase-auth.ts` (line 71: buffer time, line 29: test mode)
- **Token Refresh Logic**: `src/utils/auth-core.ts` (line 117: 5-minute buffer for refresh)

---

**Remember**: The actual token expiration is controlled by Supabase server settings, not client code. The client code only handles when to refresh based on the expiration time.

