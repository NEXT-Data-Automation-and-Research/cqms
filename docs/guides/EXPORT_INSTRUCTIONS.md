# Database Export Instructions

## Quick Export

To export the database locally with the `users` table renamed to `people`:

### Step 1: Set Database Password

**Windows PowerShell:**
```powershell
$env:SOURCE_DB_PASSWORD="your-database-password"
```

**Windows CMD:**
```cmd
set SOURCE_DB_PASSWORD=your-database-password
```

**Linux/Mac:**
```bash
export SOURCE_DB_PASSWORD="your-database-password"
```

### Step 2: Run Export Script

```bash
node export-database-local.js
```

## What Gets Exported

✅ **Schema** (`schema.sql`):
- All table structures
- Primary keys
- Foreign keys
- Constraints
- Indexes
- **`users` table renamed to `people`**

✅ **Data** (`data.sql`):
- All rows from all tables
- **`users` table data inserted into `people` table**

❌ **NOT Exported**:
- Auth settings
- Storage buckets
- Edge Functions
- API keys
- Project settings
- RLS policies (unless included in schema)

## Output Location

All files will be saved to: `db-migration-data/`

- `schema.sql` - Database schema
- `data.sql` - All data as INSERT statements

## Table Rename

The script automatically:
- Renames `users` table to `people` in schema
- Inserts `users` data into `people` table
- Updates all foreign key references

## Verification

After export, you can verify:
1. Check file sizes (should be > 0)
2. Open `schema.sql` and search for "people" (should exist)
3. Open `data.sql` and search for "INSERT INTO people" (should exist)

## Troubleshooting

**Error: "Please set SOURCE_DB_PASSWORD"**
- Make sure you set the environment variable before running the script

**Error: "Connection refused"**
- Check your database password
- Verify project reference ID
- Check if your IP is allowed in Supabase Dashboard

**Error: "Permission denied"**
- Make sure you have read access to the database
- Check Supabase Dashboard → Settings → Database

---

**Note:** This is a READ-ONLY operation. Your production database will not be modified.




