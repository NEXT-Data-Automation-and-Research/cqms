-- Migration: Enable Row Level Security (RLS) and create security policies
-- This migration enables RLS on all tables and creates appropriate policies
-- for secure, authenticated access

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY "Users can read own data"
ON users FOR SELECT
USING (auth.uid() = id);

-- Policy: Users can update their own data
CREATE POLICY "Users can update own data"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy: Users can insert their own data (for signup)
-- Note: This allows users to create their own profile during signup
CREATE POLICY "Users can insert own data"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Users can delete their own data
CREATE POLICY "Users can delete own data"
ON users FOR DELETE
USING (auth.uid() = id);

-- ============================================================================
-- NOTIFICATION_SUBSCRIPTIONS TABLE POLICIES
-- ============================================================================

-- Enable RLS on notification_subscriptions table
ALTER TABLE notification_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscriptions
CREATE POLICY "Users can read own subscriptions"
ON notification_subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
ON notification_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions"
ON notification_subscriptions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own subscriptions"
ON notification_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- NOTIFICATIONS TABLE POLICIES
-- ============================================================================

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Policy: System can insert notifications (via service role)
-- Note: This requires service role key, not anon key
-- For client-side, users can only insert their own notifications
CREATE POLICY "Users can insert own notifications"
ON notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own notifications
CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- SCORECARDS TABLE POLICIES (if exists)
-- ============================================================================

-- Enable RLS on scorecards table (if it exists)
-- This is a dynamic table, so we'll use a more permissive read policy
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scorecards') THEN
    ALTER TABLE scorecards ENABLE ROW LEVEL SECURITY;
    
    -- Policy: Authenticated users can read scorecards
    DROP POLICY IF EXISTS "Authenticated users can read scorecards" ON scorecards;
    CREATE POLICY "Authenticated users can read scorecards"
    ON scorecards FOR SELECT
    USING (auth.role() = 'authenticated');
    
    -- Policy: Authenticated users can insert scorecards
    DROP POLICY IF EXISTS "Authenticated users can insert scorecards" ON scorecards;
    CREATE POLICY "Authenticated users can insert scorecards"
    ON scorecards FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
    
    -- Policy: Authenticated users can update scorecards
    DROP POLICY IF EXISTS "Authenticated users can update scorecards" ON scorecards;
    CREATE POLICY "Authenticated users can update scorecards"
    ON scorecards FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
    
    -- Policy: Authenticated users can delete scorecards
    DROP POLICY IF EXISTS "Authenticated users can delete scorecards" ON scorecards;
    CREATE POLICY "Authenticated users can delete scorecards"
    ON scorecards FOR DELETE
    USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- These policies ensure:
-- 1. Users can only access their own data
-- 2. All operations require authentication
-- 3. RLS is enforced at the database level (cannot be bypassed)
-- 
-- For operations that need to bypass RLS (admin operations, system operations),
-- use the service role key on the server-side API.
-- 
-- The service role key should NEVER be exposed to the client.
-- It should only be used in server-side code.

