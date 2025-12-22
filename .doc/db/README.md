# Database Schema Documentation

## Overview

This project uses **Supabase** as the database backend with **Drizzle ORM** for type-safe database operations. The database schema is designed for production use with comprehensive user analytics and web push notification support.

## Tables

### 1. `users` Table

Stores comprehensive user information and analytics.

**Columns:**
- `id` (UUID, Primary Key) - References `auth.users(id)`
- `email` (TEXT, Unique, Not Null)
- `full_name` (TEXT, Nullable)
- `avatar_url` (TEXT, Nullable)
- `provider` (TEXT, Default: 'google')
- `last_sign_in_at` (TIMESTAMPTZ) - Last sign-in timestamp
- `last_sign_out_at` (TIMESTAMPTZ) - Last sign-out timestamp
- `sign_in_count` (TEXT) - Total number of sign-ins
- `first_sign_in_at` (TIMESTAMPTZ) - First sign-in timestamp
- `device_info` (JSONB) - Comprehensive device/browser information
- `notification_preferences` (JSONB) - User notification preferences
- `created_at` (TIMESTAMPTZ) - Account creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp (auto-updated)

**Indexes:**
- `idx_users_email` - Fast email lookups
- `idx_users_last_sign_in` - Analytics queries
- `idx_users_created_at` - Time-based queries

**RLS:** Disabled (access controlled via authenticated API calls only)

### 2. `notification_subscriptions` Table

Stores web push notification subscriptions for each user/device.

**Columns:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `endpoint` (TEXT, Unique, Not Null) - Push subscription endpoint
- `p256dh` (TEXT, Not Null) - Public key for encryption
- `auth` (TEXT, Not Null) - Auth secret
- `user_agent` (TEXT) - Browser user agent
- `platform` (TEXT) - Device platform
- `browser` (TEXT) - Browser name
- `browser_version` (TEXT) - Browser version
- `os` (TEXT) - Operating system
- `os_version` (TEXT) - OS version
- `device_type` (TEXT) - 'desktop', 'mobile', or 'tablet'
- `screen_resolution` (TEXT) - Screen resolution
- `language` (TEXT) - User language
- `timezone` (TEXT) - User timezone
- `is_active` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `last_used_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_notification_subscriptions_user_id` - User subscriptions
- `idx_notification_subscriptions_active` - Active subscriptions only
- `idx_notification_subscriptions_endpoint` - Endpoint lookups

**RLS:** Disabled (access controlled via authenticated API calls only)

### 3. `notifications` Table

Stores notification history and queued notifications.

**Columns:**
- `id` (UUID, Primary Key)
- `user_id` (UUID, Foreign Key → users.id)
- `title` (TEXT, Not Null) - Notification title
- `body` (TEXT, Not Null) - Notification body
- `icon_url` (TEXT) - Notification icon
- `image_url` (TEXT) - Notification image
- `action_url` (TEXT) - URL to open when clicked
- `type` (TEXT, Not Null) - 'info', 'warning', 'error', 'success'
- `category` (TEXT) - 'system', 'task', 'message', 'reminder', etc.
- `status` (TEXT, Default: 'pending') - 'pending', 'sent', 'read', 'failed'
- `sent_at` (TIMESTAMPTZ) - When notification was sent
- `read_at` (TIMESTAMPTZ) - When notification was read
- `metadata` (JSONB) - Additional metadata
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_notifications_user_id` - User notifications
- `idx_notifications_status` - Status filtering
- `idx_notifications_created_at` - Time-based queries
- `idx_notifications_user_status` - Combined user and status queries

**RLS:** Disabled (access controlled via authenticated API calls only)

## Device Information Collected

When a user signs in, comprehensive device information is automatically collected:

- **Browser Information:** Name, version, engine
- **Operating System:** Name, version, platform
- **Device Type:** Desktop, mobile, or tablet
- **Screen Information:** Resolution, dimensions, color depth
- **Network Information:** Connection type, speed (if available)
- **Hardware Information:** CPU cores, memory (if available)
- **Language & Locale:** Language, timezone, timezone offset
- **Browser Capabilities:** Cookies, do not track, vendor
- **Page Information:** Referrer, current URL, origin

This data is stored in the `device_info` JSONB column for analytics purposes.

## Authentication Flow

1. User signs in with Google OAuth
2. `saveUserProfileToDatabase()` is called automatically
3. User record is created/updated in `users` table with:
   - Basic user information
   - Comprehensive device information
   - Sign-in analytics (count, timestamps)
   - Notification preferences

## Notification System

### Subscribing to Push Notifications

Use the `notification-subscriptions.ts` utility:

```typescript
import { subscribeToPushNotifications } from './utils/notification-subscriptions.js';

const subscription = await subscribeToPushNotifications(userId);
```

### Saving Subscriptions

```typescript
import { saveNotificationSubscription } from './utils/notification-subscriptions.js';

await saveNotificationSubscription(subscription, userId);
```

### Getting User Subscriptions

```typescript
import { getUserNotificationSubscriptions } from './utils/notification-subscriptions.js';

const subscriptions = await getUserNotificationSubscriptions(userId);
```

## Security

- **RLS Disabled:** Row Level Security is disabled as requested
- **Authenticated Access Only:** All database operations require authenticated Supabase sessions
- **Foreign Key Constraints:** Proper relationships ensure data integrity
- **Cascade Deletes:** User deletion automatically cleans up related records

## Migrations

Migrations are applied via Supabase MCP. Migration files are located in:
- `src/db/migrations/001_create_users_table.sql`
- `src/db/migrations/002_create_notification_subscriptions_table.sql`
- `src/db/migrations/003_create_notifications_table.sql`

## Drizzle ORM

The schema is defined in `src/db/schema.ts` using Drizzle ORM for type safety:

```typescript
import { users, notifications, notificationSubscriptions } from './db/schema.js';
```

## Usage Examples

### Get User Analytics

```typescript
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

console.log('Sign-in count:', data.sign_in_count);
console.log('Last sign-in:', data.last_sign_in_at);
console.log('Device info:', data.device_info);
```

### Update Notification Preferences

```typescript
await supabase
  .from('users')
  .update({
    notification_preferences: {
      email: true,
      push: false,
      in_app: true,
    }
  })
  .eq('id', userId);
```

### Create a Notification

```typescript
await supabase
  .from('notifications')
  .insert({
    user_id: userId,
    title: 'New Task Assigned',
    body: 'You have been assigned a new task',
    type: 'info',
    category: 'task',
    status: 'pending',
  });
```

