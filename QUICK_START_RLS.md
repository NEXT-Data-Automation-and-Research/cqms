# Quick Start: Apply RLS Migration

## 🚀 Fastest Method (Recommended)

### Step 1: Open Supabase Dashboard
Go to [https://app.supabase.com](https://app.supabase.com) → Your Project

### Step 2: Open SQL Editor
Click "SQL Editor" → "New query"

### Step 3: Copy & Paste
1. Open: `src/db/migrations/004_enable_rls_policies.sql`
2. Copy all contents (Ctrl+A, Ctrl+C)
3. Paste into SQL Editor (Ctrl+V)
4. Click "Run" (or Ctrl+Enter)

### Step 4: Done! ✅
RLS is now enabled on all tables.

---

## 📋 Alternative: Command Line

### Windows
```powershell
.\scripts\apply-rls.ps1
```

### Linux/Mac
```bash
chmod +x scripts/apply-rls.sh
./scripts/apply-rls.sh
```

---

## ✅ Verify It Worked

1. Go to Supabase Dashboard → Table Editor
2. Select `users` table
3. Look for "RLS enabled" badge ✅

---

## 🔧 What You Need

- **Project Reference ID**: Settings → General → Reference ID
- **Database Password**: Settings → Database → (reset if needed)

---

## 📚 Full Guide

See `APPLY_RLS_MIGRATION.md` for detailed instructions and troubleshooting.

