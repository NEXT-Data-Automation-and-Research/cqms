# Sandbox Security Architecture - Complete Explanation

## 🎯 Why: The Security Problem

### The Risk
The sandbox endpoint (`/api/sandbox/people`) uses **service role key** which **bypasses Row Level Security (RLS)**. This means:

1. **Powerful Access**: Can read ALL users' data, not just the current user's
2. **No RLS Protection**: Database-level security policies are bypassed
3. **Sensitive Data Exposure**: If any authenticated user could access this, they could see:
   - All user emails
   - All user profiles
   - All user metadata
   - Potentially sensitive information

### Before the Fix
```typescript
// ❌ BEFORE: Any authenticated user could access
router.get('/people', verifyAuth, async (req, res) => {
  // Service role key = can see ALL data
  const supabase = getServerSupabase(); // Bypasses RLS!
  const result = await supabase.from('users').select('*');
  // Returns ALL users to ANY authenticated user
});
```

**Problem**: Any logged-in user could call this endpoint and see everyone's data.

### After the Fix
```typescript
// ✅ AFTER: Only admins can access
router.get('/people', verifyAuth, requireAdmin, async (req, res) => {
  // Still uses service role key, but now protected by admin check
  const supabase = getServerSupabase();
  const result = await supabase.from('users').select('*');
  // Only admins can reach this code
});
```

**Solution**: Added admin verification layer before allowing service role access.

---

## 🔒 What: The Security Components

### 1. Admin-Only Access to Sandbox Endpoints

**What it does**: Restricts powerful endpoints to administrators only.

**Implementation**: Middleware chain in `sandbox.routes.ts`:
```22:22:src/api/routes/sandbox.routes.ts
router.get('/people', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
```

**How it works**:
- `verifyAuth`: First checks if user is authenticated (has valid JWT token)
- `requireAdmin`: Then checks if authenticated user is an admin
- Handler: Only executes if both checks pass

**Security benefit**: Even if someone steals a user's token, they can't access admin endpoints unless they're an admin.

---

### 2. Multiple Admin Verification Methods

**What it does**: Provides three flexible ways to grant admin access.

**Implementation**: `isAdmin()` function checks three conditions:

#### Method 1: Supabase User Metadata Role
```62:67:src/api/utils/admin-check.ts
  // Check 1: user_metadata.role === 'admin'
  const userRole = (user as any).user_metadata?.role;
  if (userRole === 'admin') {
    logger.info(`User ${userEmail} is admin (role check)`);
    return true;
  }
```

**How to use**: Set in Supabase Dashboard:
1. Go to Authentication → Users
2. Edit user → Raw User Meta Data
3. Add: `{ "role": "admin" }`

**Use case**: Best for individual user management via Supabase UI.

#### Method 2: Environment Variable - Email List
```69:74:src/api/utils/admin-check.ts
  // Check 2: Email in admin list
  const adminEmails = getAdminEmails();
  if (adminEmails.length > 0 && userEmail && adminEmails.includes(userEmail)) {
    logger.info(`User ${userEmail} is admin (email list)`);
    return true;
  }
```

**How to use**: Set environment variable:
```bash
ADMIN_EMAILS=admin@example.com,admin2@example.com,ceo@company.com
```

**Use case**: Quick setup for specific admin users without touching Supabase.

#### Method 3: Environment Variable - Email Domain
```76:85:src/api/utils/admin-check.ts
  // Check 3: Email domain in admin domains
  const adminDomains = getAdminDomains();
  if (adminDomains.length > 0 && userEmail) {
    for (const domain of adminDomains) {
      if (userEmail.endsWith(domain)) {
        logger.info(`User ${userEmail} is admin (domain check: ${domain})`);
        return true;
      }
    }
  }
```

**How to use**: Set environment variable:
```bash
ADMIN_EMAIL_DOMAINS=@company.com,@admin.com
```

**Use case**: Grant admin to entire email domains (e.g., all `@company.com` emails).

