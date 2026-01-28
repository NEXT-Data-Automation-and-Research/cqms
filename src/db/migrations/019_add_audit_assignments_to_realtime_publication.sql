-- Enable Realtime (Postgres Changes) for audit_assignments so clients can
-- subscribe to INSERT/UPDATE/DELETE and show the "You have been assigned a new audit" toast.
-- See: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes

ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_assignments;
