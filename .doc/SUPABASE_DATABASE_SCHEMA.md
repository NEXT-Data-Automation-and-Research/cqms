# Supabase Database Schema for User Profiles and Notifications

## Overview

This document describes the database schema needed to support user profiles and future web platform notifications.

## Required Tables

### 1. `user_profiles` Table

Stores user profile information and notification preferences.

```sql
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
    "in_app": true
  }'::jsonb,
  
  -- Device/browser information for web push
  device_info JSONB DEFAULT '{}'::jsonb,
  
  -- Activity tracking
  last_login_at TIMESTAMPTZ,
  last_logout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_login ON user_profiles(last_login_at);
```

### 2. `notification_subscriptions` Table (Future)

Stores web push notification subscriptions for each user.

```sql
CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Web Push subscription details
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  
  -- Subscription metadata
  user_agent TEXT,
  platform TEXT,
  browser TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one subscription per endpoint
  UNIQUE(endpoint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_active ON notification_subscriptions(is_active) WHERE is_active = true;
```

### 3. `notifications` Table (Future)

Stores notification history and queued notifications.

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_url TEXT,
  action_url TEXT,
  
  -- Notification type and category
  type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
  category TEXT, -- 'system', 'task', 'message', etc.
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'read', 'failed'
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
```

## Row Level Security (RLS) Policies

### User Profiles

```sql
-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- System can insert profiles (via service role)
CREATE POLICY "System can insert profiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (true);
```

### Notification Subscriptions

```sql
-- Enable RLS
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage own subscriptions"
  ON notification_subscriptions
  FOR ALL
  USING (auth.uid() = user_id);
```

### Notifications

```sql
-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);
```

## Setup Instructions

### 1. Create Tables in Supabase

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL commands above to create tables
3. Enable RLS and create policies

### 2. Verify Setup

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_profiles', 'notification_subscriptions', 'notifications');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_profiles', 'notification_subscriptions', 'notifications');
```

## Data Flow

### When User Signs In

1. **Supabase Auth** creates/updates auth user
2. **handleGoogleOAuthCallback()** calls `saveUserProfileToDatabase()`
3. **User profile** is saved/updated in `user_profiles` table
4. **User info** saved to localStorage for app compatibility

### For Future Notifications

1. **User subscribes** to web push → Save to `notification_subscriptions`
2. **System sends notification** → Create record in `notifications` table
3. **Notification sent** → Update status to 'sent'
4. **User reads notification** → Update status to 'read'

## Notification Preferences Structure

```json
{
  "email": true,
  "push": true,
  "in_app": true,
  "categories": {
    "system": true,
    "task": true,
    "message": true,
    "reminder": false
  },
  "quiet_hours": {
    "enabled": false,
    "start": "22:00",
    "end": "08:00"
  }
}
```

## Future Extensions

### Additional Fields for `user_profiles`

```sql
-- Add timezone for scheduling
ALTER TABLE user_profiles ADD COLUMN timezone TEXT DEFAULT 'UTC';

-- Add notification frequency preferences
ALTER TABLE user_profiles ADD COLUMN notification_frequency TEXT DEFAULT 'realtime';

-- Add notification sound preferences
ALTER TABLE user_profiles ADD COLUMN notification_sound_enabled BOOLEAN DEFAULT true;
```

## Migration Script

If you need to add these tables to an existing database:

```sql
-- Run this in Supabase SQL Editor
BEGIN;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'google',
  notification_preferences JSONB DEFAULT '{"email": true, "push": true, "in_app": true}'::jsonb,
  device_info JSONB DEFAULT '{}'::jsonb,
  last_login_at TIMESTAMPTZ,
  last_logout_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
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

COMMIT;
```

## Notes

- **user_profiles.id** references `auth.users(id)` - automatically linked to Supabase Auth
- **RLS policies** ensure users can only access their own data
- **JSONB fields** allow flexible notification preferences
- **Timestamps** track user activity for analytics
- **Future-ready** structure supports web push notifications

