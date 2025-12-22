# Authenticated Supabase Helper - Usage Guide

## Overview

The **Authenticated Supabase Helper** is the **ONLY** way to access Supabase in this application. It enforces authentication on every database operation, ensuring no unauthenticated calls can be made.

## Critical Rule

**ALL Supabase database calls MUST use `getAuthenticatedSupabase()`. Direct Supabase client access is FORBIDDEN.**

## Quick Start

```typescript
import { getAuthenticatedSupabase } from './utils/authenticated-supabase.js';

// Get authenticated client
const supabase = await getAuthenticatedSupabase();

// Use it like normal Supabase client
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId);
```

## Features

### ✅ Automatic Authentication Verification
- Verifies user authentication before every database operation
- Caches authentication status for 30 seconds (performance optimization)
- Automatically clears cache on authentication errors

### ✅ Secure by Default
- All database operations require authentication
- Storage operations require authentication
- Auth methods (login/logout) are allowed

### ✅ Error Handling
- Throws clear errors if user is not authenticated
- Handles Supabase auth errors automatically
- Provides detailed error messages

## Usage Examples

### Basic Query

```typescript
import { getAuthenticatedSupabase } from './utils/authenticated-supabase.js';

async function getUsers() {
  const supabase = await getAuthenticatedSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('*');
  
  if (error) {
    console.error('Error:', error);
    return null;
  }
  
  return data;
}
```

### Insert Operation

```typescript
async function createUser(userData: any) {
  const supabase = await getAuthenticatedSupabase();
  const { data, error } = await supabase
    .from('users')
    .insert(userData)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Update Operation

```typescript
async function updateUser(userId: string, updates: any) {
  const supabase = await getAuthenticatedSupabase();
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
```

### Check Authentication Status

```typescript
import { isUserAuthenticated, getAuthenticatedUserId } from './utils/authenticated-supabase.js';

// Check if user is authenticated
const isAuth = await isUserAuthenticated();

// Get current user ID
const userId = await getAuthenticatedUserId();
```

## What's Protected

### ✅ Protected Operations
- **Database queries**: `select()`, `insert()`, `update()`, `upsert()`, `delete()`
- **Storage operations**: `storage.from(bucket).*`
- **All table access**: `from('table_name')`

### ✅ Allowed Operations
- **Auth methods**: `supabase.auth.*` (login, logout, signup)
- **Server-side**: `getServerSupabase()` (uses service role key)

## Error Handling

### Authentication Required Error

```typescript
try {
  const supabase = await getAuthenticatedSupabase();
  // ... operations
} catch (error: any) {
  if (error.code === 'AUTH_REQUIRED') {
    // User is not authenticated
    // Redirect to login page
    window.location.href = '/src/auth/presentation/auth-page.html';
  }
}
```

### Authentication Failed Error

```typescript
try {
  const supabase = await getAuthenticatedSupabase();
  const { data, error } = await supabase.from('users').select('*');
} catch (error: any) {
  if (error.code === 'AUTH_FAILED') {
    // Token expired or invalid
    // Clear cache and redirect to login
    clearAuthCache();
    window.location.href = '/src/auth/presentation/auth-page.html';
  }
}
```

## Migration Guide

### ❌ Old Way (FORBIDDEN)

```typescript
// DON'T DO THIS
import { getSupabase } from './utils/supabase-init.js';
const supabase = getSupabase();
const { data } = await supabase.from('users').select('*');
```

### ✅ New Way (REQUIRED)

```typescript
// DO THIS INSTEAD
import { getAuthenticatedSupabase } from './utils/authenticated-supabase.js';
const supabase = await getAuthenticatedSupabase();
const { data } = await supabase.from('users').select('*');
```

## Architecture

The helper is split into three modules:

1. **`authenticated-supabase.ts`** (69 lines)
   - Main entry point
   - Exports `getAuthenticatedSupabase()`
   - Helper functions

2. **`authenticated-supabase-auth.ts`** (94 lines)
   - Authentication verification
   - Auth status caching
   - Cache management

3. **`authenticated-supabase-wrappers.ts`** (140 lines)
   - Client wrapper (Proxy)
   - Query builder wrapper
   - Storage wrapper

## Benefits

1. **Security**: All operations require authentication
2. **Consistency**: Single way to access Supabase
3. **Error Prevention**: Prevents accidental unauthenticated calls
4. **Audit Trail**: All operations logged with user context
5. **Performance**: Auth status caching reduces API calls

## Best Practices

1. **Always use the helper**: Never use `getSupabase()` directly
2. **Handle errors**: Always wrap in try-catch for auth errors
3. **Clear cache**: Call `clearAuthCache()` after logout
4. **Check auth first**: Use `isUserAuthenticated()` before operations
5. **Server-side**: Use `getServerSupabase()` for server-side operations

## Troubleshooting

### "Authentication required" error
- User is not logged in
- Session expired
- Solution: Redirect to login page

### "Failed to initialize Supabase client"
- Supabase not initialized
- Solution: Call `initSupabase()` first

### "Authentication failed" error
- Token invalid or expired
- Solution: Clear cache and redirect to login

---

**Remember: This is the ONLY way to access Supabase. All other methods are FORBIDDEN.**

