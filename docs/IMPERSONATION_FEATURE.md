# User Impersonation Feature

## Overview

The User Impersonation feature allows Super Admins and Admins to temporarily log into other users' accounts without knowing their credentials. This is useful for:

- **Maintenance**: Fixing user-specific issues
- **Support**: Understanding what a user sees and experiences
- **Debugging**: Reproducing bugs from a user's perspective
- **Auditing**: Verifying data and permissions from the user's viewpoint

## Table of Contents

1. [Architecture](#architecture)
2. [User Flow](#user-flow)
3. [Security Model](#security-model)
4. [Components](#components)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Edge Cases & Known Limitations](#edge-cases--known-limitations)
8. [Future Improvements](#future-improvements)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

### High-Level Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Admin     │────▶│   Server    │────▶│  Supabase   │────▶│   Client    │
│   clicks    │     │  generates  │     │  verifies   │     │   creates   │
│  "Login As" │     │ token_hash  │     │   token     │     │   session   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Audit     │
                    │    Log      │
                    └─────────────┘
```

### Technology Stack

- **Frontend**: TypeScript, Vanilla JS
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth (magic link tokens)
- **State Management**: sessionStorage (impersonation state), localStorage (user info)

---

## User Flow

### Starting Impersonation

1. **Super Admin** navigates to **Settings → User Impersonation**
2. Searches for and selects a target user
3. Enters an optional reason for impersonation
4. Clicks **"Login As"** button
5. System:
   - Saves admin's current session to `sessionStorage`
   - Clears all localStorage caches
   - Signs out the admin
   - Generates a magic link token via Supabase Admin API
   - Uses `verifyOtp` with `token_hash` to create target user session
   - Logs the impersonation to the audit table
   - Redirects to `/home?impersonated=true`
6. **Red banner** appears at top of page showing impersonation status

### During Impersonation

- Admin sees and interacts with the platform **exactly as the target user would**
- Red banner shows:
  - Target user's email
  - Duration of impersonation session
  - "Return to Admin" button
- All actions are performed as the target user (using their auth token)
- Sidebar shows menu items based on **target user's role**

### Exiting Impersonation

1. Admin clicks **"Return to Admin"** button in the banner
2. System performs **COMPLETE cleanup**:
   - Logs the end time to the audit table
   - Signs out from Supabase (global sign out from all devices)
   - Clears **ALL** localStorage (except theme/language preferences)
   - Clears **ALL** sessionStorage
   - Clears Supabase-related cookies
   - Clears IndexedDB caches
   - Clears global window state
   - Redirects to login page
3. Admin must **log in again** with their own credentials
4. This ensures NO impersonated user data remains in the system

> **Note:** Unlike previous versions, exiting impersonation now requires a fresh login. This is intentional to ensure complete data isolation and prevent any cached impersonated user data from affecting the admin's session.

---

## Security Model

### Role-Based Access Control

| Admin Role | Can Impersonate |
|------------|-----------------|
| Super Admin | All users (including other Super Admins) |
| Admin | Users with lower role level only |
| All other roles | Cannot impersonate |

### Role Hierarchy (Level)

```
Super Admin: 5
Admin: 4
Manager: 3
Quality Supervisor: 2
Quality Analyst: 2
Employee: 1
General User: 0
```

### Security Measures

1. **Server-side validation**: Role checks happen on the server, not just client
2. **Audit logging**: All impersonation sessions are logged with:
   - Admin ID and email
   - Target user ID and email
   - Reason (optional)
   - IP address
   - User agent
   - Start and end timestamps
3. **Session isolation**: Original admin session stored in `sessionStorage` (cleared on tab close)
4. **CSRF protection**: All API calls include CSRF tokens
5. **Token-based verification**: Uses Supabase's `verifyOtp` for secure session creation
6. **Visual indicator**: Prominent red banner cannot be dismissed without exiting impersonation

### What Impersonation Does NOT Do

- Does not give the admin the target user's password
- Does not persist across browser sessions (closing tab clears state)
- Does not allow impersonating users who don't exist in `auth.users`
- Does not bypass Supabase's authentication mechanisms

---

## Components

### Frontend Components

| File | Purpose |
|------|---------|
| `src/utils/impersonation-service.ts` | Core service for start/exit impersonation |
| `src/components/impersonation-banner.ts` | Red banner UI component |
| `src/features/settings/impersonation/presentation/impersonation-controller.ts` | Impersonation page controller |
| `src/features/settings/impersonation/presentation/impersonation.html` | Impersonation page UI |
| `src/features/settings/impersonation/presentation/impersonation.css` | Page styles |

### Backend Components

| File | Purpose |
|------|---------|
| `src/api/routes/admin.routes.ts` | API endpoints for impersonation |

### Key Functions

#### `startImpersonation(targetEmail: string, reason?: string)`
- Validates admin privileges
- Stores original session in sessionStorage
- Gets token from server
- Signs out admin
- Verifies token to create target user session
- Redirects to home

#### `exitImpersonation()`
- Logs impersonation end time
- Signs out target user
- Clears all caches
- Restores admin session
- Redirects to home

#### `isImpersonating(): boolean`
- Checks if currently in impersonation mode

#### `getImpersonationInfo()`
- Returns current impersonation session details

---

## API Endpoints

### POST `/api/admin/impersonate`

**Request:**
```json
{
  "targetEmail": "user@example.com",
  "reason": "Checking audit display issue"
}
```

**Response:**
```json
{
  "success": true,
  "tokenHash": "abc123...",
  "actionLink": "https://...",
  "targetEmail": "user@example.com",
  "targetRole": "Employee",
  "message": "Impersonation token generated for user@example.com"
}
```

**Errors:**
- `400`: Target email required / Cannot impersonate yourself
- `401`: Authentication required
- `403`: Admin privileges required / Cannot impersonate higher role
- `404`: Target user not found in authentication system
- `500`: Server error

### GET `/api/admin/impersonation-logs`

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)

**Response:**
```json
{
  "logs": [...],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

**Access:** Super Admin only

### POST `/api/admin/end-impersonation`

**Request:**
```json
{
  "adminEmail": "admin@example.com",
  "targetEmail": "user@example.com"
}
```

**Response:**
```json
{
  "success": true
}
```

---

## Database Schema

### Table: `impersonation_log`

```sql
CREATE TABLE public.impersonation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  target_id UUID,
  target_email TEXT NOT NULL,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Indexes
- `idx_impersonation_log_admin_email`
- `idx_impersonation_log_target_email`
- `idx_impersonation_log_started_at`

### RLS Policies
- Super Admins can SELECT (view logs)
- Service role can INSERT (log start)
- Service role can UPDATE (log end time)

---

## Edge Cases & Known Limitations

### ✅ Handled Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| Self-impersonation | Blocked with error message |
| Impersonating higher role | Blocked for non-Super Admins |
| User not in auth.users | Returns "Target user not found" error |
| Nested impersonation | Blocked - must exit current impersonation first |
| Session expiring soon | Auto-refreshes session before storing |
| Token verification fails | Clear error message with specific reason |
| Exit impersonation | Complete cleanup - all caches cleared, fresh login required |
| Network error during exit | Forces complete cleanup anyway, redirects to login |
| Page refresh while impersonating | Banner re-appears (state in sessionStorage) |

### ⚠️ Known Limitations

| Limitation | Description | Future Fix Priority |
|------------|-------------|---------------------|
| **Fresh login required** | Exiting impersonation requires a fresh login (by design for security) | N/A - Intentional |
| **Multiple tabs** | Opening new tabs while impersonating may have inconsistent state | Medium |
| **Token expiration** | Magic link tokens expire (default: 1 hour). If impersonation takes too long before verifyOtp, it may fail | Low |
| **2FA users** | If target user has 2FA enabled, impersonation may not work correctly | Medium |
| **Concurrent sessions** | Multiple admins impersonating the same user simultaneously may cause conflicts | Low |

### 🔴 Not Yet Implemented

| Feature | Description |
|---------|-------------|
| Impersonation time limit | Auto-exit after X minutes |
| Activity logging | Log actions taken while impersonating |
| Notification to user | Email/notify user that their account was accessed |
| Read-only mode | View-only impersonation without write capabilities |
| Impersonation approval workflow | Require another admin to approve impersonation |

---

## Future Improvements

### High Priority

1. **Session expiration handling**
   - Check if admin's stored session is still valid before starting impersonation
   - Refresh admin token if needed before storing
   - Add warning if session will expire soon

2. **Impersonation time limit**
   - Add configurable maximum impersonation duration
   - Auto-exit with warning before time expires
   - Show countdown in banner

3. **Multi-tab support**
   - Use BroadcastChannel API to sync impersonation state across tabs
   - Prevent opening new tabs while impersonating OR sync state to new tabs

### Medium Priority

4. **User notification**
   - Send email to user when their account is accessed via impersonation
   - Show in-app notification on user's next login

5. **Activity logging**
   - Log all significant actions taken while impersonating
   - Store in separate audit table linked to impersonation session

6. **Read-only mode**
   - Option to impersonate in read-only mode
   - Disable all form submissions and mutations
   - Useful for investigation without risk

### Low Priority

7. **Impersonation approval workflow**
   - Require another Super Admin to approve impersonation requests
   - Add approval/rejection flow with notifications

8. **Nested impersonation prevention**
   - Check if already impersonating before allowing another impersonation
   - Show clear error message

9. **Session extension**
   - Allow extending impersonation session without re-authenticating
   - Refresh target user's token automatically

---

## Troubleshooting

### "CSRF token missing" Error
**Cause:** The impersonation API call is missing the CSRF token.
**Fix:** The service fetches CSRF token from `/api/env` before making POST requests.

### "Target user not found in authentication system"
**Cause:** The user exists in the `people` table but not in `auth.users`.
**Fix:** The user must have logged in at least once via Google OAuth to exist in `auth.users`.

### Impersonation starts but shows wrong user's data
**Cause:** Caches weren't properly cleared before switching sessions.
**Fix:** The `clearAllUserCaches()` function clears all localStorage and sessionStorage caches.

### "Return to Admin" button doesn't work
**Cause:** The admin's original session in sessionStorage has expired or is corrupt.
**Fix:** The user will be redirected to the login page. They need to log in again.

### Sidebar shows wrong menu items
**Cause:** The `userInfoUpdated` event wasn't dispatched or the sidebar didn't regenerate.
**Fix:** The auth-checker now dispatches this event on `document` (not `window`) and the sidebar listens for it.

### Getting logged out when clicking "Login As"
**Cause:** The `verifyOtp` call failed to create a new session.
**Fix:** Check server logs for token generation errors. Ensure the target user exists in `auth.users`.

---

## Related Files

```
src/
├── api/
│   └── routes/
│       └── admin.routes.ts          # Backend API
├── components/
│   └── impersonation-banner.ts      # Banner component
├── features/
│   └── settings/
│       └── impersonation/
│           └── presentation/
│               ├── impersonation.html
│               ├── impersonation.css
│               └── impersonation-controller.ts
├── utils/
│   └── impersonation-service.ts     # Core service
└── auth-checker.ts                  # Session sync logic
```

---

## Changelog

### v1.0.0 (2026-01-28)
- Initial implementation
- Super Admin and Admin can impersonate users
- Role hierarchy enforcement
- Audit logging
- Visual banner indicator
- Session save/restore

---

## Contact

For questions or issues with this feature, contact the development team.
