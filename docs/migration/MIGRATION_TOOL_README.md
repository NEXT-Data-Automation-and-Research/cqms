# 🚀 Supabase Migration Tool - Quick Start Guide

## Overview

This is a **safe, read-only** migration tool with a beautiful GUI that helps you migrate data and schema from one Supabase project to another. 

**🔒 Safety First:** All operations on your source (production) database are **READ-ONLY**. Your production database will never be modified.

## Features

- ✅ **Safe & Read-Only** - Source database is never modified
- ✅ **Beautiful GUI** - Easy-to-use web interface
- ✅ **Real-time Progress** - See migration progress in real-time
- ✅ **Batch Processing** - Handles large databases efficiently
- ✅ **Error Handling** - Clear error messages and recovery
- ✅ **Skip Existing** - Option to skip tables that already exist

## How to Use

### Step 1: Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:4000`

### Step 2: Open the Migration Tool

Open your browser and navigate to:
```
http://localhost:4000/migration-tool.html
```

### Step 3: Enter Your Project Details

**Source Database (Production - READ-ONLY):**
- **Project Reference ID**: Find this in Supabase Dashboard → Settings → General → Reference ID
- **Database Password**: The password you set when creating the project

**Destination Database (New Project):**
- **Project Reference ID**: Your new Supabase project reference ID
- **Database Password**: The password for your new project

### Step 4: Test Connections

Click **"🧪 Test Connections"** to verify:
- You can connect to the source database (read-only)
- You can connect to the destination database

### Step 5: Start Migration

1. Click **"🚀 Start Migration"**
2. Confirm the migration
3. Watch the progress in real-time!

## What Gets Migrated

### ✅ Migrated:
- All tables and their structures
- All data (rows)
- Indexes
- Foreign keys and constraints
- Sequences

### ❌ NOT Migrated:
- Auth users and sessions
- Storage buckets and files
- Edge Functions
- API keys
- Project settings
- Row Level Security (RLS) policies (unless included in schema)
- Database extensions (need to enable manually)

## Options

- **Skip Existing Tables**: If checked, tables that already exist in the destination will be skipped. Useful for resuming failed migrations.

## Troubleshooting

### Connection Errors

**"Connection refused" or authentication errors:**
- Double-check your project reference IDs
- Verify your database passwords
- Make sure your IP is allowed (check Supabase Dashboard → Settings → Database → Connection Pooling)

### Large Databases

For very large databases:
- The tool processes data in batches (1000 rows at a time)
- Progress is shown in real-time
- You can stop and resume if needed

### Foreign Key Errors

If you get foreign key constraint errors:
- Make sure the schema is migrated first
- The tool tries to handle dependencies automatically
- You may need to disable foreign key checks temporarily in your destination database

## API Endpoints

The tool also provides REST API endpoints if you want to automate:

- `POST /api/migration/test-connections` - Test database connections
- `POST /api/migration/start` - Start migration
- `GET /api/migration/progress` - Get migration progress
- `POST /api/migration/stop` - Stop migration
- `POST /api/migration/reset` - Reset migration state

## Security Notes

1. **Source Database is READ-ONLY**: The tool only performs SELECT queries on the source database
2. **Passwords**: Passwords are sent to the server but never logged or stored
3. **No Data Modification**: The source database is never modified in any way
4. **Connection Security**: Uses SSL/TLS connections to Supabase

## Example Usage

1. **Production Project**: `abcdefghijklmnop` (password: `myprodpass`)
2. **New Project**: `xyzabcdefghijkl` (password: `mynewpass`)

Enter these in the form, test connections, then start migration!

## Need Help?

- Check the browser console for detailed error messages
- Verify your project reference IDs and passwords
- Make sure both projects are accessible from your network
- Check Supabase Dashboard for any connection restrictions

---

**Remember:** This tool is designed to be safe. Your production database will never be modified. All source operations are read-only! 🔒

