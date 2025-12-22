-- Migration: Create notification_subscriptions table for web push notifications
-- This table stores web push notification subscriptions for each user/device

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Web Push subscription details (required for web push API)
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL, -- Public key
  auth TEXT NOT NULL, -- Auth secret
  
  -- Device/browser metadata for targeting and analytics
  user_agent TEXT,
  platform TEXT,
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  screen_resolution TEXT,
  language TEXT,
  timezone TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user_id ON notification_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_active ON notification_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_endpoint ON notification_subscriptions(endpoint);

-- Disable RLS (Row Level Security) as requested
-- Note: Access will be controlled through authenticated API calls only
ALTER TABLE notification_subscriptions DISABLE ROW LEVEL SECURITY;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_notification_subscriptions_updated_at
  BEFORE UPDATE ON notification_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