**Why multiple methods?**
- **Flexibility**: Different teams prefer different approaches
- **Redundancy**: If one method fails, others still work
- **Scalability**: Domain-based is easy for large organizations
- **Granularity**: Email list for specific individuals

---

### 3. Clear Error Messages for Unauthorized Access

**What it does**: Provides user-friendly error messages when access is denied.

**Implementation**: Two layers of error handling:

#### Server-Side (API)
```100:107:src/api/utils/admin-check.ts
  if (!isAdmin(req)) {
    logger.warn(`Admin access denied for user: ${req.user?.email || 'unknown'}`);
    res.status(403).json({ 
      error: 'Admin access required',
      message: 'This endpoint requires administrator privileges'
    });
    return;
  }
```

**Returns**: HTTP 403 with clear JSON message.

#### Client-Side (Sandbox Page)
```typescript
// In sandbox-page.html
if (!response.ok) {
  if (response.status === 403) {
    throw new Error('Admin access required. This page is restricted to administrators only.');
  } else if (response.status === 401) {
    throw new Error('Not authenticated. Please log in to access this page.');
  }
}
```

**Why it matters**:
- **User Experience**: Users understand why access was denied
- **Security**: Doesn't leak information about system structure
- **Debugging**: Clear messages help developers troubleshoot

---

### 4. Proper Middleware Chain (Auth → Admin Check → Handler)

**What it does**: Enforces security in the correct order.

**Implementation**: Express middleware chain:
```22:22:src/api/routes/sandbox.routes.ts
router.get('/people', verifyAuth, requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
```

**Execution Flow**:

```
Request → verifyAuth → requireAdmin → Handler
           ↓              ↓
      [Check JWT]    [Check Admin]
           ↓              ↓
      [Attach user]  [Verify admin]
           ↓              ↓
      [Next]         [Next]
                     ↓
                  [Execute handler]
```

**Why this order matters**:

1. **verifyAuth First**: 
   - Validates JWT token
   - Attaches `req.user` to request
   - If fails → 401 (Unauthorized)
   - **Must run first** because `requireAdmin` needs `req.user`

2. **requireAdmin Second**:
   - Uses `req.user` from previous middleware
   - Checks admin status
   - If fails → 403 (Forbidden)
   - **Must run second** because it depends on authenticated user

3. **Handler Last**:
   - Only executes if both checks pass
   - Has access to `req.user` with admin privileges
   - Performs the actual operation

**Security benefit**: Defense in depth - multiple layers of protection.

---

## 🔧 How: Configuration Guide

### Option 1: Environment Variables (Recommended for Development)

Create or update `.env` file:

```bash
# Specific admin emails (comma-separated)
ADMIN_EMAILS=admin@example.com,admin2@example.com,ceo@company.com

# Admin email domains (comma-separated, must start with @)
ADMIN_EMAIL_DOMAINS=@company.com,@admin.com
```

**Pros**:
- Easy to change without database access
- Version controlled (if using `.env.example`)
- Works across environments (dev, staging, prod)

**Cons**:
- Requires server restart to change
- Not user-friendly for non-technical admins

### Option 2: Supabase User Metadata (Recommended for Production)

1. **Via Supabase Dashboard**:
   - Go to Authentication → Users
   - Click on user
   - Scroll to "Raw User Meta Data"
   - Add: `{ "role": "admin" }`
   - Save

2. **Via Supabase API** (programmatic):
   ```typescript
   const { data, error } = await supabase.auth.admin.updateUserById(
     userId,
     { user_metadata: { role: 'admin' } }
   );
   ```

**Pros**:
- No server restart needed
- Per-user granular control
- Can be managed via Supabase UI
- Works with Supabase Auth features

**Cons**:
- Requires Supabase access
- Changes require database operation

### Option 3: Hybrid Approach (Best Practice)

Use **both** methods:
- **Environment variables** for initial setup and bulk admin access
- **User metadata** for individual user management

