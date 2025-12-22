-- Migration: Create notifications table for notification history
-- This table stores notification history and queued notifications

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  icon_url TEXT,
  image_url TEXT,
  action_url TEXT,
  
  -- Notification type and category
  type TEXT NOT NULL, -- 'info', 'warning', 'error', 'success'
  category TEXT, -- 'system', 'task', 'message', 'reminder', etc.
  
  -- Status tracking
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'sent', 'read', 'failed'
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  
  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);

-- Disable RLS (Row Level Security) as requested
-- Note: Access will be controlled through authenticated API calls only
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

