-- Migration: Add notification consent fields to users table
-- This adds fields to track notification consent and channel preferences

-- Add notification consent fields
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS notification_consent_given BOOLEAN DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS notification_consent_given_at TIMESTAMPTZ;

-- Update notification_preferences structure to include channels
-- Note: This migration updates the default structure but doesn't modify existing data
-- Existing users will need to be updated when they provide consent

-- Create index for consent queries
CREATE INDEX IF NOT EXISTS idx_users_notification_consent ON users(notification_consent_given);

-- Add comment for documentation
COMMENT ON COLUMN users.notification_consent_given IS 'Whether user has provided notification consent on any device';
COMMENT ON COLUMN users.notification_consent_given_at IS 'Timestamp when user first provided notification consent';
COMMENT ON COLUMN users.notification_preferences IS 'JSONB structure: {channels: {web: bool, email: bool, clickup: bool}, browser_permission_granted: bool, email: bool, push: bool, in_app: bool, categories: {...}}';