**Example**:
```bash
# .env - Grant admin to all @company.com emails
ADMIN_EMAIL_DOMAINS=@company.com
```

Then for specific external admins:
```json
// Supabase user metadata
{ "role": "admin" }
```

---

## 📊 Security Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Request                            │
│              GET /api/sandbox/people                        │
│         Authorization: Bearer <JWT_TOKEN>                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Middleware 1: verifyAuth                        │
│  • Extract JWT token from Authorization header              │
│  • Verify token with Supabase                               │
│  • Decode user information                                  │
│  • Attach user to req.user                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
              ┌────────┴────────┐
              │  Valid Token?   │
              └────────┬────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
         NO │                     │ YES
            │                     │
            ▼                     ▼
    ┌──────────────┐    ┌─────────────────────────────┐
    │ Return 401   │    │ Middleware 2: requireAdmin  │
    │ Unauthorized │    │ • Check req.user exists      │
    └──────────────┘    │ • Check user_metadata.role   │
                        │ • Check ADMIN_EMAILS         │
                        │ • Check ADMIN_EMAIL_DOMAINS  │
                        └──────────┬──────────────────┘
                                   │
                         ┌─────────┴─────────┐
                         │   Is Admin?       │
                         └─────────┬─────────┘
                                   │
                        ┌──────────┴──────────┐
                        │                     │
                     NO │                     │ YES
                        │                     │
                        ▼                     ▼
                ┌──────────────┐    ┌──────────────────────┐
                │ Return 403   │    │ Handler Execution    │
                │ Forbidden    │    │ • Use service role   │
                └──────────────┘    │ • Bypass RLS         │
                                    │ • Return all users   │
                                    └──────────────────────┘
```

---

## 🛡️ Security Best Practices Implemented

### 1. **Principle of Least Privilege**
- Only admins can access powerful endpoints
- Regular users can't see other users' data
- Service role key only used when necessary

### 2. **Defense in Depth**
- Multiple layers: Auth → Admin Check → Handler
- Each layer validates independently
- Failure at any layer stops execution

### 3. **Fail Secure**
- If admin check fails → deny access (403)
- If auth check fails → deny access (401)
- No partial access or information leakage

### 4. **Audit Trail**
- All admin checks are logged
- Failed attempts are logged with user email
- Success logs include which method granted access

### 5. **Flexible Configuration**
- Multiple ways to grant admin (role, email, domain)
- Environment-based for easy deployment
- Metadata-based for user management

---

## 🧪 Testing the Security

### Test 1: Non-Admin User
```bash
# Login as regular user
curl -H "Authorization: Bearer <regular_user_token>" \
     http://localhost:3000/api/sandbox/people

# Expected: 403 Forbidden
# Response: { "error": "Admin access required", ... }
```

### Test 2: Admin User (via email)
```bash
# Set environment variable
export ADMIN_EMAILS=admin@example.com

# Login as admin@example.com
curl -H "Authorization: Bearer <admin_token>" \
     http://localhost:3000/api/sandbox/people

# Expected: 200 OK with user data
```

### Test 3: Admin User (via domain)
```bash
# Set environment variable
export ADMIN_EMAIL_DOMAINS=@company.com

# Login as user@company.com
curl -H "Authorization: Bearer <user_token>" \
     http://localhost:3000/api/sandbox/people

# Expected: 200 OK with user data
```

---

## 📝 Summary

**Why**: Sandbox endpoints use service role key (bypasses RLS) and expose all user data - must be restricted to admins only.

**What**: 
- Admin-only access via middleware
- Three verification methods (role, email list, domain)
- Clear error messages
- Proper middleware chain

**How**:
- Configure via environment variables (`ADMIN_EMAILS`, `ADMIN_EMAIL_DOMAINS`)
- Or set `user_metadata.role = 'admin'` in Supabase
- Middleware chain: `verifyAuth` → `requireAdmin` → handler

**Result**: Secure admin-only access with flexible configuration options.

