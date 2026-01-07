# Security Rules & Best Practices

This document outlines all security rules and best practices that must be followed when developing in this codebase. These rules are based on comprehensive security fixes and should be referenced during development to ensure secure code delivery.

---

## 🔒 1. XSS Prevention - HTML Content Security

### Rule: NEVER use `innerHTML` with user data

**CRITICAL**: All `innerHTML` assignments MUST use safe alternatives to prevent Cross-Site Scripting (XSS) attacks.

### ✅ CORRECT Usage

```typescript
import { safeSetHTML, escapeHtml } from '../../../utils/html-sanitizer.js';

// For setting HTML content
safeSetHTML(element, htmlString);

// For escaping user data in HTML strings
const safeHtml = `<div>${escapeHtml(userInput)}</div>`;
safeSetHTML(element, safeHtml);

// For simple text content (preferred when possible)
element.textContent = userInput;
```

### ❌ WRONG Usage

```typescript
// NEVER do this - XSS vulnerability
element.innerHTML = userInput;
element.innerHTML = `<div>${userData}</div>`;
element.innerHTML = conversations.map(c => `<div>${c.name}</div>`).join('');
```

### Implementation Details

- **Location**: `src/utils/html-sanitizer.ts`
- **Functions Available**:
  - `safeSetHTML(element, html)` - Safely sets HTML using DOMPurify
  - `sanitizeHTML(html)` - Sanitizes HTML string
  - `escapeHtml(text)` - Escapes HTML special characters
- **When to Use**:
  - Use `safeSetHTML` for any HTML content that includes user data
  - Use `textContent` when you only need plain text (no HTML)
  - Use `escapeHtml` when building HTML strings with user data

### Enforcement

- **Code Review**: Reject any PR that uses `innerHTML` directly
- **Linting**: Consider adding ESLint rule to prevent `innerHTML` usage
- **Pattern**: Search codebase for `innerHTML` before committing

---

## 🔒 2. Data Over-Exposure Prevention

### Rule: NEVER use `select('*')` - Always specify explicit field lists

**CRITICAL**: Database queries MUST use explicit field lists to prevent exposing sensitive or unnecessary data.

### ✅ CORRECT Usage

```typescript
import { USER_PUBLIC_FIELDS, USER_PRIVATE_FIELDS } from '../../../core/constants/field-whitelists.js';

// Public user data
const { data } = await supabase
  .from('users')
  .select(USER_PUBLIC_FIELDS)
  .eq('id', userId)
  .single();

// Private user data (for authenticated user's own profile)
const { data } = await supabase
  .from('users')
  .select(USER_PRIVATE_FIELDS)
  .eq('id', userId)
  .single();
```

### ❌ WRONG Usage

```typescript
// NEVER do this - exposes all columns including sensitive data
const { data } = await supabase.from('users').select('*');
const { data } = await supabase.from('users').select('*').eq('id', userId);
```

### Field Whitelists Available

**Location**: `src/core/constants/field-whitelists.ts`

Available field lists:
- `USER_PUBLIC_FIELDS` - Public user information
- `USER_PRIVATE_FIELDS` - Private user information (own profile)
- `USER_MINIMAL_FIELDS` - Minimal user information
- `NOTIFICATION_FIELDS` - Notification data
- `NOTIFICATION_SUBSCRIPTION_FIELDS` - Push subscription data
- `SCORECARD_FIELDS` - Scorecard data
- `AUDIT_ASSIGNMENT_FIELDS` - Audit assignment data
- `PEOPLE_PUBLIC_FIELDS` - People table public data
- `AUDIT_FIELDS` - Audit data

### When Field List Doesn't Exist

1. **Check existing lists** in `field-whitelists.ts`
2. **Create new field list** if needed:
   ```typescript
   export const YOUR_TABLE_FIELDS = 'id, name, email, created_at';
   export const YOUR_TABLE_MINIMAL_FIELDS = 'id, name';
   ```
3. **Use the new list** in your queries

### Enforcement

- **Code Review**: Reject any PR with `select('*')`
- **Pattern**: Search for `select('*')` before committing
- **Principle**: Only retrieve data you actually need

---

## 🔒 3. Input Validation & Sanitization

### Rule: Always validate and sanitize user input

**CRITICAL**: All user input MUST be validated and sanitized before use.

### ✅ CORRECT Usage

```typescript
import { sanitizeString } from '../../../api/utils/validation.js';

// Sanitize string input
const cleanInput = sanitizeString(userInput, maxLength);

// Validate required fields
if (!input || input.trim().length === 0) {
  throw createValidationError('Field is required', { field: 'input' });
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  throw createValidationError('Invalid email format', { field: 'email' });
}
```

