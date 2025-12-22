# User Profile Save Logic

## Overview

The `saveUserProfileToDatabase()` function intelligently handles user profile creation and updates after authentication is completed.

## Function Behavior

### 1. Always Checks if User Exists ✅

- Uses `maybeSingle()` to safely check for existing user
- Returns `null` if user doesn't exist (no errors thrown)
- Fetches complete user record if exists

### 2. New User Creation ✅

**When:** User doesn't exist in `users` table

**Actions:**
- Creates new user record with all information
- Sets `first_sign_in_at` to current timestamp
- Sets `sign_in_count` to '1'
- Sets `created_at` to current timestamp
- Stores comprehensive device information
- Sets default notification preferences

**Console Output:**
```
✅ New user created successfully with comprehensive analytics
📊 User data saved: { id, email, sign_in_count: '1', is_new_user: true, ... }
```

### 3. Existing User - Information Update ✅

**When:** User exists but information has changed

**Detects Changes In:**
- `full_name` - User's name changed
- `avatar_url` - Profile picture changed
- `email` - Email address changed

**Actions:**
- Updates changed information
- Preserves existing notification preferences
- Updates `last_sign_in_at`
- Increments `sign_in_count`
- Updates `device_info` with current device

**Console Output:**
```
📝 User information has changed - will update
✅ User profile updated: user info updated
📊 User data saved: { ... is_new_user: false, ... }
```

### 4. Existing User - New Device Login ✅

**When:** User exists but logging in from different device

**Detection Criteria:**
- Different `user_agent`
- Different `browser` or `browser_version`
- Different `os` or `os_version`
- Different `device_type` (desktop/mobile/tablet)
- Different `platform`
- Different screen resolution

**Actions:**
- Updates `device_info` with new device information
- Updates `last_sign_in_at`
- Increments `sign_in_count`
- Preserves user information and preferences

**Console Output:**
```
🆕 New device login detected: {
  previous_device: 'desktop',
  previous_browser: 'Chrome',
  current_device: 'mobile',
  current_browser: 'Safari'
}
✅ User profile updated: new device detected
📊 User data saved: { ... is_new_device: true, ... }
```

### 5. Existing User - Regular Sign-In ✅

**When:** User exists, same device, no information changes

**Actions:**
- Updates `last_sign_in_at`
- Increments `sign_in_count`
- Updates `device_info` (may have minor changes like timestamp)
- Updates `updated_at` timestamp

**Console Output:**
```
✅ User profile updated (sign-in tracked)
📊 User data saved: { ... is_new_user: false, is_new_device: false, ... }
```

## Data Preserved

### Always Preserved:
- ✅ Existing `notification_preferences` (if user exists)
- ✅ `first_sign_in_at` timestamp
- ✅ User ID (never changes)

### Always Updated:
- ✅ `last_sign_in_at` (every sign-in)
- ✅ `sign_in_count` (incremented every sign-in)
- ✅ `device_info` (current device information)
- ✅ `updated_at` (timestamp)

### Updated When Changed:
- ✅ `full_name` (if changed in auth metadata)
- ✅ `avatar_url` (if changed in auth metadata)
- ✅ `email` (if changed in auth metadata)

## Error Handling

### Graceful Error Handling:
- Errors are logged but don't block authentication
- Detailed error information logged to console
- Specific error codes handled:
  - `42P01` - Table doesn't exist
  - `23503` - Foreign key constraint (user not in auth.users)
  - `23505` - Unique constraint (email already exists)

### Error Logging:
```javascript
❌ Error saving user profile to database: {
  code: 'error_code',
  message: 'Error message',
  details: 'Additional details',
  hint: 'Helpful hint',
  user_id: 'user-uuid',
  email: 'user@example.com'
}
```

## Execution Flow

```
1. User signs in with Google OAuth
   ↓
2. Supabase processes OAuth callback
   ↓
3. handleGoogleOAuthCallback() called
   ↓
4. Session verified
   ↓
5. saveUserProfileToDatabase() called
   ↓
6. Check if user exists
   ↓
7a. If new user → Create with all data
7b. If existing user → Check for changes
   ↓
8. Update/Insert user profile
   ↓
9. Save to localStorage (for app compatibility)
   ↓
10. Redirect to home page
```

## Device Detection Logic

The function uses `isNewDeviceLogin()` to detect new devices by comparing:

1. **Primary Identifiers:**
   - User Agent string
   - Browser name and version
   - Operating system and version
   - Device type (desktop/mobile/tablet)
   - Platform

2. **Secondary Indicators:**
   - Screen resolution

If any of these differ, it's considered a new device login.

## Information Change Detection

The function uses `hasInformationChanged()` to detect changes in:
- Full name
- Avatar URL
- Email address

If any of these differ from stored values, the information is updated.

## Example Scenarios

### Scenario 1: First Time User
```
User signs in → No record exists → Creates new user
Output: ✅ New user created successfully
```

### Scenario 2: Returning User, Same Device
```
User signs in → Record exists → Same device → Updates sign-in count
Output: ✅ User profile updated (sign-in tracked)
```

### Scenario 3: Returning User, New Device
```
User signs in → Record exists → Different device → Updates device info
Output: 🆕 New device login detected → ✅ User profile updated: new device detected
```

### Scenario 4: User Changed Profile Picture
```
User signs in → Record exists → Avatar URL changed → Updates avatar
Output: 📝 User information has changed → ✅ User profile updated: user info updated
```

## Testing

To test the function:

1. **New User:**
   - Sign in with a new Google account
   - Check console for "New user created"
   - Verify in Supabase `users` table

2. **Existing User, Same Device:**
   - Sign out and sign in again
   - Check console for "sign-in tracked"
   - Verify `sign_in_count` incremented

3. **Existing User, New Device:**
   - Sign in from different browser/device
   - Check console for "New device login detected"
   - Verify `device_info` updated

4. **Information Change:**
   - Change profile picture in Google account
   - Sign in again
   - Check console for "User information has changed"
   - Verify `avatar_url` updated

## Summary

✅ Always checks if user exists  
✅ Creates new user if doesn't exist  
✅ Detects and updates information changes  
✅ Detects and tracks new device logins  
✅ Preserves user preferences  
✅ Updates analytics (sign-in count, timestamps)  
✅ Runs after authentication is completed  
✅ Comprehensive error handling  
✅ Detailed logging for debugging  

