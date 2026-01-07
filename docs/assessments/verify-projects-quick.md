# Quick Project Verification Guide

Since the MCP connection might not be configured, here's how to manually verify your projects:

## Method 1: Verify via Supabase Dashboard

1. **Go to Supabase Dashboard**: https://app.supabase.com
2. **Check your projects**:
   - Look for projects named:
     - **"source supabase"** (or similar)
     - **"Destination supabase"** (or similar)
3. **For each project, note**:
   - **Project Reference ID**: Settings → General → Reference ID
   - **Database Password**: Settings → Database → Connection string (or reset it)

## Method 2: Use the Verification Script

Run the verification script I created:

```bash
node verify-projects.js
```

This will prompt you for:
- Source project reference ID
- Source database password
- Destination project reference ID
- Destination database password

It will verify the format and help confirm both projects.

## Method 3: Quick Checklist

✅ **Source Project (Production)**:
- [ ] Project name contains "source" or "production"
- [ ] Has your production data
- [ ] Project Reference ID: `_____________`
- [ ] Database Password: `_____________`

✅ **Destination Project (New)**:
- [ ] Project name contains "destination" or "new"
- [ ] Is empty or has test data
- [ ] Project Reference ID: `_____________`
- [ ] Database Password: `_____________`

## Finding Project Reference ID

1. Go to Supabase Dashboard
2. Click on your project
3. Go to **Settings** → **General**
4. Find **Reference ID** (looks like: `abcdefghijklmnop`)

## Finding Database Password

1. Go to Supabase Dashboard
2. Click on your project
3. Go to **Settings** → **Database**
4. Look for **Connection string** or click **Reset Database Password**

---

**Once you have both project details, you can use them in the migration tool!**




