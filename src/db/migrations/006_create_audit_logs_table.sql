-- Migration: Create api_access_logs table for API access tracking
-- This table stores API access logs for monitoring and analytics

CREATE TABLE IF NOT EXISTS api_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  user_email TEXT,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_access_logs_user_id ON api_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_timestamp ON api_access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_endpoint ON api_access_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_access_logs_success ON api_access_logs(success);

-- Enable RLS on api_access_logs table
ALTER TABLE api_access_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read API access logs (admin access)
-- Regular users cannot access logs for security
CREATE POLICY "Service role can read API access logs"
ON api_access_logs FOR SELECT
USING (false); -- No direct access, only via service role

-- Policy: Authenticated users can insert API access logs
-- This allows the API to log access
CREATE POLICY "Authenticated users can insert API access logs"
ON api_access_logs FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Note: In practice, API access logs are typically written using service role key
-- The RLS policy above is for additional security if using regular client

