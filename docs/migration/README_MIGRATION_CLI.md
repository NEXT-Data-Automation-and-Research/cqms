# Supabase Migration CLI Tool

A Python command-line tool to migrate tables and data between Supabase databases.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Or install directly:

```bash
pip install psycopg2-binary
```

### 2. Get Connection Strings

See [HOW_TO_GET_SUPABASE_CONNECTION_STRING.md](./HOW_TO_GET_SUPABASE_CONNECTION_STRING.md) for detailed instructions.

**Quick version:**
1. Go to Supabase Dashboard → Your Project → Settings → Database
2. Copy the **Connection string (URI)** format
3. Replace `[YOUR-PASSWORD]` with your actual database password

### 3. Run the Migration Tool

#### Interactive Mode (Recommended)

```bash
python supabase-migration-cli.py
```

The tool will prompt you for:
- Source database connection string
- Destination database connection string
- Which tables to migrate

#### Command Line Mode

```bash
python supabase-migration-cli.py \
  --source "postgresql://postgres:[PASSWORD]@db.[SOURCE-REF].supabase.co:5432/postgres" \
  --dest "postgresql://postgres:[PASSWORD]@db.[DEST-REF].supabase.co:5432/postgres" \
  --tables users,posts,comments
```

## 📖 Usage Examples

### Migrate All Tables

```bash
python supabase-migration-cli.py
# When prompted, enter 'all' for tables
```

### Migrate Specific Tables

```bash
python supabase-migration-cli.py \
  --source "postgresql://..." \
  --dest "postgresql://..." \
  --tables users,posts,comments
```

### Migrate with Table Renaming

Create a JSON file `mappings.json`:

```json
{
  "old_table_name": "new_table_name",
  "users": "customers",
  "posts": "articles"
}
```

Then run:

```bash
python supabase-migration-cli.py \
  --source "postgresql://..." \
  --dest "postgresql://..." \
  --mappings mappings.json
```

### Skip Existing Tables

```bash
python supabase-migration-cli.py \
  --source "postgresql://..." \
  --dest "postgresql://..." \
  --skip-existing
```

### Custom Batch Size

For large tables, adjust batch size:

```bash
python supabase-migration-cli.py \
  --source "postgresql://..." \
  --dest "postgresql://..." \
  --batch-size 5000
```

## 🔧 Command Line Options

```
Options:
  --source TEXT          Source database connection string
  --dest TEXT            Destination database connection string
  --tables TEXT          Comma-separated list of tables to migrate
  --mappings TEXT        JSON file with table name mappings
  --skip-existing        Skip tables that already exist in destination
  --batch-size INTEGER   Batch size for data migration (default: 1000)
  -h, --help            Show help message
```

## 📋 Features

- ✅ Migrate tables between Supabase databases
- ✅ Select specific tables or migrate all
- ✅ Rename tables during migration
- ✅ Skip existing tables
- ✅ Batch processing for large tables
- ✅ Progress tracking
- ✅ Interactive mode for easy use
- ✅ Command-line mode for automation

## ⚠️ Important Notes

1. **Source database is read-only** - The tool only reads from source, never modifies it
2. **Data is appended** - Uses `ON CONFLICT DO NOTHING` to avoid duplicates
3. **Large tables** - May take time for tables with millions of rows
4. **Network access** - Ensure your IP is allowed in Supabase settings
5. **Password security** - Never commit connection strings to Git

## 🛠️ Troubleshooting

### Connection Issues

- Verify connection strings are correct
- Check IP whitelist in Supabase Dashboard
- Ensure database password is correct

### Permission Issues

- Make sure you're using the database password, not API keys
- Check RLS policies if using anon keys (this tool uses direct DB connection)

### Large Tables

- Increase batch size: `--batch-size 5000`
- Be patient - large migrations take time
- Monitor progress in the output

## 📚 Related Documentation

- [How to Get Connection String](./HOW_TO_GET_SUPABASE_CONNECTION_STRING.md)
- [Supabase Documentation](https://supabase.com/docs)

## 🔒 Security Best Practices

1. Use environment variables for connection strings
2. Never commit `.env` files or connection strings to Git
3. Use separate credentials for source and destination
4. Reset passwords after migration if needed
5. Use `.gitignore` to exclude sensitive files

## 📝 Example `.gitignore` Entry

```
.env
*.env
connection_strings.txt
mappings.json  # If it contains sensitive info
```

## 🆘 Getting Help

1. Check [HOW_TO_GET_SUPABASE_CONNECTION_STRING.md](./HOW_TO_GET_SUPABASE_CONNECTION_STRING.md)
2. Verify your connection strings
3. Check Supabase Dashboard for any restrictions
4. Review error messages for specific issues

---

**Happy Migrating! 🚀**




