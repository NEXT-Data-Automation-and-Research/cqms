-- Migration: Create cache_versions table for platform-wide cache clearing
-- This table acts as a broadcast trigger - when admins insert a row,
-- Supabase Realtime notifies all connected clients to clear their caches.

-- Create the cache_versions table
CREATE TABLE IF NOT EXISTS cache_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    triggered_by UUID REFERENCES auth.users(id),
    triggered_by_email TEXT NOT NULL,
    reason TEXT,
    clear_type TEXT DEFAULT 'full' CHECK (clear_type IN ('full', 'service_worker', 'storage')),
    is_skippable BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment to describe the table
COMMENT ON TABLE cache_versions IS 'Stores cache clear events triggered by admins. Used with Supabase Realtime to broadcast cache clear commands to all users.';
COMMENT ON COLUMN cache_versions.version IS 'Unique version identifier for this cache clear event';
COMMENT ON COLUMN cache_versions.triggered_by IS 'User ID of the admin who triggered the cache clear';
COMMENT ON COLUMN cache_versions.triggered_by_email IS 'Email of the admin who triggered the cache clear';
COMMENT ON COLUMN cache_versions.reason IS 'Optional reason for clearing cache (e.g., "Deploying v2.1.0")';
COMMENT ON COLUMN cache_versions.clear_type IS 'Type of cache clear: full (all), service_worker (SW only), storage (localStorage/sessionStorage only)';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_cache_versions_created_at ON cache_versions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE cache_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read (needed for realtime subscription)
CREATE POLICY "cache_versions_read_policy" ON cache_versions
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policy: Only admins can insert (enforced at API level, but extra protection here)
-- Note: We use a permissive policy here; admin check is done in API layer
CREATE POLICY "cache_versions_insert_policy" ON cache_versions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add table to Supabase Realtime publication for postgres_changes
-- This allows clients to subscribe to INSERT events
ALTER PUBLICATION supabase_realtime ADD TABLE cache_versions;

-- Grant necessary permissions
GRANT SELECT ON cache_versions TO authenticated;
GRANT INSERT ON cache_versions TO authenticated;
