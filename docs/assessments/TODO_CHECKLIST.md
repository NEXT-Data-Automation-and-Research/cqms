# ✅ TODO Checklist - Sandbox Security Fixes

## Required Actions

### 1. ⚠️ **Apply Database Migrations** (REQUIRED)

You need to run two SQL migrations in your Supabase database:

#### Migration 1: Add Permissive Read Policy
**File**: `src/db/migrations/005_add_permissive_users_read_policy.sql`

**How to apply**:
- Option A (Supabase Dashboard - Recommended):
  1. Go to your Supabase project dashboard
  2. Navigate to **SQL Editor**
  3. Click **New Query**
  4. Copy the entire contents of `005_add_permissive_users_read_policy.sql`
  5. Paste and click **Run**

- Option B (Command Line):
  ```bash
  psql -h your-db-host -U postgres -d your-db-name -f src/db/migrations/005_add_permissive_users_read_policy.sql
  ```

**What it does**: Allows authenticated users to read all users (for sandbox feature)

---

#### Migration 2: Create Audit Logs Table
**File**: `src/db/migrations/006_create_audit_logs_table.sql`

**How to apply**:
- Option A (Supabase Dashboard - Recommended):
  1. Go to your Supabase project dashboard
  2. Navigate to **SQL Editor**
  3. Click **New Query**
  4. Copy the entire contents of `006_create_audit_logs_table.sql`
  5. Paste and click **Run**

- Option B (Command Line):
  ```bash
  psql -h your-db-host -U postgres -d your-db-name -f src/db/migrations/006_create_audit_logs_table.sql
  ```

**What it does**: Creates `api_access_logs` table to track API access

---

### 2. 🔄 **Restart Your Server** (REQUIRED)

After applying migrations, restart your development server:

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run serve
```

Or if using dev mode:
```bash
npm run dev
```

**Why**: The new code needs to be loaded for the security fixes to work.

---

## Optional: Verification Steps

### 3. ✅ **Test Rate Limiting** (Optional)

Test that rate limiting is working:

```bash
# Make 21 requests quickly (21st should fail)
for i in {1..21}; do
  curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/sandbox/people
  echo "Request $i"
done
```

**Expected**: 
- Requests 1-20: Should succeed (200 OK)
- Request 21: Should fail with 429 (Too Many Requests)

---

### 4. ✅ **Test Audit Logging** (Optional)

1. Make a request to the sandbox endpoint:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/sandbox/people
   ```

2. Check API access logs in Supabase:
   - Go to **Table Editor** → `api_access_logs`
   - You should see a new entry with:
     - Your user ID
     - Endpoint: `/api/sandbox/people`
     - Timestamp
     - Success: `true`

---

### 5. ✅ **Test RLS Protection** (Optional)

The endpoint should now respect RLS policies. If you remove the RLS policy, the endpoint should fail (security by default).

---

## ⚠️ Important Notes

1. **Migrations are REQUIRED**: The code won't work properly without applying both migrations
2. **Server restart is REQUIRED**: New code needs to be loaded
3. **No breaking changes**: Existing functionality remains the same, just more secure
4. **Backward compatible**: All existing API calls will continue to work

---

## 🆘 Troubleshooting

### Issue: "Policy already exists"
- **Solution**: The migration now uses `DROP POLICY IF EXISTS` before creating, so this shouldn't happen
- **Fix**: If you still see this error, the migration has already been applied - you can skip it

### Issue: "Table api_access_logs already exists"
- **Solution**: The migration uses `CREATE TABLE IF NOT EXISTS` so this shouldn't happen
- **Fix**: If it does, the table already exists and you can skip this migration

### Issue: Rate limiting not working
- **Check**: Make sure server was restarted after code changes
- **Check**: Verify `express-rate-limit` is installed: `npm list express-rate-limit`

### Issue: API access logs not appearing
- **Check**: Verify `api_access_logs` table was created successfully
- **Check**: Check server logs for any errors
- **Note**: API access logging is non-blocking, so errors won't break the API

---

## ✅ Completion Checklist

- [ ] Applied migration `005_add_permissive_users_read_policy.sql`
- [ ] Applied migration `006_create_audit_logs_table.sql`
- [ ] Restarted server
- [ ] (Optional) Tested rate limiting
- [ ] (Optional) Verified audit logging
- [ ] (Optional) Tested sandbox endpoint works

---

**Once migrations are applied and server is restarted, all security fixes are active!** 🎉

