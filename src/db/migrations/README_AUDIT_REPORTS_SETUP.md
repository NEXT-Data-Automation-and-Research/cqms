# Audit Reports Database Setup Guide

This guide explains how to set up the database for the Audit Reports feature step by step.

## Overview

The Audit Reports feature requires:
1. An RPC function `get_audit_tables()` to discover audit tables
2. Proper RLS (Row Level Security) policies on audit tables
3. Consistent schema across all audit tables

## Step-by-Step Setup

### Step 1: Create the `get_audit_tables` RPC Function

Run migration `012_create_get_audit_tables_rpc.sql`:

```sql
-- This creates a function that returns all audit tables in the database
-- The function automatically discovers tables matching common audit table patterns
```

**What it does:**
- Creates `get_audit_tables()` function that returns a list of audit table names
- Grants execute permission to authenticated users
- Excludes system tables (users, scorecards, etc.)

**To run:**
```bash
# Using Supabase CLI
supabase db execute -f src/db/migrations/012_create_get_audit_tables_rpc.sql

# Or using psql
psql -h your-db-host -U postgres -d your-database -f src/db/migrations/012_create_get_audit_tables_rpc.sql
```

### Step 2: Add RLS Policies to Audit Tables

Run migration `013_add_audit_tables_rls_policies.sql`:

```sql
-- This adds RLS policies to all existing audit tables
-- Policies allow authenticated users to read, insert, update, and delete audits
```

**What it does:**
- Creates helper function `add_audit_table_rls_policy()` to add RLS to any table
- Automatically applies RLS policies to all existing audit tables
- Enables RLS on tables that don't have it enabled
- Creates policies for SELECT, INSERT, UPDATE, and DELETE operations

**To run:**
```bash
supabase db execute -f src/db/migrations/013_add_audit_tables_rls_policies.sql
```

### Step 3: Fix Audit Table Schemas

Run migration `014_fix_audit_tables_schema.sql`:

```sql
-- This adds missing columns to existing audit tables
-- Ensures all audit tables have the same schema structure
```

**What it does:**
- Creates helper function `fix_audit_table_schema()` to add missing columns
- Adds all columns from `AUDIT_TABLE_COMMON_FIELDS` to existing tables
- Only adds columns that don't already exist (safe to run multiple times)
- Handles errors gracefully if a table doesn't exist

**To run:**
```bash
supabase db execute -f src/db/migrations/014_fix_audit_tables_schema.sql
```

## Running All Migrations

You can run all migrations in order:

```bash
# Using Supabase CLI
supabase db execute -f src/db/migrations/012_create_get_audit_tables_rpc.sql
supabase db execute -f src/db/migrations/013_add_audit_tables_rls_policies.sql
supabase db execute -f src/db/migrations/014_fix_audit_tables_schema.sql

# Or using psql (replace connection details)
psql -h your-db-host -U postgres -d your-database -f src/db/migrations/012_create_get_audit_tables_rpc.sql
psql -h your-db-host -U postgres -d your-database -f src/db/migrations/013_add_audit_tables_rls_policies.sql
psql -h your-db-host -U postgres -d your-database -f src/db/migrations/014_fix_audit_tables_schema.sql
```

## Verification

After running the migrations, verify everything is set up correctly:

### 1. Test the RPC function:
```sql
SELECT * FROM get_audit_tables();
```

This should return a list of all audit tables.

### 2. Check RLS is enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (SELECT table_name FROM get_audit_tables());
```

All tables should have `rowsecurity = true`.

### 3. Check policies exist:
```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN (SELECT table_name FROM get_audit_tables());
```

You should see policies for SELECT, INSERT, UPDATE, and DELETE.

### 4. Test querying an audit table:
```sql
-- This should work if you're authenticated
SELECT id, employee_email, submitted_at 
FROM fnchat_cfd_v4_0_v2 
LIMIT 5;
```

## Troubleshooting

### Error: Function already exists
If you get an error that the function already exists, you can drop it first:
```sql
DROP FUNCTION IF EXISTS get_audit_tables();
```

### Error: Policy already exists
The migrations handle this automatically by using `DROP POLICY IF EXISTS` before creating new policies.

### Error: Column already exists
The schema fix function checks if columns exist before adding them, so it's safe to run multiple times.

### Tables still showing 404/400 errors
1. Make sure the tables actually exist in your database
2. Check that RLS policies are correctly applied
3. Verify your user has the `authenticated` role
4. Check that the table names match the patterns in `get_audit_tables()` function

## Expected Schema

All audit tables should have these columns (at minimum):
- `id` (UUID or TEXT)
- `employee_email` (TEXT)
- `employee_name` (TEXT)
- `auditor_email` (TEXT)
- `interaction_id` (TEXT)
- `submitted_at` (TIMESTAMPTZ)
- `passing_status` (TEXT)
- `average_score` (NUMERIC)
- `total_errors_count` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

Plus optional columns for full functionality (see `AUDIT_TABLE_COMMON_FIELDS` in `field-whitelists.ts`).

## Next Steps

After running these migrations:
1. Refresh your audit reports page
2. The RPC function should now work (no more 404)
3. Tables with schema issues should be fixed (no more 400 errors)
4. All audit tables should be accessible with proper RLS

