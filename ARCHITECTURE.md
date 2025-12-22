# Architecture Documentation

## Overview

This application uses a **hybrid architecture** that combines:
- **Client-side reads** with Row Level Security (RLS) for performance
- **Server-side writes** via API for security and validation
- **Supabase** as the database with proper security policies

## Security Architecture

### Row Level Security (RLS)

All tables have RLS enabled with appropriate policies:

- **Users**: Users can only access their own data
- **Notifications**: Users can only access their own notifications
- **Notification Subscriptions**: Users can only manage their own subscriptions
- **Scorecards**: Authenticated users can access (if exists)

RLS policies are enforced at the database level and cannot be bypassed by client-side code.

### Authentication

- **Client-side**: Uses Supabase anon key with RLS (for reads)
- **Server-side**: Uses Supabase service role key (for writes, bypasses RLS)
- **API**: JWT tokens verified on every request

## API Structure

### Server-Side API Routes

All write operations go through server-side APIs:

```
/api/users
  GET    /me              - Get current user
  PUT    /me              - Update current user
  POST   /                - Create user profile

/api/notifications
  GET    /                - Get user's notifications
  POST   /                - Create notification
  PATCH  /:id             - Update notification
  DELETE /:id             - Delete notification

/api/notification-subscriptions
  GET    /                - Get subscriptions
  POST   /                - Create subscription
  DELETE /:id             - Delete subscription
```

### Client-Side API Client

Use the `apiClient` utility for easy API access:

```typescript
import { apiClient } from './utils/api-client.js';

// Get current user
const { data: user, error } = await apiClient.users.getMe();

// Update user
await apiClient.users.updateMe({ full_name: 'John Doe' });

// Get notifications
const { data: notifications } = await apiClient.notifications.getAll();

// Create notification
await apiClient.notifications.create({
  title: 'New Message',
  body: 'You have a new message',
  type: 'info',
});
```

## Database Access Patterns

### ✅ Client-Side (Reads Only)

Use direct Supabase client for read operations:

```typescript
import { DatabaseFactory } from './infrastructure/database-factory.js';

const db = DatabaseFactory.createClient();

// Read operations (RLS enforced)
const { data, error } = await db
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
  .execute();
```

### ✅ Server-Side (Writes)

Use API client for write operations:

```typescript
import { apiClient } from './utils/api-client.js';

// Write operations (server-side validation)
await apiClient.users.updateMe({ full_name: 'John Doe' });
```

## Environment Variables

### Required

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # Server-side only
```

### Security Notes

- **ANON_KEY**: Safe to expose to client (used with RLS)
- **SERVICE_ROLE_KEY**: NEVER expose to client (server-side only)
- Service role key bypasses RLS - use only in server code

## Migration Guide

### Running RLS Migration

Apply the RLS policies migration:

```sql
-- Run migration 004_enable_rls_policies.sql
-- This enables RLS and creates security policies
```

### Updating Existing Code

1. **Reads**: Keep using direct Supabase client (RLS will protect)
2. **Writes**: Migrate to API client:

```typescript
// Before (direct write - not secure)
await db.from('users').update({ full_name: 'John' }).eq('id', userId).execute();

// After (API write - secure)
await apiClient.users.updateMe({ full_name: 'John' });
```

## Best Practices

### ✅ DO

- Use API client for all write operations
- Use direct Supabase client for read operations
- Always validate input on server-side
- Use RLS policies for data access control
- Keep service role key secret

### ❌ DON'T

- Never expose service role key to client
- Don't bypass RLS without good reason
- Don't do writes directly from client (use API)
- Don't trust client-side validation alone

## Development

### Adding New API Endpoints

1. Create route file in `src/api/routes/`
2. Add authentication middleware
3. Add validation
4. Use server Supabase client
5. Register route in `server-commonjs.ts`

Example:

```typescript
// src/api/routes/my-feature.routes.ts
import { Router } from 'express';
import { verifyAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { getServerSupabase } from '../../core/config/server-supabase.js';

const router = Router();

router.post('/', verifyAuth, async (req: AuthenticatedRequest, res) => {
  const supabase = getServerSupabase();
  // ... implementation
});

export default router;
```

### Testing

- Test with valid JWT tokens
- Test with invalid/expired tokens
- Test RLS policies
- Test validation errors

## Security Checklist

- [x] RLS enabled on all tables
- [x] RLS policies created
- [x] Service role key secured (server-side only)
- [x] API authentication middleware
- [x] Input validation on server
- [x] Error handling middleware
- [x] Audit logging (to be implemented)

## Performance

- **Reads**: Fast (direct client connection, RLS enforced)
- **Writes**: Secure (server-side API, validated)
- **Caching**: Client-side caching for reads
- **Real-time**: Supabase real-time subscriptions work with RLS

## Compliance

- All data access logged (via Supabase)
- RLS provides database-level security
- Server-side validation ensures data integrity
- Audit trail for sensitive operations

