# Sandbox API Security Assessment

## Current Security Rating: **6.5/10**

### Security Flow Analysis

```
Client (sandbox-page.html)
  ↓
1. getAuthenticatedSupabase() ✅
  ↓
2. Extract JWT token from session ✅
  ↓
3. Send token in Authorization header ✅
  ↓
Server (/api/sandbox/people)
  ↓
4. verifyAuth middleware ✅
   - Validates JWT token
   - Verifies with Supabase
  ↓
5. getServerSupabase() ⚠️
   - Uses SERVICE ROLE KEY
   - Bypasses Row Level Security (RLS)
  ↓
6. Query all users ⚠️
   - Returns ALL user data
   - No filtering or restrictions
```

---

## ✅ Security Strengths

### 1. **Proper Authentication (9/10)**
**Location**: `src/sandbox/sandbox-page.html` lines 279-284, `src/api/middleware/auth.middleware.ts`

- ✅ Uses `getAuthenticatedSupabase()` helper (follows project rules)
- ✅ JWT token properly extracted from session
- ✅ Token sent in `Authorization: Bearer <token>` header
- ✅ Server-side token verification via `verifyAuth` middleware
- ✅ Token validated with Supabase (`supabase.auth.getUser(token)`)
- ✅ Proper error handling for missing/invalid tokens

**Security Benefit**: Prevents unauthenticated access. Only logged-in users can access.

### 2. **Server-Side Service Role Key (8/10)**
**Location**: `src/core/config/server-supabase.ts`, `src/api/routes/sandbox.routes.ts` line 23

- ✅ Service role key never exposed to client
- ✅ Only used server-side in API routes
- ✅ Properly configured via environment variables
- ✅ Fallback handling if key not set

**Security Benefit**: Prevents client-side access to service role key. Key stays on server.

### 3. **Error Handling (7/10)**
**Location**: `src/sandbox/sandbox-page.html` lines 294-304

- ✅ Handles 401 (Unauthorized) errors
- ✅ Proper error message display
- ✅ No sensitive information leaked in errors
- ⚠️ Could be more specific about error types

**Security Benefit**: Prevents information leakage through error messages.

### 4. **HTTPS/Transport Security (Assumed)**
- ✅ Token sent over HTTPS (in production)
- ✅ No token stored in localStorage (uses session)
- ✅ Token in memory only

**Security Benefit**: Prevents token interception during transmission.

---

## ⚠️ Security Concerns

### 1. **Overly Permissive Access (3/10)** 🔴 **CRITICAL**

**Issue**: Any authenticated user can see ALL users' data.

**Current Behavior**:
```typescript
// Any logged-in user can access
router.get('/people', verifyAuth, async (req, res) => {
  const supabase = getServerSupabase(); // Bypasses RLS
  const result = await supabase.from('users').select('*'); // Returns ALL users
});
```

**Risk Level**: **HIGH**
- **Data Exposure**: All user emails, names, avatars, sign-in counts, etc.
- **Privacy Violation**: Users can see other users' information
- **Compliance Issues**: May violate GDPR, CCPA, or other privacy regulations
- **Business Risk**: Competitors, ex-employees, or malicious users can enumerate all users

**Impact**:
- User A (regular user) can see User B's email, profile, activity
- No granular access control
- All authenticated users have same level of access

**Recommendation**: 
- If this is intentional (e.g., internal directory), document it clearly
- Consider adding role-based access or restricting to specific user groups
- Add audit logging to track who accesses this data

### 2. **Service Role Key Bypasses RLS (4/10)** ⚠️ **HIGH RISK**

**Issue**: Service role key completely bypasses Row Level Security.

**Current Behavior**:
```typescript
const supabase = getServerSupabase(); // Uses service role key
// RLS policies are completely ignored
const result = await supabase.from('users').select('*');
```

**Risk Level**: **HIGH**
- **No Database-Level Protection**: RLS policies don't apply
- **Powerful Access**: Can read/write any data in database
- **Single Point of Failure**: If this endpoint is compromised, all data is at risk

**Why It's Used**:
- RLS policy on `users` table only allows users to see their own data
- To show all users, must bypass RLS
- Service role key is the only way to bypass RLS

**Trade-off**:
- ✅ Allows showing all users (as intended)
- ❌ Bypasses all database security policies
- ❌ No protection if endpoint is misused

**Recommendation**:
- Consider creating a more permissive RLS policy instead:
  ```sql
  -- Allow all authenticated users to read all users
  CREATE POLICY "Authenticated users can read all users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');
  ```
- Then use regular Supabase client (with anon key) instead of service role key
- This provides database-level protection even if API is compromised

### 3. **No Rate Limiting (5/10)** ⚠️ **MEDIUM RISK**

**Issue**: No protection against abuse or DoS attacks.

**Current Behavior**:
- No rate limiting on `/api/sandbox/people` endpoint
- User can make unlimited requests
- No throttling or request limits

**Risk Level**: **MEDIUM**
- **DoS Vulnerability**: Malicious user can spam requests
- **Resource Exhaustion**: Can overload database with repeated queries
- **Cost Impact**: High API usage can increase costs

**Recommendation**:
- Add rate limiting middleware (e.g., `express-rate-limit`)
- Limit to X requests per minute per user
- Consider caching results to reduce database load

### 4. **No Input Validation (7/10)** ⚠️ **LOW RISK**

