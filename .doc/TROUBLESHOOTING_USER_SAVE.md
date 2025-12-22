# Troubleshooting: User Not Saving to Database

## Issue
User information is not being saved to the `users` table after Google sign-in.

## Error Message
```
POST https://mdaffwklbdfthqcjbuyw.supabase.co/rest/v1/user_profiles?on_conflict=id 404 (Not Found)
Error: Could not find the table 'public.user_profiles' in the schema cache
```

## Root Cause
The browser is using a **cached version** of the JavaScript file that references the old table name `user_profiles` instead of `users`.

## Solution

### Step 1: Hard Refresh Browser Cache
1. **Chrome/Edge**: Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Firefox**: Press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac)
3. **Or**: Open DevTools (F12) → Right-click refresh button → "Empty Cache and Hard Reload"

### Step 2: Verify Table Name
The code now uses `users` table (NOT `user_profiles`). Check console logs:
- Should see: `📋 Table name: users (NOT user_profiles)`
- Should NOT see: `user_profiles` in any error messages

### Step 3: Check Console Logs
After hard refresh, you should see:
```
🔍 Checking if user profile exists in database...
🔐 Starting user profile save process for: [email]
✅ Secure Supabase client obtained
📤 Executing upsert operation...
📋 Table name: users (NOT user_profiles)
✅ User profile save completed
```

### Step 4: Verify in Supabase
1. Go to Supabase Dashboard → Table Editor
2. Select `users` table (NOT `user_profiles`)
3. Check if user record exists

## If Still Not Working

### Check RLS Policies
The `users` table must have these RLS policies:
- ✅ "Users can insert own profile" - WITH CHECK (auth.uid() = id)
- ✅ "Users can view own profile" - USING (auth.uid() = id)
- ✅ "Users can update own profile" - USING (auth.uid() = id)

### Check Browser Console
Look for these specific errors:
- `❌ Permission denied (42501)` - RLS policy issue
- `❌ JWT expired (PGRST301)` - Session expired
- `❌ Authentication required (AUTH_REQUIRED)` - Not authenticated

### Verify Table Exists
Run in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'users';
```

Should return: `users`

## Prevention
To prevent cache issues in the future:
1. Use versioned file names: `auth.js?v=1.0.0`
2. Set proper cache headers on server
3. Use service workers with cache invalidation

## Current Status
✅ Code uses correct table name: `users`
✅ RLS policies are configured
✅ Error handling is in place
⚠️ Browser cache needs to be cleared

