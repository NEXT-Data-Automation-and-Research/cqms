# Testing Token Refresh with 5-Second Expiry

## ⚠️ IMPORTANT: After Changing JWT Expiry

**You MUST log out and log back in** for the new token to have the 5-second expiry!

The token you got before changing the setting still has the old expiry time (1 hour). Only NEW tokens issued after the change will have the 5-second expiry.

## Steps to Test

### 1. Change JWT Expiry (Already Done ✅)
- Settings → Auth Settings → JWT Settings
- Set "Access token expiry time" to **5 seconds**
- Click **Save**

### 2. Log Out and Log Back In
- **This is critical!** The current token still has the old expiry
- Log out completely
- Log back in to get a NEW token with 5-second expiry

### 3. Open Browser Console
- Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- Go to **Console** tab
- Keep it open and watch for logs

### 4. What You Should See

After logging back in, you should immediately see:

```
🔐 Auth state listener initialized - monitoring token refresh events
⏰ Current session expires in: 0m 5s
   Expires at: [time]
🔐 Auth checker: Setting up auth state listener
⏰ Auth Checker: Current session expires in: 0m 5s
   Expires at: [time]
```

Then **every 5 seconds**, you should see:

```
[HH:MM:SS] 🔄 Auth state change event: TOKEN_REFRESHED
✅ [HH:MM:SS] TOKEN REFRESHED SUCCESSFULLY
   New token expires at: [new time]
   User ID: [your user id]
[HH:MM:SS] 🔄 Auth Checker - Event: TOKEN_REFRESHED Session exists
[HH:MM:SS] ✅ Auth Checker: Session refreshed successfully
   New token expires at: [new time]
[HH:MM:SS] 🧹 Auth cache cleared after refresh
```

### 5. If You Don't See Logs

**Check these:**

1. **Did you log out and log back in?** (Most important!)
   - The old token still has 1-hour expiry
   - Only new tokens have 5-second expiry

2. **Is the console open?**
   - Make sure you're on the **Console** tab
   - Check if there are any filters hiding logs

3. **Is the page still loaded?**
   - Don't navigate away from the page
   - Keep the home page open

4. **Check if listener is initialized:**
   - Look for: `🔐 Auth state listener initialized`
   - If you don't see this, refresh the page

5. **Manually check session:**
   - Open console and run:
   ```javascript
   const { getSupabase } = await import('/js/utils/supabase-init.js');
   const supabase = getSupabase();
   const { data: { session } } = await supabase.auth.getSession();
   if (session) {
     const now = Math.floor(Date.now() / 1000);
     const expiresAt = session.expires_at;
     const timeLeft = expiresAt - now;
     console.log('Time until expiry:', timeLeft, 'seconds');
   }
   ```

### 6. Expected Behavior

With 5-second expiry:
- Token refreshes **every ~5 seconds** automatically
- You should see console logs every 5 seconds
- You should **NOT** be logged out (refresh should work)
- The page should stay functional

### 7. After Testing

**Remember to change it back!**
- Go back to Settings → Auth Settings → JWT Settings
- Set "Access token expiry time" back to **3600** (1 hour)
- Click **Save**
- Log out and log back in again

---

## Quick Debug Commands

Run these in the browser console to check status:

```javascript
// Check if listener is set up
console.log('Listener check:', window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL);

// Check current session expiry
const { getSupabase } = await import('/js/utils/supabase-init.js');
const supabase = getSupabase();
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at;
  const timeLeft = expiresAt - now;
  console.log('⏰ Token expires in:', timeLeft, 'seconds');
  console.log('   Expires at:', new Date(expiresAt * 1000).toLocaleTimeString());
} else {
  console.log('❌ No active session');
}

// Manually trigger refresh (for testing)
const { data, error } = await supabase.auth.refreshSession();
console.log('Manual refresh:', { data, error });
```

---

**Most Common Issue**: Not logging out and back in after changing the setting. The old token still has 1-hour expiry!

