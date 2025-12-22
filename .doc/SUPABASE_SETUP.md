# Supabase Configuration Guide

This guide explains how to configure Supabase for your serverless website.

## 📦 Package Installation

Supabase has been added to your `package.json`. Install it by running:

```bash
npm install
```

## 🔧 Configuration Steps

### 1. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2. Configure Environment Variables

Edit your `.env` file in the `migration` directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important Notes:**
- ✅ The `SUPABASE_ANON_KEY` is **safe to expose** to the client (it's designed for public use)
- ✅ The `SUPABASE_URL` is also public
- ❌ Never expose your `SUPABASE_SERVICE_ROLE_KEY` (this is server-only)

### 3. Restart Your Development Server

After updating `.env`, restart your server:

```bash
npm run dev
```

The server will expose these variables to the client via the `/api/env` endpoint.

## 🚀 Usage in Your Code

### Option 1: Using the Initialization Utility (Recommended)

```typescript
import { initSupabase, getSupabase } from './utils/supabase-init';

// Initialize Supabase (call once when app loads)
await initSupabase();

// Get the client
const supabase = getSupabase();

// Use Supabase
const { data, error } = await supabase
  .from('users')
  .select('*');
```

### Option 2: Direct Import (After Build)

```typescript
import { supabase } from './config/supabase';

// Use directly
const { data, error } = await supabase
  .from('users')
  .select('*');
```

### Option 3: Browser Usage (HTML/JavaScript)

```html
<script type="module">
  import { initSupabase, getSupabase } from './js/utils/supabase-init.js';
  
  // Initialize
  await initSupabase();
  
  // Use
  const supabase = getSupabase();
  const { data } = await supabase.from('users').select('*');
</script>
```

## 🔐 Authentication Example

### Google Sign-In (Recommended)

```typescript
import { signInWithGoogle, signOut, getUserInfo } from './utils/auth';

// Sign in with Google
await signInWithGoogle();
// User will be redirected to Google, then back to your app

// Get current user
const user = await getUserInfo();
console.log('User:', user?.email, user?.name);

// Sign out
await signOut();
```

### Email/Password (Alternative)

```typescript
import { initSupabase, getSupabase } from './utils/supabase-init';

await initSupabase();
const supabase = getSupabase();

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
await supabase.auth.signOut();

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

### Dev Bypass (Testing Only)

```typescript
import { enableDevBypassAuthentication } from './utils/auth';

// Enable dev mode first
localStorage.setItem('isDev', 'true');

// Bypass authentication with test email
enableDevBypassAuthentication('test@example.com');
```

**See [AUTHENTICATION.md](./AUTHENTICATION.md) for complete authentication guide.**

## 📊 Database Query Example

```typescript
const supabase = getSupabase();

// Select data
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'active');

// Insert data
const { data, error } = await supabase
  .from('users')
  .insert([
    { name: 'John', email: 'john@example.com' }
  ]);

// Update data
const { data, error } = await supabase
  .from('users')
  .update({ name: 'Jane' })
  .eq('id', 1);

// Delete data
const { data, error } = await supabase
  .from('users')
  .delete()
  .eq('id', 1);
```

## 🛡️ Security Best Practices

1. **Row Level Security (RLS)**: Always enable RLS on your Supabase tables
2. **Policies**: Create policies to control who can read/write data
3. **Never expose service role key**: Only use `anon` key on the client
4. **Validate on server**: For sensitive operations, use Supabase Edge Functions

## 📁 File Structure

```
migration/
├── src/
│   ├── config/
│   │   ├── supabase.ts          # TypeScript config (for build)
│   │   └── supabase-client.ts   # Browser config
│   └── utils/
│       └── supabase-init.ts      # Initialization utility (recommended)
├── .env                         # Your Supabase credentials
└── SUPABASE_SETUP.md           # This file
```

## 🔄 How It Works (Serverless)

1. **Server exposes config**: The Express server reads `.env` and exposes safe variables via `/api/env`
2. **Client fetches config**: Your client-side code fetches the config from the API
3. **Supabase client created**: The client creates a Supabase instance using the public keys
4. **Direct database access**: The client communicates directly with Supabase (no backend needed)

## ✅ Verification

To verify your setup is working:

1. Check browser console for: `✅ Supabase client initialized successfully`
2. Try a simple query:
   ```typescript
   const { data, error } = await supabase.from('your_table').select('*').limit(1);
   console.log('Supabase test:', { data, error });
   ```

## 🆘 Troubleshooting

**Issue**: "Supabase configuration missing"
- **Solution**: Make sure `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- **Solution**: Restart your dev server after updating `.env`

**Issue**: "CORS errors"
- **Solution**: Check your Supabase project settings for allowed origins
- **Solution**: Add your localhost URL to Supabase dashboard → Settings → API → CORS

**Issue**: "Authentication not working"
- **Solution**: Check that RLS policies allow the operation
- **Solution**: Verify the user is authenticated: `await supabase.auth.getUser()`

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

