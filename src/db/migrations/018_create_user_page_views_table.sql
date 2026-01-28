-- Migration: Create user_page_views table for user analytics
-- Strict schema: CHECK constraints and NOT NULL to prevent false data
-- See docs/analytics/ANALYTICS_FEATURE_PROPOSAL.md

CREATE TABLE IF NOT EXISTS user_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_event_id UUID UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  page_slug TEXT NOT NULL,
  page_path TEXT NOT NULL,
  referrer TEXT,
  view_started_at TIMESTAMPTZ NOT NULL,
  view_ended_at TIMESTAMPTZ NOT NULL,
  time_on_page_seconds INTEGER NOT NULL,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT chk_time_on_page_non_negative CHECK (time_on_page_seconds >= 0),
  CONSTRAINT chk_time_on_page_max_24h CHECK (time_on_page_seconds <= 86400),
  CONSTRAINT chk_view_end_after_start CHECK (view_ended_at >= view_started_at)
);

CREATE INDEX IF NOT EXISTS idx_user_page_views_user_id ON user_page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_page_views_session_id ON user_page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_user_page_views_page_slug ON user_page_views(page_slug);
CREATE INDEX IF NOT EXISTS idx_user_page_views_view_timestamp ON user_page_views(view_started_at);
CREATE INDEX IF NOT EXISTS idx_user_page_views_created_at ON user_page_views(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_page_views_client_event_id ON user_page_views(client_event_id) WHERE client_event_id IS NOT NULL;

COMMENT ON TABLE user_page_views IS 'User analytics: page views with exact time-on-page (seconds). Server-validated only.';
