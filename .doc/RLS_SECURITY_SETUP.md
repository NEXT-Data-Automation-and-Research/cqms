# Row Level Security (RLS) Setup

## ✅ RLS Enabled

Row Level Security has been enabled on all three tables to protect user data. Users can only access their own data.

## Tables Protected

### 1. `users` Table

**RLS Status:** ✅ Enabled

**Policies:**
- ✅ **Users can view own profile** - SELECT policy
  - Users can only read their own profile (`auth.uid() = id`)
  
- ✅ **Users can update own profile** - UPDATE policy
  - Users can only update their own profile (`auth.uid() = id`)
  
- ✅ **Users can insert own profile** - INSERT policy
  - Users can create their own profile when signing in for the first time (`auth.uid() = id`)
  
- ✅ **Service role can manage users** - ALL operations
  - Backend/service role can manage all users for administrative operations

### 2. `notification_subscriptions` Table

**RLS Status:** ✅ Enabled

**Policies:**
- ✅ **Users can view own subscriptions** - SELECT policy
  - Users can only view their own notification subscriptions (`auth.uid() = user_id`)
  
- ✅ **Users can insert own subscriptions** - INSERT policy
  - Users can create their own notification subscriptions (`auth.uid() = user_id`)
  
- ✅ **Users can update own subscriptions** - UPDATE policy
  - Users can update their own subscriptions (`auth.uid() = user_id`)
  
- ✅ **Users can delete own subscriptions** - DELETE policy
  - Users can delete their own subscriptions (`auth.uid() = user_id`)
  
- ✅ **Service role can manage subscriptions** - ALL operations
  - Backend/service role can manage all subscriptions

### 3. `notifications` Table

**RLS Status:** ✅ Enabled

**Policies:**
- ✅ **Users can view own notifications** - SELECT policy
  - Users can only view their own notifications (`auth.uid() = user_id`)
  
- ✅ **Users can update own notifications** - UPDATE policy
  - Users can update their own notifications (e.g., mark as read) (`auth.uid() = user_id`)
  
- ✅ **Service role can insert notifications** - INSERT policy
  - Backend can create notifications for any user (for sending notifications)
  
- ✅ **Service role can update notifications** - UPDATE policy
  - Backend can update notification status (e.g., mark as sent)

**Note:** Users cannot delete notifications (only mark as read). This preserves notification history.

## Security Model

### User Access
- ✅ Users can only access their own data
- ✅ All queries are automatically filtered by `auth.uid()`
- ✅ No user can access another user's data
- ✅ Policies are enforced at the database level

### Backend Access
- ✅ Service role can manage all data (for backend operations)
- ✅ Backend can send notifications to any user
- ✅ Backend can manage user profiles for administrative tasks

## How It Works

### When User Signs In

1. **User authenticates** with Google OAuth
2. **Supabase creates session** with `auth.uid()`
3. **User profile save** uses authenticated session
4. **RLS policies check** `auth.uid() = id` before allowing INSERT/UPDATE
5. **Only user's own data** can be created/updated

### Example Queries

**User tries to read their own profile:**
```sql
-- This works (auth.uid() = user.id)
SELECT * FROM users WHERE id = auth.uid();
```

**User tries to read another user's profile:**
```sql
-- This is blocked by RLS (auth.uid() ≠ other_user.id)
SELECT * FROM users WHERE id = 'other-user-id';
```

**User creates their profile:**
```sql
-- This works (auth.uid() = new_profile.id)
INSERT INTO users (id, email, ...) 
VALUES (auth.uid(), 'user@example.com', ...);
```

## Testing RLS

### Test 1: User Can Access Own Data
```sql
-- As authenticated user
SELECT * FROM users WHERE id = auth.uid();
-- ✅ Should return user's own data
```

### Test 2: User Cannot Access Other User's Data
```sql
-- As authenticated user
SELECT * FROM users WHERE email = 'other@example.com';
-- ❌ Should return empty (blocked by RLS)
```

### Test 3: User Can Update Own Profile
```sql
-- As authenticated user
UPDATE users 
SET full_name = 'New Name' 
WHERE id = auth.uid();
-- ✅ Should succeed
```

### Test 4: User Cannot Update Other User's Profile
```sql
-- As authenticated user
UPDATE users 
SET full_name = 'Hacked' 
WHERE id = 'other-user-id';
-- ❌ Should fail (0 rows updated, blocked by RLS)
```

## Migration History

The following migrations were applied:

1. **enable_rls_users_table** - Enabled RLS and created policies for users table
2. **enable_rls_notification_subscriptions_table** - Enabled RLS and created policies for notification_subscriptions table
3. **enable_rls_notifications_table** - Enabled RLS and created policies for notifications table

## Important Notes

### ✅ What's Protected
- User profiles (users can only see/edit their own)
- Notification subscriptions (users can only manage their own)
- Notifications (users can only view/update their own)

### ✅ What Still Works
- User sign-in and profile creation (authenticated users can insert their own profile)
- User profile updates (authenticated users can update their own profile)
- Notification subscription management (users can manage their own subscriptions)
- Backend operations (service role can manage all data)

### ⚠️ Important Considerations

1. **First-time sign-in:** When a new user signs in, they must be authenticated (have a session) before the INSERT policy will allow them to create their profile. This is handled automatically by the authentication flow.

2. **Service role:** For backend operations that need to access all users (e.g., sending notifications, admin operations), use the service role key, not the anon key.

3. **Testing:** When testing in Supabase SQL Editor, you're using the service role, so RLS policies don't apply. To test RLS, you need to test from the client application with authenticated users.

## Verification

To verify RLS is working:

1. **Check Supabase Dashboard:**
   - Go to Authentication → Policies
   - You should see all policies listed
   - Tables should show "ENABLED" for RLS

2. **Test from Application:**
   - Sign in as User A
   - Try to access User B's data
   - Should be blocked by RLS

3. **Check Logs:**
   - Supabase logs will show RLS policy violations
   - Application console will show permission errors

## Summary

✅ RLS enabled on all three tables  
✅ Users can only access their own data  
✅ Backend can manage all data (service role)  
✅ Policies enforce security at database level  
✅ No code changes needed - works with existing authentication  

Your database is now properly secured! 🔒

