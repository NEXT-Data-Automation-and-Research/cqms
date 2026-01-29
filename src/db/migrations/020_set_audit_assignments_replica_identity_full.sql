-- Migration: Set REPLICA IDENTITY FULL for audit_assignments table
-- 
-- This is required for Supabase Realtime (postgres_changes) to:
-- 1. Send full row data in the payload (including auditor_email, employee_name, etc.)
-- 2. Properly apply RLS filtering for subscriptions
-- 
-- Without this, realtime events would only include the primary key, making it
-- impossible for the client to filter events by auditor_email or show
-- meaningful notification content like employee_name.
--
-- See: https://supabase.com/docs/guides/realtime/postgres-changes#replica-identity

ALTER TABLE public.audit_assignments REPLICA IDENTITY FULL;
