-- Migration: Create platform_notifications table for system-wide announcements
-- This table stores platform-wide notifications that are visible to all users

CREATE TABLE IF NOT EXISTS platform_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'alert', 'success', 'maintenance'
  
  -- Display settings
  priority INTEGER DEFAULT 0, -- Higher = more important (for ordering)
  is_dismissible BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false, -- Pinned notifications stay at top
  
  -- Targeting
  target_roles TEXT[] DEFAULT ARRAY[]::TEXT[], -- Empty = all roles
  
  -- Links/actions
  action_url TEXT,
  action_label TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = never expires
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_by_email TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_notifications_active ON platform_notifications(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_platform_notifications_starts_at ON platform_notifications(starts_at);
CREATE INDEX IF NOT EXISTS idx_platform_notifications_expires_at ON platform_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_platform_notifications_priority ON platform_notifications(priority DESC);

-- Table to track which users have dismissed which notifications
CREATE TABLE IF NOT EXISTS platform_notification_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES platform_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint to prevent duplicate dismissals
  UNIQUE(notification_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_dismissals_user ON platform_notification_dismissals(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_dismissals_notification ON platform_notification_dismissals(notification_id);

-- Enable RLS with proper policies
ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Platform notifications: Anyone authenticated can read active ones
CREATE POLICY "Authenticated users can read active notifications"
  ON platform_notifications
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Admins can do everything on platform_notifications
CREATE POLICY "Admins can manage all notifications"
  ON platform_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM people 
      WHERE people.email = auth.jwt() ->> 'email'
      AND people.role IN ('Admin', 'Super Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM people 
      WHERE people.email = auth.jwt() ->> 'email'
      AND people.role IN ('Admin', 'Super Admin')
    )
  );

-- Platform notification dismissals: Users can manage their own dismissals
CREATE POLICY "Users can read their own dismissals"
  ON platform_notification_dismissals
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own dismissals"
  ON platform_notification_dismissals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own dismissals"
  ON platform_notification_dismissals
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_platform_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_platform_notifications_updated_at ON platform_notifications;
CREATE TRIGGER update_platform_notifications_updated_at
  BEFORE UPDATE ON platform_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_platform_notifications_updated_at();

-- Insert a welcome notification as an example
INSERT INTO platform_notifications (title, message, type, priority, is_dismissible, is_pinned)
VALUES (
  'Welcome to CQMS Platform Notifications',
  'This is where you will see important system announcements, maintenance notices, and updates. Administrators can manage these notifications from the admin panel.',
  'info',
  0,
  true,
  false
);