### ❌ WRONG Usage

```typescript
// NEVER use user input directly without sanitization
const query = `SELECT * FROM users WHERE name = '${userInput}'`; // SQL Injection risk
element.innerHTML = userInput; // XSS risk
const url = `https://api.com?q=${userInput}`; // URL injection risk
```

### Sanitization Function

**Location**: `src/api/utils/validation.ts`

The `sanitizeString` function:
- Removes HTML tags (`<`, `>`)
- Removes `javascript:` URLs
- Removes event handlers (`onclick`, `onerror`, etc.)
- Removes `data:` URIs (if not needed)
- Trims whitespace
- Enforces maximum length

### Validation Best Practices

1. **Validate early** - Check input as soon as it's received
2. **Validate on both client and server** - Never trust client-side validation alone
3. **Use type checking** - Ensure data types match expectations
4. **Check length limits** - Prevent buffer overflow attacks
5. **Whitelist, don't blacklist** - Allow only known good values

### Enforcement

- **Code Review**: Verify all user input is sanitized
- **Testing**: Test with malicious input (XSS payloads, SQL injection attempts)
- **Pattern**: Search for direct user input usage before committing

---

## 🔒 4. CSRF Protection

### Rule: All state-changing API routes MUST use CSRF protection

**CRITICAL**: POST, PUT, DELETE, and PATCH requests MUST include CSRF tokens to prevent Cross-Site Request Forgery attacks.

### ✅ CORRECT Usage

```typescript
// Server-side: CSRF middleware is automatically applied
// Client-side: Include CSRF token in requests

// For form submissions
<form method="POST" action="/api/endpoint">
  <input type="hidden" name="_csrf" value="{{csrfToken}}">
  <!-- form fields -->
</form>

// For fetch requests
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': getCsrfToken(), // Get from cookie or meta tag
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

### ❌ WRONG Usage

```typescript
// NEVER make state-changing requests without CSRF token
fetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
  // Missing CSRF token!
});
```

### Implementation Details

- **Location**: `src/api/middleware/csrf.middleware.ts`
- **Middleware**: `csrfProtection` is applied to all `/api/` routes
- **Token Storage**: Uses cookies (secure, httpOnly)
- **Exempt Routes**: GET requests are exempt by default

### Getting CSRF Token

```typescript
// From meta tag (if using server-side rendering)
const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

// From cookie (if using cookie-based storage)
const token = getCookie('_csrf');

// From API endpoint (if needed)
const response = await fetch('/api/csrf-token');
const { token } = await response.json();
```

### Enforcement

- **Code Review**: Verify CSRF tokens in all POST/PUT/DELETE requests
- **Testing**: Test that requests without tokens are rejected
- **Pattern**: Search for POST/PUT/DELETE requests without CSRF tokens

---

## 🔒 5. Error Handling & Information Leakage

### Rule: Never expose sensitive information in error messages

**CRITICAL**: Error messages MUST be generic in production and never expose:
- Stack traces
- Database connection strings
- API keys or secrets
- Internal file paths
- User data
- SQL queries

### ✅ CORRECT Usage

```typescript
import { AppError, createDatabaseError, createValidationError } from '../../../core/errors/app-error.js';

// In production: Generic error message
// In development: Detailed error with stack trace
const isDevelopment = process.env.NODE_ENV === 'development';

try {
  // ... operation
} catch (error) {
  if (isDevelopment) {
    // Detailed error for debugging
    logError('Operation failed', error, { details: error.stack });
  } else {
    // Generic error for production
    logError('Operation failed', error);
    throw new AppError('An error occurred. Please try again later.');
  }
}
```

### ❌ WRONG Usage

```typescript
// NEVER expose sensitive information
catch (error) {
  throw new Error(`Database error: ${error.message}`); // May expose DB details
  throw new Error(`Failed to connect to ${databaseUrl}`); // Exposes connection string
  throw new Error(`User ${user.email} not found`); // Exposes user data
  console.error('Full error:', error); // May log sensitive data
}
```

### Error Handling Middleware

**Location**: `src/api/middleware/error-handler.middleware.ts`

The error handler:
- Returns generic messages in production
- Includes stack traces only in development
- Sanitizes error details
- Uses appropriate HTTP status codes
- Logs errors securely

### Best Practices

1. **Use AppError** - Never throw plain `Error` objects
2. **Log securely** - Use structured logging that sanitizes data
3. **Generic messages** - "An error occurred" instead of detailed errors
4. **Separate logging** - Log details server-side, show generic messages to users
5. **Error codes** - Use error codes for client-side handling without exposing details

