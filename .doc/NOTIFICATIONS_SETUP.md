# Web Platform Notifications Setup Guide

## Overview

The authentication system is now configured to save user information to Supabase database, making it ready for future web platform notifications. User profiles are automatically created/updated when users sign in.

## What's Already Implemented

### ✅ Automatic User Profile Saving

When a user signs in with Google:
1. Supabase Auth creates/updates the auth user
2. **`saveUserProfileToDatabase()`** automatically saves user profile to `user_profiles` table
3. Profile includes:
   - Basic user info (email, name, avatar)
   - **Notification preferences** (email, push, in-app)
   - **Device/browser information** (for web push targeting)
   - **Activity tracking** (last login, last logout)

### ✅ Database Structure Ready

The code is prepared to work with:
- `user_profiles` table - User data and notification preferences
- `notification_subscriptions` table - Web push subscriptions (future)
- `notifications` table - Notification history (future)

## Setup Steps

### 1. Create Database Tables

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'google',
  
  -- Notification preferences
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": true,
    "in_app": true,
    "categories": {
      "system": true,
      "task": true,
      "message": true,
      "reminder": true
    }
  }'::jsonb,
  
  -- Device/browser information for web push
  device_info JSONB DEFAULT '{}'::jsonb,
  
  -- Activity tracking
  last_login_at TIMESTAMPTZ,
  last_logout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "System can insert profiles"
  ON user_profiles FOR INSERT
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at);
```

### 2. Verify It's Working

After creating the table:

1. **Sign in with Google** (or use dev bypass)
2. **Check Supabase Dashboard** → Table Editor → `user_profiles`
3. **Verify** user profile was created with:
   - User ID, email, name
   - Notification preferences
   - Device info
   - Last login timestamp

## How It Works

### When User Signs In

```
1. User clicks "Continue with Google"
   ↓
2. Google OAuth redirect
   ↓
3. User signs in with Google
   ↓
4. Redirected back to app
   ↓
5. handleGoogleOAuthCallback() called
   ↓
6. saveUserProfileToDatabase() saves to Supabase:
   - Creates/updates user_profiles record
   - Includes notification preferences
   - Saves device/browser info
   - Updates last_login_at
   ↓
7. User info saved to localStorage
   ↓
8. User redirected to main app
```

### Data Saved to Database

```json
{
  "id": "user-uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "avatar_url": "https://...",
  "provider": "google",
  "notification_preferences": {
    "email": true,
    "push": true,
    "in_app": true,
    "categories": {
      "system": true,
      "task": true,
      "message": true,
      "reminder": true
    }
  },
  "device_info": {
    "user_agent": "Mozilla/5.0...",
    "platform": "Win32",
    "language": "en-US",
    "timezone": "America/New_York"
  },
  "last_login_at": "2025-12-05T11:00:00Z",
  "created_at": "2025-12-05T10:00:00Z",
  "updated_at": "2025-12-05T11:00:00Z"
}
```

## Future: Implementing Web Push Notifications

When you're ready to implement notifications:

### 1. Create Notification Tables

See `SUPABASE_DATABASE_SCHEMA.md` for complete schema including:
- `notification_subscriptions` - Web push subscriptions
- `notifications` - Notification history

### 2. Use Notification Utilities

Functions are already prepared in `src/utils/notifications.ts`:
- `saveNotificationSubscription()` - Save web push subscription
- `updateNotificationPreferences()` - Update user preferences
- `getNotificationPreferences()` - Get user preferences
- `getUserNotificationSubscriptions()` - Get user's subscriptions

### 3. Request Notification Permission

```typescript
import { saveNotificationSubscription } from './utils/notifications';

// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  // Get subscription
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: 'YOUR_VAPID_PUBLIC_KEY'
  });
  
  // Save to Supabase
  await saveNotificationSubscription(subscription);
}
```

## Notification Preferences Structure

Users can customize their notification preferences:

```json
{
  "email": true,           // Email notifications
  "push": true,            // Web push notifications
  "in_app": true,          // In-app notifications
  "categories": {
    "system": true,        // System notifications
    "task": true,          // Task notifications
    "message": true,       // Message notifications
    "reminder": false      // Reminder notifications
  },
  "quiet_hours": {         // Future: Do not disturb
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }
}
```

## Benefits

✅ **Automatic** - User profiles saved automatically on sign-in  
✅ **Notification-ready** - Preferences and device info already stored  
✅ **Future-proof** - Structure supports web push, email, and in-app notifications  
✅ **Activity tracking** - Last login/logout times for analytics  
✅ **Device targeting** - Browser/platform info for notification optimization  

## Testing

### Test User Profile Creation

1. **Sign in** with Google (or dev bypass)
2. **Check Supabase Dashboard** → `user_profiles` table
3. **Verify** your user profile exists with all fields

### Test Notification Preferences

```typescript
import { updateNotificationPreferences, getNotificationPreferences } from './utils/notifications';

// Update preferences
await updateNotificationPreferences({
  email: true,
  push: false,
  in_app: true
});

// Get preferences
const prefs = await getNotificationPreferences();
console.log('Notification preferences:', prefs);
```

## Troubleshooting

### "user_profiles table not found" warning

**Solution**: Create the table using the SQL in step 1 above.

### User profile not saving

**Check**:
1. Is Supabase initialized? ✅
2. Does `user_profiles` table exist? ✅
3. Are RLS policies correct? ✅
4. Check browser console for errors

### Notification preferences not updating

**Check**:
1. User is authenticated? ✅
2. RLS policy allows updates? ✅
3. JSON structure is valid? ✅

## Next Steps

1. **Create the database tables** (SQL provided above)
2. **Test user profile creation** (sign in and verify)
3. **Plan notification implementation** (when ready)
4. **Use notification utilities** (functions already prepared)

The foundation is ready! When you're ready to implement notifications, everything is in place.

