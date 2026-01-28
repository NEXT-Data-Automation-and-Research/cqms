# Environment Variable Setup Guide

This guide explains how to add a new environment variable to the project.

## Quick Steps

### 1. Add to `.env` File

Add your new environment variable to your `.env` file in the project root:

```env
# Your new variable
MY_NEW_VAR=your_value_here
```

**Note:** The `.env` file is already in `.gitignore`, so it won't be committed to version control.

### 2. Determine if Client Access is Needed

**Question:** Does your frontend/client code need to access this variable?

- **YES** → Continue to step 3
- **NO** → You're done! The variable is available server-side via `process.env.MY_NEW_VAR`

### 3. Add to Safe Environment Variables Whitelist

If the client needs access, you must add it to the `SAFE_ENV_VARS` array in **both** of these files:

#### File 1: `api/index.ts`
```typescript
const SAFE_ENV_VARS: string[] = [
  'NODE_ENV',
  'APP_NAME',
  'API_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VAPID_PUBLIC_KEY',
  'MY_NEW_VAR',  // ← Add your variable here
];
```

#### File 2: `src/server-commonjs.ts`
```typescript
const SAFE_ENV_VARS: string[] = [
  'NODE_ENV',
  'APP_NAME',
  'API_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'VAPID_PUBLIC_KEY',
  'MY_NEW_VAR',  // ← Add your variable here
];
```

**⚠️ Security Warning:** Only add variables that are **safe to expose publicly**. Never add:
- Private keys
- Service role keys
- Passwords
- Secrets
- Tokens (unless they're public keys like VAPID_PUBLIC_KEY)

### 4. (Optional) Update Template Files

For documentation purposes, you can add your variable to the template files:

#### `env.template`
Add your variable with a comment explaining its purpose:
```env
# My New Variable Description
MY_NEW_VAR=your_value_here
```

#### `setup-env.js` and `src/setup-env.ts`
If it's a commonly used variable, add it to the `ENV_TEMPLATE` constant in these files.

### 5. (Optional) Update Docker Configuration

If you're using Docker and need the variable in containers, add it to:

#### `docker-compose.yml` (Production)
```yaml
environment:
  - MY_NEW_VAR=${MY_NEW_VAR:-default_value}
```

#### `docker-compose.dev.yml` (Development)
```yaml
environment:
  - MY_NEW_VAR=${MY_NEW_VAR:-default_value}
```

## How It Works

### Server-Side Access

Environment variables are automatically available server-side via `process.env`:

```typescript
// In any server-side file
const myValue = process.env.MY_NEW_VAR;
```

### Client-Side Access

If added to `SAFE_ENV_VARS`, the client can access it via the `/api/env` endpoint:

```typescript
// In client-side code
const response = await fetch('/api/env');
const env = await response.json();
const myValue = env.MY_NEW_VAR;
```

The `/api/env` endpoint only returns variables that are in the `SAFE_ENV_VARS` whitelist for security.

## Examples

### Example 1: Server-Only Variable (No Client Access Needed)

**Use Case:** Database connection string (sensitive, server-only)

1. Add to `.env`:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
```

2. Use in server code:
```typescript
const dbUrl = process.env.DATABASE_URL;
```

**Done!** No need to add to `SAFE_ENV_VARS`.

### Example 2: Public Client Variable

**Use Case:** Public API key for a service (safe to expose)

1. Add to `.env`:
```env
PUBLIC_API_KEY=abc123xyz
```

2. Add to `SAFE_ENV_VARS` in both `api/index.ts` and `src/server-commonjs.ts`:
```typescript
const SAFE_ENV_VARS: string[] = [
  // ... existing vars
  'PUBLIC_API_KEY',
];
```

3. Use in client code:
```typescript
const response = await fetch('/api/env');
const env = await response.json();
const apiKey = env.PUBLIC_API_KEY;
```

## Troubleshooting

### Variable Not Available Client-Side

- ✅ Check it's in your `.env` file
- ✅ Check it's added to `SAFE_ENV_VARS` in **both** files
- ✅ Restart your server (environment variables are loaded at startup)
- ✅ Check the variable name matches exactly (case-sensitive)

### Variable Not Available Server-Side

- ✅ Check it's in your `.env` file
- ✅ Restart your server
- ✅ Check for typos in the variable name
- ✅ Verify `.env` file is in the project root

### Docker Container Not Getting Variable

- ✅ Check it's in your `.env` file
- ✅ Check it's added to `docker-compose.yml` or `docker-compose.dev.yml`
- ✅ Rebuild containers: `docker-compose up --build`

## Security Checklist

Before adding a variable to `SAFE_ENV_VARS`, ask:

- [ ] Is this variable designed to be public?
- [ ] Does it contain any secrets or private keys?
- [ ] Would exposing it compromise security?
- [ ] Is it similar to other variables already in the whitelist?

If you answered "yes" to any security question, **DO NOT** add it to `SAFE_ENV_VARS`.

## Summary Checklist

When adding a new environment variable:

- [ ] Add to `.env` file
- [ ] Determine if client access is needed
- [ ] If client access needed: Add to `SAFE_ENV_VARS` in `api/index.ts`
- [ ] If client access needed: Add to `SAFE_ENV_VARS` in `src/server-commonjs.ts`
- [ ] (Optional) Update `env.template`
- [ ] (Optional) Update Docker configs if using Docker
- [ ] Restart server to load new variable
- [ ] Test that variable is accessible where needed
