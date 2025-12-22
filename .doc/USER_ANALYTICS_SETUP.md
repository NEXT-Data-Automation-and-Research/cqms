# User Analytics and Notification System Setup

## ✅ Completed Setup

This document describes the comprehensive user analytics and notification system that has been implemented for your migration project.

## Database Tables Created

### 1. `users` Table
- ✅ Created with comprehensive analytics fields
- ✅ Tracks sign-in count, first sign-in, last sign-in, last sign-out
- ✅ Stores comprehensive device information (browser, OS, screen, network, etc.)
- ✅ Notification preferences stored as JSONB
- ✅ RLS disabled (as requested)
- ✅ Auto-updating `updated_at` trigger

### 2. `notification_subscriptions` Table
- ✅ Created for web push notification subscriptions
- ✅ Stores endpoint, encryption keys (p256dh, auth)
- ✅ Device metadata for targeting
- ✅ RLS disabled (as requested)
- ✅ Unique constraint on endpoint

### 3. `notifications` Table
- ✅ Created for notification history
- ✅ Tracks notification status (pending, sent, read, failed)
- ✅ Supports different notification types and categories
- ✅ RLS disabled (as requested)

## Features Implemented

### ✅ Comprehensive Device Information Collection

When users sign in, the system automatically collects:

**Browser Information:**
- Browser name and version
- Browser engine and version
- User agent string

**Operating System:**
- OS name and version
- Platform information

**Device Information:**
- Device type (desktop, mobile, tablet)
- Screen resolution and dimensions
- Color depth
- Viewport size

**Network Information:**
- Connection type (if available)
- Connection speed (if available)
- Online status

**Hardware Information:**
- CPU cores (hardware concurrency)
- Device memory (if available)
- Max touch points

**Language & Locale:**
- Primary language
- All supported languages
- Timezone
- Timezone offset

**Browser Capabilities:**
- Cookie support
- Do not track preference
- Vendor information

**Page Information:**
- Referrer
- Current URL
- Origin

### ✅ Sign-In Analytics

- **Sign-in Count:** Tracks total number of sign-ins
- **First Sign-In:** Records when user first signed in
- **Last Sign-In:** Updated on every sign-in
- **Last Sign-Out:** Updated when user signs out

### ✅ Automatic User Profile Saving

The `saveUserProfileToDatabase()` function in `src/utils/auth.ts`:
- Automatically called after successful authentication
- Collects comprehensive device information
- Updates sign-in analytics
- Handles both new users and returning users
- Non-blocking (won't prevent login if save fails)

### ✅ Notification System Infrastructure

**Files Created:**
- `src/utils/device-info.ts` - Device information collection
- `src/utils/notification-subscriptions.ts` - Push notification subscription management
- `src/db/schema.ts` - Drizzle ORM schema definitions
- `src/db/migrations/` - SQL migration files

**Utilities Available:**
- `saveNotificationSubscription()` - Save push subscription
- `getUserNotificationSubscriptions()` - Get user subscriptions
- `deactivateNotificationSubscription()` - Unsubscribe
- `subscribeToPushNotifications()` - Request permission and subscribe

## Database Configuration

- **RLS:** Disabled on all tables (as requested)
- **Access Control:** All operations require authenticated Supabase sessions
- **Foreign Keys:** Proper relationships with cascade deletes
- **Indexes:** Optimized for common queries
- **Triggers:** Auto-update `updated_at` timestamps

## Drizzle ORM Integration

- ✅ Drizzle ORM installed
- ✅ Schema defined in `src/db/schema.ts`
- ✅ Type-safe database operations available
- ✅ Configuration file created (`drizzle.config.ts`)

## Usage

### When User Signs In

The system automatically:
1. Authenticates user via Google OAuth
2. Collects comprehensive device information
3. Saves/updates user record in `users` table
4. Updates sign-in analytics
5. Stores device info for future analytics

### Accessing User Data

```typescript
import { getSupabase } from './utils/supabase-init.js';

const supabase = getSupabase();
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

// Access analytics
console.log('Sign-ins:', user.sign_in_count);
console.log('Last sign-in:', user.last_sign_in_at);
console.log('Device:', user.device_info.browser);
console.log('OS:', user.device_info.os);
```

### Setting Up Push Notifications

```typescript
import { subscribeToPushNotifications } from './utils/notification-subscriptions.js';

// Request permission and subscribe
const subscription = await subscribeToPushNotifications(userId);
if (subscription) {
  console.log('Subscribed to push notifications!');
}
```

## Project ID

- **Supabase Project:** `mdaffwklbdfthqcjbuyw`
- **Project Name:** cqms-staging
- **Region:** ap-south-1

## Next Steps

1. **Set VAPID Keys:** Add VAPID public key to environment variables for push notifications
2. **Service Worker:** Create service worker for handling push notifications
3. **Notification UI:** Build UI for managing notification preferences
4. **Analytics Dashboard:** Create dashboard to view user analytics

## Files Modified/Created

### Created:
- `src/db/schema.ts` - Drizzle ORM schema
- `src/db/migrations/001_create_users_table.sql`
- `src/db/migrations/002_create_notification_subscriptions_table.sql`
- `src/db/migrations/003_create_notifications_table.sql`
- `src/db/README.md` - Database documentation
- `src/utils/device-info.ts` - Device information collection
- `src/utils/notification-subscriptions.ts` - Notification subscription utilities
- `drizzle.config.ts` - Drizzle configuration
- `USER_ANALYTICS_SETUP.md` - This file

### Modified:
- `src/utils/auth.ts` - Updated to use `users` table and collect comprehensive device info
- `src/utils/notifications.ts` - Updated to use `users` table
- `package.json` - Added Drizzle ORM dependencies

## Testing

To test the setup:

1. **Sign in with Google** - User record should be created automatically
2. **Check Supabase Dashboard** - Verify user appears in `users` table
3. **Verify Device Info** - Check `device_info` JSONB column contains comprehensive data
4. **Check Analytics** - Verify `sign_in_count`, `last_sign_in_at`, etc. are populated

## Notes

- All tables have RLS disabled as requested
- Only authenticated API calls can access the data
- Device information is collected automatically on sign-in
- Sign-in analytics are tracked automatically
- Notification system is ready for web push implementation

