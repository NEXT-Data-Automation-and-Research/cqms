# Supabase Token Settings Explained

## Understanding the Different Settings

Based on the Supabase Dashboard, there are several token/session-related settings that can be confusing. Here's what each one does:

### 1. JWT Expiry (Auth Settings → JWT Settings)
**Location**: Settings → Auth Settings → JWT Settings  
**What it does**: Controls how long **access tokens** are valid before they expire  
**Default**: 3600 seconds (1 hour)  
**This is what controls when tokens refresh** (~55 minutes with auto-refresh)

**To test token refresh:**
- Change this to a lower value (e.g., 300 seconds = 5 minutes)
- Log out and log back in
- Wait for token to expire/refresh

### 2. Refresh Token Reuse Interval (User Sessions → Refresh Tokens)
**Location**: Settings → User Sessions → Refresh Tokens  
**Current value**: 10 seconds  
**What it does**: Security setting that prevents the same refresh token from being used multiple times within this interval (prevents replay attacks)  
**NOT the refresh interval**: This does NOT control when tokens refresh - it's a security feature

**Should you change it?**
- Generally, keep it at 10 seconds (recommended)
- Only change if you have specific security requirements
- Lower values = more secure but might cause issues with concurrent requests

### 3. Time-box User Sessions (User Sessions)
**Location**: Settings → User Sessions  
**Current value**: 0 (never)  
**What it does**: Forces users to sign in again after a set time, regardless of token refresh  
**Requires**: Pro Plan or above  
**Note**: This is different from JWT expiry - this forces a full re-login

### 4. Inactivity Timeout (User Sessions)
**Location**: Settings → User Sessions  
**Current value**: 0 (never)  
**What it does**: Forces users to sign in again after inactivity period  
**Requires**: Pro Plan or above

## Quick Reference

| Setting | Location | Controls | Default | For Testing |
|---------|----------|----------|---------|-------------|
| **JWT Expiry** | Auth Settings → JWT Settings | Access token lifetime | 3600s (1h) | ✅ Change this |
| **Refresh Token Reuse Interval** | User Sessions → Refresh Tokens | Replay attack prevention | 10s | ❌ Don't change |
| **Time-box Sessions** | User Sessions | Force re-login after time | 0 (never) | ⚠️ Pro Plan only |
| **Inactivity Timeout** | User Sessions | Force re-login after inactivity | 0 (never) | ⚠️ Pro Plan only |

## For Testing Token Refresh

**Use Method 1 (Test Mode) - Recommended:**
```javascript
// In browser console
window.SUPABASE_TOKEN_REFRESH_TEST_INTERVAL = 30; // 30 seconds
```

**Or Method 2 (Change JWT Expiry):**
1. Go to **Settings → Auth Settings → JWT Settings**
2. Change **"JWT Expiry"** to 300 seconds (5 minutes)
3. Log out and log back in
4. Wait for refresh

**Do NOT change "Refresh token reuse interval"** - that's not what you need for testing.

## Current Configuration (From Your Dashboard)

- ✅ **Refresh token reuse interval**: 10 seconds (good, keep it)
- ✅ **Detect compromised tokens**: Enabled (good security)
- ⚠️ **Time-box sessions**: 0 (never) - Pro Plan feature
- ⚠️ **Inactivity timeout**: 0 (never) - Pro Plan feature

---

**Summary**: To test token refresh, either use the test mode in browser console OR change "JWT Expiry" in Auth Settings (not User Sessions).