### Enforcement

- **Code Review**: Check error messages don't expose sensitive data
- **Testing**: Verify production error messages are generic
- **Pattern**: Search for error messages with user data or system details

---

## 🔒 6. Logging Security

### Rule: NEVER use `console.log` - Use structured logging with sanitization

**CRITICAL**: All logging MUST use the structured logging utility that automatically sanitizes sensitive data.

### ✅ CORRECT Usage

```typescript
import { logInfo, logError, logWarn } from '../../../utils/logging-helper.js';

// Info logging
logInfo('User logged in', { userId: user.id, email: user.email });
logInfo('Operation completed', { count: items.length });

// Error logging
logError('Failed to load data', error, { context: 'user-profile' });

// Warning logging
logWarn('Cache miss', { key: cacheKey });
```

### ❌ WRONG Usage

```typescript
// NEVER use console.log/error/warn directly
console.log('User data:', user); // May log sensitive data
console.error('Error:', error); // May expose stack traces with sensitive data
console.warn('Token:', token); // Exposes authentication tokens
```

### Structured Logging Utility

**Location**: `src/utils/logging-helper.ts`

The logging helper:
- **Automatically sanitizes** sensitive data (passwords, tokens, keys, etc.)
- **Structured format** - Consistent log format across application
- **Log levels** - Info, warn, error with appropriate handling
- **Safe data** - Never logs sensitive information

### Sensitive Data Automatically Sanitized

The logging helper automatically redacts:
- Passwords
- Secrets and keys
- Tokens (JWT, auth tokens)
- Database URLs
- Connection strings
- Session data
- Cookie secrets
- Push notification keys (p256dh, endpoint)

### When to Use Each Log Level

- **logInfo**: General information, successful operations, state changes
- **logWarn**: Non-critical issues, deprecation warnings, fallback scenarios
- **logError**: Errors, exceptions, failures that need attention

### Enforcement

- **Code Review**: Reject any PR with `console.log/error/warn`
- **Linting**: Consider adding ESLint rule to prevent console usage
- **Pattern**: Search for `console.` before committing

---

## 🔒 7. Authentication Requirements

### Rule: All database operations MUST use authenticated Supabase helper

**CRITICAL**: Never access Supabase database directly - always use the authenticated helper.

### ✅ CORRECT Usage

```typescript
import { getAuthenticatedSupabase } from '../../../utils/authenticated-supabase.js';

// All database operations
async function fetchData() {
  const supabase = await getAuthenticatedSupabase();
  const { data, error } = await supabase
    .from('users')
    .select(USER_PUBLIC_FIELDS)
    .eq('id', userId)
    .single();
  return data;
}
```

### ❌ WRONG Usage

```typescript
// NEVER use Supabase client directly for database operations
import { getSupabase } from './utils/supabase-init.js';
const supabase = getSupabase(); // Bypasses authentication check!
const { data } = await supabase.from('users').select('*');
```

### Authenticated Supabase Helper

**Location**: `src/utils/authenticated-supabase.ts`

The helper:
- **Verifies authentication** before allowing database access
- **Throws error** if user is not authenticated
- **Enforces RLS** - Row Level Security policies are respected
- **Consistent pattern** - Single way to access database

### Exceptions

- **Server-side operations**: Use `getServerSupabase()` from `src/core/config/server-supabase.ts` (service role, bypasses RLS)
- **Auth operations**: `supabase.auth.*` methods are allowed through authenticated helper
- **Initialization**: `initSupabase()` is allowed for setup only

### Enforcement

- **Code Review**: Reject any direct `getSupabase()` usage for database operations
- **Linting**: Consider adding ESLint rule to prevent direct Supabase access
- **Pattern**: Search for `getSupabase()` before committing

---

## 🔒 8. HTML Sanitization for Dynamic Content

### Rule: Always sanitize HTML when rendering user-generated content

**CRITICAL**: Any HTML content that includes user data MUST be sanitized using DOMPurify.

### ✅ CORRECT Usage

```typescript
import { safeSetHTML, sanitizeHTML, escapeHtml } from '../../../utils/html-sanitizer.js';

// For setting HTML content
safeSetHTML(element, userGeneratedHtml);

// For sanitizing HTML strings
const cleanHtml = sanitizeHTML(dirtyHtml);

// For escaping in template strings
const safeTemplate = `
  <div class="user-card">
    <h3>${escapeHtml(user.name)}</h3>
    <p>${escapeHtml(user.email)}</p>
  </div>
`;
safeSetHTML(container, safeTemplate);
```

### ❌ WRONG Usage