**Issue**: No query parameter validation (though minimal risk for GET request).

**Current Behavior**:
- No query parameters accepted (simple GET)
- No SQL injection risk (using Supabase client)
- No input sanitization needed

**Risk Level**: **LOW**
- Currently safe because no user input is processed
- If extended to accept filters/sorting, would need validation

**Recommendation**:
- If adding query parameters (e.g., `?limit=100`), add validation
- Use Supabase query builder (already doing this ✅)

### 5. **No Audit Logging (4/10)** ⚠️ **MEDIUM RISK**

**Issue**: No tracking of who accessed sensitive data.

**Current Behavior**:
- Basic logging (`logger.info`) but no audit trail
- No record of which users accessed all user data
- No compliance logging

**Risk Level**: **MEDIUM**
- **Compliance**: May need audit logs for GDPR/privacy regulations
- **Security**: Can't track suspicious access patterns
- **Forensics**: Can't investigate data breaches

**Recommendation**:
- Log every access with: user ID, timestamp, IP address
- Store in audit log table or external logging service
- Retain logs for compliance period (e.g., 90 days)

### 6. **No Data Filtering/Sanitization (6/10)** ⚠️ **LOW-MEDIUM RISK**

**Issue**: Returns all columns, including potentially sensitive data.

**Current Behavior**:
```typescript
.select('*') // Returns ALL columns
```

**Risk Level**: **LOW-MEDIUM**
- Returns all user data (email, device_info, notification_preferences, etc.)
- Some fields may be sensitive (device_info, preferences)
- No field-level filtering

**Recommendation**:
- Only return necessary fields:
  ```typescript
  .select('id, email, full_name, avatar_url, created_at')
  ```
- Exclude sensitive fields like `device_info`, internal metadata
- Consider user preferences for what data to share

---

## 🔒 Security Recommendations

### Priority 1: High Impact, Low Effort

1. **Add Rate Limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';
   
   const sandboxLimiter = rateLimit({
     windowMs: 1 * 60 * 1000, // 1 minute
     max: 10 // 10 requests per minute
   });
   
   router.get('/people', verifyAuth, sandboxLimiter, async (req, res) => {
   ```

2. **Add Audit Logging**
   ```typescript
   logger.info('Sandbox access', {
     userId: req.user?.id,
     email: req.user?.email,
     ip: req.ip,
     timestamp: new Date().toISOString()
   });
   ```

3. **Filter Sensitive Fields**
   ```typescript
   .select('id, email, full_name, avatar_url, provider, created_at, last_sign_in_at')
   // Exclude: device_info, notification_preferences, sign_in_count
   ```

### Priority 2: High Impact, Medium Effort

4. **Consider RLS Policy Instead of Service Role**
   - Create permissive RLS policy for authenticated users
   - Use regular Supabase client (anon key) instead of service role
   - Provides database-level protection

5. **Add Request Caching**
   - Cache results for 30-60 seconds
   - Reduces database load
   - Prevents abuse

### Priority 3: Medium Impact, High Effort

6. **Add Role-Based Access Control**
   - If not all users should see all data
   - Implement user roles/permissions
   - Restrict access based on role

7. **Add Data Anonymization**
   - For public directory, consider anonymizing emails
   - Show initials instead of full names
   - Reduce PII exposure

---

## 📊 Security Score Breakdown

| Category | Score | Weight | Weighted Score |
|----------|-------|--------|----------------|
| Authentication | 9/10 | 25% | 2.25 |
| Authorization | 3/10 | 20% | 0.60 |
| Data Protection | 4/10 | 20% | 0.80 |
| Rate Limiting | 5/10 | 10% | 0.50 |
| Audit Logging | 4/10 | 10% | 0.40 |
| Error Handling | 7/10 | 10% | 0.70 |
| Input Validation | 7/10 | 5% | 0.35 |
| **TOTAL** | | **100%** | **6.5/10** |

---

## 🎯 Final Assessment

### Current State: **6.5/10 - MODERATE SECURITY**

**Summary**:
- ✅ **Strong authentication** - Proper JWT verification
- ✅ **Server-side security** - Service role key protected
- ⚠️ **Overly permissive** - All authenticated users can see all data
- ⚠️ **No rate limiting** - Vulnerable to abuse
- ⚠️ **No audit logging** - Can't track access

### Is This Acceptable?

**✅ Acceptable if**:
- This is an internal tool/directory
- All users are trusted (e.g., company employees)
- Data shown is not sensitive (public directory)
- You're aware of the risks and accept them

**❌ Not acceptable if**:
- This is a public-facing application
- User data is sensitive (emails, PII)
- Compliance requirements (GDPR, HIPAA, etc.)
- You need to track who accesses what

### Quick Wins to Improve Score

1. Add rate limiting → **+0.5 points** (7.0/10)
2. Add audit logging → **+0.5 points** (7.5/10)
3. Filter sensitive fields → **+0.5 points** (8.0/10)
4. Use RLS instead of service role → **+1.0 point** (9.0/10)

---

## 🔍 Code References

- **Client-side call**: `src/sandbox/sandbox-page.html:287-292`
- **API endpoint**: `src/api/routes/sandbox.routes.ts:21-52`
- **Auth middleware**: `src/api/middleware/auth.middleware.ts:23-61`
- **Service role client**: `src/core/config/server-supabase.ts:27-62`

