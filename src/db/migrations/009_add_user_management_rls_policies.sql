-- Migration: Add RLS policies for User Management feature
-- This migration adds SELECT policies for authenticated users on:
-- 1. people table (if not already exists)
-- 2. channels table
-- 3. intercom_admin_cache table
--
-- These policies allow authenticated users to read data needed for user management UI

-- ============================================================================
-- PEOPLE TABLE POLICIES
-- ============================================================================
-- Ensure people table has read access for authenticated users
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'people') THEN
    -- Enable RLS on people table if not already enabled
    ALTER TABLE people ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policy if it exists (to avoid conflicts)
    DROP POLICY IF EXISTS "Authenticated users can read all users" ON people;
    
    -- Drop any RESTRICTIVE policies that might block access
    DROP POLICY IF EXISTS "Users can only read own data" ON people;
    DROP POLICY IF EXISTS "Users can read own profile" ON people;
    
    -- Create PERMISSIVE policy allowing authenticated users to read all people
    CREATE POLICY "Authenticated users can read all users"
    ON people FOR SELECT
    TO authenticated
    USING (auth.role() = 'authenticated');
    
    RAISE NOTICE 'RLS policy created for people table';
  ELSE
    RAISE NOTICE 'people table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- CHANNELS TABLE POLICIES
-- ============================================================================
-- Allow authenticated users to read active channels for dropdowns
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'channels') THEN
    -- Enable RLS on channels table if not already enabled
    ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Authenticated users can read channels" ON channels;
    
    -- Create policy allowing authenticated users to read all channels
    CREATE POLICY "Authenticated users can read channels"
    ON channels FOR SELECT
    TO authenticated
    USING (auth.role() = 'authenticated');
    
    RAISE NOTICE 'RLS policy created for channels table';
  ELSE
    RAISE NOTICE 'channels table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- INTERCOM_ADMIN_CACHE TABLE POLICIES
-- ============================================================================
-- Allow authenticated users to read Intercom admin data for dropdowns
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'intercom_admin_cache') THEN
    -- Enable RLS on intercom_admin_cache table if not already enabled
    ALTER TABLE intercom_admin_cache ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Authenticated users can read intercom admins" ON intercom_admin_cache;
    
    -- Create policy allowing authenticated users to read all Intercom admins
    CREATE POLICY "Authenticated users can read intercom admins"
    ON intercom_admin_cache FOR SELECT
    TO authenticated
    USING (auth.role() = 'authenticated');
    
    RAISE NOTICE 'RLS policy created for intercom_admin_cache table';
  ELSE
    RAISE NOTICE 'intercom_admin_cache table does not exist, skipping';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries to verify policies were created:
--
-- Check people table policies:
-- SELECT policyname, cmd, permissive, roles 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'people';
--
-- Check channels table policies:
-- SELECT policyname, cmd, permissive, roles 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'channels';
--
-- Check intercom_admin_cache table policies:
-- SELECT policyname, cmd, permissive, roles 
-- FROM pg_policies 
-- WHERE schemaname = 'public' AND tablename = 'intercom_admin_cache';

