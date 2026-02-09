-- Security events for audit trail: login, permission changes, etc.
-- Written by backend only (service role). No direct client access needed.

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  resource TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);

-- RLS: restrict access; backend uses service role (bypasses RLS) to insert.
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for security_events"
ON security_events FOR ALL
USING (false)
WITH CHECK (false);
