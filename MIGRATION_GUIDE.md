# Supabase Data & Schema Migration Guide

This guide will help you migrate **only** the schema and data from your existing Supabase project to a new project.

## Prerequisites
- ✅ Supabase CLI installed (already done!)
- Your existing Supabase project URL and database password
- Access to create a new Supabase project

---

## Step 1: Link to Your Existing (Source) Project

First, we'll connect to your existing project to export the data:

```bash
# Link to your existing Supabase project
supabase link --project-ref YOUR_EXISTING_PROJECT_REF
```

**How to find your project ref:**
- Go to your Supabase Dashboard
- Select your existing project
- The project ref is in the URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`
- Or go to Settings → General → Reference ID

**Example:**
```bash
supabase link --project-ref abcdefghijklmnop
```

You'll be prompted for your database password. Enter the password you set when creating the project.

---

## Step 2: Export the Schema

Export the database schema (table structures, relationships, functions, etc.):

```bash
# Export schema to a SQL file
supabase db dump --schema public -f schema.sql
```

This creates a `schema.sql` file with all your table definitions, indexes, constraints, etc.

---

## Step 3: Export the Data

Export all the data from your tables:

```bash
# Export data to a SQL file
supabase db dump --data-only -f data.sql
```

This creates a `data.sql` file with all INSERT statements for your data.

**Alternative: Export both schema and data together:**
```bash
# Export everything in one file
supabase db dump -f full_backup.sql
```

---

## Step 4: Create Your New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in:
   - Organization
   - Project name
   - Database password (save this!)
   - Region
4. Wait for the project to be created (2-3 minutes)

---

## Step 5: Link to Your New (Destination) Project

```bash
# Unlink from the old project first (optional, but cleaner)
supabase unlink

# Link to your new project
supabase link --project-ref YOUR_NEW_PROJECT_REF
```

Enter the database password for your **new** project when prompted.

---

## Step 6: Import the Schema to New Project

```bash
# Import the schema
supabase db push --file schema.sql
```

Or if you exported everything together:
```bash
# Import everything
supabase db push --file full_backup.sql
```

**Note:** If you get errors about existing tables, you can use:
```bash
# Reset the database first (WARNING: This deletes everything in the new project!)
supabase db reset

# Then import
supabase db push --file schema.sql
```

---

## Step 7: Import the Data to New Project

If you exported data separately:

```bash
# Import the data
supabase db push --file data.sql
```

---

## Step 8: Verify the Migration

Check that everything was migrated correctly:

```bash
# Check tables
supabase db diff

# Or connect and query
supabase db remote
```

You can also check in the Supabase Dashboard:
- Go to Table Editor
- Verify all tables exist
- Check that data is present

---

## Alternative: Using pg_dump (More Reliable for Large Databases)

If you have a large database or want more control, you can use `pg_dump` directly:

### Export from old project:
```bash
# Get connection string from Supabase Dashboard
# Settings → Database → Connection string → URI

# Export schema only
pg_dump "postgresql://postgres:[PASSWORD]@db.[OLD_PROJECT_REF].supabase.co:5432/postgres" \
  --schema-only --no-owner --no-acl -f schema.sql

# Export data only
pg_dump "postgresql://postgres:[PASSWORD]@db.[OLD_PROJECT_REF].supabase.co:5432/postgres" \
  --data-only --no-owner --no-acl -f data.sql
```

### Import to new project:
```bash
# Import schema
psql "postgresql://postgres:[PASSWORD]@db.[NEW_PROJECT_REF].supabase.co:5432/postgres" \
  -f schema.sql

# Import data
psql "postgresql://postgres:[PASSWORD]@db.[NEW_PROJECT_REF].supabase.co:5432/postgres" \
  -f data.sql
```

---

## Troubleshooting

### Issue: "Connection refused" or authentication errors
- Double-check your project ref
- Verify your database password
- Make sure your IP is allowed (check Supabase Dashboard → Settings → Database)

### Issue: Foreign key constraint errors during data import
- Import tables in the correct order (parent tables before child tables)
- Or temporarily disable foreign key checks:
  ```sql
  SET session_replication_role = 'replica';
  -- Run your INSERT statements
  SET session_replication_role = 'origin';
  ```

### Issue: Large database takes too long
- Use `pg_dump` with compression: `pg_dump ... | gzip > backup.sql.gz`
- Import in smaller batches if needed

---

## What Gets Migrated vs. What Doesn't

### ✅ Migrated (Schema & Data):
- All tables and their structures
- All data (rows)
- Indexes
- Foreign keys and constraints
- Functions and triggers
- Sequences

### ❌ NOT Migrated (Settings):
- Auth users and sessions
- Storage buckets and files
- Edge Functions
- API keys
- Project settings
- Row Level Security (RLS) policies (unless included in schema)
- Database extensions (need to enable manually)

---

## Quick Reference Commands

```bash
# 1. Link to source project
supabase link --project-ref OLD_PROJECT_REF

# 2. Export schema
supabase db dump --schema public -f schema.sql

# 3. Export data
supabase db dump --data-only -f data.sql

# 4. Link to destination project
supabase link --project-ref NEW_PROJECT_REF

# 5. Import schema
supabase db push --file schema.sql

# 6. Import data
supabase db push --file data.sql
```

---

## Next Steps After Migration

1. **Update your environment variables** with the new project URL and keys
2. **Re-enable extensions** if needed (check Extensions in Dashboard)
3. **Set up RLS policies** if you had them (they might be in schema.sql)
4. **Re-upload storage files** if you need them
5. **Recreate auth users** or migrate them separately if needed
6. **Test your application** with the new project

---

## Need Help?

If you encounter issues:
- Check Supabase CLI docs: https://supabase.com/docs/guides/cli
- Check the error messages - they usually tell you what's wrong
- Verify your connection strings and passwords

