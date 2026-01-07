# Migration Guide: Moving to Secure API Architecture

This guide helps you migrate existing code to use the new secure API architecture.

## Quick Reference

### Before (Direct Client Write - Insecure)
```typescript
// ❌ Direct write from client
const { error } = await db
  .from('users')
  .update({ full_name: 'John' })
  .eq('id', userId)
  .execute();
```

### After (API Write - Secure)
```typescript
// ✅ Use API client
import { apiClient } from './utils/api-client.js';
const { error } = await apiClient.users.updateMe({ full_name: 'John' });
```

## Migration Steps

### Step 1: Update User Operations

**Find:**
```typescript
db.from('users').update(...)
db.from('users').insert(...)
db.from('users').delete(...)
```

**Replace with:**
```typescript
apiClient.users.updateMe(...)
apiClient.users.create(...)
// Note: Delete operations should go through API if needed
```

### Step 2: Update Notification Operations

**Find:**
```typescript
db.from('notifications').insert(...)
db.from('notifications').update(...)
db.from('notifications').delete(...)
```

**Replace with:**
```typescript
apiClient.notifications.create(...)
apiClient.notifications.update(id, updates)
apiClient.notifications.delete(id)
```

### Step 3: Update Subscription Operations

**Find:**
```typescript
db.from('notification_subscriptions').insert(...)
db.from('notification_subscriptions').delete(...)
```

**Replace with:**
```typescript
apiClient.subscriptions.create(...)
apiClient.subscriptions.delete(id)
```

### Step 4: Keep Reads Client-Side

**Keep as-is (RLS protects these):**
```typescript
// ✅ Reads are fine - RLS enforces security
const { data } = await db
  .from('users')
  .select('*')
  .eq('id', userId)
  .single()
  .execute();
```

## Common Patterns

### Pattern 1: Update User Profile

**Before:**
```typescript
const { error } = await db
  .from('users')
  .update({ full_name: newName })
  .eq('id', userId)
  .execute();
```

**After:**
```typescript
const { error } = await apiClient.users.updateMe({ full_name: newName });
```

### Pattern 2: Create Notification

**Before:**
```typescript
const { error } = await db
  .from('notifications')
  .insert({
    user_id: userId,
    title: 'New Message',
    body: 'You have a new message',
  })
  .execute();
```

**After:**
```typescript
const { error } = await apiClient.notifications.create({
  title: 'New Message',
  body: 'You have a new message',
});
```

### Pattern 3: Get Notifications

**Before:**
```typescript
const { data } = await db
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .execute();
```

**After (Option 1 - API):**
```typescript
const { data } = await apiClient.notifications.getAll({
  limit: 50,
  offset: 0,
});
```

**After (Option 2 - Keep Direct, RLS Protected):**
```typescript
// ✅ Still works - RLS ensures user only sees their notifications
const { data } = await db
  .from('notifications')
  .select('*')
  .order('created_at', { ascending: false })
  .execute();
```

## Error Handling

### API Client Errors

```typescript
const { data, error } = await apiClient.users.updateMe({ full_name: 'John' });

if (error) {
  if (error.code === 'AUTH_REQUIRED') {
    // Redirect to login
  } else if (error.code === 'NETWORK_ERROR') {
    // Handle network error
  } else {
    // Handle other errors
    console.error('Update failed:', error.message);
  }
}
```

## Testing

### Test with Valid Token
```typescript
// Token is automatically included from Supabase session
const { data } = await apiClient.users.getMe();
```

### Test Error Cases
```typescript
// API client handles auth errors automatically
// Test with expired/invalid tokens
```

## Benefits

✅ **Security**: Server-side validation and RLS
✅ **Consistency**: Centralized business logic
✅ **Maintainability**: Easier to update validation rules
✅ **Audit Trail**: Server-side logging
✅ **Performance**: Reads still fast (direct connection)

## Need Help?

- See `ARCHITECTURE.md` for full architecture details
- See `src/utils/api-client.ts` for API client implementation
- See `src/api/routes/` for API endpoint examples

