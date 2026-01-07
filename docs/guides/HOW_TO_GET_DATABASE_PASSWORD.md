# How to Get Your Supabase Database Password

## Quick Answer

Your Supabase database password can be found or reset in the Supabase Dashboard.

## Step-by-Step Instructions

### Method 1: Find Your Password (If You Remember Setting It)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Sign in to your account

2. **Select Your Project**
   - Click on the project you want to access

3. **Navigate to Database Settings**
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **Database** in the settings menu

4. **Find the Connection String**
   - Scroll down to find **Connection string** or **Connection pooling**
   - The password is in the connection string format:
     ```
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
   - The part between `postgres:` and `@` is your password

### Method 2: Reset Your Password (If You Forgot It)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Sign in to your account

2. **Select Your Project**
   - Click on the project you want to access

3. **Navigate to Database Settings**
   - Click on **Settings** (gear icon) in the left sidebar
   - Click on **Database** in the settings menu

4. **Reset the Password**
   - Look for **Database Password** section
   - Click the **Reset Database Password** button
   - A new password will be generated
   - **⚠️ IMPORTANT:** Copy this password immediately - you won't be able to see it again!
   - Save it securely (password manager, secure note, etc.)

5. **Update Connection Strings**
   - After resetting, you may need to update any applications using the old password
   - The connection string will automatically use the new password

## Visual Guide

```
Supabase Dashboard
  └── Your Project
      └── Settings (⚙️)
          └── Database
              ├── Connection string (contains password)
              └── Reset Database Password (button)
```

## Important Notes

### ⚠️ Security Tips

1. **Never share your database password publicly**
2. **Store it securely** - Use a password manager
3. **Reset if compromised** - If you think someone has your password, reset it immediately
4. **Use environment variables** - Never hardcode passwords in your code

### 🔑 Password Requirements

- Supabase database passwords are auto-generated
- They are typically long and complex (for security)
- You can reset them anytime from the dashboard

### 📝 For Both Projects

You'll need to do this for **both** projects:
- **Source Project** (production) - Your existing project
- **Destination Project** (new) - The project you're migrating to

## Alternative: Using Connection String

If you have the full connection string, you can extract the password:

```
postgresql://postgres:YOUR_PASSWORD_HERE@db.abcdefghijklmnop.supabase.co:5432/postgres
                                    ↑
                            This is your password
```

## Troubleshooting

### "Password authentication failed"
- Make sure you copied the password correctly (no extra spaces)
- Try resetting the password and using the new one
- Check if you're using the correct project

### "Can't find the password"
- Look in Settings → Database → Connection string
- If you can't find it, just reset it (Method 2 above)

### "I reset it but can't see it"
- After resetting, the password is shown only once
- If you missed it, reset it again
- Make sure to copy it immediately

## Quick Links

- **Supabase Dashboard**: https://app.supabase.com
- **Supabase Docs**: https://supabase.com/docs/guides/database/connecting-to-postgres

---

**Remember:** The database password is different from:
- Your Supabase account password
- Your project API keys (anon key, service role key)
- Your GitHub/Google OAuth passwords

The database password is specifically for connecting to the PostgreSQL database directly.

