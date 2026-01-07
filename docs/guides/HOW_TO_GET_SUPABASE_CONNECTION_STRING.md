# How to Get Supabase Connection String and Password

This guide will help you get the PostgreSQL connection string and database password from your Supabase project.

## 📋 Prerequisites

- Access to your Supabase project dashboard
- Admin access to the project

---

## 🔑 Method 1: Get Connection String from Dashboard (Easiest)

### Step 1: Open Your Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project

### Step 2: Navigate to Database Settings

1. Click on **Settings** (gear icon) in the left sidebar
2. Click on **Database** in the settings menu

### Step 3: Get Connection String

1. Scroll down to **Connection string** section
2. You'll see different connection string formats
3. **Select "URI"** format - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

### Step 4: Get Your Password

The connection string shows `[YOUR-PASSWORD]` as a placeholder. To get your actual password:

1. In the same **Database** settings page
2. Look for **Database password** section
3. If you see "Reset database password" button, you may need to reset it
4. Or check if you saved it when creating the project

**⚠️ Important:** If you don't remember your password, you'll need to reset it.

---

## 🔐 Method 2: Reset Database Password (If You Forgot It)

### Step 1: Go to Database Settings

1. Supabase Dashboard → Your Project → **Settings** → **Database**

### Step 2: Reset Password

1. Find **Database password** section
2. Click **Reset database password** button
3. **Copy the new password immediately** (you won't be able to see it again!)
4. Save it securely

### Step 3: Build Connection String

Now you can build your connection string:

```
postgresql://postgres:[NEW-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

Replace:
- `[NEW-PASSWORD]` with the password you just reset
- `[PROJECT-REF]` with your project reference ID (found in the connection string or in Settings → General)

---

## 📝 Method 3: Get Components Separately

If you prefer to get each component separately:

### Project Reference ID

1. Go to **Settings** → **General**
2. Find **Reference ID** - it's a long string like `abcdefghijklmnop`

### Database Host

- Format: `db.[PROJECT-REF].supabase.co`
- Example: `db.abcdefghijklmnop.supabase.co`

### Port

- Default: `5432`

### Database Name

- Default: `postgres`

### Username

- Default: `postgres`

### Password

- Get from **Settings** → **Database** → **Database password**
- Or reset it if you forgot

### Build Connection String

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## 🔍 Quick Reference: Where to Find Everything

| Item | Location |
|------|----------|
| **Connection String (URI)** | Settings → Database → Connection string → URI |
| **Database Password** | Settings → Database → Database password |
| **Project Reference ID** | Settings → General → Reference ID |
| **Database Host** | `db.[PROJECT-REF].supabase.co` |
| **Port** | `5432` (default) |
| **Database Name** | `postgres` (default) |
| **Username** | `postgres` (default) |

---

## 📋 Example Connection String

Here's what a complete connection string looks like:

```
postgresql://postgres:MySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres
```

Breaking it down:
- `postgresql://` - Protocol
- `postgres` - Username
- `MySecurePassword123` - Password
- `db.abcdefghijklmnop.supabase.co` - Host
- `5432` - Port
- `postgres` - Database name

---

## ⚠️ Security Notes

1. **Never commit connection strings to Git** - They contain your password!
2. **Use environment variables** or secure storage for connection strings
3. **Reset password** if you suspect it's been compromised
4. **Use service role key** for server-side operations (not anon key)
5. **Connection strings are sensitive** - treat them like passwords

---

## 🛠️ Using with the Migration CLI Tool

### Option 1: Interactive Mode

Run the tool without arguments - it will prompt you:

```bash
python supabase-migration-cli.py
```

Then enter your connection strings when prompted.

### Option 2: Command Line Arguments

```bash
python supabase-migration-cli.py \
  --source "postgresql://postgres:[PASSWORD]@db.[SOURCE-REF].supabase.co:5432/postgres" \
  --dest "postgresql://postgres:[PASSWORD]@db.[DEST-REF].supabase.co:5432/postgres"
```

### Option 3: Environment Variables (Recommended)

Create a `.env` file (don't commit it!):

```env
SOURCE_DB=postgresql://postgres:[PASSWORD]@db.[SOURCE-REF].supabase.co:5432/postgres
DEST_DB=postgresql://postgres:[PASSWORD]@db.[DEST-REF].supabase.co:5432/postgres
```

Then modify the script to read from environment variables.

---

## 🆘 Troubleshooting

### "Connection refused" or "Could not connect"

- Check your IP is allowed in Supabase Dashboard → Settings → Database → Connection pooling
- Verify the connection string format is correct
- Check if your password has special characters (may need URL encoding)

### "Password authentication failed"

- Double-check your password
- Reset the database password if needed
- Make sure you're using the database password, not the API key

### "Relation does not exist"

- This is normal if the table doesn't exist yet
- Check table names are correct
- Verify you're connected to the right database

### Special Characters in Password

If your password contains special characters, you may need to URL-encode them:
- `@` becomes `%40`
- `#` becomes `%23`
- `$` becomes `%24`
- etc.

Or use the interactive mode which handles this automatically.

---

## 📚 Additional Resources

- [Supabase Database Docs](https://supabase.com/docs/guides/database)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Supabase Dashboard](https://app.supabase.com)

---

## ✅ Quick Checklist

Before running the migration tool, make sure you have:

- [ ] Source Supabase project connection string
- [ ] Destination Supabase project connection string
- [ ] Database passwords for both projects
- [ ] Network access (IP whitelist if required)
- [ ] List of tables you want to migrate (optional)

---

**Need help?** Check the Supabase documentation or community forums.