```typescript
// NEVER use innerHTML with unsanitized content
element.innerHTML = userGeneratedHtml; // XSS risk
element.innerHTML = `<div>${userData}</div>`; // XSS risk
element.innerHTML = template.replace('{{name}}', user.name); // XSS risk
```

### HTML Sanitizer Utility

**Location**: `src/utils/html-sanitizer.ts`

Functions:
- `safeSetHTML(element, html)` - Safely sets HTML using DOMPurify
- `sanitizeHTML(html)` - Sanitizes HTML string, returns clean HTML
- `escapeHtml(text)` - Escapes HTML special characters (`<`, `>`, `&`, `"`, `'`)

### When to Use Each Function

- **safeSetHTML**: When setting HTML content of an element
- **sanitizeHTML**: When you need to sanitize HTML but not set it immediately
- **escapeHtml**: When building HTML strings with user data in template literals

### Enforcement

- **Code Review**: Verify all HTML rendering uses sanitization
- **Testing**: Test with XSS payloads (`<script>alert('XSS')</script>`, etc.)
- **Pattern**: Search for `innerHTML` assignments before committing

---

## 🔒 9. Field Whitelisting for Database Queries

### Rule: Always use explicit field lists from field-whitelists.ts

**CRITICAL**: Database queries MUST use predefined field lists to prevent data over-exposure.

### ✅ CORRECT Usage

```typescript
import { 
  USER_PUBLIC_FIELDS, 
  NOTIFICATION_FIELDS,
  AUDIT_ASSIGNMENT_FIELDS 
} from '../../../core/constants/field-whitelists.js';

// Use appropriate field list
const { data } = await supabase
  .from('users')
  .select(USER_PUBLIC_FIELDS)
  .eq('id', userId);

// For dynamic tables, use generic fields
const { data } = await supabase
  .from(tableName)
  .select(AUDIT_GENERIC_FIELDS)
  .eq('employee_id', employeeId);
```

### ❌ WRONG Usage

```typescript
// NEVER use select('*') or hardcoded field lists
const { data } = await supabase.from('users').select('*');
const { data } = await supabase.from('users').select('id, email, password, secret_key');
```

### Creating New Field Lists

When you need a new field list:

1. **Add to field-whitelists.ts**:
   ```typescript
   export const YOUR_TABLE_FIELDS = 'id, name, email, created_at, updated_at';
   export const YOUR_TABLE_MINIMAL_FIELDS = 'id, name';
   ```

2. **Use in queries**:
   ```typescript
   import { YOUR_TABLE_FIELDS } from '../../../core/constants/field-whitelists.js';
   const { data } = await supabase.from('your_table').select(YOUR_TABLE_FIELDS);
   ```

### Field List Naming Convention

- `{TABLE}_FIELDS` - Full field list for the table
- `{TABLE}_PUBLIC_FIELDS` - Public fields (safe to expose)
- `{TABLE}_PRIVATE_FIELDS` - Private fields (authenticated user only)
- `{TABLE}_MINIMAL_FIELDS` - Minimal fields (for lists/summaries)

### Enforcement

- **Code Review**: Verify all queries use field whitelists
- **Pattern**: Search for `select('*')` before committing
- **Principle**: Only retrieve fields you actually need

---

## 🔒 10. Security Headers & Configuration

### Rule: Always use security headers and secure configuration

**CRITICAL**: Application MUST use security headers and secure configuration.

### ✅ CORRECT Usage

```typescript
// Server configuration with Helmet
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Minimize unsafe-inline
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

### Security Headers Configured

- **Content Security Policy (CSP)** - Prevents XSS attacks
- **Strict Transport Security (HSTS)** - Forces HTTPS
- **X-Frame-Options** - Prevents clickjacking
- **X-Content-Type-Options** - Prevents MIME sniffing
- **Referrer-Policy** - Controls referrer information

### Rate Limiting

- **API routes** - Limited to prevent abuse
- **Authentication routes** - Stricter limits
- **Configurable** - Adjust based on application needs

### Enforcement

- **Code Review**: Verify security headers are configured
- **Testing**: Test with security header checkers
- **Monitoring**: Monitor rate limit violations

---

## 🔒 11. Environment Variable Security

### Rule: Never expose sensitive environment variables to client

**CRITICAL**: Only expose safe, public environment variables to the client.

### ✅ CORRECT Usage

```typescript
// Server-side: Safe environment variable exposure
const safeEnvVars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  // Only public, non-sensitive variables
};

