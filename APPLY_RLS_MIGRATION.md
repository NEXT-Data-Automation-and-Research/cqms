# How to Apply RLS Migration

This guide explains how to apply the Row Level Security (RLS) policies migration to your Supabase database.

## Quick Start

### Method 1: Supabase Dashboard (Recommended - Easiest)

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy Migration SQL**
   - Open `src/db/migrations/004_enable_rls_policies.sql`
   - Copy the entire contents

4. **Paste and Run**
   - Paste the SQL into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

5. **Verify**
   - Check for success message
   - Verify RLS is enabled: Go to Table Editor → Select a table → Check "RLS enabled" badge

### Method 2: Command Line (psql)

#### Windows (PowerShell)

```powershell
# Option 1: Use the provided script
.\scripts\apply-rls.ps1 -ProjectRef "your-project-ref" -Password "your-password"

# Option 2: Manual psql command
$env:PGPASSWORD="your-password"
psql "postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres" -f src/db/migrations/004_enable_rls_policies.sql
```

#### Linux/Mac (Bash)

```bash
# Option 1: Use the provided script
chmod +x scripts/apply-rls.sh
./scripts/apply-rls.sh

# Option 2: Manual psql command
PGPASSWORD="your-password" psql "postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres" -f src/db/migrations/004_enable_rls_policies.sql
```

### Method 3: Node.js Script

```bash
# Build the script first
npm run build:server

# Run the script
npm run apply-rls
```

**Note**: The Node.js script provides instructions but may have limited SQL execution capabilities. Use Method 1 or 2 for best results.

## Finding Your Project Reference ID

1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → General
4. Copy the "Reference ID"

Or find it in your project URL:
```
https://app.supabase.com/project/YOUR_PROJECT_REF
```

## Finding Your Database Password

1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → Database
4. Click "Reset database password" if you forgot it
5. Copy the password (you'll need it for connection)

## Verification

After applying the migration, verify RLS is enabled:

### Check in Supabase Dashboard

1. Go to Table Editor
2. Select a table (e.g., `users`)
3. Look for "RLS enabled" badge or icon
4. Go to Authentication → Policies to see the policies

### Check via SQL

```sql
-- Check if RLS is enabled on users table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- List all RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Troubleshooting

### Error: "permission denied"

- Make sure you're using the **database password**, not the API keys
- Verify your IP is allowed in Supabase Dashboard → Settings → Database

### Error: "relation does not exist"

- Make sure you've run the previous migrations first:
  - `001_create_users_table.sql`
  - `002_create_notification_subscriptions_table.sql`
  - `003_create_notifications_table.sql`

### Error: "policy already exists"

- The migration uses `DROP POLICY IF EXISTS`, so this should be safe
- If you see this error, the policy might have a different name
- Check existing policies: `SELECT * FROM pg_policies WHERE tablename = 'users';`

### RLS Not Working

1. **Check RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'users';
   ```

2. **Check policies exist:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

3. **Test with authenticated user:**
   - Make sure you're authenticated when testing
   - RLS policies require `auth.uid()` to work

## What This Migration Does

1. **Enables RLS** on all tables:
   - `users`
   - `notifications`
   - `notification_subscriptions`
   - `scorecards` (if exists)

2. **Creates security policies** that ensure:
   - Users can only access their own data
   - All operations require authentication
   - Database-level enforcement (cannot be bypassed)

3. **Protects your data** at the database level

## After Applying Migration

1. ✅ **Update your code** to use `apiClient` for write operations
2. ✅ **Test your application** to ensure everything works
3. ✅ **Verify security** by trying to access other users' data (should fail)
4. ✅ **Monitor logs** for any RLS policy violations

## Need Help?

- See `ARCHITECTURE.md` for architecture details
- See `README_SECURITY.md` for security information
- See `MIGRATION_GUIDE_API.md` for code migration help