// Client-side: Use only exposed safe variables
const supabaseUrl = window.env?.SUPABASE_URL;
```

### ❌ WRONG Usage

```typescript
// NEVER expose sensitive variables
const allEnvVars = process.env; // Exposes everything!
const secretKey = process.env.SECRET_KEY; // Exposed to client!
const dbUrl = process.env.DATABASE_URL; // Exposed to client!
```

### Safe Environment Variables

**Location**: `src/server-commonjs.ts` - `getSafeEnvVars()`

Only these variables are exposed:
- `SUPABASE_URL` - Public Supabase URL
- `SUPABASE_ANON_KEY` - Public anon key (safe to expose)
- Other public configuration variables

### Never Expose

- Database connection strings
- API keys (except public anon keys)
- Secret keys
- JWT secrets
- Service role keys
- Private tokens

### Enforcement

- **Code Review**: Verify only safe variables are exposed
- **Pattern**: Search for `process.env` in client-side code
- **Testing**: Verify sensitive variables are not in client bundle

---

## 🔒 12. Dependency Security

### Rule: Regularly audit and update dependencies

**CRITICAL**: Dependencies MUST be kept up-to-date and vulnerabilities addressed.

### ✅ CORRECT Usage

```bash
# Regular dependency audit
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### Dependency Management

- **Regular audits** - Run `npm audit` before each release
- **Automatic fixes** - Use `npm audit fix` when safe
- **Manual review** - Review and test after updates
- **Security advisories** - Monitor for security advisories

### Known Vulnerabilities

- **Dev dependencies** - Lower priority but still important
- **Production dependencies** - Critical priority
- **Transitive dependencies** - Check indirect dependencies

### Enforcement

- **CI/CD**: Run `npm audit` in CI pipeline
- **Pre-commit**: Consider adding audit check to pre-commit hook
- **Regular schedule**: Monthly dependency review

---

## 📋 Quick Reference Checklist

Before committing code, verify:

- [ ] No `innerHTML` usage - Use `safeSetHTML` instead
- [ ] No `select('*')` queries - Use field whitelists
- [ ] All user input is sanitized - Use `sanitizeString`
- [ ] CSRF tokens in POST/PUT/DELETE requests
- [ ] No `console.log` - Use `logInfo/logError/logWarn`
- [ ] All database access uses `getAuthenticatedSupabase()`
- [ ] Error messages are generic (no sensitive data)
- [ ] HTML content is sanitized with DOMPurify
- [ ] Only safe environment variables exposed to client
- [ ] Dependencies are up-to-date and secure

---

## 🚨 Security Violation Examples

### Example 1: XSS Vulnerability
```typescript
// ❌ VULNERABLE
element.innerHTML = `<div>${userInput}</div>`;

// ✅ SECURE
safeSetHTML(element, `<div>${escapeHtml(userInput)}</div>`);
```

### Example 2: Data Over-Exposure
```typescript
// ❌ VULNERABLE
const { data } = await supabase.from('users').select('*');

// ✅ SECURE
const { data } = await supabase.from('users').select(USER_PUBLIC_FIELDS);
```

### Example 3: Information Leakage
```typescript
// ❌ VULNERABLE
catch (error) {
  throw new Error(`Database error: ${error.message}`);
}

// ✅ SECURE
catch (error) {
  logError('Database operation failed', error);
  throw new AppError('An error occurred. Please try again.');
}
```

### Example 4: Unauthenticated Database Access
```typescript
// ❌ VULNERABLE
const supabase = getSupabase();
const { data } = await supabase.from('users').select('*');

// ✅ SECURE
const supabase = await getAuthenticatedSupabase();
const { data } = await supabase.from('users').select(USER_PUBLIC_FIELDS);
```

---

## 📚 Related Files

- **HTML Sanitization**: `src/utils/html-sanitizer.ts`
- **Field Whitelists**: `src/core/constants/field-whitelists.ts`
- **Input Validation**: `src/api/utils/validation.ts`
- **CSRF Middleware**: `src/api/middleware/csrf.middleware.ts`
- **Error Handling**: `src/api/middleware/error-handler.middleware.ts`
- **Structured Logging**: `src/utils/logging-helper.ts`
- **Authenticated Supabase**: `src/utils/authenticated-supabase.ts`
- **Security Headers**: `src/server-commonjs.ts`

---

## 🎯 Security Rating Goals

Target security ratings:
- **XSS Prevention**: 9.5/10
- **Data Protection**: 9.5/10
- **Input Validation**: 9.0/10
- **CSRF Protection**: 9.0/10
- **Error Handling**: 9.0/10
- **Logging Security**: 9.5/10
- **Authentication**: 9.5/10
- **Overall Security**: 9.3/10+

---

**Remember**: Security is not optional. Every line of code should follow these rules to ensure a secure application.

